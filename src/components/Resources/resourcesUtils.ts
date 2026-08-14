import { DocumentData } from 'firebase/firestore';
import {
  ResourceFolder,
  ResourceFolderColor,
  ResourceLink,
  ResourceLinkKind,
  UserRole,
} from '../../types';
import { isValidRegistrationUrl } from '../Calendar/eventUtils';

export const RESOURCE_MAX_DEPTH = 5;

export const RESOURCE_FOLDER_COLORS: {
  id: ResourceFolderColor;
  iconClass: string;
  swatchClass: string;
}[] = [
  { id: 'brand', iconClass: 'text-brand-600', swatchClass: 'bg-brand-600' },
  { id: 'slate', iconClass: 'text-slate-600', swatchClass: 'bg-slate-500' },
  { id: 'sky', iconClass: 'text-sky-600', swatchClass: 'bg-sky-500' },
  { id: 'emerald', iconClass: 'text-emerald-600', swatchClass: 'bg-emerald-500' },
  { id: 'amber', iconClass: 'text-amber-600', swatchClass: 'bg-amber-500' },
  { id: 'orange', iconClass: 'text-orange-600', swatchClass: 'bg-orange-500' },
  { id: 'rose', iconClass: 'text-rose-600', swatchClass: 'bg-rose-500' },
  { id: 'violet', iconClass: 'text-violet-600', swatchClass: 'bg-violet-500' },
];

const FOLDER_COLOR_IDS = new Set(RESOURCE_FOLDER_COLORS.map((c) => c.id));

export function normalizeFolderColor(value: unknown): ResourceFolderColor {
  if (typeof value === 'string' && FOLDER_COLOR_IDS.has(value as ResourceFolderColor)) {
    return value as ResourceFolderColor;
  }
  return 'brand';
}

export function folderIconClass(color: ResourceFolderColor | undefined): string {
  const found = RESOURCE_FOLDER_COLORS.find((c) => c.id === (color ?? 'brand'));
  return found?.iconClass ?? 'text-brand-600';
}

export function coerceDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function mapFirestoreResourceFolder(id: string, data: DocumentData): ResourceFolder {
  return {
    id,
    name: String(data.name || ''),
    parentId: data.parentId == null || data.parentId === '' ? null : String(data.parentId),
    allowAdmins: Boolean(data.allowAdmins),
    allowCounselors: Boolean(data.allowCounselors),
    color: normalizeFolderColor(data.color),
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    createdBy: String(data.createdBy || ''),
    createdAt: coerceDate(data.createdAt),
    updatedAt: coerceDate(data.updatedAt),
  };
}

export function mapFirestoreResourceLink(id: string, data: DocumentData): ResourceLink {
  const kind = data.kind;
  return {
    id,
    folderId: String(data.folderId || ''),
    title: String(data.title || ''),
    url: String(data.url || ''),
    kind: kind === 'doc' || kind === 'sheet' || kind === 'other' ? kind : 'other',
    sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
    createdBy: String(data.createdBy || ''),
    createdAt: coerceDate(data.createdAt),
    updatedAt: coerceDate(data.updatedAt),
  };
}

export function canSeeResourceFolder(role: UserRole | undefined, folder: ResourceFolder): boolean {
  if (!role) return false;
  if (role === 'leader') return true;
  if (role === 'admin') return folder.allowAdmins || folder.allowCounselors;
  if (role === 'counselor') return folder.allowCounselors;
  return false;
}

/** Folder is visible only if it and every ancestor are visible to the role. */
export function isFolderVisibleInTree(
  role: UserRole | undefined,
  folder: ResourceFolder,
  byId: Map<string, ResourceFolder>
): boolean {
  let current: ResourceFolder | undefined = folder;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) return false;
    seen.add(current.id);
    if (!canSeeResourceFolder(role, current)) return false;
    if (!current.parentId) return true;
    current = byId.get(current.parentId);
    if (!current) return false;
  }
  return false;
}

export function folderDepth(folder: ResourceFolder, byId: Map<string, ResourceFolder>): number {
  let depth = 1;
  let parentId = folder.parentId;
  const seen = new Set<string>();
  while (parentId) {
    if (seen.has(parentId)) break;
    seen.add(parentId);
    depth += 1;
    const parent = byId.get(parentId);
    if (!parent) break;
    parentId = parent.parentId;
  }
  return depth;
}

