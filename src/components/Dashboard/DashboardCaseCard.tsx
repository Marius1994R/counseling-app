import React from 'react';
import { ClipboardDocumentListIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Appointment, Case } from '../../types';
import {
  formatNextAppointmentChipLabel,
  getAvatarColorClass,
  getInitials,
  getStatusBadgeClass,
  getStatusLabel,
} from './dashboardUtils';
import SessionRoad from './SessionRoad';
import {
  translateIssueType,
  getIssueTypeBadgeClass,
} from '../Cases/casesUtils';
import { t } from '../../utils/translations';

interface DashboardCaseCardProps {
  caseItem: Case;
  reportCount: number;
  lastActivityLabel: string;
  nextAppointment?: Appointment;
  appointmentBySession?: Record<number, Appointment>;
  pulseAppointment?: boolean;
  onView: () => void;
  onAddNote: () => void;
  onAddReport: () => void;
  onSchedule: (sessionNumber?: number) => void;
  onOpenAppointment?: () => void;
  onOpenReport?: (session: number) => void;
}

const DashboardCaseCard: React.FC<DashboardCaseCardProps> = ({
  caseItem,
  reportCount,
  lastActivityLabel,
  nextAppointment,
  appointmentBySession,
  pulseAppointment = false,
  onView,
  onAddNote,
  onAddReport,
  onSchedule,
  onOpenAppointment,
  onOpenReport,
}) => {
  return (
    // The hover lift makes this card a stacking context, so the session-road
    // bubble can only clear the next card's pulsing chip if the card itself is
    // raised. No static z-index: without one the card stays out of the stacking
    // order on touch, where there is no hover.
    <div className="relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 ease-out hover:z-30 hover:-translate-y-0.5 hover:shadow-md focus-within:z-30 sm:p-5">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColorClass(
            caseItem.counseledName
          )}`}
        >
          {getInitials(caseItem.counseledName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">{caseItem.counseledName}</p>
                {nextAppointment && (
                  <button
                    type="button"
                    onClick={onOpenAppointment}
                    className={`${
                      pulseAppointment ? 'animate-schedule-pulse ' : ''
                    }shrink-0 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white transition hover:bg-brand-700`}
                    title={t.dashboard.upcomingAppointments}
                  >
                    {formatNextAppointmentChipLabel(nextAppointment)}
                  </button>
                )}
              </div>
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
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                caseItem.status
              )}`}
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
            <SessionRoad
              reportCount={reportCount}
              nextAppointment={nextAppointment}
              appointmentBySession={appointmentBySession}
              onOpenReport={onOpenReport}
              onAddReport={onAddReport}
              onSchedule={(session) => onSchedule(session)}
            />
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
              onClick={onAddNote}
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
              onClick={() => onSchedule()}
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
