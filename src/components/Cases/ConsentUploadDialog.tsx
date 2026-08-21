import React, { useEffect, useRef, useState } from 'react';
import { CircularProgress } from '@mui/material';
import { DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Case } from '../../types';
import { logConsentUploaded } from '../../utils/activityLogger';
import {
  CONSENT_ALLOWED_TYPES,
  uploadCaseConsent,
  validateConsentFile,
} from '../../utils/consentUpload';
import { t } from '../../utils/translations';
import ConfirmDialog from '../common/ConfirmDialog';

interface ConsentUploadDialogProps {
  open: boolean;
  caseItem: Case | null;
  onClose: () => void;
  onUploaded?: (caseItem: Case) => void;
}

const ConsentUploadDialog: React.FC<ConsentUploadDialogProps> = ({
  open,
  caseItem,
  onClose,
  onUploaded,
}) => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setPendingFile(null);
      setConfirmOpen(false);
      setUploadLoading(false);
      setError('');
    }
  }, [open, caseItem?.id]);

  if (!open || !caseItem) return null;

  const handleClose = () => {
    if (uploadLoading) return;
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validationError = validateConsentFile(file);
    if (validationError) {
      setError(validationError);
      setPendingFile(null);
      return;
    }
    setError('');
    setPendingFile(file);
  };

  const handleConfirm = async () => {
    if (!pendingFile || !currentUser?.id || uploadLoading) return;
    try {
      setUploadLoading(true);
      await uploadCaseConsent({
        caseItem,
        file: pendingFile,
        userId: currentUser.id,
        userName: currentUser.fullName || '',
      });
      await logConsentUploaded(
        caseItem.id,
        caseItem.title,
        currentUser.id,
        currentUser.fullName || ''
      );
      setConfirmOpen(false);
      onUploaded?.(caseItem);
      onClose();
    } catch (err) {
      console.error('Consent upload failed:', err);
      setError(
        err instanceof Error ? err.message : t.cases.consentUploadError
      );
      setConfirmOpen(false);
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[1400] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-upload-title"
      >
        <div
          className="absolute inset-0 bg-slate-900/40"
          aria-hidden="true"
          onClick={handleClose}
        />
        <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <h2
              id="consent-upload-title"
              className="text-base font-semibold text-slate-900"
            >
              {t.cases.consentMissingTitle}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {caseItem.counseledName} · {caseItem.title}
            </p>
          </div>

          <div className="space-y-3 px-4 py-4 sm:px-5">
            <p className="text-sm text-slate-600">{t.cases.consentMissingBody}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept={CONSENT_ALLOWED_TYPES.join(',')}
              className="hidden"
              onChange={handleFileChange}
            />

            {pendingFile ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                <span className="font-medium">{t.cases.consentSelectedFile}:</span>{' '}
                {pendingFile.name}
              </div>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploadLoading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <DocumentArrowUpIcon className="h-4 w-4" />
                {pendingFile
                  ? t.cases.consentChangeFile
                  : t.cases.consentUploadAction}
              </button>
              {pendingFile ? (
                <button
                  type="button"
                  disabled={uploadLoading}
                  onClick={() => setConfirmOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {uploadLoading && (
                    <CircularProgress size={14} color="inherit" />
                  )}
                  {t.cases.consentUploadAction}
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 px-4 py-3 sm:px-5">
            <button
              type="button"
              disabled={uploadLoading}
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t.cases.consentConfirmTitle}
        message={t.cases.consentConfirmMessage}
        warningMessage={t.cases.consentConfirmWarning}
        confirmLabel={t.cases.consentUploadAction}
        loading={uploadLoading}
        onClose={() => {
          if (!uploadLoading) setConfirmOpen(false);
        }}
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default ConsentUploadDialog;
