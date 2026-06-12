import React from 'react';
import { t } from '../../utils/translations';

interface SessionReportsKpiRowProps {
  totalReports: number;
  casesWithReports: number;
  reportsThisMonth: number;
  loading?: boolean;
}

const SessionReportsKpiRow: React.FC<SessionReportsKpiRowProps> = ({
  totalReports,
  casesWithReports,
  reportsThisMonth,
  loading,
}) => (
  <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
    {[
      { label: t.sessionReports.metrics.total, value: totalReports },
      { label: t.sessionReports.metrics.cases, value: casesWithReports },
      { label: t.sessionReports.metrics.thisMonth, value: reportsThisMonth },
    ].map((item) => (
      <div
        key={item.label}
        className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
      >
        <p className="text-xs font-medium text-slate-500">{item.label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {loading ? '—' : item.value}
        </p>
      </div>
    ))}
  </div>
);

export default SessionReportsKpiRow;
