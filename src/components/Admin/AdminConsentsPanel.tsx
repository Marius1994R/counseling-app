import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, CircularProgress, Snackbar } from '@mui/material';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  collection,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../utils/translations';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  deleteCaseConsent,
  getConsentDownloadUrl,
  replaceCaseConsent,
  validateConsentFile,
  CONSENT_ALLOWED_TYPES,
} from '../../utils/consentUpload';

export interface CaseConsentRecord {
  id: string;
  caseId: string;
  caseTitle: string;
  counseledName: string;
  assignedCounselorName: string | null;
  storagePath: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: Date;
  uploadedBy: string;
  uploadedByName: string;
}

const AdminConsentsPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<CaseConsentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CaseConsentRecord | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<CaseConsentRecord | null>(null);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const loadConsents = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'caseConsents'));
      const rows: CaseConsentRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        rows.push({
          id: docSnap.id,
          caseId: data.caseId || docSnap.id,
          caseTitle: data.caseTitle || '',
          counseledName: data.counseledName || '',
          assignedCounselorName: data.assignedCounselorName ?? null,
          storagePath: data.storagePath || '',
          fileName: data.fileName || 'consent',
          contentType: data.contentType || '',
          sizeBytes: data.sizeBytes || 0,
          uploadedAt: data.uploadedAt?.toDate?.() ?? new Date(),
          uploadedBy: data.uploadedBy || '',
          uploadedByName: data.uploadedByName || '',
        });
      });
      rows.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      setItems(rows);
    } catch (err) {
      console.error('Error loading consents:', err);
      setSnackbar({
        open: true,
        message: t.admin.consents.loadError,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConsents();
  }, [loadConsents]);

  const handleDownload = async (item: CaseConsentRecord) => {
    if (downloadingId) return;
    try {
      setDownloadingId(item.id);
      const url = await getConsentDownloadUrl(item.storagePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Download failed:', err);
      setSnackbar({
        open: true,
        message: t.admin.consents.downloadError,
        severity: 'error',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || actionLoading) return;
    try {
      setActionLoading(true);
      await deleteCaseConsent(deleteTarget.caseId);
      setDeleteTarget(null);
      setSnackbar({
        open: true,
        message: t.admin.consents.deleteSuccess,
        severity: 'success',
      });
      await loadConsents();
    } catch (err) {
      console.error('Delete consent failed:', err);
      setSnackbar({
        open: true,
        message: t.admin.consents.loadError,
        severity: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const startReplace = (item: CaseConsentRecord) => {
    setReplaceTarget(item);
    setPendingReplaceFile(null);
    fileInputRef.current?.click();
  };

  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !replaceTarget) {
      setReplaceTarget(null);
      return;
    }
    const error = validateConsentFile(file);
    if (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
      setReplaceTarget(null);
      return;
    }
    setPendingReplaceFile(file);
  };

  const handleReplaceConfirm = async () => {
    if (!replaceTarget || !pendingReplaceFile || !currentUser?.id || actionLoading) {
      return;
    }
    try {
      setActionLoading(true);
      await replaceCaseConsent({
        caseItem: {
          id: replaceTarget.caseId,
          title: replaceTarget.caseTitle,
          counseledName: replaceTarget.counseledName,
          assignedCounselorName: replaceTarget.assignedCounselorName || undefined,
          age: 0,
          civilStatus: 'unmarried',
          issueTypes: [],
          phoneNumber: '',
          description: '',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: '',
        },
        file: pendingReplaceFile,
        userId: currentUser.id,
        userName: currentUser.fullName || '',
      });
      setReplaceTarget(null);
      setPendingReplaceFile(null);
      setSnackbar({
        open: true,
        message: t.admin.consents.replaceSuccess,
        severity: 'success',
      });
      await loadConsents();
    } catch (err) {
      console.error('Replace consent failed:', err);
      setSnackbar({
        open: true,
        message:
          err instanceof Error ? err.message : t.admin.consents.loadError,
        severity: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">{t.admin.consents.title}</h2>
        <p className="mt-1 text-sm text-slate-500">{t.admin.consents.subtitle}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={CONSENT_ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={handleReplaceFileChange}
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress size={32} sx={{ color: '#C99700' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          {t.admin.consents.empty}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    {t.admin.consents.personLabel}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    {t.admin.consents.caseLabel}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    {t.admin.consents.uploadedBy}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    {t.admin.consents.uploadedAt}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    {t.admin.consents.fileLabel}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    {t.common.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 text-slate-900">{item.counseledName}</td>
                    <td className="px-4 py-3 text-slate-600">{item.caseTitle}</td>
                    <td className="px-4 py-3 text-slate-600">{item.uploadedByName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.uploadedAt.toLocaleDateString('ro-RO')}
                    </td>
                    <td className="max-w-[10rem] truncate px-4 py-3 text-slate-600">
                      {item.fileName}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDownload(item)}
                          disabled={downloadingId === item.id}
                          aria-busy={downloadingId === item.id}
                          className="inline-flex min-w-[6.5rem] items-center justify-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
                        >
                          {downloadingId === item.id ? (
                            <CircularProgress size={14} thickness={5} sx={{ color: '#64748B' }} />
                          ) : (
                            <>
                              <ArrowDownTrayIcon className="h-4 w-4" />
                              {t.admin.consents.download}
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => startReplace(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <ArrowPathIcon className="h-4 w-4" />
                          {t.admin.consents.replace}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                          {t.admin.consents.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t.admin.consents.deleteConfirmTitle}
        message={t.admin.consents.deleteConfirmMessage.replace(
          '{name}',
          deleteTarget?.counseledName || ''
        )}
        variant="danger"
        confirmLabel={t.admin.consents.delete}
        loading={actionLoading}
        onClose={() => {
          if (!actionLoading) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={pendingReplaceFile !== null && replaceTarget !== null}
        title={t.admin.consents.replaceConfirmTitle}
        message={t.admin.consents.replaceConfirmMessage}
        warningMessage={t.cases.consentConfirmWarning}
        variant="default"
        confirmLabel={t.cases.consentUploadAction}
        loading={actionLoading}
        onClose={() => {
          if (!actionLoading) {
            setPendingReplaceFile(null);
            setReplaceTarget(null);
          }
        }}
        onConfirm={handleReplaceConfirm}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AdminConsentsPanel;
