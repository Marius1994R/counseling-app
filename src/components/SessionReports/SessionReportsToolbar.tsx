import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { TimeRangeFilter } from '../../utils/timeRange';
import { CounselorOption } from '../../hooks/useSessionReportsData';
import { t } from '../../utils/translations';
import { SessionReportsStatusFilter } from './sessionReportsUtils';

interface SessionReportsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  counselorFilter: string;
  onCounselorFilterChange: (value: string) => void;
  timeRangeFilter: TimeRangeFilter;
  onTimeRangeFilterChange: (value: TimeRangeFilter) => void;
  statusFilter: SessionReportsStatusFilter;
  onStatusFilterChange: (value: SessionReportsStatusFilter) => void;
  counselors: CounselorOption[];
  showCounselorFilter: boolean;
  filteredCount: number;
}

const StatusPill: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
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
);

const SessionReportsToolbar: React.FC<SessionReportsToolbarProps> = ({
  searchTerm,
  onSearchChange,
  counselorFilter,
  onCounselorFilterChange,
  timeRangeFilter,
  onTimeRangeFilterChange,
  statusFilter,
  onStatusFilterChange,
  counselors,
  showCounselorFilter,
  filteredCount,
}) => (
  <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="relative">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t.sessionReports.searchPlaceholder}
        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        <StatusPill
          label={t.sessionReports.statusActive}
          active={statusFilter === 'active'}
          onClick={() => onStatusFilterChange('active')}
        />
        <StatusPill
          label={t.sessionReports.statusOthers}
          active={statusFilter === 'others'}
          onClick={() => onStatusFilterChange('others')}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {showCounselorFilter && (
          <select
            id="reports-counselor"
            value={counselorFilter}
            onChange={(e) => onCounselorFilterChange(e.target.value)}
            aria-label={t.sessionReports.counselorLabel}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">{t.sessionReports.allCounselors}</option>
            {counselors.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.name}
              </option>
            ))}
          </select>
        )}

        <select
          id="reports-period"
          value={timeRangeFilter}
          onChange={(e) => onTimeRangeFilterChange(e.target.value as TimeRangeFilter)}
          aria-label={t.sessionReports.periodLabel}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="3months">{t.activity.periods.threeMonths}</option>
          <option value="6months">{t.activity.periods.sixMonths}</option>
          <option value="9months">{t.activity.periods.nineMonths}</option>
          <option value="alltime">{t.activity.periods.allTime}</option>
        </select>
      </div>
    </div>

    <p className="text-xs text-slate-500">
      {filteredCount}{' '}
      {filteredCount === 1 ? t.sessionReports.caseSingular : t.sessionReports.casePlural}
    </p>
  </div>
);

export default SessionReportsToolbar;
