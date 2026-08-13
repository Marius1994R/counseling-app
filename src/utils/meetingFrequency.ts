import { MeetingFrequencyWeeks } from '../types';
import { t } from './translations';

export const MEETING_FREQUENCY_OPTIONS: MeetingFrequencyWeeks[] = [1, 2, 3, 4];

export function isMeetingFrequencyWeeks(value: unknown): value is MeetingFrequencyWeeks {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

export function meetingFrequencyLabel(weeks: MeetingFrequencyWeeks): string {
  return t.sessionReports.frequencyOptions[weeks];
}

/** True when cadence is overdue by more than one week past the agreed interval. */
export function isMeetingFrequencyOverdue(
  lastMeetingDate: Date,
  frequencyWeeks: MeetingFrequencyWeeks,
  now = new Date()
): boolean {
  const dueMs =
    lastMeetingDate.getTime() + (frequencyWeeks + 1) * 7 * 24 * 60 * 60 * 1000;
  return now.getTime() > dueMs;
}

export function toMeetingDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}
