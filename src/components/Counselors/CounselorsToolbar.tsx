import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

interface CounselorsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
}

const CounselorsToolbar: React.FC<CounselorsToolbarProps> = ({
  searchTerm,
  onSearchChange,
  filteredCount,
}) => {
  const countLabel =
    filteredCount === 1 ? t.counselors.countSingular : t.counselors.countPlural;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <label
          htmlFor="counselors-search"
          className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
        >
          {t.counselors.searchLabel}
        </label>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="counselors-search"
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.counselors.searchPlaceholder}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-600">
          {filteredCount} {countLabel}
        </span>
      </div>
    </div>
  );
};

export default CounselorsToolbar;
