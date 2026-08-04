import React, { useState } from 'react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
} from '@mui/material';
import { MonthlyReport } from '../../types';
import { t } from '../../utils/translations';
import { formatMonthKeyLabel, listRecentMonthKeys } from './monthlyReportUtils';
import { downloadMonthlyReportPdf } from './monthlyReportPdf';
import MonthlyReportReadOnly from './MonthlyReportReadOnly';

interface MonthlyReportLeaderPanelProps {
  monthKey: string;
  onMonthKeyChange: (monthKey: string) => void;
  reports: MonthlyReport[];
  loading: boolean;
  error: string;
  /** When true, omit outer title (parent provides it). */
  embedded?: boolean;
}

const MonthlyReportLeaderPanel: React.FC<MonthlyReportLeaderPanelProps> = ({
  monthKey,
  onMonthKeyChange,
  reports,
  loading,
  error,
  embedded = false,
}) => {
  const [selected, setSelected] = useState<MonthlyReport | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const monthOptions = listRecentMonthKeys(12);

  const handleDownloadPdf = async (report: MonthlyReport) => {
    if (downloadingId) return;
    setDownloadError('');
    setDownloadingId(report.id);
    try {
      await downloadMonthlyReportPdf(report);
    } catch (err) {
      console.error('Monthly report PDF error:', err);
      setDownloadError(t.monthlyReport.downloadPdfError);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className={embedded ? 'space-y-4' : 'mt-10 space-y-4'}>
      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-end ${
          embedded ? 'sm:justify-end' : 'sm:justify-between'
        }`}
      >
        {!embedded && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t.monthlyReport.leaderTitle}
            </h2>
            <p className="text-sm text-slate-500">{t.monthlyReport.leaderSubtitle}</p>
          </div>
        )}
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block font-medium">{t.monthlyReport.selectMonth}</span>
          <select
            value={monthKey}
            onChange={(e) => onMonthKeyChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:min-w-[220px]"
          >
            {monthOptions.map((key) => (
              <option key={key} value={key}>
                {formatMonthKeyLabel(key)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <Alert severity="error" className="rounded-xl">
          {error}
        </Alert>
      )}

      {downloadError && (
        <Alert severity="error" className="rounded-xl" onClose={() => setDownloadError('')}>
          {downloadError}
        </Alert>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-3 text-sm text-slate-600">
          {t.monthlyReport.submissionsCount.replace('{count}', String(reports.length))}
        </p>

        {loading ? (
          <div className="flex justify-center py-8">
            <CircularProgress size={28} />
          </div>
        ) : reports.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            {t.monthlyReport.noSubmissions}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reports.map((report) => {
              const isDownloading = downloadingId === report.id;
              return (
                <li
                  key={report.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{report.userName}</p>
                    <p className="text-xs text-slate-500">{report.userEmail}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(report)}
                      className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      {t.monthlyReport.viewReport}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadPdf(report)}
                      disabled={!!downloadingId}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-800 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDownloading && <CircularProgress size={12} color="inherit" />}
                      {isDownloading
                        ? t.monthlyReport.downloadingPdf
                        : t.monthlyReport.downloadPdf}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{ className: 'rounded-xl' }}
      >
        <DialogTitle>
          {selected
            ? `${selected.userName} · ${formatMonthKeyLabel(selected.monthKey)}`
            : t.monthlyReport.viewReport}
        </DialogTitle>
        <DialogContent dividers>
          {selected && <MonthlyReportReadOnly report={selected} showMeta={false} />}
        </DialogContent>
        <DialogActions>
          {selected && (
            <Button
              onClick={() => void handleDownloadPdf(selected)}
              disabled={!!downloadingId}
              startIcon={
                downloadingId === selected.id ? (
                  <CircularProgress size={14} color="inherit" />
                ) : undefined
              }
            >
              {downloadingId === selected.id
                ? t.monthlyReport.downloadingPdf
                : t.monthlyReport.downloadPdf}
            </Button>
          )}
          <Button onClick={() => setSelected(null)}>{t.common.close}</Button>
        </DialogActions>
      </Dialog>
    </section>
  );
};

export default MonthlyReportLeaderPanel;
