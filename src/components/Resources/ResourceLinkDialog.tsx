import React, { useEffect, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { ResourceFolder, ResourceLink, ResourceLinkKind } from '../../types';
import { t } from '../../utils/translations';
import { LinkInput } from '../../hooks/useResources';
import { inferResourceLinkKind } from './resourcesUtils';

interface ResourceLinkDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: ResourceLink | null;
  defaultFolderId?: string | null;
  folders: ResourceFolder[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (input: LinkInput) => Promise<void>;
}

const ResourceLinkDialog: React.FC<ResourceLinkDialogProps> = ({
  open,
  mode,
  initial,
  defaultFolderId = null,
  folders,
  saving = false,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [folderId, setFolderId] = useState('');
  const [kind, setKind] = useState<ResourceLinkKind>('other');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setUrl(initial.url);
      setFolderId(initial.folderId);
      setKind(initial.kind);
    } else {
      setTitle('');
      setUrl('');
      setFolderId(defaultFolderId ?? folders[0]?.id ?? '');
      setKind('other');
    }
    setError(null);
  }, [open, initial, defaultFolderId, folders]);

  if (!open) return null;

  const handleUrlBlur = () => {
    if (!initial || kind === 'other') {
      setKind(inferResourceLinkKind(url));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await onSubmit({
        folderId,
        title,
        url,
        kind: kind || inferResourceLinkKind(url),
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
        <h2 className="text-base font-semibold text-slate-900">
          {mode === 'edit' ? t.resources.editLink : t.resources.addLink}
        </h2>
        <p className="mt-1 text-xs text-slate-500">{t.resources.linkOpensExternal}</p>

        <label className="mt-4 block text-sm font-medium text-slate-800">
          {t.resources.linkTitle}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            required
            autoFocus
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-slate-800">
          {t.resources.linkUrl}
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder="https://docs.google.com/..."
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            required
          />
        </label>

        <label className="mt-3 block text-sm font-medium text-slate-800">
          {t.resources.folder}
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            required
          >
            {folders.length === 0 && <option value="">{t.resources.noFoldersYet}</option>}
            {folders.map((f) => {
              const parent = f.parentId ? folders.find((p) => p.id === f.parentId) : null;
              const label = parent ? `${parent.name} / ${f.name}` : f.name;
              return (
                <option key={f.id} value={f.id}>
                  {label}
                </option>
              );
            })}
          </select>
        </label>

        <label className="mt-3 block text-sm font-medium text-slate-800">
          {t.resources.linkKind}
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as ResourceLinkKind)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            <option value="doc">{t.resources.kindDoc}</option>
            <option value="sheet">{t.resources.kindSheet}</option>
            <option value="powerpoint">{t.resources.kindPowerpoint}</option>
            <option value="pdf">{t.resources.kindPdf}</option>
            <option value="audio">{t.resources.kindAudio}</option>
            <option value="video">{t.resources.kindVideo}</option>
            <option value="other">{t.resources.kindOther}</option>
          </select>
        </label>

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
            disabled={saving || !folderId}
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

export default ResourceLinkDialog;
