import dayjs, { Dayjs } from 'dayjs';
import { ChurchEvent } from '../../types';
import { t } from '../../utils/translations';
import { formatTime } from './calendarUtils';

export interface EventDisplayStyles {
  bg: string;
  text: string;
  border: string;
  dot: string;
  accent: string;
}

export const EVENT_DISPLAY_STYLES: EventDisplayStyles = {
  bg: 'bg-indigo-100',
  text: 'text-indigo-900',
  border: 'border-indigo-300',
  dot: 'bg-indigo-500',
  accent: '#6366f1',
};

export function getEventDisplayStyles(): EventDisplayStyles {
  return EVENT_DISPLAY_STYLES;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function eventOccursOnDate(event: ChurchEvent, date: Date): boolean {
  const day = startOfDay(date).getTime();
  const start = startOfDay(event.startDate).getTime();
  const end = startOfDay(event.endDate).getTime();
  return day >= start && day <= end;
}

export function getEventsForDate(events: ChurchEvent[], date: Date): ChurchEvent[] {
  return events.filter((event) => eventOccursOnDate(event, date));
}

export function sortEventsByTime(events: ChurchEvent[]): ChurchEvent[] {
  return [...events].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function formatEventDateRange(event: ChurchEvent): string {
  const start = dayjs(event.startDate);
  const end = dayjs(event.endDate);
  if (start.isSame(end, 'day')) {
    return start.format('DD MMM YYYY');
  }
  return `${start.format('DD MMM')} – ${end.format('DD MMM YYYY')}`;
}

export function formatEventTimeRange(event: ChurchEvent): string {
  return `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`;
}

/** True when the event's last day + end time is in the past. */
export function isPastEvent(event: ChurchEvent, now = new Date()): boolean {
  const end = startOfDay(event.endDate);
  const [hours, minutes] = event.endTime.split(':').map(Number);
  end.setHours(hours, minutes, 0, 0);
  return end.getTime() <= now.getTime();
}

export function getNextEventOccurrenceDate(event: ChurchEvent, now = new Date()): Date | null {
  const today = startOfDay(now);
  const rangeStart = startOfDay(event.startDate);
  const rangeEnd = startOfDay(event.endDate);

  if (rangeEnd.getTime() < today.getTime()) {
    return null;
  }

  let cursor = rangeStart.getTime() < today.getTime() ? new Date(today) : new Date(rangeStart);

  while (cursor.getTime() <= rangeEnd.getTime()) {
    const [hours, minutes] = event.endTime.split(':').map(Number);
    const endDateTime = new Date(cursor);
    endDateTime.setHours(hours, minutes, 0, 0);

    if (endDateTime > now) {
      return new Date(cursor);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return null;
}

export function getUpcomingEvents(events: ChurchEvent[], now = new Date()) {
  return events
    .map((event) => {
      const displayDate = getNextEventOccurrenceDate(event, now);
      return displayDate ? { event, displayDate } : null;
    })
    .filter((item): item is { event: ChurchEvent; displayDate: Date } => item !== null)
    .sort((a, b) => {
      const dateCompare = a.displayDate.getTime() - b.displayDate.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.event.startTime.localeCompare(b.event.startTime);
    });
}

export function isValidRegistrationUrl(url: string): boolean {
  if (!url.trim()) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export interface EventFormValues {
  name: string;
  description: string;
  startDate: Dayjs | null;
  endDate: Dayjs | null;
  startTime: Dayjs | null;
  endTime: Dayjs | null;
  registrationUrl: string;
}

export function validateEventForm(
  values: EventFormValues,
  isEditing: boolean
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.name.trim()) {
    errors.name = t.events.nameRequired;
  }
  if (!values.description.trim()) {
    errors.description = t.events.descriptionRequired;
  }
  if (!values.startDate) {
    errors.startDate = t.events.startDateRequired;
  }
  if (!values.endDate) {
    errors.endDate = t.events.endDateRequired;
  }
  if (values.startDate && values.endDate && values.endDate.isBefore(values.startDate, 'day')) {
    errors.endDate = t.events.endDateBeforeStart;
  }
  if (!values.startTime) {
    errors.startTime = t.events.startTimeRequired;
  }
  if (!values.endTime) {
    errors.endTime = t.events.endTimeRequired;
  }
  if (values.startTime && values.endTime) {
    const duration = values.endTime.diff(values.startTime, 'minute');
    if (duration < 15) {
      errors.endTime = t.events.minDuration;
    }
  }

  if (!isEditing && values.startDate && values.startDate.isBefore(dayjs().startOf('day'))) {
    errors.startDate = t.events.pastDateError;
  }

  if (values.registrationUrl.trim() && !isValidRegistrationUrl(values.registrationUrl)) {
    errors.registrationUrl = t.events.invalidUrl;
  }

  return errors;
}

export type CalendarDayItem =
  | {
      kind: 'appointment';
      id: string;
      startTime: string;
      endTime: string;
      label: string;
      styles: { bg: string; text: string; border: string; dot: string };
    }
  | {
      kind: 'event';
      id: string;
      startTime: string;
      endTime: string;
      label: string;
      styles: EventDisplayStyles;
    };
