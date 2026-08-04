import React, { useState } from 'react';
import { useMonthlyReport } from '../../hooks/useMonthlyReport';
import { getDueReportMonthKey } from '../MonthlyReport/monthlyReportUtils';
import MonthlyReportLeaderPanel from '../MonthlyReport/MonthlyReportLeaderPanel';
import { t } from '../../utils/translations';

/** Leader-only: team monthly reports inbox (formerly on Raport lunar). */
const AdminReceivedReportsPanel: React.FC = () => {
  const [leaderMonthKey, setLeaderMonthKey] = useState(getDueReportMonthKey);
  const data = useMonthlyReport(leaderMonthKey);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-base font-semibold text-slate-900">
          {t.monthlyReport.leaderTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{t.monthlyReport.leaderSubtitle}</p>
      </div>
      <MonthlyReportLeaderPanel
        monthKey={leaderMonthKey}
        onMonthKeyChange={setLeaderMonthKey}
        reports={data.leaderReports}
        loading={data.leaderLoading}
        error={data.leaderError}
        embedded
      />
    </div>
  );
};

export default AdminReceivedReportsPanel;
