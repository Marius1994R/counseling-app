import React, { useState, useEffect } from 'react';
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
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
  canViewCaseDetails?: (appointment: Appointment) => boolean;
}

const MAX_BANNERS = 3;
const MAX_MOBILE_DOTS = 4;

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
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
        styles: {
          bg: colors.bg,
          text: colors.text,
          border: colors.border,
          dot: colors.dot,
        },
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
  selectedDate,
  onDateClick,
  canViewCaseDetails = () => false,
}) => {
  const [currentDate, setCurrentDate] = useState(
    () => selectedDate ?? new Date()
  );

  useEffect(() => {
    if (!selectedDate) return;
    setCurrentDate((prev) => {
      if (
        prev.getFullYear() === selectedDate.getFullYear() &&
        prev.getMonth() === selectedDate.getMonth()
      ) {
        return prev;
      }
      return new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    });
  }, [selectedDate]);

  const days = getDaysInMonth(currentDate);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">
          {MONTH_NAMES_RO[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50"
            aria-label="Luna anterioară"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              setCurrentDate(today);
              onDateClick(today);
            }}
            className="rounded-full border border-brand-200 px-3 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
          >
            {t.dashboard.today}
          </button>
          <button
            type="button"
            onClick={() =>
              setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }
            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50"
            aria-label="Luna următoare"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAY_NAMES_RO.map((day) => (
          <div
            key={day}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="min-h-[3.25rem] sm:min-h-[5.5rem]" />;
          }

          const dayAppointments = sortAppointmentsByTime(
            getAppointmentsForDate(appointments, date)
          );
          const dayEvents = sortEventsByTime(getEventsForDate(events, date));
          const dayItems = buildDayItems(dayAppointments, dayEvents, canViewCaseDetails);
          const currentDay = isToday(date);
          const selected = selectedDate ? isSameCalendarDay(date, selectedDate) : false;
          const past = isPastDate(date);
          const bannerOverflow = dayItems.length - MAX_BANNERS;
          const mobileDots = dayItems.slice(0, MAX_MOBILE_DOTS);
          const mobileOverflow = dayItems.length - MAX_MOBILE_DOTS;

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onDateClick(date)}
              className={`flex min-h-[3.25rem] min-w-0 flex-col overflow-hidden rounded-lg border p-0.5 text-left transition sm:min-h-[5.5rem] sm:p-1.5 ${
                selected
                  ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500'
                  : currentDay
                    ? 'border-brand-300 bg-brand-50/60'
                    : 'border-slate-100 hover:bg-slate-50'
              } ${past && !selected ? 'opacity-60' : ''}`}
            >
              <span
                className={`mb-0.5 text-center text-xs sm:mb-0.5 sm:text-left sm:text-sm ${
                  selected || currentDay ? 'font-bold text-brand-700' : 'font-medium text-slate-700'
                }`}
              >
                {date.getDate()}
              </span>

              {/* Mobile: vertical colored dots */}
              <div className="flex min-h-0 flex-1 flex-col items-center gap-0.5 overflow-hidden sm:hidden">
                {mobileDots.map((item) => (
                  <span
                    key={`${item.kind}-${item.id}`}
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.styles.dot}`}
                    title={`${formatTime(item.startTime)} · ${item.label}`}
                  />
                ))}
                {mobileOverflow > 0 && (
                  <span className="text-[8px] leading-none text-slate-500">+{mobileOverflow}</span>
                )}
              </div>

              {/* Desktop / tablet: colored banners */}
              <div className="hidden min-h-0 min-w-0 flex-1 flex-col gap-0.5 overflow-hidden sm:flex">
                {dayItems.slice(0, MAX_BANNERS).map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${item.styles.bg} ${item.styles.text}`}
                    title={`${formatTime(item.startTime)} · ${item.label}`}
                  >
                    <span className="font-semibold">{formatTime(item.startTime)}</span>{' '}
                    {item.label}
                  </div>
                ))}
                {bannerOverflow > 0 && (
                  <p className="truncate px-0.5 text-[10px] text-slate-500">
                    +{bannerOverflow} {t.appointments.moreOnDay}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        <CalendarRoomLegend />
      </div>
    </section>
  );
};

export default CalendarMonthGrid;
