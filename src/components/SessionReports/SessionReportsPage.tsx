import React, { useState, useCallback } from 'react';
import { Alert, useMediaQuery, useTheme } from '@mui/material';
import { useSessionReportsData } from '../../hooks/useSessionReportsData';
import SessionReportsToolbar from './SessionReportsToolbar';
import SessionReportsCaseList from './SessionReportsCaseList';
import SessionReportsTimeline from './SessionReportsTimeline';
import SessionReportsSkeleton from './SessionReportsSkeleton';
import SessionReport from '../Cases/SessionReport';
import { Case } from '../../types';

const SessionReportsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'), { noSsr: true });
  const data = useSessionReportsData();
  const { selectCase, selectedSummary, refetch } = data;

  const [sessionReportOpen, setSessionReportOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [mobileDossierOpen, setMobileDossierOpen] = useState(false);

  const openAddReportForCase = useCallback((caseItem: Case) => {
    setSelectedCase(caseItem);
    setSessionReportOpen(true);
  }, []);

  const handleAddReportFromDossier = useCallback(() => {
    if (!selectedSummary?.case) return;
    openAddReportForCase(selectedSummary.case);
  }, [selectedSummary, openAddReportForCase]);

  const handleSelectCase = useCallback(
    (caseId: string) => {
      selectCase(caseId);
      setMobileDossierOpen(true);
    },
    [selectCase]
  );

  const handleCloseSessionReport = () => {
    setSessionReportOpen(false);
    setSelectedCase(null);
  };

  const handleReportSaved = () => {
    const caseId = selectedCase?.id;
    setSessionReportOpen(false);
    setSelectedCase(null);
    refetch();
    if (caseId) {
      selectCase(caseId);
    }
  };

  if (data.loading) {
    return (
      <div>
        <SessionReportsSkeleton />
      </div>
    );
  }

  const canAddReport =
    selectedSummary?.case.status === 'active' ||
    selectedSummary?.case.status === 'finished';

  const dossierProps = {
    summary: data.selectedSummary,
    onAddReport: canAddReport ? handleAddReportFromDossier : undefined,
  };

  return (
    <div>
      {data.error && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {data.error}
        </Alert>
      )}

      <SessionReportsToolbar
        searchTerm={data.searchTerm}
        onSearchChange={data.setSearchTerm}
        counselorFilter={data.counselorFilter}
        onCounselorFilterChange={data.setCounselorFilter}
        timeRangeFilter={data.timeRangeFilter}
        onTimeRangeFilterChange={data.setTimeRangeFilter}
        statusFilter={data.statusFilter}
        onStatusFilterChange={data.setStatusFilter}
        counselors={data.counselorOptions}
        showCounselorFilter={data.showCounselorFilter}
        filteredCount={data.filteredSummaries.length}
      />

      <div
        className={
          isMobile
            ? ''
            : 'grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start'
        }
      >
        <SessionReportsCaseList
          summaries={data.filteredSummaries}
          selectedCaseId={data.selectedSummary?.case.id ?? null}
          onSelectCase={handleSelectCase}
        />

        {!isMobile && <SessionReportsTimeline variant="panel" {...dossierProps} />}
      </div>

      {isMobile && (
        <SessionReportsTimeline
          variant="drawer"
          open={mobileDossierOpen}
          onClose={() => setMobileDossierOpen(false)}
          {...dossierProps}
        />
      )}

      <SessionReport
        open={sessionReportOpen}
        onClose={handleCloseSessionReport}
        caseId={selectedCase?.id || ''}
        caseTitle={selectedCase?.title || ''}
        onReportAdded={handleReportSaved}
        onCancelAddForm={handleCloseSessionReport}
        hideAddButton
        caseStatus={selectedCase?.status}
        autoOpenAddForm
      />
    </div>
  );
};

export default SessionReportsPage;
