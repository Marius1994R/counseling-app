import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ResourceFolder, ResourceFolderColor, ResourceLink, ResourceLinkKind } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { assertUserHasRole, isAdminOrLeader } from '../utils/roleAuth';
import {
  clearResourcesCache,
  loadResourcesCache,
  saveResourcesCache,
} from '../components/Resources/resourcesCache';
import {
  buildVisibleTree,
  canAddSubfolderUnder,
  collectDescendantFolderIds,
  canMoveFolderUnder,
  inferResourceLinkKind,
  isValidResourceUrl,
  mapFirestoreResourceFolder,
  mapFirestoreResourceLink,
  RESOURCE_MAX_DEPTH,
  rootFoldersForParentSelect,
} from '../components/Resources/resourcesUtils';
import { t } from '../utils/translations';

const META_DOC = doc(db, 'resourceMeta', 'state');
const FOLDERS_COL = collection(db, 'resourceFolders');
const LINKS_COL = collection(db, 'resourceLinks');

export interface FolderInput {
  name: string;
  parentId: string | null;
  allowAdmins: boolean;
  allowCounselors: boolean;
  color: ResourceFolderColor;
}

export interface LinkInput {
  folderId: string;
  title: string;
  url: string;
  kind?: ResourceLinkKind;
}

async function readMetaRevision(): Promise<number> {
  const snap = await getDoc(META_DOC);
  if (!snap.exists()) return 0;
  const rev = snap.data()?.revision;
  return typeof rev === 'number' ? rev : 0;
}

async function bumpMetaRevision(): Promise<number> {
  const snap = await getDoc(META_DOC);
  if (!snap.exists()) {
    await setDoc(META_DOC, { revision: 1, updatedAt: new Date() });
    return 1;
  }
  await updateDoc(META_DOC, {
    revision: increment(1),
    updatedAt: new Date(),
  });
  const after = await getDoc(META_DOC);
  const rev = after.data()?.revision;
  return typeof rev === 'number' ? rev : (snap.data()?.revision ?? 0) + 1;
}

async function fetchCollections(): Promise<{
  folders: ResourceFolder[];
  links: ResourceLink[];
}> {
  const [foldersSnap, linksSnap] = await Promise.all([
    getDocs(FOLDERS_COL),
    getDocs(LINKS_COL),
  ]);
  const folders = foldersSnap.docs.map((d) => mapFirestoreResourceFolder(d.id, d.data()));
  const links = linksSnap.docs.map((d) => mapFirestoreResourceLink(d.id, d.data()));
  return { folders, links };
}

