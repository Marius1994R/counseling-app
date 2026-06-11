import React from 'react';
import {
  ActivityTimelineItem,
  formatActivityDate,
  getActivityColor,
  translateActivityDescription,
  translateActivityTitle,
  translateStatus,
} from './activityUtils';
import { t } from '../../utils/translations';

interface ActivityListProps {
  activities: ActivityTimelineItem[];
}

const ActivityList: React.FC<ActivityListProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-slate-500">{t.activity.noResults}</p>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="relative space-y-6 pl-2">
        <div
          className="absolute bottom-2 left-[5px] top-2 w-px bg-slate-200"
          aria-hidden
        />
        {activities.map((activity) => (
          <article key={activity.id} className="relative flex gap-4">
            <div
              className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${getActivityColor(activity.type)}`}
              aria-hidden
            />
            <div className="min-w-0 flex-1 pb-1">
              <h2 className="text-sm font-semibold text-slate-900">
                {translateActivityTitle(activity.title)}
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                {translateActivityDescription(activity.description)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                <span>
                  {t.activity.byUser} {activity.userName}
                </span>
                <span aria-hidden>•</span>
                <time dateTime={activity.timestamp.toISOString()}>
                  {formatActivityDate(activity.timestamp)}
                </time>
                {activity.counselorName && (
                  <>
                    <span aria-hidden>•</span>
                    <span>{activity.counselorName}</span>
                  </>
                )}
              </div>
              {activity.metadata?.oldStatus && activity.metadata?.newStatus && (
                <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {translateStatus(activity.metadata.oldStatus)} →{' '}
                  {translateStatus(activity.metadata.newStatus)}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ActivityList;
