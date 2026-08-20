import React, { useCallback, useRef, useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  DocumentIcon,
  TableCellsIcon,
  PresentationChartBarIcon,
  MusicalNoteIcon,
  VideoCameraIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
  FolderIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { ResourceFolder, ResourceLink } from '../../types';
import { RESOURCE_MAX_DEPTH, ResourceTreeNode, folderIconClass, openResourceUrl } from './resourcesUtils';
import { t } from '../../utils/translations';

const LINK_DRAG_MIME = 'application/x-resource-link';

interface ResourcesTreeProps {
  tree: ResourceTreeNode[];
  canManage: boolean;
  expandedIds: Set<string>;
  onToggleExpanded: (folderId: string) => void;
  onEnsureExpanded?: (folderId: string) => void;
  onAddSubfolder: (parent: ResourceFolder) => void;
  onAddLink: (folder: ResourceFolder) => void;
  onEditFolder: (folder: ResourceFolder) => void;
  onDeleteFolder: (folder: ResourceFolder) => void;
  onEditLink: (link: ResourceLink) => void;
  onDeleteLink: (link: ResourceLink) => void;
  onMoveLink?: (linkId: string, targetFolderId: string) => Promise<void>;
}

function KindIcon({ kind }: { kind: ResourceLink['kind'] }) {
  if (kind === 'sheet') {
    return <TableCellsIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  }
  if (kind === 'doc') {
    return <DocumentTextIcon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />;
  }
  if (kind === 'powerpoint') {
    return <PresentationChartBarIcon className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />;
  }
  if (kind === 'pdf') {
    return <DocumentIcon className="h-4 w-4 shrink-0 text-red-600" aria-hidden />;
  }
  if (kind === 'audio') {
    return <MusicalNoteIcon className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />;
  }
  if (kind === 'video') {
    return <VideoCameraIcon className="h-4 w-4 shrink-0 text-rose-600" aria-hidden />;
  }
  return <LinkIcon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />;
}

function VisibilityChips({ folder }: { folder: ResourceFolder }) {
  const chips: string[] = [];
  if (folder.allowCounselors) chips.push(t.resources.chipCounselors);
  if (folder.allowAdmins) chips.push(t.resources.chipAdmins);
  if (!folder.allowCounselors && !folder.allowAdmins) chips.push(t.resources.chipLeadersOnly);
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map((label) => (
        <span
          key={label}
          className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600"
        >
          {label}
        </span>
      ))}
    </span>
  );
}

type FolderNodeProps = {
  node: ResourceTreeNode;
  depth: number;
  canManage: boolean;
  expandedIds: Set<string>;
  dragOverFolderId: string | null;
  draggingLinkId: string | null;
  onToggleExpanded: (folderId: string) => void;
  onAddSubfolder: (parent: ResourceFolder) => void;
  onAddLink: (folder: ResourceFolder) => void;
  onEditFolder: (folder: ResourceFolder) => void;
  onDeleteFolder: (folder: ResourceFolder) => void;
  onEditLink: (link: ResourceLink) => void;
  onDeleteLink: (link: ResourceLink) => void;
  onLinkDragStart: (link: ResourceLink, e: React.DragEvent) => void;
  onLinkDragEnd: () => void;
  onFolderDragOver: (folder: ResourceFolder, e: React.DragEvent) => void;
  onFolderDragLeave: (folderId: string, e: React.DragEvent) => void;
  onFolderDrop: (folder: ResourceFolder, e: React.DragEvent) => void;
};

