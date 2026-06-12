import { WEEKLY_VERSES, WeeklyVerse } from '../data/weeklyVerses';

export function getIsoWeekKey(date: Date): number {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return utc.getUTCFullYear() * 100 + week;
}

export function getWeeklyVerse(date: Date = new Date()): WeeklyVerse {
  const weekKey = getIsoWeekKey(date);
  const index = weekKey % WEEKLY_VERSES.length;
  return WEEKLY_VERSES[index];
}
