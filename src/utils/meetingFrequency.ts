import { MeetingFrequencyWeeks } from '../types';
import { t } from './translations';

export const MEETING_FREQUENCY_OPTIONS: MeetingFrequencyWeeks[] = [1, 2, 3, 4];

export function isMeetingFrequencyWeeks(value: unknown): value is MeetingFrequencyWeeks {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function meetingFrequencyLabel(weeks: MeetingFrequencyWeeks): string {
  return t.sessionReports.frequencyOptions[weeks];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** True when the gap since the last meeting exceeds the agreed interval. */
export function isMeetingFrequencyOverdue(
  lastMeetingDate: Date,
  frequencyWeeks: MeetingFrequencyWeeks,
  now = new Date()
): boolean {
  const dueMs =
    lastMeetingDate.getTime() + frequencyWeeks * 7 * DAY_MS;
  return now.getTime() > dueMs;
}

export function formatMeetingFrequencyOverdueBy(
  lastMeetingDate: Date,
  frequencyWeeks: MeetingFrequencyWeeks,
  now = new Date()
): string {
  const dueMs = lastMeetingDate.getTime() + frequencyWeeks * 7 * DAY_MS;
  const overdueMs = Math.max(0, now.getTime() - dueMs);
  const overdueDays = Math.max(1, Math.ceil(overdueMs / DAY_MS));

  if (overdueDays < 7) {
    return overdueDays === 1 ? '1 zi' : `${overdueDays} zile`;
  }

  const weeks = Math.floor(overdueDays / 7);
  const days = overdueDays % 7;
  const weeksLabel = weeks === 1 ? '1 săptămână' : `${weeks} săptămâni`;
  if (days === 0) return weeksLabel;
  const daysLabel = days === 1 ? '1 zi' : `${days} zile`;
  return `${weeksLabel} și ${daysLabel}`;
}

export function toMeetingDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}
