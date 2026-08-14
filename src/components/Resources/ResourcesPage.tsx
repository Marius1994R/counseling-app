import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, CircularProgress } from '@mui/material';
import { BookOpenIcon, FolderPlusIcon } from '@heroicons/react/24/outline';
import { ResourceFolder, ResourceLink } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useResources } from '../../hooks/useResources';
import { t } from '../../utils/translations';
import ConfirmDialog from '../common/ConfirmDialog';
import ResourcesTree from './ResourcesTree';
import ResourceFolderDialog from './ResourceFolderDialog';
import ResourceLinkDialog from './ResourceLinkDialog';
import { isFolderVisibleInTree } from './resourcesUtils';
import {
  clearExpandedFolderIds,
  loadExpandedFolderIds,
  saveExpandedFolderIds,
} from './resourcesCache';

type FolderDialogState =
  | { open: false }
  | { open: true; mode: 'create' | 'edit'; folder?: ResourceFolder; defaultParentId?: string | null };

type LinkDialogState =
  | { open: false }
  | { open: true; mode: 'create' | 'edit'; link?: ResourceLink; defaultFolderId?: string | null };

type PendingDelete =
  | { type: 'folder'; folder: ResourceFolder }
  | { type: 'link'; link: ResourceLink }
  | null;

const ResourcesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const data = useResources();
  const [folderDialog, setFolderDialog] = useState<FolderDialogState>({ open: false });
  const [linkDialog, setLinkDialog] = useState<LinkDialogState>({ open: false });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(loadExpandedFolderIds())
  );

  // Persist open folders across reload; clear when leaving via in-app navigation.
  useEffect(() => {
    let leavingViaSpa = true;
    const onBeforeUnload = () => {
      leavingViaSpa = false;
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (leavingViaSpa) {
        clearExpandedFolderIds();
      }
    };
  }, []);

  const handleToggleExpanded = useCallback((folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      saveExpandedFolderIds(Array.from(next));
      return next;
    });
  }, []);

  const visibleFolders = useMemo(() => {
    const byId = new Map(data.folders.map((f) => [f.id, f]));
    return data.folders
      .filter((f) => isFolderVisibleInTree(currentUser?.role, f, byId))
      .sort((a, b) => {
        const aRoot = a.parentId ? 1 : 0;
        const bRoot = b.parentId ? 1 : 0;
        if (aRoot !== bRoot) return aRoot - bRoot;
        return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
      });
  }, [data.folders, currentUser?.role]);

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    try {
      if (pendingDelete.type === 'folder') {
        await data.deleteFolder(pendingDelete.folder.id);
      } else {
        await data.deleteLink(pendingDelete.link.id);
      }
      setPendingDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-slate-600 sm:max-w-xl">{t.resources.accessHint}</p>
        {data.canManage && (
          <button
            type="button"
            onClick={() =>
              setFolderDialog({ open: true, mode: 'create', defaultParentId: null })
            }
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            <FolderPlusIcon className="h-4 w-4" />
            {t.resources.addFolder}
          </button>
        )}
      </div>

      {data.error && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {data.error}
        </Alert>
      )}

      {data.loading && data.tree.length === 0 ? (
        <div className="flex justify-center py-16">
          <CircularProgress size={32} />
        </div>
      ) : data.tree.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
          <BookOpenIcon className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">{t.resources.empty}</p>
          <p className="mt-1 text-xs text-slate-500">{t.resources.emptyHint}</p>
          {data.canManage && (
            <button
              type="button"
              onClick={() =>
                setFolderDialog({ open: true, mode: 'create', defaultParentId: null })
              }
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <FolderPlusIcon className="h-4 w-4" />
              {t.resources.addFolder}
            </button>
          )}
        </div>
      ) : (
        <ResourcesTree
          tree={data.tree}
          canManage={data.canManage}
          expandedIds={expandedIds}
          onToggleExpanded={handleToggleExpanded}
          onAddSubfolder={(parent) =>
            setFolderDialog({ open: true, mode: 'create', defaultParentId: parent.id })
          }
          onAddLink={(folder) =>
            setLinkDialog({ open: true, mode: 'create', defaultFolderId: folder.id })
          }
          onEditFolder={(folder) =>
            setFolderDialog({ open: true, mode: 'edit', folder })
          }
          onDeleteFolder={(folder) => setPendingDelete({ type: 'folder', folder })}
          onEditLink={(link) => setLinkDialog({ open: true, mode: 'edit', link })}
          onDeleteLink={(link) => setPendingDelete({ type: 'link', link })}
        />
      )}

      <ResourceFolderDialog
        open={folderDialog.open}
        mode={folderDialog.open ? folderDialog.mode : 'create'}
        initial={folderDialog.open && folderDialog.mode === 'edit' ? folderDialog.folder : null}
        defaultParentId={
          folderDialog.open && folderDialog.mode === 'create'
            ? folderDialog.defaultParentId ?? null
            : null
        }
        parentLabel={(() => {
          if (!folderDialog.open) return null;
          if (folderDialog.mode === 'create' && folderDialog.defaultParentId) {
            return (
              data.folders.find((f) => f.id === folderDialog.defaultParentId)?.name ?? null
            );
          }
          return null;
        })()}
        allFolders={data.folders}
        saving={data.saving}
        onClose={() => setFolderDialog({ open: false })}
        onSubmit={async (input) => {
          if (folderDialog.open && folderDialog.mode === 'edit' && folderDialog.folder) {
            await data.updateFolder(folderDialog.folder.id, input);
          } else {
            await data.createFolder(input);
          }
        }}
      />

      <ResourceLinkDialog
        open={linkDialog.open}
        mode={linkDialog.open ? linkDialog.mode : 'create'}
        initial={linkDialog.open && linkDialog.mode === 'edit' ? linkDialog.link : null}
        defaultFolderId={
          linkDialog.open && linkDialog.mode === 'create'
            ? linkDialog.defaultFolderId ?? null
            : null
        }
        folders={visibleFolders}
        saving={data.saving}
        onClose={() => setLinkDialog({ open: false })}
        onSubmit={async (input) => {
          if (linkDialog.open && linkDialog.mode === 'edit' && linkDialog.link) {
            await data.updateLink(linkDialog.link.id, input);
          } else {
            await data.createLink(input);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={
          pendingDelete?.type === 'folder'
            ? t.resources.deleteFolderTitle
            : t.resources.deleteLinkTitle
        }
        message={
          pendingDelete?.type === 'folder'
            ? t.resources.deleteFolderConfirm.replace('{name}', pendingDelete.folder.name)
            : t.resources.deleteLinkConfirm.replace(
                '{name}',
                pendingDelete?.type === 'link' ? pendingDelete.link.title : ''
              )
        }
        warningMessage={
          pendingDelete?.type === 'folder' ? t.resources.deleteFolderWarning : undefined
        }
        loading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deleteLoading) setPendingDelete(null);
        }}
      />
    </div>
  );
};

export default ResourcesPage;
