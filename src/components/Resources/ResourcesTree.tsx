import React from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  TableCellsIcon,
  LinkIcon,
  PencilSquareIcon,
  TrashIcon,
  FolderIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { ResourceFolder, ResourceLink } from '../../types';
import { RESOURCE_MAX_DEPTH, ResourceTreeNode, folderIconClass, openResourceUrl } from './resourcesUtils';
import { t } from '../../utils/translations';

interface ResourcesTreeProps {
  tree: ResourceTreeNode[];
  canManage: boolean;
  expandedIds: Set<string>;
  onToggleExpanded: (folderId: string) => void;
  onAddSubfolder: (parent: ResourceFolder) => void;
  onAddLink: (folder: ResourceFolder) => void;
  onEditFolder: (folder: ResourceFolder) => void;
  onDeleteFolder: (folder: ResourceFolder) => void;
  onEditLink: (link: ResourceLink) => void;
  onDeleteLink: (link: ResourceLink) => void;
}

function KindIcon({ kind }: { kind: ResourceLink['kind'] }) {
  if (kind === 'sheet') {
    return <TableCellsIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  }
  if (kind === 'doc') {
    return <DocumentTextIcon className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />;
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

const FolderNode: React.FC<{
  node: ResourceTreeNode;
  depth: number;
  canManage: boolean;
  expandedIds: Set<string>;
  onToggleExpanded: (folderId: string) => void;
  onAddSubfolder: (parent: ResourceFolder) => void;
  onAddLink: (folder: ResourceFolder) => void;
  onEditFolder: (folder: ResourceFolder) => void;
  onDeleteFolder: (folder: ResourceFolder) => void;
  onEditLink: (link: ResourceLink) => void;
  onDeleteLink: (link: ResourceLink) => void;
}> = ({
  node,
  depth,
  canManage,
  expandedIds,
  onToggleExpanded,
  onAddSubfolder,
  onAddLink,
  onEditFolder,
  onDeleteFolder,
  onEditLink,
  onDeleteLink,
}) => {
  const { folder, children, links } = node;
  const open = expandedIds.has(folder.id);
  const canHaveSubfolder = depth + 1 < RESOURCE_MAX_DEPTH;

  const toggle = () => onToggleExpanded(folder.id);

  return (
    <div className={depth === 0 ? 'rounded-xl border border-slate-200 bg-white shadow-sm' : ''}>
      <div
        className={`flex items-start gap-2 px-3 py-3 sm:px-4 ${
          depth > 0 ? 'border-t border-slate-100' : ''
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
        <div className={depth === 0 ? 'pb-2' : ''}>
          {links.map((link) => (
            <div
              key={link.id}
              className="group flex items-center gap-2 border-t border-slate-50 px-3 py-2.5 hover:bg-slate-50 sm:px-4"
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
          ))}

          {children.map((child) => (
            <div key={child.folder.id} style={{ paddingLeft: '0.75rem' }}>
              <FolderNode
                node={child}
                depth={depth + 1}
                canManage={canManage}
                expandedIds={expandedIds}
                onToggleExpanded={onToggleExpanded}
                onAddSubfolder={onAddSubfolder}
                onAddLink={onAddLink}
                onEditFolder={onEditFolder}
                onDeleteFolder={onDeleteFolder}
                onEditLink={onEditLink}
                onDeleteLink={onDeleteLink}
              />
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
  onAddSubfolder,
  onAddLink,
  onEditFolder,
  onDeleteFolder,
  onEditLink,
  onDeleteLink,
}) => (
  <div className="space-y-3">
    {tree.map((node) => (
      <FolderNode
        key={node.folder.id}
        node={node}
        depth={0}
        canManage={canManage}
        expandedIds={expandedIds}
        onToggleExpanded={onToggleExpanded}
        onAddSubfolder={onAddSubfolder}
        onAddLink={onAddLink}
        onEditFolder={onEditFolder}
        onDeleteFolder={onDeleteFolder}
        onEditLink={onEditLink}
        onDeleteLink={onDeleteLink}
      />
    ))}
  </div>
);

export default ResourcesTree;
