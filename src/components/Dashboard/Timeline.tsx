import React, { useMemo, useState } from 'react';
import {
  ActivityRecord,
  formatTimeAgo,
  getActivityColor,
  translateActivityDescription,
  translateActivityTitle,
} from './dashboardUtils';
import { Counselor } from '../../types';
import { t } from '../../utils/translations';

interface TimelineProps {
  activities: ActivityRecord[];
  loading?: boolean;
  limit?: number;
  counselors?: Counselor[];
  showCounselorFilter?: boolean;
  onActivityClick?: (activity: ActivityRecord) => void;
}

function activityMatchesCounselor(
  activity: ActivityRecord,
  counselor: Counselor
): boolean {
  const linkedUserId = counselor.linkedUserId;
  if (linkedUserId && activity.userId === linkedUserId) return true;
  if (linkedUserId && activity.metadata?.assignedToUserId === linkedUserId) return true;
  if (activity.metadata?.counselorId === counselor.id) return true;
  return false;
}

const Timeline: React.FC<TimelineProps> = ({
  activities,
  loading,
  limit = 10,
  counselors = [],
  showCounselorFilter = false,
  onActivityClick,
}) => {
  const [counselorFilter, setCounselorFilter] = useState('all');

  const filtered = useMemo(() => {
    if (!showCounselorFilter || counselorFilter === 'all') {
      return activities;
    }
    const selected = counselors.find((c) => c.id === counselorFilter);
    if (!selected) return activities;
    return activities.filter((activity) => activityMatchesCounselor(activity, selected));
  }, [activities, counselorFilter, counselors, showCounselorFilter]);

  const items = filtered.slice(0, limit);

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">{t.dashboard.recentActivity}</h2>
        {showCounselorFilter && counselors.length > 0 ? (
          <div className="sm:min-w-[220px]">
            <label htmlFor="dashboard-activity-counselor" className="sr-only">
              {t.dashboard.filterByCounselor}
            </label>
            <select
              id="dashboard-activity-counselor"
              value={counselorFilter}
              onChange={(e) => setCounselorFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">{t.dashboard.allCounselors}</option>
              {counselors.map((counselor) => (
                <option key={counselor.id} value={counselor.id}>
                  {counselor.fullName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

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
          {items.map((activity) => {
            const caseId =
              typeof activity.metadata?.caseId === 'string'
                ? activity.metadata.caseId
                : undefined;
            const clickable = Boolean(caseId && onActivityClick);

            const content = (
              <>
                <p className="text-sm font-medium text-slate-900">
                  {translateActivityTitle(activity.title)}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {translateActivityDescription(activity.description)}
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatTimeAgo(activity.timestamp)}</p>
              </>
            );

            return (
              <div key={activity.id} className="relative flex gap-4">
                <div
                  className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${getActivityColor(activity.type)}`}
                />
                <div className="min-w-0 flex-1 pb-1">
                  {clickable ? (
                    <button
                      type="button"
                      onClick={() => onActivityClick?.(activity)}
                      className="w-full rounded-lg text-left transition hover:bg-slate-50"
                    >
                      {content}
                    </button>
                  ) : (
                    content
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Timeline;
