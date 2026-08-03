import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CaseStatus } from '../../types';
import { TimeRangeFilter } from '../../utils/timeRange';
import { CounselorOption } from '../../hooks/useSessionReportsData';
import { t } from '../../utils/translations';
import { CASE_STATUS_FILTERS } from '../Cases/casesUtils';
import { getStatusLabel } from '../Dashboard/dashboardUtils';

interface SessionReportsToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  counselorFilter: string;
  onCounselorFilterChange: (value: string) => void;
  timeRangeFilter: TimeRangeFilter;
  onTimeRangeFilterChange: (value: TimeRangeFilter) => void;
  statusFilter: CaseStatus | 'all';
  onStatusFilterChange: (value: CaseStatus | 'all') => void;
  counselors: CounselorOption[];
  showCounselorFilter: boolean;
  filteredCount: number;
}

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

    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {showCounselorFilter && (
        <div>
          <label htmlFor="reports-counselor" className="mb-1 block text-xs font-medium text-slate-500">
            {t.sessionReports.counselorLabel}
          </label>
          <select
            id="reports-counselor"
            value={counselorFilter}
            onChange={(e) => onCounselorFilterChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">{t.sessionReports.allCounselors}</option>
            {counselors.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="reports-period" className="mb-1 block text-xs font-medium text-slate-500">
          {t.sessionReports.periodLabel}
        </label>
        <select
          id="reports-period"
          value={timeRangeFilter}
          onChange={(e) => onTimeRangeFilterChange(e.target.value as TimeRangeFilter)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="3months">{t.activity.periods.threeMonths}</option>
          <option value="6months">{t.activity.periods.sixMonths}</option>
          <option value="9months">{t.activity.periods.nineMonths}</option>
          <option value="alltime">{t.activity.periods.allTime}</option>
        </select>
      </div>

      <div>
        <label htmlFor="reports-status" className="mb-1 block text-xs font-medium text-slate-500">
          {t.sessionReports.statusLabel}
        </label>
        <select
          id="reports-status"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as CaseStatus | 'all')}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">{t.sessionReports.allStatuses}</option>
          {CASE_STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {getStatusLabel(status)}
            </option>
          ))}
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
