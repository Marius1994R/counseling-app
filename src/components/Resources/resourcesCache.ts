import { ResourceFolder, ResourceLink } from '../../types';
import { coerceDate, normalizeFolderColor } from './resourcesUtils';

export const RESOURCES_CACHE_KEY = 'resourcesCache:v1';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export interface ResourcesCachePayload {
  revision: number;
  folders: ResourceFolder[];
  links: ResourceLink[];
  savedAt: number;
}

function serializeFolder(folder: ResourceFolder) {
  return {
    ...folder,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  };
}

function serializeLink(link: ResourceLink) {
  return {
    ...link,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

function reviveFolder(raw: Record<string, unknown>): ResourceFolder | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    name: raw.name,
    parentId: raw.parentId == null || raw.parentId === '' ? null : String(raw.parentId),
    allowAdmins: Boolean(raw.allowAdmins),
    allowCounselors: Boolean(raw.allowCounselors),
    color: normalizeFolderColor(raw.color),
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
    createdBy: String(raw.createdBy || ''),
    createdAt: coerceDate(raw.createdAt),
    updatedAt: coerceDate(raw.updatedAt),
  };
}

function reviveLink(raw: Record<string, unknown>): ResourceLink | null {
  if (!raw || typeof raw.id !== 'string' || typeof raw.url !== 'string') return null;
  const kind = raw.kind;
  return {
    id: raw.id,
    folderId: String(raw.folderId || ''),
    title: String(raw.title || ''),
    url: String(raw.url),
    kind:
      kind === 'doc' ||
      kind === 'sheet' ||
      kind === 'powerpoint' ||
      kind === 'pdf' ||
      kind === 'audio' ||
      kind === 'video' ||
      kind === 'other'
        ? kind
        : 'other',
    sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
    createdBy: String(raw.createdBy || ''),
    createdAt: coerceDate(raw.createdAt),
    updatedAt: coerceDate(raw.updatedAt),
  };
}

export function loadResourcesCache(): ResourcesCachePayload | null {
  try {
    const raw = localStorage.getItem(RESOURCES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      revision?: unknown;
      folders?: unknown[];
      links?: unknown[];
      savedAt?: unknown;
    };
    if (typeof parsed.revision !== 'number' || typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) return null;
    if (!Array.isArray(parsed.folders) || !Array.isArray(parsed.links)) return null;

    const folders = parsed.folders
      .map((f) => reviveFolder(f as Record<string, unknown>))
      .filter((f): f is ResourceFolder => f != null);
    const links = parsed.links
      .map((l) => reviveLink(l as Record<string, unknown>))
      .filter((l): l is ResourceLink => l != null);

    return {
      revision: parsed.revision,
      folders,
      links,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function saveResourcesCache(
  revision: number,
  folders: ResourceFolder[],
  links: ResourceLink[]
): void {
  try {
    const payload = {
      revision,
      folders: folders.map(serializeFolder),
      links: links.map(serializeLink),
      savedAt: Date.now(),
    };
    localStorage.setItem(RESOURCES_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore
  }
}

export function clearResourcesCache(): void {
  try {
    localStorage.removeItem(RESOURCES_CACHE_KEY);
    localStorage.removeItem(RESOURCES_EXPANDED_KEY);
  } catch {
    // ignore
  }
}

export const RESOURCES_EXPANDED_KEY = 'resourcesExpanded:v1';

export function loadExpandedFolderIds(): string[] {
  try {
    const raw = localStorage.getItem(RESOURCES_EXPANDED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
}

export function saveExpandedFolderIds(ids: string[]): void {
  try {
    localStorage.setItem(RESOURCES_EXPANDED_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function clearExpandedFolderIds(): void {
  try {
    localStorage.removeItem(RESOURCES_EXPANDED_KEY);
  } catch {
    // ignore
  }
}
