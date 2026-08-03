import React, { useState } from 'react';
import { Alert, CircularProgress, Snackbar } from '@mui/material';
import { useMonthlyReport } from '../../hooks/useMonthlyReport';
import { t } from '../../utils/translations';
import { getDueReportMonthKey } from './monthlyReportUtils';
import MonthlyReportForm from './MonthlyReportForm';
import MonthlyReportReadOnly from './MonthlyReportReadOnly';
import MonthlyReportLeaderPanel from './MonthlyReportLeaderPanel';

const MonthlyReportPage: React.FC = () => {
  const [leaderMonthKey, setLeaderMonthKey] = useState(getDueReportMonthKey);
  const data = useMonthlyReport(leaderMonthKey);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const handleSubmit = async (
    answers: Parameters<typeof data.submitReport>[0]
  ) => {
    await data.submitReport(answers);
    setSnackbarOpen(true);
  };

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t.monthlyReport.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{t.monthlyReport.subtitle}</p>
      </header>

      {data.ownError && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {data.ownError}
        </Alert>
      )}

      {data.ownLoading || !data.currentUser ? (
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.ownReport ? (
        <MonthlyReportReadOnly report={data.ownReport} />
      ) : (
        <MonthlyReportForm
          monthKey={data.monthKey}
          currentUser={data.currentUser}
          submitting={data.submitting}
          onSubmit={handleSubmit}
        />
      )}

      {data.isLeader && (
        <MonthlyReportLeaderPanel
          monthKey={leaderMonthKey}
          onMonthKeyChange={setLeaderMonthKey}
          reports={data.leaderReports}
          loading={data.leaderLoading}
          error={data.leaderError}
        />
      )}

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          className="rounded-xl"
        >
          {t.monthlyReport.submitSuccess}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MonthlyReportPage;