export function useResources() {
  const { currentUser } = useAuth();
  const cache = loadResourcesCache();
  const [folders, setFolders] = useState<ResourceFolder[]>(() => cache?.folders ?? []);
  const [links, setLinks] = useState<ResourceLink[]>(() => cache?.links ?? []);
  const [revision, setRevision] = useState(() => cache?.revision ?? -1);
  const [loading, setLoading] = useState(() => !cache);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const revisionRef = useRef(revision);
  revisionRef.current = revision;

  const canManage = isAdminOrLeader(currentUser?.role);

  const applyData = useCallback((nextRevision: number, nextFolders: ResourceFolder[], nextLinks: ResourceLink[]) => {
    setRevision(nextRevision);
    setFolders(nextFolders);
    setLinks(nextLinks);
    saveResourcesCache(nextRevision, nextFolders, nextLinks);
  }, []);

  const refreshCollections = useCallback(async (expectedRevision?: number) => {
    const [{ folders: nextFolders, links: nextLinks }, remoteRevision] = await Promise.all([
      fetchCollections(),
      expectedRevision != null ? Promise.resolve(expectedRevision) : readMetaRevision(),
    ]);
    applyData(remoteRevision, nextFolders, nextLinks);
  }, [applyData]);

  const syncFromRemote = useCallback(async () => {
    if (!currentUser || currentUser.id.startsWith('demo-')) {
      setFolders([]);
      setLinks([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const remoteRevision = await readMetaRevision();
      const local = loadResourcesCache();
      if (local && local.revision === remoteRevision) {
        setFolders(local.folders);
        setLinks(local.links);
        setRevision(local.revision);
        setLoading(false);
        return;
      }
      await refreshCollections(remoteRevision);
    } catch (err) {
      console.error('Error loading resources:', err);
      setError(t.resources.loadError);
    } finally {
      setLoading(false);
    }
  }, [currentUser, refreshCollections]);

  useEffect(() => {
    void syncFromRemote();
  }, [syncFromRemote]);

  // Live meta listener while page/hook is mounted
  useEffect(() => {
    if (!currentUser || currentUser.id.startsWith('demo-')) return;

    const unsub = onSnapshot(
      META_DOC,
      (snap) => {
        const remoteRevision = snap.exists()
          ? typeof snap.data()?.revision === 'number'
            ? snap.data()!.revision
            : 0
          : 0;
        if (remoteRevision === revisionRef.current) return;
        void refreshCollections(remoteRevision).catch((err) => {
          console.error('Error refreshing resources after meta change:', err);
        });
      },
      (err) => {
        console.error('Error listening to resource meta:', err);
      }
    );

    return unsub;
  }, [currentUser, refreshCollections]);

  const tree = useMemo(
    () => buildVisibleTree(currentUser?.role, folders, links),
    [currentUser?.role, folders, links]
  );

  const parentOptions = useMemo(() => rootFoldersForParentSelect(folders), [folders]);

  const requireManager = useCallback(async () => {
    if (!currentUser) throw new Error(t.auth.notAuthenticated);
    await assertUserHasRole(currentUser.id, ['admin', 'leader']);
  }, [currentUser]);

  const createFolder = useCallback(
    async (input: FolderInput) => {
      await requireManager();
      const name = input.name.trim();
      if (!name) throw new Error(t.resources.folderNameRequired);

      if (input.parentId) {
        const parent = folders.find((f) => f.id === input.parentId);
        if (!parent) throw new Error(t.resources.invalidParent);
        if (!canAddSubfolderUnder(parent, folders)) {
          throw new Error(
            t.resources.maxDepthError.replace('{max}', String(RESOURCE_MAX_DEPTH))
          );
        }
      }

      setSaving(true);
      try {
        const now = new Date();
        const sortOrder =
          folders.filter((f) => f.parentId === input.parentId).reduce((m, f) => Math.max(m, f.sortOrder), 0) +
          1;
        await addDoc(FOLDERS_COL, {
          name,
          parentId: input.parentId,
          allowAdmins: input.allowAdmins,
          allowCounselors: input.allowCounselors,
          color: input.color,
          sortOrder,
          createdBy: currentUser!.id,
          createdAt: now,
          updatedAt: now,
        });
        const nextRev = await bumpMetaRevision();
        await refreshCollections(nextRev);
      } finally {
        setSaving(false);
      }
    },
    [requireManager, folders, currentUser, refreshCollections]
  );

  const updateFolder = useCallback(
    async (id: string, input: FolderInput) => {
      await requireManager();
      const name = input.name.trim();
      if (!name) throw new Error(t.resources.folderNameRequired);
      const existing = folders.find((f) => f.id === id);
      if (!existing) throw new Error(t.resources.invalidParent);

      const parentId = input.parentId;
      if (parentId) {
        const parent = folders.find((f) => f.id === parentId);
        if (!parent) throw new Error(t.resources.invalidParent);
      }
      if (!canMoveFolderUnder(id, parentId, folders)) {
        throw new Error(
          t.resources.maxDepthError.replace('{max}', String(RESOURCE_MAX_DEPTH))
        );
      }

      setSaving(true);
      try {
        await updateDoc(doc(db, 'resourceFolders', id), {
          name,
          parentId,
          allowAdmins: input.allowAdmins,
          allowCounselors: input.allowCounselors,
          color: input.color,
          updatedAt: new Date(),
        });
        const nextRev = await bumpMetaRevision();
        await refreshCollections(nextRev);
      } finally {
        setSaving(false);
      }
    },
    [requireManager, folders, refreshCollections]
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      await requireManager();
      setSaving(true);
      try {
        const descendantIds = collectDescendantFolderIds(id, folders);
        const folderIds = [id, ...descendantIds];
        const linkIds = links.filter((l) => folderIds.includes(l.folderId)).map((l) => l.id);

        const batch = writeBatch(db);
        for (const linkId of linkIds) {
          batch.delete(doc(db, 'resourceLinks', linkId));
        }
        for (const folderId of folderIds) {
          batch.delete(doc(db, 'resourceFolders', folderId));
        }
        await batch.commit();
        const nextRev = await bumpMetaRevision();
        await refreshCollections(nextRev);
      } finally {
        setSaving(false);
      }
    },
    [requireManager, folders, links, refreshCollections]
  );

  const createLink = useCallback(
    async (input: LinkInput) => {
      await requireManager();
      const title = input.title.trim();
      const url = input.url.trim();
      if (!title) throw new Error(t.resources.linkTitleRequired);
      if (!isValidResourceUrl(url)) throw new Error(t.resources.invalidUrl);
      if (!folders.some((f) => f.id === input.folderId)) {
        throw new Error(t.resources.folderRequired);
      }

      setSaving(true);
      try {
        const now = new Date();
        const sortOrder =
          links.filter((l) => l.folderId === input.folderId).reduce((m, l) => Math.max(m, l.sortOrder), 0) +
          1;
        const kind = input.kind ?? inferResourceLinkKind(url);
        await addDoc(LINKS_COL, {
          folderId: input.folderId,
          title,
          url,
          kind,
          sortOrder,
          createdBy: currentUser!.id,
          createdAt: now,
          updatedAt: now,
        });
        const nextRev = await bumpMetaRevision();
        await refreshCollections(nextRev);
      } finally {
        setSaving(false);
      }
    },
    [requireManager, folders, links, currentUser, refreshCollections]
  );

  const updateLink = useCallback(
    async (id: string, input: LinkInput) => {
      await requireManager();
      const title = input.title.trim();
      const url = input.url.trim();
      if (!title) throw new Error(t.resources.linkTitleRequired);
      if (!isValidResourceUrl(url)) throw new Error(t.resources.invalidUrl);
      if (!folders.some((f) => f.id === input.folderId)) {
        throw new Error(t.resources.folderRequired);
      }

      setSaving(true);
      try {
        const kind = input.kind ?? inferResourceLinkKind(url);
        await updateDoc(doc(db, 'resourceLinks', id), {
          folderId: input.folderId,
          title,
          url,
          kind,
          updatedAt: new Date(),
        });
        const nextRev = await bumpMetaRevision();
        await refreshCollections(nextRev);
      } finally {
        setSaving(false);
      }
    },
    [requireManager, folders, refreshCollections]
  );

  /** Move a link into another folder (drag-and-drop). No-op if already there. */
  const moveLink = useCallback(
    async (linkId: string, targetFolderId: string) => {
      await requireManager();
      const link = links.find((l) => l.id === linkId);
      if (!link) return;
      if (link.folderId === targetFolderId) return;
      if (!folders.some((f) => f.id === targetFolderId)) {
        throw new Error(t.resources.folderRequired);
      }

      const sortOrder =
        links
          .filter((l) => l.folderId === targetFolderId)
          .reduce((m, l) => Math.max(m, l.sortOrder), 0) + 1;

      // Optimistic local update for immediate tree feedback
      setLinks((prev) =>
        prev.map((l) =>
          l.id === linkId
            ? { ...l, folderId: targetFolderId, sortOrder, updatedAt: new Date() }
            : l
        )
      );

      setSaving(true);
      try {
        await updateDoc(doc(db, 'resourceLinks', linkId), {
          folderId: targetFolderId,
          sortOrder,
          updatedAt: new Date(),
        });
        const nextRev = await bumpMetaRevision();
        await refreshCollections(nextRev);
      } catch (err) {
        // Roll back optimistic move on failure
        setLinks((prev) =>
          prev.map((l) =>
            l.id === linkId
              ? { ...l, folderId: link.folderId, sortOrder: link.sortOrder }
              : l
          )
        );
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [requireManager, links, folders, refreshCollections]
  );

  const deleteLink = useCallback(
    async (id: string) => {
      await requireManager();
      setSaving(true);
      try {
        await deleteDoc(doc(db, 'resourceLinks', id));
        const nextRev = await bumpMetaRevision();
        await refreshCollections(nextRev);
      } finally {
        setSaving(false);
      }
    },
    [requireManager, refreshCollections]
  );

  return {
    folders,
    links,
    tree,
    parentOptions,
    loading,
    error,
    saving,
    canManage,
    createFolder,
    updateFolder,
    deleteFolder,
    createLink,
    updateLink,
    moveLink,
    deleteLink,
    clearCache: clearResourcesCache,
  };
}
