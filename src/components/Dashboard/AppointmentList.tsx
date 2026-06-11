import React from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { Appointment } from '../../types';
import { groupAppointmentsByDay, getAppointmentDisplayName } from './dashboardUtils';
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
  const limited = appointments.slice(0, limit);
  const groups = groupAppointmentsByDay(limited);

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

      {loading ? (
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
                {group.items.map((apt) => (
                  <li key={apt.id} className="flex items-center gap-3 text-sm">
                    <span className="w-12 shrink-0 font-medium text-slate-700">{apt.startTime}</span>
                    <span className="text-slate-600">{getAppointmentDisplayName(apt)}</span>
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
