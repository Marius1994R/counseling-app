import React, { useRef, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import {
  UserIcon,
  IdentificationIcon,
  PhoneIcon,
  CalendarDaysIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  ClockIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { Appointment, Case } from '../../types';
import { t } from '../../utils/translations';
import ConfirmDialog from '../common/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { logConsentUploaded } from '../../utils/activityLogger';
import {
  CONSENT_ALLOWED_TYPES,
  uploadCaseConsent,
  validateConsentFile,
} from '../../utils/consentUpload';
import { formatNextAppointmentChipLabel } from '../Dashboard/dashboardUtils';
import {
  getCaseDisplayId,
  getInitials,
  getStatusLabel,
  getStatusBadgeClass,
  getAvatarColorClass,
  translateSex,
  translateCivilStatus,
  translateIssueType,
  getIssueTypeBadgeClass,
  translateReferralSource,
} from './casesUtils';

interface CaseListCardProps {
  caseItem: Case;
  latestNote: string;
  reportsCount: number;
  nextAppointment?: Appointment;
  pulseAppointment?: boolean;
  onOpenNotes: () => void;
  onOpenAddReport: () => void;
  onOpenReports: () => void;
  onOpenTimeline: () => void;
  onEdit: () => void;
  onOpenDescription: () => void;
  onOpenAppointment?: () => void;
  onDelete?: () => void;
  /** Hide sensitive meeting-notes preview (e.g. admin case management). */
  hideMeetingNotes?: boolean;
  /** Short case id (#C-xxxx) — shown in admin only. */
  showCaseId?: boolean;
  /** Blur description and restrict session-report actions (admin role). */
  blurSensitiveContent?: boolean;
}

const actionBtnClass =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 sm:justify-start';

const CaseListCard: React.FC<CaseListCardProps> = ({
  caseItem,
  latestNote,
  reportsCount,
  nextAppointment,
  pulseAppointment = false,
  onOpenNotes,
  onOpenAddReport,
  onOpenReports,
  onOpenTimeline,
  onEdit,
  onOpenDescription,
  onOpenAppointment,
  onDelete,
  hideMeetingNotes = false,
  showCaseId = false,
  blurSensitiveContent = false,
}) => {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [consentConfirmOpen, setConsentConfirmOpen] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [localConsentAttached, setLocalConsentAttached] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  const showReports = reportsCount > 0 || caseItem.status === 'active';
  const description = caseItem.description || '';
  const isTruncated = description.length > 150;
  const consentAttached =
    localConsentAttached || caseItem.consentAttached === true;

  const acceptAttr = CONSENT_ALLOWED_TYPES.join(',');

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const error = validateConsentFile(file);
    if (error) {
      setSnackbar({ open: true, message: error, severity: 'error' });
      setPendingFile(null);
      return;
    }
    setPendingFile(file);
  };

  const handleConsentConfirm = async () => {
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
      setLocalConsentAttached(true);
      setPendingFile(null);
      setConsentConfirmOpen(false);
      setSnackbar({
        open: true,
        message: t.cases.consentUploadSuccess,
        severity: 'success',
      });
    } catch (err) {
      console.error('Consent upload failed:', err);
      setSnackbar({
        open: true,
        message:
          err instanceof Error ? err.message : t.cases.consentUploadError,
        severity: 'error',
      });
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <>
      <article
        id={`case-${caseItem.id}`}
        className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md lg:grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"
      >
        {/* Left: case details */}
        <div className="flex min-w-0 flex-col border-b border-slate-100 lg:border-b-0 lg:border-r lg:border-slate-100">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColorClass(caseItem.counseledName)}`}
              >
                {getInitials(caseItem.counseledName)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {showCaseId && (
                      <p className="text-xs text-slate-400">{getCaseDisplayId(caseItem)}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">
                        {caseItem.counseledName}
                      </h2>
                      {nextAppointment && (
                        <button
                          type="button"
                          onClick={onOpenAppointment}
                          className={`${
                            pulseAppointment ? 'animate-schedule-pulse ' : ''
                          }shrink-0 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white transition hover:bg-brand-700`}
                          title={t.dashboard.upcomingAppointments}
                        >
                          {formatNextAppointmentChipLabel(nextAppointment)}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">{caseItem.title}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {caseItem.priority === 'high' && (
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                        {t.cases.priorityBadge}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(caseItem.status)}`}
                    >
                      {getStatusLabel(caseItem.status)}
                    </span>
                    {consentAttached && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                        {t.cases.consentAttached}
                      </span>
                    )}
                  </div>
                </div>

                {caseItem.issueTypes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {caseItem.issueTypes.map((issueType) => (
                      <span
                        key={issueType}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getIssueTypeBadgeClass(issueType)}`}
                      >
                        {translateIssueType(issueType)}
                      </span>
                    ))}
                  </div>
                )}

                {caseItem.assignmentStatus === 'pending' &&
                  caseItem.proposedCounselorName && (
                    <div className="mt-2">
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        {t.cases.proposalBadge.replace(
                          '{name}',
                          caseItem.proposedCounselorName
                        )}
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-slate-50 active:scale-[0.99] lg:hidden"
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronUpIcon className="h-4 w-4" />
                {t.common.showLess}
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4" />
                {t.common.showMore}
              </>
            )}
          </button>

          <div
            className={`${expanded ? 'flex' : 'hidden'} flex-1 flex-col gap-4 p-5 pt-0 lg:flex`}
          >
            <div className="rounded-lg bg-slate-50 p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.cases.clientInfo}
              </h3>
              <ul className="space-y-2.5 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {caseItem.counseledName}, {caseItem.age} {t.cases.years},{' '}
                    {translateSex(caseItem.sex, caseItem.age)}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <IdentificationIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {t.cases.civilStatusTitle}:{' '}
                    {translateCivilStatus(caseItem.civilStatus, caseItem.sex)}
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{caseItem.phoneNumber}</span>
                </li>
                {caseItem.referralSource && (
                  <li className="flex items-center gap-2 text-slate-700">
                    <span className="text-slate-500">{t.cases.referralSource}:</span>
                    <span>{translateReferralSource(caseItem.referralSource)}</span>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <CalendarDaysIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {t.cases.createdLabel}:{' '}
                    {caseItem.createdAt.toLocaleDateString('ro-RO')}
                  </span>
                </li>
              </ul>
            </div>

            {!hideMeetingNotes && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <DocumentTextIcon className="h-4 w-4 text-slate-400" />
                  {t.meetingNotes.latestMeetingNote}
                </h3>
                {latestNote ? (
                  <>
                    <p className="mb-3 line-clamp-3 text-sm italic leading-relaxed text-slate-600">
                      {latestNote}
                    </p>
                    <button
                      type="button"
                      onClick={onOpenNotes}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition hover:text-brand-700"
                    >
                      {t.meetingNotes.viewAllNotes}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mb-3 text-sm italic text-slate-500">
                      {t.meetingNotes.noMeetingNotesYet}
                    </p>
                    <button
                      type="button"
                      onClick={onOpenNotes}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <DocumentTextIcon className="h-4 w-4" />
                      {t.meetingNotes.addNote}
                    </button>
                  </>
                )}
              </div>
            )}

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t.cases.description}
              </h3>
              {blurSensitiveContent ? (
                <div className="relative overflow-hidden rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <p
                    className="select-none whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600 blur-[6px]"
                    aria-hidden
                  >
                    Conținut confidențial rezervat. Detaliile cazului nu sunt
                    afișate pentru acest rol. Text placeholder pentru efectul de
                    blur pe descrierea cazului.
                  </p>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-50/40 px-3">
                    <p className="rounded-full bg-white/90 px-3 py-1 text-center text-xs font-medium text-slate-600 shadow-sm">
                      {t.adminTools.sensitiveContentRestricted}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap break-words rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                    {isTruncated
                      ? `${description.substring(0, 150)}...`
                      : description || t.cases.noDescriptionProvided}
                  </p>
                  {isTruncated && (
                    <button
                      type="button"
                      onClick={onOpenDescription}
                      className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {t.cases.viewFullDescription}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: actions + consent */}
        <div className="flex flex-col gap-3 p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.cases.actions}
          </h3>

          <div className="flex flex-col gap-2">
            {caseItem.status === 'active' && !blurSensitiveContent && (
              <button
                type="button"
                onClick={onOpenAddReport}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-medium text-brand-600 transition hover:bg-brand-50 sm:justify-start"
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
                {t.sessionReports.addReport}
              </button>
            )}
            {showReports && (
              <button type="button" onClick={onOpenReports} className={actionBtnClass}>
                <ClipboardDocumentListIcon className="h-4 w-4" />
                {t.adminTools.manageReports}
              </button>
            )}
            <button type="button" onClick={onOpenTimeline} className={actionBtnClass}>
              <ClockIcon className="h-4 w-4" />
              {t.cases.timeline}
            </button>
            <button type="button" onClick={onEdit} className={actionBtnClass}>
              <PencilSquareIcon className="h-4 w-4" />
              {t.common.edit}
            </button>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 sm:justify-start"
              >
                <TrashIcon className="h-4 w-4" />
                {t.common.delete}
              </button>
            )}
          </div>

          {!consentAttached && !blurSensitiveContent && (
            <div
              className={`mt-auto rounded-lg border p-3 ${
                pendingFile
                  ? 'border-brand-200 bg-brand-50'
                  : 'border-amber-200 bg-amber-50'
              }`}
            >
              <p
                className={`text-xs font-semibold ${
                  pendingFile ? 'text-brand-800' : 'text-amber-900'
                }`}
              >
                {pendingFile
                  ? t.cases.consentPendingTitle
                  : t.cases.consentMissingTitle}
              </p>
              <p
                className={`mt-1 text-sm ${
                  pendingFile ? 'text-brand-800' : 'text-amber-800'
                }`}
              >
                {pendingFile ? (
                  <>
                    {t.cases.consentPendingBodyBefore}
                    <span className="font-semibold">{t.cases.consentUploadAction}</span>
                    {t.cases.consentPendingBodyMid}
                    <span className="font-semibold">{t.cases.consentChangeFile}</span>
                    {t.cases.consentPendingBodyAfter}
                  </>
                ) : (
                  t.cases.consentMissingBody
                )}
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttr}
                className="hidden"
                onChange={handleFileChange}
              />

              {!pendingFile ? (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-medium text-amber-900 transition hover:bg-amber-100 sm:justify-start"
                >
                  <DocumentCheckIcon className="h-4 w-4" />
                  {t.cases.addConsent}
                </button>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="truncate text-xs text-brand-900">
                    <span className="font-medium">{t.cases.consentSelectedFile}:</span>{' '}
                    {pendingFile.name}
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setConsentConfirmOpen(true)}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-300 bg-white px-3 py-2 text-xs font-medium text-brand-700 transition hover:bg-brand-100 sm:justify-start"
                    >
                      <DocumentCheckIcon className="h-4 w-4" />
                      {t.cases.consentUploadAction}
                    </button>
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-transparent px-3 py-2 text-xs font-medium text-brand-800 transition hover:bg-brand-100 sm:justify-start"
                    >
                      {t.cases.consentChangeFile}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      <ConfirmDialog
        open={consentConfirmOpen}
        title={t.cases.consentConfirmTitle}
        message={t.cases.consentConfirmMessage}
        warningMessage={t.cases.consentConfirmWarning}
        confirmLabel={t.cases.consentUploadAction}
        variant="default"
        loading={uploadLoading}
        onClose={() => {
          if (!uploadLoading) setConsentConfirmOpen(false);
        }}
        onConfirm={handleConsentConfirm}
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
    </>
  );
};

export default CaseListCard;
