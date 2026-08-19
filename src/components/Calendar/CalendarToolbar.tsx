import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Counselor } from '../../types';
import { t } from '../../utils/translations';

interface CalendarToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  counselorFilter: string;
  onCounselorFilterChange: (value: string) => void;
  counselors: Counselor[];
  filteredCount: number;
}

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  searchTerm,
  onSearchChange,
  counselorFilter,
  onCounselorFilterChange,
  counselors,
  filteredCount,
}) => {
  const countLabel = filteredCount === 1 ? 'programare' : 'programări';

  return (
    <div className="mb-0 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="calendar-search"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t.appointments.searchLabel}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="calendar-search"
                type="search"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.appointments.searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="calendar-counselor"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t.appointments.counselor}
            </label>
            <select
              id="calendar-counselor"
              value={counselorFilter}
              onChange={(e) => onCounselorFilterChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">{t.appointments.filters.allCounselors}</option>
              {counselors.map((counselor) => (
                <option key={counselor.id} value={counselor.id}>
                  {counselor.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-600">
            {filteredCount} {countLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarToolbar;
