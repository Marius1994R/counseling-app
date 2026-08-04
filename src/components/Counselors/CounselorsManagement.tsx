import React from 'react';
import { Alert } from '@mui/material';
import { useCounselorsData } from '../../hooks/useCounselorsData';
import CounselorForm from './CounselorForm';
import CounselorsPageHeader from './CounselorsPageHeader';
import CounselorsToolbar from './CounselorsToolbar';
import CounselorsFilterTabs from './CounselorsFilterTabs';
import CounselorsGrid from './CounselorsGrid';
import CounselorsSkeleton from './CounselorsSkeleton';

const CounselorsManagement: React.FC = () => {
  const data = useCounselorsData();
  const hasFilters = data.searchTerm.trim() !== '' || data.workloadFilter !== 'all';

  if (data.loading) {
    return (
      <div>
        <CounselorsPageHeader canAdd={data.canEdit} onAdd={data.handleAddCounselor} />
        <CounselorsSkeleton />
      </div>
    );
  }

  return (
    <div>
      <CounselorsPageHeader canAdd={data.canEdit} onAdd={data.handleAddCounselor} />

      {data.error && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {data.error}
        </Alert>
      )}

      <CounselorsToolbar
        searchTerm={data.searchTerm}
        onSearchChange={data.setSearchTerm}
        filteredCount={data.filteredCounselors.length}
      />

      <CounselorsFilterTabs
        activeFilter={data.workloadFilter}
        onFilterChange={data.setWorkloadFilter}
        counts={data.workloadCounts}
      />

      <CounselorsGrid
        counselors={data.filteredCounselors}
        getCasesForCounselor={data.getCasesForCounselor}
        onEdit={data.handleEditCounselor}
        onDelete={data.handleDeleteCounselor}
        canEdit={data.canEdit}
        canDelete={data.canDelete}
        hasFilters={hasFilters}
        canAdd={data.canEdit}
        onAdd={data.handleAddCounselor}
      />

      <CounselorForm
        open={data.formOpen}
        onClose={data.handleCloseForm}
        onSubmit={data.handleFormSubmit}
        counselorData={data.editingCounselor}
      />
    </div>
  );
};

export default CounselorsManagement;
