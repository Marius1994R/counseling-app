import React, { useState } from 'react';
import { CaseReportSummary, formatReportDate } from './sessionReportsUtils';
import SessionReportDetailCard from './SessionReportDetailCard';
import { t } from '../../utils/translations';

interface SessionReportsTimelineProps {
  summary: CaseReportSummary | null;
}

const SessionReportsTimeline: React.FC<SessionReportsTimelineProps> = ({ summary }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!summary) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">{t.sessionReports.selectCase}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        {summary.case.counseledName} — {t.sessionReports.sessions}
      </h2>
      <p className="mt-0.5 text-sm text-slate-500">{summary.case.title}</p>

      <div className="relative mt-6 space-y-4">
        <div className="absolute bottom-0 left-[5px] top-2 w-px bg-slate-200" aria-hidden="true" />

        {summary.reports.map((report) => {
          const isExpanded = expandedId === report.id;

          return (
            <article key={report.id} className="relative pl-8">
              <div
                className="absolute left-0 top-2 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white"
                aria-hidden="true"
              />

              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : report.id)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {t.sessionReports.sessionNumber} {report.sessionNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatReportDate(report.createdAt)} — {report.createdByName}
                    </p>
                  </div>
                </div>

                {!isExpanded && (
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-medium text-slate-700">{t.sessionReports.theme}:</span>{' '}
                    {report.mainTheme}
                  </p>
                )}

                {isExpanded && <SessionReportDetailCard report={report} className="mt-2" />}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default SessionReportsTimeline;
