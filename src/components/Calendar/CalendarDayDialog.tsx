import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Schedule,
  Person,
  Assignment,
  Room,
  Edit,
  Delete,
  Add,
} from '@mui/icons-material';
import { Appointment } from '../../types';
import { t } from '../../utils/translations';
import { formatCalendarDate, formatTime, isDateTodayOrFuture } from './calendarUtils';

interface CalendarDayDialogProps {
  selectedDate: Date | null;
  appointments: Appointment[];
  onClose: () => void;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onScheduleAppointment: (date: Date) => void;
  canEdit: (appointment: Appointment) => boolean;
  canDelete: (appointment: Appointment) => boolean;
}

const CalendarDayDialog: React.FC<CalendarDayDialogProps> = ({
  selectedDate,
  appointments,
  onClose,
  onEditAppointment,
  onDeleteAppointment,
  onScheduleAppointment,
  canEdit,
  canDelete,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null);
  const [localAppointments, setLocalAppointments] = useState(appointments);

  React.useEffect(() => {
    setLocalAppointments(appointments);
  }, [appointments]);

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    onDeleteAppointment(deleteTarget.id);
    setLocalAppointments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <>
      <Dialog open={Boolean(selectedDate)} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Schedule />
            <Typography variant="h6">
              {selectedDate && formatCalendarDate(selectedDate)}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {localAppointments.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={2}>
              {t.appointments.noAppointmentsDay}
            </Typography>
          ) : (
            <List>
              {localAppointments.map((appointment, index) => (
                <React.Fragment key={appointment.id}>
                  <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start', py: 2 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      width="100%"
                      mb={1}
                    >
                      <Typography variant="h6" component="h3">
                        {appointment.title}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                        </Typography>
                        {(canEdit(appointment) || canDelete(appointment)) && (
                          <Box display="flex" gap={0.5}>
                            {canEdit(appointment) && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  onEditAppointment(appointment);
                                  onClose();
                                }}
                                aria-label="edit appointment"
                              >
                                <Edit />
                              </IconButton>
                            )}
                            {canDelete(appointment) && (
                              <IconButton
                                size="small"
                                onClick={() => setDeleteTarget(appointment)}
                                aria-label="delete appointment"
                              >
                                <Delete />
                              </IconButton>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Person fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        {appointment.counselorName}
                      </Typography>
                    </Box>

                    {appointment.caseTitle && (
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Assignment fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {appointment.caseTitle}
                        </Typography>
                      </Box>
                    )}

                    {appointment.room && (
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Room fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {appointment.room}
                        </Typography>
                      </Box>
                    )}

                    {appointment.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {appointment.description}
                      </Typography>
                    )}
                  </ListItem>
                  {index < localAppointments.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t.common.close}</Button>
          {selectedDate && isDateTodayOrFuture(selectedDate) && (
            <Button
              onClick={() => {
                onScheduleAppointment(selectedDate);
                onClose();
              }}
              variant="contained"
              startIcon={<Add />}
              sx={{ backgroundColor: '#C99700', '&:hover': { backgroundColor: '#B8860B' } }}
            >
              {t.appointments.scheduleAppointment}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t.appointments.deleteAppointment}</DialogTitle>
        <DialogContent>
          <Typography>
            {t.deleteWarnings.deleteAppointmentConfirm.replace(
              '{title}',
              deleteTarget?.title || ''
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t.common.cancel}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t.common.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CalendarDayDialog;
