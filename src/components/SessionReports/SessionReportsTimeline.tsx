import React, { useState } from 'react';
import { Drawer } from '@mui/material';
import { Close } from '@mui/icons-material';
import { PlusIcon } from '@heroicons/react/24/outline';
import { CaseReportSummary, formatReportDate, toRoadSessionNumber } from './sessionReportsUtils';
import SessionReportDetailCard from './SessionReportDetailCard';
import { t } from '../../utils/translations';

interface SessionReportsTimelineProps {
  summary: CaseReportSummary | null;
  onAddReport?: () => void;
  /** Desktop: embedded panel. Mobile: slide-over drawer. */
  variant?: 'panel' | 'drawer';
  open?: boolean;
  onClose?: () => void;
}

const SessionReportsTimeline: React.FC<SessionReportsTimelineProps> = ({
  summary,
  onAddReport,
  variant = 'panel',
  open = false,
  onClose,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isDrawer = variant === 'drawer';
  const sessionNumbers = summary?.reports.map((report) => report.sessionNumber) ?? [];

  const content = !summary ? (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <p className="text-sm text-slate-500">{t.sessionReports.selectCase}</p>
    </div>
  ) : (
    <>
      <div className="shrink-0 border-b border-slate-200 px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              {summary.case.counseledName}
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{summary.case.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {summary.reportCount}{' '}
              {summary.reportCount === 1
                ? t.sessionReports.reportSingular
                : t.sessionReports.reportPlural}{' '}
              · {t.sessionReports.sessions.toLowerCase()}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onAddReport && (
              <button
                type="button"
                onClick={onAddReport}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
              >
                <PlusIcon className="h-4 w-4" />
                {t.sessionReports.addReport}
              </button>
            )}
            {isDrawer && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={t.common.close}
              >
                <Close fontSize="small" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
        {summary.reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <p className="text-sm text-slate-500">{t.sessionReports.addFirstReportHint}</p>
          </div>
        ) : (
          <div className="relative space-y-4">
            <div
              className="absolute bottom-0 left-[5px] top-2 w-px bg-slate-200"
              aria-hidden="true"
            />

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
                          {t.sessionReports.sessionNumber}{' '}
                          {toRoadSessionNumber(report.sessionNumber, sessionNumbers)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatReportDate(report.createdAt)} — {report.createdByName}
                        </p>
                      </div>
                    </div>

                    {!isExpanded && (
                      <p className="mt-2 text-sm text-slate-600">
                        <span className="font-medium text-slate-700">
                          {t.sessionReports.theme}:
                        </span>{' '}
                        {report.mainTheme}
                      </p>
                    )}

                    {isExpanded && <SessionReportDetailCard report={report} className="mt-2" />}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  if (isDrawer) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: 480,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#fff',
          },
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <aside className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {content}
    </aside>
  );
};

export default SessionReportsTimeline;
