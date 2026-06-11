import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CaseStatus } from '../../types';
import { t } from '../../utils/translations';

interface CasesToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: CaseStatus | 'all';
  onStatusFilterChange: (status: CaseStatus | 'all') => void;
  filteredCount: number;
  activeCasesCount: number;
  waitingCasesCount: number;
}

interface FilterPillProps {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, active, count, onClick }) => (
  <div className="relative">
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 active:scale-[0.98] ${
        active
          ? 'bg-brand-50 text-brand-600'
          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
    {count !== undefined && count > 0 && (
      <span className="absolute -right-2 -top-2 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border-2 border-white bg-brand-600 px-1.5 text-xs font-bold text-white">
        {count}
      </span>
    )}
  </div>
);

const CasesToolbar: React.FC<CasesToolbarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  filteredCount,
  activeCasesCount,
  waitingCasesCount,
}) => {
  const countLabel = filteredCount === 1 ? 'caz' : 'cazuri';

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <label htmlFor="cases-search" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t.cases.searchLabel}
        </label>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            id="cases-search"
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.cases.filters.searchPlaceholder || 'Căutați cazuri'}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.cases.filterByStatus}
          </span>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-600">
            {filteredCount} {countLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterPill
            label={t.status.active}
            active={statusFilter === 'active'}
            count={activeCasesCount}
            onClick={() => onStatusFilterChange('active')}
          />
          <FilterPill
            label={t.status.waiting}
            active={statusFilter === 'waiting'}
            count={waitingCasesCount}
            onClick={() => onStatusFilterChange('waiting')}
          />
          <FilterPill
            label={t.status.completed}
            active={statusFilter === 'finished'}
            onClick={() => onStatusFilterChange('finished')}
          />
          <FilterPill
            label={t.status.all}
            active={statusFilter === 'all'}
            onClick={() => onStatusFilterChange('all')}
          />
        </div>
      </div>
    </div>
  );
};

export default CasesToolbar;
