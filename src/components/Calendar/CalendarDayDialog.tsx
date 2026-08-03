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
  Chip,
  Link,
  Alert,
} from '@mui/material';
import {
  Schedule,
  Person,
  Room,
  Edit,
  Delete,
  Add,
  Event as EventIcon,
} from '@mui/icons-material';
import { Appointment, ChurchEvent } from '../../types';
import { t } from '../../utils/translations';
import {
  formatCalendarDate,
  formatTime,
  isDateTodayOrFuture,
  getRoomColorStyles,
  sortAppointmentsByTime,
} from './calendarUtils';
import {
  sortEventsByTime,
  getEventDisplayStyles,
  formatEventDateRange,
  formatEventTimeRange,
} from './eventUtils';
import ConfirmDialog from '../common/ConfirmDialog';

interface CalendarDayDialogProps {
  selectedDate: Date | null;
  appointments: Appointment[];
  events: ChurchEvent[];
  onClose: () => void;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (appointmentId: string) => void | Promise<void>;
  onScheduleAppointment: (date: Date) => void;
  onEditEvent: (event: ChurchEvent) => void;
  onDeleteEvent: (eventId: string) => void | Promise<void>;
  onAddEvent: (date: Date) => void;
  canEdit: (appointment: Appointment) => boolean;
  canDelete: (appointment: Appointment) => boolean;
  canManageEvents: boolean;
  canViewCaseDetails?: (appointment: Appointment) => boolean;
}

type DeleteTarget =
  | { kind: 'appointment'; item: Appointment }
  | { kind: 'event'; item: ChurchEvent };

const CalendarDayDialog: React.FC<CalendarDayDialogProps> = ({
  selectedDate,
  appointments,
  events,
  onClose,
  onEditAppointment,
  onDeleteAppointment,
  onScheduleAppointment,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
  canEdit,
  canDelete,
  canManageEvents,
  canViewCaseDetails = () => false,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [localAppointments, setLocalAppointments] = useState(appointments);
  const [localEvents, setLocalEvents] = useState(events);

  React.useEffect(() => {
    // Keep the day list stable while the confirm dialog is loading
    if (deleteLoading) return;
    setLocalAppointments(appointments);
    setLocalEvents(events);
  }, [appointments, events, deleteLoading]);

  const sortedAppointments = sortAppointmentsByTime(localAppointments);
  const sortedEvents = sortEventsByTime(localEvents);
  const eventStyles = getEventDisplayStyles();
  const isEmpty = sortedAppointments.length === 0 && sortedEvents.length === 0;

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteLoading) return;
    const target = deleteTarget;
    try {
      setDeleteLoading(true);
      if (target.kind === 'appointment') {
        await onDeleteAppointment(target.item.id);
        setLocalAppointments((prev) => prev.filter((a) => a.id !== target.item.id));
      } else {
        await onDeleteEvent(target.item.id);
        setLocalEvents((prev) => prev.filter((e) => e.id !== target.item.id));
      }
      setDeleteTarget(null);
    } catch {
      // Parent shows snackbar; keep confirm open so the user can retry or cancel
    } finally {
      setDeleteLoading(false);
    }
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
          {isEmpty ? (
            <Typography color="text.secondary" textAlign="center" py={2}>
              {t.appointments.noAppointmentsDay}
            </Typography>
          ) : (
            <List>
              {sortedAppointments.map((appointment, index) => {
                const roomColors = getRoomColorStyles(appointment.room);
                return (
                  <React.Fragment key={`appt-${appointment.id}`}>
                    <ListItem
                      sx={{
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        py: 2,
                        borderLeft: 4,
                        borderColor: roomColors.accent,
                        pl: 2,
                      }}
                    >
                      <Box
                        display="flex"
                        justifyContent="space-between"
                        alignItems="center"
                        width="100%"
                        mb={1}
                      >
                        <Typography variant="h6" component="h3">
                          {canViewCaseDetails(appointment)
                            ? appointment.caseTitle || appointment.title
                            : appointment.counselorName || appointment.title}
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
                                  onClick={() =>
                                    setDeleteTarget({ kind: 'appointment', item: appointment })
                                  }
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

                      {appointment.room && (
                        <Chip
                          icon={<Room sx={{ fontSize: 16 }} />}
                          label={appointment.room}
                          size="small"
                          sx={{
                            mb: 1,
                            bgcolor: `${roomColors.accent}22`,
                            color: roomColors.accent,
                            borderColor: roomColors.accent,
                            fontWeight: 500,
                          }}
                          variant="outlined"
                        />
                      )}

                      {canViewCaseDetails(appointment) && appointment.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {appointment.description}
                        </Typography>
                      )}
                    </ListItem>
                    {(index < sortedAppointments.length - 1 || sortedEvents.length > 0) && (
                      <Divider />
                    )}
                  </React.Fragment>
                );
              })}

              {sortedEvents.map((event, index) => (
                <React.Fragment key={`event-${event.id}`}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      py: 2,
                      borderLeft: 4,
                      borderColor: eventStyles.accent,
                      pl: 2,
                    }}
                  >
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      width="100%"
                      mb={1}
                    >
                      <Box display="flex" alignItems="center" gap={1}>
                        <EventIcon sx={{ fontSize: 20, color: eventStyles.accent }} />
                        <Typography variant="h6" component="h3">
                          {event.name}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" color="text.secondary">
                          {formatEventTimeRange(event)}
                        </Typography>
                        {canManageEvents && (
                          <Box display="flex" gap={0.5}>
                            <IconButton
                              size="small"
                              onClick={() => {
                                onEditEvent(event);
                                onClose();
                              }}
                              aria-label="edit event"
                            >
                              <Edit />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget({ kind: 'event', item: event })}
                              aria-label="delete event"
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                      {formatEventDateRange(event)}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      {event.description}
                    </Typography>

                    {event.registrationUrl && (
                      <>
                        <Alert severity="warning" sx={{ mt: 1.5, width: '100%' }} className="rounded-lg">
                          {t.events.registrationMandatory}
                        </Alert>
                        <Link
                          href={event.registrationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          variant="body2"
                          sx={{ mt: 1 }}
                        >
                          {t.events.registrationLink}
                        </Link>
                      </>
                    )}
                  </ListItem>
                  {index < sortedEvents.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={onClose}>{t.common.close}</Button>
          {selectedDate && isDateTodayOrFuture(selectedDate) && (
            <>
              {canManageEvents && (
                <Button
                  onClick={() => {
                    onAddEvent(selectedDate);
                    onClose();
                  }}
                  variant="outlined"
                  startIcon={<EventIcon />}
                  sx={{
                    borderColor: '#C99700',
                    color: '#B8860B',
                    '&:hover': { borderColor: '#B8860B', backgroundColor: 'rgba(201, 151, 0, 0.08)' },
                  }}
                >
                  {t.events.addEvent}
                </Button>
              )}
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
            </>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={
          deleteTarget?.kind === 'event'
            ? t.events.deleteEvent
            : t.appointments.deleteAppointment
        }
        message={
          deleteTarget?.kind === 'event'
            ? t.events.deleteConfirm.replace('{name}', deleteTarget.item.name)
            : t.deleteWarnings.deleteAppointmentConfirm.replace(
                '{title}',
                deleteTarget?.kind === 'appointment' ? deleteTarget.item.title : ''
              )
        }
        variant="danger"
        loading={deleteLoading}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
};

export default CalendarDayDialog;
