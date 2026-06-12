import React from 'react';
import { getWeeklyVerse } from '../../utils/weeklyVerse';
import { t } from '../../utils/translations';

const WeeklyVerseCard: React.FC = () => {
  const verse = getWeeklyVerse();

  return (
    <div className="mx-3 mt-2 mb-6 rounded-xl bg-brand-50/60 p-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-600/80">
        {t.dashboard.weeklyVerse}
      </p>
      <p className="text-xs italic leading-relaxed text-slate-500">
        „{verse.text}” — {verse.reference}
      </p>
    </div>
  );
};

export default WeeklyVerseCard;
