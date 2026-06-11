import React from 'react';
import { WorkloadFilter } from './counselorsUtils';
import { t } from '../../utils/translations';

interface CounselorsFilterTabsProps {
  activeFilter: WorkloadFilter;
  onFilterChange: (filter: WorkloadFilter) => void;
  counts: { all: number; low: number; moderate: number; high: number };
}

interface TabPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const TabPill: React.FC<TabPillProps> = ({ label, active, onClick }) => (
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

const CounselorsFilterTabs: React.FC<CounselorsFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => (
  <div className="mb-6 flex flex-wrap gap-2">
    <TabPill
      label={`${t.counselors.filters.all} (${counts.all})`}
      active={activeFilter === 'all'}
      onClick={() => onFilterChange('all')}
    />
    <TabPill
      label={`${t.counselors.filters.low} (${counts.low})`}
      active={activeFilter === 'low'}
      onClick={() => onFilterChange('low')}
    />
    <TabPill
      label={`${t.counselors.filters.moderate} (${counts.moderate})`}
      active={activeFilter === 'moderate'}
      onClick={() => onFilterChange('moderate')}
    />
    <TabPill
      label={`${t.counselors.filters.high} (${counts.high})`}
      active={activeFilter === 'high'}
      onClick={() => onFilterChange('high')}
    />
  </div>
);

export default CounselorsFilterTabs;
