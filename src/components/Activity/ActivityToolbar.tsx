import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Counselor } from '../../types';
import { TimeRangeFilter } from './activityUtils';
import { t } from '../../utils/translations';

interface ActivityToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  counselorFilter: string;
  onCounselorFilterChange: (value: string) => void;
  timeRangeFilter: TimeRangeFilter;
  onTimeRangeFilterChange: (value: TimeRangeFilter) => void;
  counselors: Counselor[];
  filteredCount: number;
  showCounselorFilter: boolean;
  showCounselorTypeFilter: boolean;
}

const ActivityToolbar: React.FC<ActivityToolbarProps> = ({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  counselorFilter,
  onCounselorFilterChange,
  timeRangeFilter,
  onTimeRangeFilterChange,
  counselors,
  filteredCount,
  showCounselorFilter,
  showCounselorTypeFilter,
}) => {
  const countLabel =
    filteredCount === 1 ? t.activity.countSingular : t.activity.countPlural;

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <label
            htmlFor="activity-search"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {t.activity.searchLabel}
          </label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="activity-search"
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.activity.searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="activity-type"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {t.activity.typeLabel}
          </label>
          <select
            id="activity-type"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="all">{t.activity.allTypes}</option>
            <option value="case_created">{t.activity.types.caseCreated}</option>
            <option value="case_status_changed">{t.activity.types.caseStatusChanged}</option>
            <option value="case_assigned">{t.activity.types.caseAssigned}</option>
            <option value="case_updated">{t.activity.types.caseUpdated}</option>
            <option value="meeting_notes_added">{t.activity.types.meetingNotesAdded}</option>
            <option value="session_report_added">{t.activity.types.sessionReportAdded}</option>
            <option value="appointment_created">{t.activity.types.appointmentCreated}</option>
            {showCounselorTypeFilter && (
              <option value="counselor_created">{t.activity.types.counselorAdded}</option>
            )}
          </select>
        </div>

        {showCounselorFilter && (
          <div>
            <label
              htmlFor="activity-counselor"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t.activity.counselorLabel}
            </label>
            <select
              id="activity-counselor"
              value={counselorFilter}
              onChange={(e) => onCounselorFilterChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">{t.activity.allCounselors}</option>
              {counselors.map((counselor) => (
                <option key={counselor.id} value={counselor.id}>
                  {counselor.fullName}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor="activity-period"
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            {t.activity.periodLabel}
          </label>
          <select
            id="activity-period"
            value={timeRangeFilter}
            onChange={(e) => onTimeRangeFilterChange(e.target.value as TimeRangeFilter)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="3months">{t.activity.periods.threeMonths}</option>
            <option value="6months">{t.activity.periods.sixMonths}</option>
            <option value="9months">{t.activity.periods.nineMonths}</option>
            <option value="alltime">{t.activity.periods.allTime}</option>
          </select>
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

export default ActivityToolbar;
