import React from 'react';
import { CircularProgress } from '@mui/material';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

export type ConfirmDialogVariant = 'danger' | 'default';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  warningMessage?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  warningMessage,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  loading = false,
  onConfirm,
  onClose,
}) => {
  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" />

      <div className="relative w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
        <div className="flex items-start gap-3">
          {isDanger && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2
              id="confirm-dialog-title"
              className="text-base font-semibold text-slate-900"
            >
              {title}
            </h2>
            <p id="confirm-dialog-message" className="mt-2 text-sm leading-relaxed text-slate-600">
              {message}
            </p>
            {warningMessage && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {warningMessage}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel ?? t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading}
            className={`inline-flex min-w-[7rem] items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-brand-600 hover:bg-brand-700'
            }`}
          >
            {loading ? (
              <CircularProgress size={16} thickness={5} sx={{ color: 'inherit' }} aria-hidden="true" />
            ) : (
              confirmLabel ?? (isDanger ? t.common.delete : t.common.confirm)
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
