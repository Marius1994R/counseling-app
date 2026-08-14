import React, { useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { ResourceFolder, ResourceFolderColor } from '../../types';
import { t } from '../../utils/translations';
import { FolderInput } from '../../hooks/useResources';
import {
  RESOURCE_FOLDER_COLORS,
  folderPathLabel,
  listEligibleParentsForMove,
} from './resourcesUtils';

interface ResourceFolderDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ResourceFolder | null;
  /** When set, creates a subfolder under this parent (locked). */
  defaultParentId?: string | null;
  /** Display name for locked parent (subfolder create). */
  parentLabel?: string | null;
  /** All folders — used to build move-target options when editing a subfolder. */
  allFolders?: ResourceFolder[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (input: FolderInput) => Promise<void>;
}

const ResourceFolderDialog: React.FC<ResourceFolderDialogProps> = ({
  open,
  mode,
  initial,
  defaultParentId = null,
  parentLabel = null,
  allFolders = [],
  saving = false,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [allowCounselors, setAllowCounselors] = useState(true);
  const [allowAdmins, setAllowAdmins] = useState(true);
  const [color, setColor] = useState<ResourceFolderColor>('brand');
  const [error, setError] = useState<string | null>(null);

  const isSubfolderCreate = mode === 'create' && Boolean(defaultParentId);
  const isEditingSubfolder = mode === 'edit' && Boolean(initial?.parentId);

  const moveTargets = useMemo(() => {
    if (!initial || !isEditingSubfolder) return [];
    return listEligibleParentsForMove(initial.id, allFolders);
  }, [initial, isEditingSubfolder, allFolders]);

  const folderById = useMemo(
    () => new Map(allFolders.map((f) => [f.id, f])),
    [allFolders]
  );

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setParentId(initial.parentId ?? '');
      setAllowCounselors(initial.allowCounselors);
      setAllowAdmins(initial.allowAdmins);
      setColor(initial.color || 'brand');
    } else {
      setName('');
      setParentId(defaultParentId ?? '');
      setAllowCounselors(true);
      setAllowAdmins(true);
      setColor('brand');
    }
    setError(null);
  }, [open, initial, defaultParentId]);

  if (!open) return null;

  const title =
    mode === 'edit'
      ? isEditingSubfolder
        ? t.resources.editSubfolder
        : t.resources.editFolder
      : isSubfolderCreate
        ? t.resources.addSubfolder
        : t.resources.addFolder;

  const nameLabel =
    isSubfolderCreate || isEditingSubfolder
      ? t.resources.subfolderName
      : t.resources.folderName;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const resolvedParentId = isSubfolderCreate
        ? defaultParentId
        : isEditingSubfolder
          ? parentId || null
          : mode === 'edit'
            ? initial?.parentId ?? null
            : null;

      await onSubmit({
        name,
        parentId: resolvedParentId,
        allowAdmins,
        allowCounselors,
        color,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.resources.saveError);
    }
  };

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" onClick={saving ? undefined : onClose} />
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6"
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>

        <label className="mt-4 block text-sm font-medium text-slate-800">
          {nameLabel}
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            required
            autoFocus
          />
        </label>

        {isSubfolderCreate && (
          <div className="mt-3">
            <p className="text-sm font-medium text-slate-800">{t.resources.parentFolder}</p>
            <p className="mt-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {parentLabel || t.resources.rootFolder}
            </p>
          </div>
        )}

        {isEditingSubfolder && (
          <label className="mt-3 block text-sm font-medium text-slate-800">
            {t.resources.parentFolder}
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              required
            >
              {moveTargets.map((f) => (
                <option key={f.id} value={f.id}>
                  {folderPathLabel(f, folderById)}
                </option>
              ))}
            </select>
          </label>
        )}

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-slate-800">{t.resources.folderColor}</legend>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label={t.resources.folderColor}>
            {RESOURCE_FOLDER_COLORS.map((option) => {
              const selected = color === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={option.id}
                  onClick={() => setColor(option.id)}
                  className={`h-8 w-8 rounded-full ${option.swatchClass} transition ring-offset-2 ${
                    selected ? 'ring-2 ring-slate-900' : 'ring-1 ring-black/10 hover:ring-slate-400'
                  }`}
                />
              );
            })}
          </div>
        </fieldset>

        <div className="mt-4 space-y-2">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allowCounselors}
              onChange={(e) => setAllowCounselors(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>{t.resources.allowCounselors}</span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allowAdmins}
              onChange={(e) => setAllowAdmins(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>{t.resources.allowAdmins}</span>
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="submit"
            disabled={saving || (isEditingSubfolder && !parentId)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving && <CircularProgress size={14} color="inherit" />}
            {t.common.save}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResourceFolderDialog;
