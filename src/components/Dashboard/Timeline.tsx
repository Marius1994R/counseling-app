import React from 'react';
import {
  ActivityRecord,
  formatTimeAgo,
  getActivityColor,
  translateActivityDescription,
  translateActivityTitle,
} from './dashboardUtils';
import { t } from '../../utils/translations';

interface TimelineProps {
  activities: ActivityRecord[];
  loading?: boolean;
  limit?: number;
  onViewAll: () => void;
}

const Timeline: React.FC<TimelineProps> = ({
  activities,
  loading,
  limit = 6,
  onViewAll,
}) => {
  const items = activities.slice(0, limit);

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-6 text-base font-semibold text-slate-900">{t.dashboard.recentActivity}</h2>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-3 w-3 animate-pulse rounded-full bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">{t.dashboard.noActivities}</p>
      ) : (
        <div className="relative space-y-6 pl-2">
          <div className="absolute bottom-2 left-[5px] top-2 w-px bg-slate-200" aria-hidden />
          {items.map((activity) => (
            <div key={activity.id} className="relative flex gap-4">
              <div
                className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${getActivityColor(activity.type)}`}
              />
              <div className="min-w-0 flex-1 pb-1">
                <p className="text-sm font-medium text-slate-900">
                  {translateActivityTitle(activity.title)}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {translateActivityDescription(activity.description)}
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatTimeAgo(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-right">
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Vezi toată activitatea →
        </button>
      </div>
    </section>
  );
};

export default Timeline;
