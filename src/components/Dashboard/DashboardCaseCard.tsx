import React from 'react';
import { ClipboardDocumentListIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Case } from '../../types';
import { getCaseDisplayId, getInitials, getStatusLabel } from './dashboardUtils';
import {
  translateIssueType,
  getIssueTypeBadgeClass,
} from '../Cases/casesUtils';
import { t } from '../../utils/translations';

interface DashboardCaseCardProps {
  caseItem: Case;
  progress: number;
  lastActivityLabel: string;
  onView: () => void;
  onNotes: () => void;
  onAddReport: () => void;
  onSchedule: () => void;
}

const statusBadgeClass: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  waiting: 'bg-amber-50 text-amber-700',
  finished: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-100 text-slate-600',
  unfinished: 'bg-red-50 text-red-700',
};

const avatarColors = [
  'bg-brand-100 text-brand-600',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-sky-100 text-sky-700',
];

const DashboardCaseCard: React.FC<DashboardCaseCardProps> = ({
  caseItem,
  progress,
  lastActivityLabel,
  onView,
  onNotes,
  onAddReport,
  onSchedule,
}) => {
  const colorIndex = caseItem.counseledName.charCodeAt(0) % avatarColors.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${avatarColors[colorIndex]}`}
        >
          {getInitials(caseItem.counseledName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div>
              <p className="text-xs text-slate-400">{getCaseDisplayId(caseItem)}</p>
              <p className="font-semibold text-slate-900">{caseItem.counseledName}</p>
              <p className="text-sm text-slate-500">
                {caseItem.assignedCounselorName ?? 'Nealocat'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {caseItem.priority === 'high' && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                {t.cases.priorityBadge}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                statusBadgeClass[caseItem.status] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {getStatusLabel(caseItem.status)}
            </span>
            {caseItem.issueTypes.map((issueType) => (
              <span
                key={issueType}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${getIssueTypeBadgeClass(issueType)}`}
              >
                {translateIssueType(issueType)}
              </span>
            ))}
            <span className="text-xs text-slate-400">Ultima activitate: {lastActivityLabel}</span>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Progres</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onView}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition duration-200 ease-out hover:bg-slate-50 active:scale-[0.98]"
            >
              Vezi
            </button>
            <button
              type="button"
              onClick={onNotes}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition duration-200 ease-out hover:bg-slate-50 active:scale-[0.98]"
            >
              <DocumentTextIcon className="h-4 w-4" />
              {t.meetingNotes.addNote}
            </button>
            <button
              type="button"
              onClick={onAddReport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 transition duration-200 ease-out hover:bg-brand-50 active:scale-[0.98]"
            >
              <ClipboardDocumentListIcon className="h-4 w-4" />
              {t.sessionReports.addReport}
            </button>
            <button
              type="button"
              onClick={onSchedule}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition duration-200 ease-out hover:bg-slate-50 active:scale-[0.98]"
            >
              Programează
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCaseCard;
