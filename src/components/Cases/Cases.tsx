import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Typography,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useCasesData } from '../../hooks/useCasesData';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import {
  buildNextAppointmentByCaseId,
  getCalendarDatePath,
} from '../Dashboard/dashboardUtils';
import { Appointment, Case, CaseStatus } from '../../types';
import MeetingNotes from './MeetingNotes';
import MeetingNoteFormDialog from '../MeetingNotes/MeetingNoteFormDialog';
import SessionReport from './SessionReport';
import CaseTimelineDialog from './CaseTimelineDialog';
import CasesPageHeader from './CasesPageHeader';
import CasesToolbar from './CasesToolbar';
import CasesGrid from './CasesGrid';
import { useTimedPulse } from '../../hooks/useTimedPulse';
import { t } from '../../utils/translations';

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Box>
    <Typography
      component="h3"
      sx={{
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {title}
    </Typography>
    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
  </Box>
);

const Cases: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const data = useCasesData();
  const { upcomingAppointments } = useDashboardDataContext();
  const [timelineCase, setTimelineCase] = useState<Case | null>(null);

  const nextAppointmentByCaseId = useMemo(
    () => buildNextAppointmentByCaseId(upcomingAppointments),
    [upcomingAppointments]
  );
  const pulseAppointment = useTimedPulse(5000, !data.loading);

  const handleOpenAppointment = (appointment: Appointment) => {
    navigate(getCalendarDatePath(appointment.date));
  };

  const handleOpenReports = (caseItem: { id: string }) => {
    navigate(`/session-reports?caseId=${caseItem.id}`);
  };

  const handleReportSaved = () => {
    void data.handleSessionReportSaved();
  };

  const handleOpenTimeline = (caseItem: Case) => {
    setTimelineCase(caseItem);
  };

  const handleTimelineOpenNotes = () => {
    if (!timelineCase) return;
    const caseForNotes = timelineCase;
    setTimelineCase(null);
    data.handleOpenMeetingNotes(caseForNotes);
  };

  const hasActiveFilters =
    Boolean(data.searchTerm) || data.statusFilter !== 'all' || Boolean(data.caseIdFilter);

  return (
    <div>
      <CasesPageHeader
        caseIdFilter={data.caseIdFilter}
        caseIdsFilter={data.caseIdsFilter}
        focusFilterLabel={data.focusFilterLabel}
        onClearCaseFilter={data.clearCaseIdFilter}
      />

      <CasesToolbar
        searchTerm={data.searchTerm}
        onSearchChange={data.setSearchTerm}
        statusFilter={data.statusFilter}
        onStatusFilterChange={data.handleStatusFilterChange}
        filteredCount={data.filteredCases.length}
        activeCasesCount={data.activeCasesCount}
        waitingCasesCount={data.waitingCasesCount}
      />

      {data.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {data.error}
        </Alert>
      )}

      <CasesGrid
        cases={data.filteredCases}
        loading={data.loading}
        caseNotes={data.caseNotes}
        caseReportsCount={data.caseReportsCount}
        nextAppointmentByCaseId={nextAppointmentByCaseId}
        pulseAppointment={pulseAppointment}
        hasActiveFilters={hasActiveFilters}
        onOpenNotes={data.handleOpenMeetingNotes}
        onAddNote={data.handleOpenAddNote}
        onOpenAddReport={data.handleOpenSessionReport}
        onOpenReports={handleOpenReports}
        onOpenTimeline={handleOpenTimeline}
        onEdit={data.handleEditCase}
        onOpenDescription={data.handleOpenDescription}
        onOpenAppointment={handleOpenAppointment}
      />

      <Dialog
        open={data.editDialogOpen}
        onClose={(_, reason) => {
          if (data.saveLoading) return;
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            data.handleCloseEditDialog();
            return;
          }
          data.handleCloseEditDialog();
        }}
        disableEscapeKeyDown={data.saveLoading}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{
          sx: {
            borderRadius: fullScreen ? 0 : 3,
            border: fullScreen ? 'none' : '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <DialogTitle
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography component="span" sx={{ display: 'block', fontSize: '1rem', fontWeight: 600 }}>
            {t.cases.editCase}
          </Typography>
          <Typography
            component="span"
            noWrap
            sx={{ mt: 0.5, display: 'block', fontSize: '0.875rem', color: 'text.secondary' }}
          >
            {data.selectedCase
              ? `${data.selectedCase.counseledName} · ${data.selectedCase.title}`
              : t.cases.editFormSubtitle}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              opacity: data.saveLoading ? 0.45 : 1,
              pointerEvents: data.saveLoading ? 'none' : 'auto',
            }}
          >
            <FormSection title={t.cases.status}>
              <FormControl fullWidth disabled={data.saveLoading}>
                <InputLabel>{t.cases.status} *</InputLabel>
                <Select
                  value={data.editData.status}
                  onChange={(e) =>
                    data.setEditData((prev) => ({
                      ...prev,
                      status: e.target.value as CaseStatus,
                    }))
                  }
                  label={`${t.cases.status} *`}
                >
                  <MenuItem value="waiting">{t.status.waiting}</MenuItem>
                  <MenuItem value="active">{t.status.active}</MenuItem>
                  <MenuItem value="unfinished">{t.status.unfinished}</MenuItem>
                  <MenuItem value="finished">{t.status.completed}</MenuItem>
                  <MenuItem value="cancelled">{t.status.cancelled}</MenuItem>
                </Select>
              </FormControl>
            </FormSection>

            <FormSection title={t.cases.issueTypes}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {data.commonIssueTypes.map((issueType) => (
                  <Chip
                    key={issueType}
                    label={t.issueTypes[issueType]}
                    clickable
                    color={data.editData.issueTypes.includes(issueType) ? 'primary' : 'default'}
                    variant={data.editData.issueTypes.includes(issueType) ? 'filled' : 'outlined'}
                    onClick={() => data.handleIssueTypeToggle(issueType)}
                  />
                ))}
              </Box>
            </FormSection>

            <FormSection title={t.cases.description}>
              <TextField
                label={t.cases.description}
                multiline
                rows={4}
                value={data.editData.description}
                onChange={(e) =>
                  data.setEditData((prev) => ({ ...prev, description: e.target.value }))
                }
                fullWidth
              />
            </FormSection>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            gap: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            onClick={data.handleCloseEditDialog}
            disabled={data.saveLoading}
            variant="outlined"
            color="inherit"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={data.handleSaveCase}
            variant="contained"
            disableElevation
            disabled={data.saveLoading || data.editData.issueTypes.length === 0}
            startIcon={
              data.saveLoading ? <CircularProgress size={16} color="inherit" /> : undefined
            }
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>

      <MeetingNotes
        open={data.meetingNotesOpen}
        onClose={data.handleCloseMeetingNotes}
        caseId={data.selectedCaseForNotes?.id || ''}
        caseTitle={data.selectedCaseForNotes?.title || ''}
        reportCount={
          data.selectedCaseForNotes
            ? data.caseReportsCount[data.selectedCaseForNotes.id] ?? 0
            : 0
        }
        onNoteAdded={data.handleNoteAdded}
      />

      <MeetingNoteFormDialog
        open={data.addNoteOpen}
        caseItem={data.selectedCaseForNotes}
        reportCount={
          data.selectedCaseForNotes
            ? data.caseReportsCount[data.selectedCaseForNotes.id] ?? 0
            : 0
        }
        onClose={data.handleCloseAddNote}
        onSaved={data.handleNoteAdded}
      />

      <CaseTimelineDialog
        open={timelineCase !== null}
        onClose={() => setTimelineCase(null)}
        caseItem={timelineCase}
        onOpenNotes={handleTimelineOpenNotes}
      />

      <SessionReport
        open={data.sessionReportOpen}
        onClose={data.handleCloseSessionReport}
        caseId={data.selectedCaseForNotes?.id || ''}
        caseTitle={data.selectedCaseForNotes?.title || ''}
        onReportAdded={handleReportSaved}
        onCancelAddForm={data.handleCloseSessionReport}
        hideAddButton
        caseStatus={data.selectedCaseForNotes?.status}
        autoOpenAddForm
      />

      <Dialog
        open={data.descriptionModalOpen}
        onClose={() => data.setDescriptionModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t.cases.description} - {data.selectedCaseForDescription?.counseledName}
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', py: 2 }}
          >
            {data.selectedCaseForDescription?.description}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => data.setDescriptionModalOpen(false)}>{t.common.close}</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={data.snackbar.open}
        autoHideDuration={6000}
        onClose={() => data.setSnackbar({ ...data.snackbar, open: false })}
      >
        <Alert
          onClose={() => data.setSnackbar({ ...data.snackbar, open: false })}
          severity={data.snackbar.severity}
          sx={{ width: '100%' }}
        >
          {data.snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default Cases;
