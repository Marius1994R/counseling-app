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

const Cases: React.FC = () => {
  const navigate = useNavigate();
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
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t.cases.editCase}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              mt: 1,
              opacity: data.saveLoading ? 0.45 : 1,
              pointerEvents: data.saveLoading ? 'none' : 'auto',
            }}
          >
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

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t.cases.issueTypes} *
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {data.commonIssueTypes.map((issueType) => (
                  <Chip
                    key={issueType}
                    label={t.issueTypes[issueType]}
                    clickable
                    color={data.editData.issueTypes.includes(issueType) ? 'primary' : 'default'}
                    onClick={() => data.handleIssueTypeToggle(issueType)}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Box>
            </Box>

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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={data.handleCloseEditDialog} disabled={data.saveLoading}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={data.handleSaveCase}
            variant="contained"
            disabled={data.saveLoading || data.editData.issueTypes.length === 0}
            startIcon={
              data.saveLoading ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            sx={{ backgroundColor: '#C99700', '&:hover': { backgroundColor: '#B89A00' } }}
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
