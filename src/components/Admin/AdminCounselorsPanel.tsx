import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Alert } from '@mui/material';
import { Counselor, UserRole } from '../../types';
import { WorkloadFilter } from './adminUtils';
import { t } from '../../utils/translations';
import CounselorsToolbar from '../Counselors/CounselorsToolbar';
import CounselorsFilterTabs from '../Counselors/CounselorsFilterTabs';
import CounselorsGrid from '../Counselors/CounselorsGrid';
import AdminSkeleton from './AdminSkeleton';

interface AdminCounselorsPanelProps {
  loading: boolean;
  error: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  workloadFilter: WorkloadFilter;
  onWorkloadFilterChange: (value: WorkloadFilter) => void;
  filteredCounselors: Counselor[];
  workloadCounts: { all: number; low: number; moderate: number; high: number };
  onAdd: () => void;
  onEdit: (counselor: Counselor) => void;
  onDelete: (counselorId: string) => void;
  getCasesForCounselor: (counselorId: string) => import('../../types').Case[];
  currentUserRole?: UserRole;
}

const AdminCounselorsPanel: React.FC<AdminCounselorsPanelProps> = ({
  loading,
  error,
  searchTerm,
  onSearchChange,
  workloadFilter,
  onWorkloadFilterChange,
  filteredCounselors,
  workloadCounts,
  onAdd,
  onEdit,
  onDelete,
  getCasesForCounselor,
  currentUserRole,
}) => {
  const hasFilters = searchTerm.trim() !== '' || workloadFilter !== 'all';
  const canDelete = currentUserRole === 'leader';
  const canCreateProfile = currentUserRole === 'leader';

  if (loading) {
    return <AdminSkeleton />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          {t.adminTools.counselorsManagement}
        </h2>
        {canCreateProfile && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            {t.adminTools.addCounselor}
          </button>
        )}
      </div>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {error}
        </Alert>
      )}

      <CounselorsToolbar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        filteredCount={filteredCounselors.length}
      />

      <CounselorsFilterTabs
        activeFilter={workloadFilter}
        onFilterChange={onWorkloadFilterChange}
        counts={workloadCounts}
      />

      <CounselorsGrid
        counselors={filteredCounselors}
        getCasesForCounselor={getCasesForCounselor}
        onEdit={onEdit}
        onDelete={onDelete}
        canEdit
        canDelete={canDelete}
        hasFilters={hasFilters}
        canAdd={canCreateProfile}
        onAdd={onAdd}
      />
    </div>
  );
};

export default AdminCounselorsPanel;
