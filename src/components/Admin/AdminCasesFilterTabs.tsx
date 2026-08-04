import React from 'react';
import { CaseStatusFilter, AdminCaseStatusCounts } from './adminUtils';
import { t } from '../../utils/translations';

interface AdminCasesFilterTabsProps {
  activeFilter: CaseStatusFilter;
  onFilterChange: (filter: CaseStatusFilter) => void;
  counts: AdminCaseStatusCounts;
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

const AdminCasesFilterTabs: React.FC<AdminCasesFilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => (
  <div className="mb-6 flex flex-wrap gap-2">
    <TabPill
      label={`${t.adminTools.allStatuses} (${counts.all})`}
      active={activeFilter === 'all'}
      onClick={() => onFilterChange('all')}
    />
    <TabPill
      label={`${t.status.waiting} (${counts.waiting})`}
      active={activeFilter === 'waiting'}
      onClick={() => onFilterChange('waiting')}
    />
    <TabPill
      label={`${t.status.active} (${counts.active})`}
      active={activeFilter === 'active'}
      onClick={() => onFilterChange('active')}
    />
    <TabPill
      label={`${t.status.unfinished} (${counts.unfinished})`}
      active={activeFilter === 'unfinished'}
      onClick={() => onFilterChange('unfinished')}
    />
    <TabPill
      label={`${t.status.completed} (${counts.finished})`}
      active={activeFilter === 'finished'}
      onClick={() => onFilterChange('finished')}
    />
    <TabPill
      label={`${t.status.cancelled} (${counts.cancelled})`}
      active={activeFilter === 'cancelled'}
      onClick={() => onFilterChange('cancelled')}
    />
  </div>
);

export default AdminCasesFilterTabs;
