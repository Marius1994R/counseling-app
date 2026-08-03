import React from 'react';
import { MonthlyReport } from '../../types';
import { t } from '../../utils/translations';
import { formatMonthKeyLabel } from './monthlyReportUtils';
import { getMonthlyReportAnswerRows } from './monthlyReportPdf';

interface MonthlyReportReadOnlyProps {
  report: MonthlyReport;
  showMeta?: boolean;
}

function AnswerBlock({ label, value }: { label: string; value: string }) {
  if (!value?.trim()) return null;
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{value}</p>
    </div>
  );
}

const MonthlyReportReadOnly: React.FC<MonthlyReportReadOnlyProps> = ({
  report,
  showMeta = true,
}) => {
  const submittedLabel = report.submittedAt.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const rows = getMonthlyReportAnswerRows(report.answers);

  return (
    <div className="space-y-5">
      {showMeta && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">
            {t.monthlyReport.alreadySubmitted}
          </p>
          <p className="mt-1 text-sm text-emerald-800">
            {t.monthlyReport.reportFor.replace(
              '{month}',
              formatMonthKeyLabel(report.monthKey)
            )}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            {t.monthlyReport.submittedAt.replace('{date}', submittedLabel)}
          </p>
        </div>
      )}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <p className="text-xs font-medium text-slate-500">{t.monthlyReport.name}</p>
          <p className="text-sm text-slate-900">{report.userName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500">{t.monthlyReport.email}</p>
          <p className="text-sm text-slate-900">{report.userEmail}</p>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          {t.monthlyReport.sectionSpiritual}
        </h3>
        {rows.slice(0, 3).map((item) => (
          <AnswerBlock key={item.label} label={item.label} value={item.value} />
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          {t.monthlyReport.sectionRelationships}
        </h3>
        {rows.slice(3, 6).map((item) => (
          <AnswerBlock key={item.label} label={item.label} value={item.value} />
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          {t.monthlyReport.sectionSelfCare}
        </h3>
        {rows.slice(6).map((item) => (
          <AnswerBlock key={item.label} label={item.label} value={item.value} />
        ))}
      </section>
    </div>
  );
};

export default MonthlyReportReadOnly;