const FolderNode: React.FC<FolderNodeProps> = ({
  node,
  depth,
  canManage,
  expandedIds,
  dragOverFolderId,
  draggingLinkId,
  onToggleExpanded,
  onAddSubfolder,
  onAddLink,
  onEditFolder,
  onDeleteFolder,
  onEditLink,
  onDeleteLink,
  onLinkDragStart,
  onLinkDragEnd,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
}) => {
  const { folder, children, links } = node;
  const open = expandedIds.has(folder.id);
  const canHaveSubfolder = depth + 1 < RESOURCE_MAX_DEPTH;
  const isDropTarget = dragOverFolderId === folder.id;
  const childProps = {
    canManage,
    expandedIds,
    dragOverFolderId,
    draggingLinkId,
    onToggleExpanded,
    onAddSubfolder,
    onAddLink,
    onEditFolder,
    onDeleteFolder,
    onEditLink,
    onDeleteLink,
    onLinkDragStart,
    onLinkDragEnd,
    onFolderDragOver,
    onFolderDragLeave,
    onFolderDrop,
  };

  const toggle = () => onToggleExpanded(folder.id);

  return (
    <div className={depth === 0 ? 'rounded-xl border border-slate-200 bg-white shadow-sm' : ''}>
      <div
        onDragOver={canManage ? (e) => onFolderDragOver(folder, e) : undefined}
        onDragLeave={canManage ? (e) => onFolderDragLeave(folder.id, e) : undefined}
        onDrop={canManage ? (e) => onFolderDrop(folder, e) : undefined}
        className={`flex items-start gap-2 px-3 py-3 transition-colors sm:px-4 ${
          depth > 0 ? 'border-t border-slate-100' : ''
        } ${
          isDropTarget
            ? 'bg-brand-50 ring-2 ring-inset ring-brand-400'
            : ''
        }`}
      >
        <button
          type="button"
          onClick={toggle}
          className="mt-0.5 rounded p-0.5 text-slate-500 hover:bg-slate-100"
          aria-expanded={open}
          aria-label={open ? t.resources.collapse : t.resources.expand}
        >
          {open ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        </button>
        <FolderIcon className={`mt-0.5 h-5 w-5 shrink-0 ${folderIconClass(folder.color)}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="text-left text-sm font-semibold text-slate-900"
            >
              {folder.name}
            </button>
            {canManage && <VisibilityChips folder={folder} />}
            {isDropTarget && (
              <span className="text-[11px] font-medium text-brand-700">
                {t.resources.dropLinkHere}
              </span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-0.5">
            {canHaveSubfolder && (
              <button
                type="button"
                title={t.resources.addSubfolder}
                onClick={() => onAddSubfolder(folder)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <PlusIcon className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              title={t.resources.addLink}
              onClick={() => onAddLink(folder)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={t.common.edit}
              onClick={() => onEditFolder(folder)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              title={t.common.delete}
              onClick={() => onDeleteFolder(folder)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {open && (
        <div
          className={depth === 0 ? 'pb-2' : ''}
          onDragOver={canManage ? (e) => onFolderDragOver(folder, e) : undefined}
          onDragLeave={canManage ? (e) => onFolderDragLeave(folder.id, e) : undefined}
          onDrop={canManage ? (e) => onFolderDrop(folder, e) : undefined}
        >
          {links.map((link) => {
            const isDragging = draggingLinkId === link.id;
            return (
              <div
                key={link.id}
                draggable={canManage}
                onDragStart={canManage ? (e) => onLinkDragStart(link, e) : undefined}
                onDragEnd={canManage ? onLinkDragEnd : undefined}
                title={canManage ? t.resources.dragLinkHint : undefined}
                className={`group flex items-center gap-2 border-t border-slate-50 px-3 py-2.5 hover:bg-slate-50 sm:px-4 ${
                  canManage ? 'cursor-grab active:cursor-grabbing' : ''
                } ${isDragging ? 'opacity-40' : ''}`}
                style={{ paddingLeft: `${1.75 + (depth + 1) * 0.75}rem` }}
              >
                <KindIcon kind={link.kind} />
                <button
                  type="button"
                  onClick={() => openResourceUrl(link.url)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800 hover:text-brand-700"
                  title={t.resources.openInGoogle}
                >
                  {link.title}
                </button>
                {canManage && (
                  <div className="flex shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      title={t.common.edit}
                      onClick={() => onEditLink(link)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title={t.common.delete}
                      onClick={() => onDeleteLink(link)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {children.map((child) => (
            <div key={child.folder.id} style={{ paddingLeft: '0.75rem' }}>
              <FolderNode node={child} depth={depth + 1} {...childProps} />
            </div>
          ))}

          {links.length === 0 && children.length === 0 && (
            <p
              className="border-t border-slate-50 px-4 py-3 text-xs text-slate-400"
              style={{ paddingLeft: `${1.75 + (depth + 1) * 0.75}rem` }}
            >
              {t.resources.emptyFolder}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const ResourcesTree: React.FC<ResourcesTreeProps> = ({
  tree,
  canManage,
  expandedIds,
  onToggleExpanded,
  onEnsureExpanded,
  onAddSubfolder,
  onAddLink,
  onEditFolder,
  onDeleteFolder,
  onEditLink,
  onDeleteLink,
  onMoveLink,
}) => {
  const [draggingLinkId, setDraggingLinkId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const expandTimerRef = useRef<number | null>(null);

  const clearExpandTimer = useCallback(() => {
    if (expandTimerRef.current != null) {
      window.clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  }, []);

  const handleLinkDragStart = useCallback((link: ResourceLink, e: React.DragEvent) => {
    e.dataTransfer.setData(LINK_DRAG_MIME, link.id);
    e.dataTransfer.setData('text/plain', link.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingLinkId(link.id);
  }, []);

  const handleLinkDragEnd = useCallback(() => {
    clearExpandTimer();
    setDraggingLinkId(null);
    setDragOverFolderId(null);
  }, [clearExpandTimer]);

  const handleFolderDragOver = useCallback(
    (folder: ResourceFolder, e: React.DragEvent) => {
      if (!canManage || !onMoveLink) return;
      const types = Array.from(e.dataTransfer.types);
      if (!types.includes(LINK_DRAG_MIME) && !types.includes('text/plain')) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'move';
      setDragOverFolderId(folder.id);

      if (!expandedIds.has(folder.id) && onEnsureExpanded) {
        clearExpandTimer();
        expandTimerRef.current = window.setTimeout(() => {
          onEnsureExpanded(folder.id);
        }, 450);
      }
    },
    [canManage, onMoveLink, expandedIds, onEnsureExpanded, clearExpandTimer]
  );

  const handleFolderDragLeave = useCallback((folderId: string, e: React.DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    clearExpandTimer();
    setDragOverFolderId((current) => (current === folderId ? null : current));
  }, [clearExpandTimer]);

  const handleFolderDrop = useCallback(
    (folder: ResourceFolder, e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      clearExpandTimer();
      setDragOverFolderId(null);
      const linkId =
        e.dataTransfer.getData(LINK_DRAG_MIME) || e.dataTransfer.getData('text/plain');
      setDraggingLinkId(null);
      if (!linkId || !onMoveLink) return;
      void onMoveLink(linkId, folder.id).catch((err) => {
        console.error('Failed to move resource link:', err);
      });
    },
    [clearExpandTimer, onMoveLink]
  );

  const nodeProps = {
    canManage,
    expandedIds,
    dragOverFolderId,
    draggingLinkId,
    onToggleExpanded,
    onAddSubfolder,
    onAddLink,
    onEditFolder,
    onDeleteFolder,
    onEditLink,
    onDeleteLink,
    onLinkDragStart: handleLinkDragStart,
    onLinkDragEnd: handleLinkDragEnd,
    onFolderDragOver: handleFolderDragOver,
    onFolderDragLeave: handleFolderDragLeave,
    onFolderDrop: handleFolderDrop,
  };

  return (
    <div className="space-y-3">
      {canManage && (
        <p className="text-xs text-slate-500">{t.resources.dragLinkHint}</p>
      )}
      {tree.map((node) => (
        <FolderNode key={node.folder.id} node={node} depth={0} {...nodeProps} />
      ))}
    </div>
  );
};

export default ResourcesTree;
