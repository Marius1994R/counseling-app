import { WEEKLY_VERSES } from '../data/weeklyVerses';
import { getIsoWeekKey, getWeeklyVerse } from './weeklyVerse';

describe('weeklyVerse', () => {
  it('returns the same verse for the same date', () => {
    const date = new Date('2026-06-11');
    const first = getWeeklyVerse(date);
    const second = getWeeklyVerse(date);
    expect(first).toEqual(second);
  });

  it('returns a verse from the pool', () => {
    const verse = getWeeklyVerse(new Date('2026-06-11'));
    expect(WEEKLY_VERSES).toContainEqual(verse);
  });

  it('rotates to a different verse on consecutive ISO weeks', () => {
    const weekOne = getWeeklyVerse(new Date('2026-06-09'));
    const weekTwo = getWeeklyVerse(new Date('2026-06-16'));
    expect(weekOne).not.toEqual(weekTwo);
  });

  it('cycles through the 28-verse pool', () => {
    expect(WEEKLY_VERSES).toHaveLength(28);
    const keys = new Set(
      Array.from({ length: 28 }, (_, index) => {
        const date = new Date(Date.UTC(2026, 0, 5 + index * 7));
        return getIsoWeekKey(date) % WEEKLY_VERSES.length;
      })
    );
    expect(keys.size).toBeGreaterThan(1);
  });
});
