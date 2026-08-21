import React, { useState, useEffect, useMemo } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import { useDashboardReport } from '../../contexts/DashboardReportContext';
import {
  collectDashboardActionCaseBuckets,
  computeDashboardActionMetrics,
  getActiveCases,
} from './dashboardUtils';
import KpiRow from './KpiRow';
import RecentActiveCases from './RecentActiveCases';
import QuickPanel from './QuickPanel';
import Timeline from './Timeline';
import SessionReport from '../Cases/SessionReport';
import MeetingNoteFormDialog from '../MeetingNotes/MeetingNoteFormDialog';
import { t } from '../../utils/translations';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { registerOpenCaseReportModal } = useDashboardReport();
  const {
    cases,
    appointments,
    activities,
    counselors,
    sessionReportCounts,
    upcomingAppointments,
    loading,
    error,
    incrementSessionReportCount,
    upsertCase,
    refetch,
  } = useDashboardDataContext();

  const [caseSelectionModalOpen, setCaseSelectionModalOpen] = useState(false);
  const [sessionReportOpen, setSessionReportOpen] = useState(false);
  const [selectedCaseForReport, setSelectedCaseForReport] = useState<Case | null>(null);
  const [reportFromSelection, setReportFromSelection] = useState(false);
  const [addNoteCase, setAddNoteCase] = useState<Case | null>(null);

  useEffect(() => {
    registerOpenCaseReportModal(() => setCaseSelectionModalOpen(true));
    return () => registerOpenCaseReportModal(null);
  }, [registerOpenCaseReportModal]);

  const handleCloseCaseSelection = () => setCaseSelectionModalOpen(false);

  const handleSelectCaseForReport = (selectedCase: Case) => {
    setSelectedCaseForReport(selectedCase);
    setCaseSelectionModalOpen(false);
    setReportFromSelection(true);
    setSessionReportOpen(true);
  };

  const handleAddReportForCase = (caseItem: Case) => {
    setSelectedCaseForReport(caseItem);
    setReportFromSelection(false);
    setSessionReportOpen(true);
  };

  const handleCloseSessionReport = () => {
    setSessionReportOpen(false);
    setSelectedCaseForReport(null);
    if (reportFromSelection) {
      setCaseSelectionModalOpen(true);
    }
    setReportFromSelection(false);
  };

  const handleReportSaved = (result?: {
    caseId: string;
    meetingDate: Date;
    meetingFrequencyWeeks: Case['meetingFrequencyWeeks'];
    sessionNumber: number;
  }) => {
    const caseId = selectedCaseForReport?.id;
    const caseItem = selectedCaseForReport;
    setSessionReportOpen(false);
    setCaseSelectionModalOpen(false);
    setSelectedCaseForReport(null);
    setReportFromSelection(false);
    if (caseId && caseItem) {
      incrementSessionReportCount(caseId);
      if (result?.caseId === caseId) {
        upsertCase({
          ...caseItem,
          lastMeetingDate: result.meetingDate,
          meetingFrequencyWeeks:
            result.meetingFrequencyWeeks ?? caseItem.meetingFrequencyWeeks ?? null,
          updatedAt: new Date(),
        });
      }
    }
    void refetch();
  };

  const handleCancelAddForm = () => {
    setSessionReportOpen(false);
    setSelectedCaseForReport(null);
    if (reportFromSelection) {
      setCaseSelectionModalOpen(true);
    }
    setReportFromSelection(false);
  };

  const activeCases = getActiveCases(cases);
  const showTeamPulse = currentUser?.role === 'leader';
  const actionCaseBuckets = useMemo(
    () => collectDashboardActionCaseBuckets(cases, appointments, activities, sessionReportCounts),
    [cases, appointments, activities, sessionReportCounts]
  );
  const actionMetrics = useMemo(
    () =>
      computeDashboardActionMetrics(
        cases,
        appointments,
        activities,
        sessionReportCounts
      ),
    [cases, appointments, activities, sessionReportCounts]
  );

  const openCasesWithIds = (
    caseIds: string[],
    focus: 'reportsNeeded' | 'consentMissing' | 'frequencyOverdue'
  ) => {
    if (caseIds.length === 0) return;
    const params = new URLSearchParams();
    params.set('status', 'active');
    params.set('focus', focus);
    if (caseIds.length === 1) {
      params.set('caseId', caseIds[0]);
    } else {
      params.set('caseIds', caseIds.join(','));
    }
    navigate(`/cases?${params.toString()}`);
  };

  const handleActivityClick = (activity: (typeof activities)[number]) => {
    const caseId =
      typeof activity.metadata?.caseId === 'string' ? activity.metadata.caseId : undefined;
    if (caseId) {
      navigate(`/cases?caseId=${caseId}`);
    }
  };

  if (error) {
    return (
      <Alert severity="error" className="rounded-xl">
        {error}
      </Alert>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="order-3 mt-6 lg:order-1 lg:mt-0">
        <KpiRow
          metrics={actionMetrics}
          loading={loading}
          onReportsClick={() =>
            openCasesWithIds(actionCaseBuckets.reportsNeededCaseIds, 'reportsNeeded')
          }
          onConsentClick={() =>
            openCasesWithIds(actionCaseBuckets.casesWithoutConsentIds, 'consentMissing')
          }
          onFrequencyClick={() =>
            openCasesWithIds(actionCaseBuckets.frequencyOverdueCaseIds, 'frequencyOverdue')
          }
          onActiveClick={() => navigate('/cases?status=active')}
        />
      </div>

      <div className="order-1 mt-0 grid grid-cols-1 gap-6 lg:order-2 lg:mt-6 lg:grid-cols-[1fr_340px]">
        <div className="order-2 lg:order-none">
          <RecentActiveCases
            cases={activeCases}
            activities={activities}
            sessionReportCounts={sessionReportCounts}
            upcomingAppointments={upcomingAppointments}
            loading={loading}
            onAddReport={handleAddReportForCase}
            onAddNote={setAddNoteCase}
          />
        </div>
        <div className="order-1 lg:order-none">
          <QuickPanel
            appointments={upcomingAppointments}
            cases={cases}
            sessionReportCounts={sessionReportCounts}
            loading={loading}
            onViewCalendar={() => navigate('/calendar')}
            onRaportCaz={() => setCaseSelectionModalOpen(true)}
            onSchedule={() => navigate('/calendar?new=true')}
            onAddCase={() => navigate('/admin?tab=2&create=true')}
            onUpdateProfile={() => navigate('/profile?edit=true')}
          />
        </div>
      </div>

      <div className="order-4 lg:order-3">
        <Timeline
          activities={activities}
          loading={loading}
          counselors={counselors}
          showCounselorFilter={showTeamPulse}
          onActivityClick={handleActivityClick}
        />
      </div>

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

      <MeetingNoteFormDialog
        open={addNoteCase !== null}
        caseItem={addNoteCase}
        reportCount={
          addNoteCase ? sessionReportCounts[addNoteCase.id] ?? 0 : 0
        }
        onClose={() => setAddNoteCase(null)}
      />
    </div>
  );
};

export default Dashboard;
