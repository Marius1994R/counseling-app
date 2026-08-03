import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Appointment, ChurchEvent } from '../../types';
import { t } from '../../utils/translations';
import {
  getDaysInMonth,
  getAppointmentsForDate,
  isToday,
  isPastDate,
  MONTH_NAMES_RO,
  DAY_NAMES_RO,
  getRoomColorStyles,
  formatTime,
  sortAppointmentsByTime,
} from './calendarUtils';
import {
  getEventsForDate,
  sortEventsByTime,
  getEventDisplayStyles,
  CalendarDayItem,
} from './eventUtils';
import CalendarRoomLegend from './CalendarRoomLegend';

interface CalendarMonthGridProps {
  appointments: Appointment[];
  events: ChurchEvent[];
  onDateClick: (date: Date) => void;
  canViewCaseDetails?: (appointment: Appointment) => boolean;
}

function buildDayItems(
  dayAppointments: Appointment[],
  dayEvents: ChurchEvent[],
  canViewCaseDetails: (appointment: Appointment) => boolean
): CalendarDayItem[] {
  const items: CalendarDayItem[] = [
    ...dayAppointments.map((appointment) => {
      const colors = getRoomColorStyles(appointment.room);
      return {
        kind: 'appointment' as const,
        id: appointment.id,
        startTime: appointment.startTime,
        label: canViewCaseDetails(appointment)
          ? appointment.caseTitle || appointment.counselorName
          : appointment.counselorName,
        styles: { bg: colors.bg, text: colors.text, border: colors.border },
      };
    }),
    ...dayEvents.map((event) => {
      const styles = getEventDisplayStyles();
      return {
        kind: 'event' as const,
        id: event.id,
        startTime: event.startTime,
        label: event.name,
        styles,
      };
    }),
  ];

  return items.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  appointments,
  events,
  onDateClick,
  canViewCaseDetails = () => false,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const days = getDaysInMonth(currentDate);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
          {MONTH_NAMES_RO[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
            aria-label="Luna anterioară"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date())}
            className="rounded-full border border-brand-200 px-3 py-1.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
          >
            {t.dashboard.today}
          </button>
          <button
            type="button"
            onClick={() =>
              setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
            className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
            aria-label="Luna următoare"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 sm:gap-2">
        {DAY_NAMES_RO.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="min-h-[5rem] sm:min-h-[6.25rem]" />;
          }

          const dayAppointments = sortAppointmentsByTime(getAppointmentsForDate(appointments, date));
          const dayEvents = sortEventsByTime(getEventsForDate(events, date));
          const dayItems = buildDayItems(dayAppointments, dayEvents, canViewCaseDetails);
          const currentDay = isToday(date);
          const past = isPastDate(date);
          const totalCount = dayAppointments.length + dayEvents.length;

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onDateClick(date)}
              className={`min-h-[5rem] rounded-lg border p-1 text-left transition sm:min-h-[6.25rem] sm:p-2 ${
                currentDay
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500'
                  : 'border-slate-100 hover:bg-slate-50'
              } ${past ? 'opacity-60' : ''}`}
            >
              <span
                className={`text-xs sm:text-sm ${currentDay ? 'font-bold text-brand-700' : 'text-slate-700'}`}
              >
                {date.getDate()}
              </span>
              <div className="mt-1 space-y-0.5 overflow-hidden">
                {dayItems.slice(0, 2).map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className={`truncate rounded border px-1 py-0.5 text-[10px] font-medium sm:text-xs ${item.styles.bg} ${item.styles.text} ${item.styles.border}`}
                    title={`${formatTime(item.startTime)} · ${item.label}`}
                  >
                    <span className="font-semibold">{formatTime(item.startTime)}</span>{' '}
                    {item.label}
                  </div>
                ))}
                {totalCount > 2 && (
                  <p className="text-[10px] text-slate-500 sm:text-xs">
                    +{totalCount - 2} {t.appointments.moreOnDay}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <CalendarRoomLegend />
    </section>
  );
};

export default CalendarMonthGrid;
