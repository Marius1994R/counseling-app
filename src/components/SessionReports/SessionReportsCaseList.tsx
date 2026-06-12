import React, { useState, useEffect } from 'react';
import { CaseReportSummary, formatReportDate } from './sessionReportsUtils';
import { getInitials, getAvatarColorClass } from '../Cases/casesUtils';
import { t } from '../../utils/translations';

const DISPLAY_LIMIT = 3;

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
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!selectedCaseId || showAll) return;
    const selectedIndex = summaries.findIndex((s) => s.case.id === selectedCaseId);
    if (selectedIndex >= DISPLAY_LIMIT) {
      setShowAll(true);
    }
  }, [selectedCaseId, summaries, showAll]);

  if (summaries.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
        <p className="text-sm text-slate-500">{t.sessionReports.noCases}</p>
      </div>
    );
  }

  const visibleSummaries = showAll ? summaries : summaries.slice(0, DISPLAY_LIMIT);
  const hasMore = summaries.length > DISPLAY_LIMIT;

  return (
    <div className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-slate-900">{t.sessionReports.casesWithReports}</h2>
      <div className={`space-y-2 pr-1 ${showAll ? 'max-h-[32rem] overflow-y-auto' : ''}`}>
        {visibleSummaries.map((summary) => {
          const isSelected = summary.case.id === selectedCaseId;
          const initials = getInitials(summary.case.counseledName);

          return (
            <button
              key={summary.case.id}
              type="button"
              onClick={() => onSelectCase(summary.case.id)}
              className={`w-full rounded-xl border p-3 text-left transition ${
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
                  <p className="truncate text-sm font-semibold text-slate-900">{summary.case.title}</p>
                  <p className="truncate text-xs text-slate-500">{summary.case.counseledName}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                      {summary.reportCount}{' '}
                      {summary.reportCount === 1
                        ? t.sessionReports.reportSingular
                        : t.sessionReports.reportPlural}
                    </span>
                    {summary.lastReportDate && (
                      <span className="text-[10px] text-slate-400">
                        {t.sessionReports.lastReport}: {formatReportDate(summary.lastReportDate)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
          className="px-1 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          {showAll ? t.common.showLess : t.common.showMore}
        </button>
      )}
    </div>
  );
};

export default SessionReportsCaseList;
