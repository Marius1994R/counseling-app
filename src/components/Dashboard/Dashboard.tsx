import React, { useState, useEffect, useMemo } from 'react';
import { Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Appointment, Case } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import { useDashboardReport } from '../../contexts/DashboardReportContext';
import {
  collectDashboardActionCaseBuckets,
  computeDashboardActionMetrics,
  getActiveCases,
  getCalendarDatePath,
} from './dashboardUtils';
import KpiRow from './KpiRow';
import RecentActiveCases from './RecentActiveCases';
import QuickPanel from './QuickPanel';
import Timeline from './Timeline';
import SessionReport from '../Cases/SessionReport';
import ConsentUploadDialog from '../Cases/ConsentUploadDialog';
import ScheduleAppointmentDialog from './ScheduleAppointmentDialog';
import CaseSelectionDialog from './CaseSelectionDialog';
import MeetingNoteFormDialog from '../MeetingNotes/MeetingNoteFormDialog';
import { t } from '../../utils/translations';

type CaseSelectionPurpose = 'report' | 'note' | 'consent';

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

  const [caseSelectionPurpose, setCaseSelectionPurpose] =
    useState<CaseSelectionPurpose | null>(null);
  const [sessionReportOpen, setSessionReportOpen] = useState(false);
  const [selectedCaseForReport, setSelectedCaseForReport] = useState<Case | null>(null);
  const [addNoteCase, setAddNoteCase] = useState<Case | null>(null);
  const [consentCase, setConsentCase] = useState<Case | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleCaseId, setScheduleCaseId] = useState<string | null>(null);

  useEffect(() => {
    registerOpenCaseReportModal(() => setCaseSelectionPurpose('report'));
    return () => registerOpenCaseReportModal(null);
  }, [registerOpenCaseReportModal]);

  const handleCloseCaseSelection = () => setCaseSelectionPurpose(null);

  const handleSelectCase = (selectedCase: Case) => {
    const purpose = caseSelectionPurpose;
    setCaseSelectionPurpose(null);
    if (purpose === 'report') {
      setSelectedCaseForReport(selectedCase);
      setSessionReportOpen(true);
      return;
    }
    if (purpose === 'note') {
      setAddNoteCase(selectedCase);
      return;
    }
    if (purpose === 'consent') {
      setConsentCase(selectedCase);
    }
  };

  const handleAddReportForCase = (caseItem: Case) => {
    setSelectedCaseForReport(caseItem);
    setSessionReportOpen(true);
  };

  const handleCloseSessionReport = () => {
    setSessionReportOpen(false);
    setSelectedCaseForReport(null);
    setCaseSelectionPurpose(null);
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
    setCaseSelectionPurpose(null);
    setSelectedCaseForReport(null);
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
    setCaseSelectionPurpose(null);
  };

  const handleCloseAddNote = () => {
    setAddNoteCase(null);
    setCaseSelectionPurpose(null);
  };

  const handleNoteSaved = () => {
    setAddNoteCase(null);
    setCaseSelectionPurpose(null);
    void refetch();
  };

  const handleCloseConsent = () => {
    setConsentCase(null);
    setCaseSelectionPurpose(null);
  };

  const handleOpenSchedule = (caseItem?: Case) => {
    setScheduleCaseId(caseItem?.id ?? null);
    setScheduleOpen(true);
  };

  const handleCloseSchedule = () => {
    setScheduleOpen(false);
    setScheduleCaseId(null);
  };

  const handleAppointmentScheduled = (appointment: Appointment) => {
    setScheduleOpen(false);
    setScheduleCaseId(null);
    navigate(getCalendarDatePath(appointment.date));
  };

  const handleConsentUploaded = (caseItem: Case) => {
    upsertCase({
      ...caseItem,
      consentAttached: true,
      updatedAt: new Date(),
    });
    setConsentCase(null);
    setCaseSelectionPurpose(null);
    void refetch();
  };

  const activeCases = getActiveCases(cases);
  const caseSelectionList =
    caseSelectionPurpose === 'consent'
      ? activeCases.filter((c) => c.consentAttached !== true)
      : activeCases;

  const caseSelectionTitle =
    caseSelectionPurpose === 'note'
      ? t.sessionReports.selectCaseForNote
      : caseSelectionPurpose === 'consent'
        ? t.sessionReports.selectCaseForConsent
        : t.sessionReports.selectCaseForReport;

  const caseSelectionEmpty =
    caseSelectionPurpose === 'note'
      ? t.sessionReports.noActiveCasesForNote
      : caseSelectionPurpose === 'consent'
        ? t.sessionReports.noActiveCasesForConsent
        : t.sessionReports.noActiveCases;
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
            onSchedule={handleOpenSchedule}
          />
        </div>
        <div className="order-1 lg:order-none">
          <QuickPanel
            appointments={upcomingAppointments}
            cases={cases}
            sessionReportCounts={sessionReportCounts}
            loading={loading}
            onViewCalendar={() => navigate('/calendar')}
            onRaportCaz={() => setCaseSelectionPurpose('report')}
            onAddNote={() => setCaseSelectionPurpose('note')}
            onAddConsent={() => setCaseSelectionPurpose('consent')}
            onSchedule={() => handleOpenSchedule()}
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

      <CaseSelectionDialog
        open={caseSelectionPurpose !== null}
        title={caseSelectionTitle}
        cases={caseSelectionList}
        loading={loading}
        emptyMessage={caseSelectionEmpty}
        onSelect={handleSelectCase}
        onClose={handleCloseCaseSelection}
      />

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
        onClose={handleCloseAddNote}
        onSaved={handleNoteSaved}
      />

      <ConsentUploadDialog
        open={consentCase !== null}
        caseItem={consentCase}
        onClose={handleCloseConsent}
        onUploaded={handleConsentUploaded}
      />

      <ScheduleAppointmentDialog
        open={scheduleOpen}
        preSelectedCaseId={scheduleCaseId}
        onClose={handleCloseSchedule}
        onScheduled={handleAppointmentScheduled}
      />
    </div>
  );
};

export default Dashboard;
