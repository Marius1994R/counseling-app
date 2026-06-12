import React, { useState } from 'react';
import {
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Chip,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useSessionReportsData } from '../../hooks/useSessionReportsData';
import SessionReportsPageHeader from './SessionReportsPageHeader';
import SessionReportsKpiRow from './SessionReportsKpiRow';
import SessionReportsToolbar from './SessionReportsToolbar';
import SessionReportsCaseList from './SessionReportsCaseList';
import SessionReportsTimeline from './SessionReportsTimeline';
import SessionReportsSkeleton from './SessionReportsSkeleton';
import SessionReport from '../Cases/SessionReport';
import { Case } from '../../types';
import { t } from '../../utils/translations';

const SessionReportsPage: React.FC = () => {
  const data = useSessionReportsData();
  const [casePickerOpen, setCasePickerOpen] = useState(false);
  const [sessionReportOpen, setSessionReportOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  const activeCases = data.allCases.filter((c) => c.status === 'active');

  const handleAddReport = () => {
    setCasePickerOpen(true);
  };

  const handleSelectCaseForReport = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setCasePickerOpen(false);
    setSessionReportOpen(true);
  };

  const handleCloseSessionReport = () => {
    setSessionReportOpen(false);
    setSelectedCase(null);
    setCasePickerOpen(true);
  };

  const handleReportSaved = () => {
    const caseId = selectedCase?.id;
    setSessionReportOpen(false);
    setSelectedCase(null);
    setCasePickerOpen(false);
    data.refetch();
    if (caseId) {
      data.selectCase(caseId);
    }
  };

  const handleCancelAddForm = () => {
    setSessionReportOpen(false);
    setSelectedCase(null);
    setCasePickerOpen(true);
  };

  if (data.loading) {
    return (
      <div>
        <SessionReportsPageHeader onAddReport={handleAddReport} />
        <SessionReportsSkeleton />
      </div>
    );
  }

  return (
    <div>
      <SessionReportsPageHeader onAddReport={handleAddReport} />

      <SessionReportsKpiRow
        totalReports={data.metrics.totalReports}
        casesWithReports={data.metrics.casesWithReports}
        reportsThisMonth={data.metrics.reportsThisMonth}
      />

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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <SessionReportsCaseList
          summaries={data.filteredSummaries}
          selectedCaseId={data.selectedSummary?.case.id ?? null}
          onSelectCase={data.selectCase}
        />
        <SessionReportsTimeline summary={data.selectedSummary} />
      </div>

      <Dialog open={casePickerOpen} onClose={() => setCasePickerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t.sessionReports.selectCaseForReport}</DialogTitle>
        <DialogContent>
          {activeCases.length === 0 ? (
            <p className="py-4 text-sm text-slate-500">{t.sessionReports.noActiveCases}</p>
          ) : (
            <List>
              {activeCases.map((caseItem) => (
                <ListItem key={caseItem.id} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleSelectCaseForReport(caseItem)}
                    sx={{
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'rgba(201, 151, 0, 0.08)',
                        borderColor: '#C99700',
                      },
                    }}
                  >
                    <ListItemText
                      primary={caseItem.title}
                      secondary={
                        <Box sx={{ mt: 0.5 }}>
                          <span className="text-xs text-slate-500">{caseItem.counseledName}</span>
                          <Chip
                            label={caseItem.status}
                            size="small"
                            sx={{ mt: 0.5, ml: 1, height: 20, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                    />
                    <ArrowForward sx={{ color: 'text.secondary' }} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCasePickerOpen(false)}>{t.common.cancel}</Button>
        </DialogActions>
      </Dialog>

      <SessionReport
        open={sessionReportOpen}
        onClose={handleCloseSessionReport}
        caseId={selectedCase?.id || ''}
        caseTitle={selectedCase?.title || ''}
        onReportAdded={handleReportSaved}
        onCancelAddForm={handleCancelAddForm}
        hideAddButton
        caseStatus={selectedCase?.status}
        autoOpenAddForm
      />
    </div>
  );
};

export default SessionReportsPage;
