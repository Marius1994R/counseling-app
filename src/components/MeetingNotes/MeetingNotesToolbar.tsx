import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

interface MeetingNotesToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'active' | 'others';
  onStatusFilterChange: (value: 'active' | 'others') => void;
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

const MeetingNotesToolbar: React.FC<MeetingNotesToolbarProps> = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  filteredCount,
}) => (
  <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="relative">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t.meetingNotes.searchPlaceholder}
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
      <p className="text-xs text-slate-500">
        {filteredCount}{' '}
        {filteredCount === 1
          ? t.sessionReports.caseSingular
          : t.sessionReports.casePlural}
      </p>
    </div>
  </div>
);

export default MeetingNotesToolbar;
