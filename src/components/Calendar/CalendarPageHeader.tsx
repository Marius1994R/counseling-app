import React from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

const CalendarPageHeader: React.FC = () => (
  <div className="mb-6">
    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:text-3xl">
      <CalendarDaysIcon className="h-7 w-7 text-brand-gold sm:h-8 sm:w-8" />
      {t.navigation.calendar}
    </h1>
    <p className="mt-1 text-sm text-slate-500">{t.appointments.subtitle}</p>
  </div>
);

export default CalendarPageHeader;
