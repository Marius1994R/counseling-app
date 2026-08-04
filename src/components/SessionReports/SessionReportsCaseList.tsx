import React from 'react';
import { CaseReportSummary, formatReportDate } from './sessionReportsUtils';
import { getInitials, getAvatarColorClass } from '../Cases/casesUtils';
import { t } from '../../utils/translations';

interface SessionReportsCaseListProps {
  summaries: CaseReportSummary[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
}

const SessionReportsCaseList: React.FC<SessionReportsCaseListProps> = ({
  summaries,
  selectedCaseId,
  onSelectCase,
}) => {
  if (summaries.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">{t.sessionReports.noCases}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{t.sessionReports.casesList}</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {summaries.length}{' '}
          {summaries.length === 1
            ? t.sessionReports.caseSingular
            : t.sessionReports.casePlural}
        </p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {summaries.map((summary) => {
          const isSelected = summary.case.id === selectedCaseId;
          const initials = getInitials(summary.case.counseledName);
          const counselor =
            summary.case.assignedCounselorName ||
            summary.reports[0]?.createdByName ||
            null;

          return (
            <button
              key={summary.case.id}
              type="button"
              onClick={() => onSelectCase(summary.case.id)}
              className={`w-full rounded-lg border p-3 text-left transition ${
                isSelected
                  ? 'border-brand-300 bg-brand-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColorClass(summary.case.counseledName)}`}
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {summary.case.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {summary.reportCount}{' '}
                    {summary.reportCount === 1
                      ? t.sessionReports.reportSingular
                      : t.sessionReports.reportPlural}
                    {counselor ? ` · ${counselor}` : ''}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    {summary.lastReportDate ? (
                      <span className="text-[10px] text-slate-400">
                        {t.sessionReports.lastReport}: {formatReportDate(summary.lastReportDate)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {t.sessionReports.noReportsYet}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SessionReportsCaseList;
