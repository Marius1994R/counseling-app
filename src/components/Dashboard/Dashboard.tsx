import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Typography,
  Box,
  Chip,
  Alert,
} from '@mui/material';
import { Description, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Case } from '../../types';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import { useDashboardReport } from '../../contexts/DashboardReportContext';
import { getActiveCases } from './dashboardUtils';
import KpiRow from './KpiRow';
import RecentActiveCases from './RecentActiveCases';
import QuickPanel from './QuickPanel';
import Timeline from './Timeline';
import SessionReport from '../Cases/SessionReport';
import { t } from '../../utils/translations';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { registerOpenCaseReportModal } = useDashboardReport();
  const {
    cases,
    activities,
    sessionReportCounts,
    metrics,
    upcomingAppointments,
    loading,
    error,
    refetch,
  } = useDashboardDataContext();

  const [caseSelectionModalOpen, setCaseSelectionModalOpen] = useState(false);
  const [sessionReportOpen, setSessionReportOpen] = useState(false);
  const [selectedCaseForReport, setSelectedCaseForReport] = useState<Case | null>(null);

  useEffect(() => {
    registerOpenCaseReportModal(() => setCaseSelectionModalOpen(true));
    return () => registerOpenCaseReportModal(null);
  }, [registerOpenCaseReportModal]);

  const handleCloseCaseSelection = () => setCaseSelectionModalOpen(false);

  const handleSelectCaseForReport = (selectedCase: Case) => {
    setSelectedCaseForReport(selectedCase);
    setCaseSelectionModalOpen(false);
    setSessionReportOpen(true);
  };

  const handleCloseSessionReport = () => {
    setSessionReportOpen(false);
    setSelectedCaseForReport(null);
    setCaseSelectionModalOpen(true);
  };

  const handleReportSaved = () => {
    setSessionReportOpen(false);
    setCaseSelectionModalOpen(false);
    setSelectedCaseForReport(null);
    refetch();
  };

  const handleCancelAddForm = () => {
    setSessionReportOpen(false);
    setSelectedCaseForReport(null);
    setCaseSelectionModalOpen(true);
  };

  const activeCases = getActiveCases(cases);

  if (error) {
    return (
      <Alert severity="error" className="rounded-xl">
        {error}
      </Alert>
    );
  }

  return (
    <div>
      <KpiRow
        metrics={metrics}
        loading={loading}
        onActiveClick={() => navigate('/cases?status=active')}
        onPendingClick={() => navigate('/cases?status=waiting')}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <RecentActiveCases
          cases={activeCases}
          activities={activities}
          sessionReportCounts={sessionReportCounts}
          loading={loading}
        />
        <QuickPanel
          appointments={upcomingAppointments}
          cases={cases}
          sessionReportCounts={sessionReportCounts}
          loading={loading}
          onViewCalendar={() => navigate('/calendar')}
          onRaportCaz={() => setCaseSelectionModalOpen(true)}
          onSchedule={() => navigate('/calendar?new=true')}
          onAddCase={() => navigate('/admin?tab=2')}
          onUpdateProfile={() => navigate('/profile?edit=true')}
        />
      </div>

      <Timeline
        activities={activities}
        loading={loading}
        onViewAll={() => navigate('/activity')}
      />

      <Dialog open={caseSelectionModalOpen} onClose={handleCloseCaseSelection} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
          <Description sx={{ mr: 1, color: 'primary.main' }} />
          Selectează Caz pentru Raport
        </DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress sx={{ color: '#C99700' }} />
            </Box>
          ) : cases.filter((c) => c.status === 'active').length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Nu există cazuri active disponibile pentru raportare
            </Typography>
          ) : (
            <List>
              {cases
                .filter((caseItem) => caseItem.status === 'active')
                .map((caseItem) => (
                  <ListItem key={caseItem.id} disablePadding sx={{ mb: 1 }}>
                    <ListItemButton
                      onClick={() => handleSelectCaseForReport(caseItem)}
                      sx={{
                        border: '1px solid rgba(0, 0, 0, 0.12)',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'rgba(79, 70, 229, 0.08)',
                          borderColor: '#C99700',
                        },
                      }}
                    >
                      <ListItemText
                        primary={caseItem.title}
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {caseItem.counseledName}
                            </Typography>
                            <Chip label={caseItem.status} size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }} />
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
          <Button onClick={handleCloseCaseSelection}>{t.common.cancel}</Button>
        </DialogActions>
      </Dialog>

      <SessionReport
        open={sessionReportOpen}
        onClose={handleCloseSessionReport}
        caseId={selectedCaseForReport?.id || ''}
        caseTitle={selectedCaseForReport?.title || ''}
        onReportAdded={handleReportSaved}
        onCancelAddForm={handleCancelAddForm}
        hideAddButton={false}
        caseStatus={selectedCaseForReport?.status}
        autoOpenAddForm
      />
    </div>
  );
};

export default Dashboard;