export function inferResourceLinkKind(url: string): ResourceLinkKind {
  const lower = url.trim().toLowerCase();
  if (lower.includes('docs.google.com/spreadsheets') || lower.includes('sheets.google.com')) {
    return 'sheet';
  }
  if (lower.includes('docs.google.com/document') || lower.includes('docs.google.com/doc')) {
    return 'doc';
  }
  if (lower.includes('spreadsheet')) return 'sheet';
  if (lower.includes('document')) return 'doc';
  return 'other';
}

export function isValidResourceUrl(url: string): boolean {
  if (!url.trim()) return false;
  return isValidRegistrationUrl(url.trim());
}

export interface ResourceTreeNode {
  folder: ResourceFolder;
  children: ResourceTreeNode[];
  links: ResourceLink[];
}

export function buildVisibleTree(
  role: UserRole | undefined,
  folders: ResourceFolder[],
  links: ResourceLink[]
): ResourceTreeNode[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const visible = folders.filter((f) => isFolderVisibleInTree(role, f, byId));
  const visibleIds = new Set(visible.map((f) => f.id));

  const linksByFolder = new Map<string, ResourceLink[]>();
  for (const link of links) {
    if (!visibleIds.has(link.folderId)) continue;
    const list = linksByFolder.get(link.folderId) ?? [];
    list.push(link);
    linksByFolder.set(link.folderId, list);
  }
  for (const list of Array.from(linksByFolder.values())) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
  }

  const childrenOf = new Map<string | null, ResourceFolder[]>();
  for (const folder of visible) {
    const key = folder.parentId;
    const list = childrenOf.get(key) ?? [];
    list.push(folder);
    childrenOf.set(key, list);
  }
  for (const list of Array.from(childrenOf.values())) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }

  const build = (parentId: string | null): ResourceTreeNode[] => {
    const kids = childrenOf.get(parentId) ?? [];
    return kids.map((folder) => ({
      folder,
      children: build(folder.id),
      links: linksByFolder.get(folder.id) ?? [],
    }));
  };

  return build(null);
}

/** Root folders only (parentId null). */
export function rootFoldersForParentSelect(folders: ResourceFolder[]): ResourceFolder[] {
  return folders
    .filter((f) => f.parentId == null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** All descendant folder ids under rootId (not including rootId). */
export function collectDescendantFolderIds(
  rootId: string,
  folders: ResourceFolder[]
): string[] {
  const result: string[] = [];
  const walk = (id: string) => {
    for (const f of folders) {
      if (f.parentId === id) {
        result.push(f.id);
        walk(f.id);
      }
    }
  };
  walk(rootId);
  return result;
}

/** Whether a subfolder can be created under this folder (depth < max). */
export function canAddSubfolderUnder(
  parent: ResourceFolder,
  folders: ResourceFolder[]
): boolean {
  const byId = new Map(folders.map((f) => [f.id, f]));
  return folderDepth(parent, byId) < RESOURCE_MAX_DEPTH;
}

/** Height of subtree rooted at folderId (folder itself = 1). */
export function folderSubtreeHeight(folderId: string, folders: ResourceFolder[]): number {
  const children = folders.filter((f) => f.parentId === folderId);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((c) => folderSubtreeHeight(c.id, folders)));
}

/** Whether folderId can be placed under newParentId (null = become root). */
export function canMoveFolderUnder(
  folderId: string,
  newParentId: string | null,
  folders: ResourceFolder[]
): boolean {
  if (newParentId === folderId) return false;
  const descendants = collectDescendantFolderIds(folderId, folders);
  if (newParentId && descendants.includes(newParentId)) return false;

  const byId = new Map(folders.map((f) => [f.id, f]));
  if (newParentId) {
    const parent = byId.get(newParentId);
    if (!parent) return false;
  }

  const parentDepth = newParentId ? folderDepth(byId.get(newParentId)!, byId) : 0;
  const movedDepth = parentDepth + 1;
  const height = folderSubtreeHeight(folderId, folders);
  return movedDepth + height - 1 <= RESOURCE_MAX_DEPTH;
}

/** Parents a folder may be moved under (excludes self and descendants). */
export function listEligibleParentsForMove(
  folderId: string,
  folders: ResourceFolder[]
): ResourceFolder[] {
  return folders
    .filter((f) => canMoveFolderUnder(folderId, f.id, folders))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function folderPathLabel(
  folder: ResourceFolder,
  byId: Map<string, ResourceFolder>
): string {
  const parts: string[] = [folder.name];
  let parentId = folder.parentId;
  const seen = new Set<string>();
  while (parentId) {
    if (seen.has(parentId)) break;
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    parts.unshift(parent.name);
    parentId = parent.parentId;
  }
  return parts.join(' / ');
}

export function openResourceUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
