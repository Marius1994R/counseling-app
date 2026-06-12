import React, { useMemo } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { Appointment } from '../../types';
import {
  buildUpcomingScheduleItems,
  groupUpcomingScheduleByDay,
} from './dashboardUtils';
import { useEvents } from '../../contexts/EventsContext';
import { getUpcomingEvents, getEventDisplayStyles } from '../Calendar/eventUtils';
import { t } from '../../utils/translations';

interface AppointmentListProps {
  appointments: Appointment[];
  loading?: boolean;
  limit?: number;
  onViewCalendar: () => void;
}

const AppointmentList: React.FC<AppointmentListProps> = ({
  appointments,
  loading,
  limit = 6,
  onViewCalendar,
}) => {
  const { events, loading: eventsLoading } = useEvents();
  const eventStyles = getEventDisplayStyles();

  const upcomingItems = useMemo(() => {
    const upcomingEvents = getUpcomingEvents(events);
    return buildUpcomingScheduleItems(appointments, upcomingEvents);
  }, [appointments, events]);

  const limited = upcomingItems.slice(0, limit);
  const groups = groupUpcomingScheduleByDay(limited);
  const isLoading = loading || eventsLoading;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{t.dashboard.upcomingAppointments}</h2>
        <button
          type="button"
          onClick={onViewCalendar}
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Vezi calendar
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ) : limited.length === 0 ? (
        <div className="flex flex-col items-center py-6 text-center">
          <CalendarIcon className="mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm text-slate-500">{t.dashboard.noAppointments}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={`${item.kind}-${item.id}-${item.date.toISOString()}`} className="flex items-center gap-3 text-sm">
                    <span className="w-12 shrink-0 font-medium text-slate-700">{item.startTime}</span>
                    {item.kind === 'event' ? (
                      <span className="flex items-center gap-2 text-slate-600">
                        <span
                          className={`inline-block h-2 w-2 shrink-0 rounded-full ${eventStyles.dot}`}
                          aria-hidden="true"
                        />
                        <span>{item.label}</span>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                          {t.events.legend}
                        </span>
                      </span>
                    ) : (
                      <span className="text-slate-600">{item.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default AppointmentList;
