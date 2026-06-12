import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardCaseCard from './DashboardCaseCard';
import { Case } from '../../types';
import { ActivityRecord, formatTimeAgo, getCaseProgress } from './dashboardUtils';
import { t } from '../../utils/translations';

const DISPLAY_LIMIT = 2;

interface RecentActiveCasesProps {
  cases: Case[];
  activities: ActivityRecord[];
  sessionReportCounts: Record<string, number>;
  loading?: boolean;
}

const RecentActiveCases: React.FC<RecentActiveCasesProps> = ({
  cases,
  activities,
  sessionReportCounts,
  loading,
}) => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const getLastActivity = (caseItem: Case): string => {
    const caseActivity = activities.find(
      (a) => a.metadata?.caseId === caseItem.id || a.description?.includes(caseItem.title)
    );
    return formatTimeAgo(caseActivity?.timestamp ?? caseItem.updatedAt);
  };

  const visibleCases = showAll ? cases : cases.slice(0, DISPLAY_LIMIT);
  const hasMore = cases.length > DISPLAY_LIMIT;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Cazuri active recente</h2>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : cases.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Nu există cazuri active momentan.</p>
      ) : (
        <div className="space-y-4">
          {visibleCases.map((caseItem) => (
            <DashboardCaseCard
              key={caseItem.id}
              caseItem={caseItem}
              progress={getCaseProgress(caseItem.status, sessionReportCounts[caseItem.id] ?? 0)}
              lastActivityLabel={getLastActivity(caseItem)}
              onView={() => navigate(`/cases?caseId=${caseItem.id}`)}
              onNotes={() => navigate(`/cases?caseId=${caseItem.id}&openNotes=true`)}
              onSchedule={() => navigate(`/calendar?new=true&caseId=${caseItem.id}`)}
            />
          ))}
        </div>
      )}

      {!loading && cases.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 min-[450px]:flex-row min-[450px]:items-center">
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="self-start shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              {showAll ? t.common.showLess : t.common.showMore}
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/cases?status=active')}
            className="self-start shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700 min-[450px]:ml-auto min-[450px]:self-auto min-[450px]:text-right"
          >
            {t.dashboard.viewAllActiveCases} →
          </button>
        </div>
      )}
    </section>
  );
};

export default RecentActiveCases;
