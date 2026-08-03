import React from 'react';
import {
  UserIcon,
  IdentificationIcon,
  PhoneIcon,
  CalendarDaysIcon,
  PencilSquareIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Case } from '../../types';
import { t } from '../../utils/translations';
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
  onOpenNotes: () => void;
  onOpenAddReport: () => void;
  onOpenReports: () => void;
  onOpenTimeline: () => void;
  onEdit: () => void;
  onOpenDescription: () => void;
  onDelete?: () => void;
}

const CaseListCard: React.FC<CaseListCardProps> = ({
  caseItem,
  latestNote,
  reportsCount,
  onOpenNotes,
  onOpenAddReport,
  onOpenReports,
  onOpenTimeline,
  onEdit,
  onOpenDescription,
  onDelete,
}) => {
  const showReports = reportsCount > 0 || caseItem.status === 'active';
  const description = caseItem.description || '';
  const isTruncated = description.length > 150;

  return (
    <article
      id={`case-${caseItem.id}`}
      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="border-b border-slate-100 p-5">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColorClass(caseItem.counseledName)}`}
          >
            {getInitials(caseItem.counseledName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-slate-400">{getCaseDisplayId(caseItem)}</p>
                <h2 className="text-lg font-semibold text-slate-900">{caseItem.counseledName}</h2>
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

            {caseItem.assignmentStatus === 'pending' && caseItem.proposedCounselorName && (
              <div className="mt-2">
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  {t.cases.proposalBadge.replace('{name}', caseItem.proposedCounselorName)}
                </span>
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {caseItem.status === 'active' && (
                <button
                  type="button"
                  onClick={onOpenAddReport}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
                >
                  <ClipboardDocumentListIcon className="h-4 w-4" />
                  {t.sessionReports.addReport}
                </button>
              )}
              {showReports && (
                <button
                  type="button"
                  onClick={onOpenReports}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ClipboardDocumentListIcon className="h-4 w-4" />
                  {t.adminTools.manageReports}
                </button>
              )}
              <button
                type="button"
                onClick={onOpenTimeline}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ClockIcon className="h-4 w-4" />
                {t.cases.timeline}
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <PencilSquareIcon className="h-4 w-4" />
                {t.common.edit}
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  {t.common.delete}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
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
                {t.cases.civilStatusTitle}: {translateCivilStatus(caseItem.civilStatus, caseItem.sex)}
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
                {t.cases.createdLabel}: {caseItem.createdAt.toLocaleDateString('ro-RO')}
              </span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.cases.description}
          </h3>
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
        </div>

        <div className="mt-auto rounded-lg border border-slate-200 bg-slate-50/80 p-4">
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
              <p className="mb-3 text-sm italic text-slate-500">{t.meetingNotes.noMeetingNotesYet}</p>
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
      </div>
    </article>
  );
};

export default CaseListCard;
