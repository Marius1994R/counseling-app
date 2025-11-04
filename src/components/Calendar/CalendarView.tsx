import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Schedule,
  Person,
  Assignment,
  Edit,
  Delete,
  Room,
  Add
} from '@mui/icons-material';
import { Appointment, Case } from '../../types';
import { t } from '../../utils/translations';

interface CalendarViewProps {
  appointments: Appointment[];
  cases: Case[];
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onScheduleAppointment: (date: Date) => void;
  canEdit: boolean | ((appointment: Appointment) => boolean);
  canDelete: boolean | ((appointment: Appointment) => boolean);
}

const CalendarView: React.FC<CalendarViewProps> = ({
  appointments,
  cases,
  onEditAppointment,
  onDeleteAppointment,
  onScheduleAppointment,
  canEdit,
  canDelete
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointments, setSelectedAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.toDateString() === date.toDateString();
    });
  };

  const isDateTodayOrFuture = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0); // Reset time to start of day
    return compareDate >= today;
  };

  const handleDateClick = (date: Date) => {
    const dayAppointments = getAppointmentsForDate(date);
    setSelectedDate(date);
    setSelectedAppointments(dayAppointments);
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };


  const handleDeleteConfirm = () => {
    if (selectedAppointment) {
      onDeleteAppointment(selectedAppointment.id);
      // Update the selectedAppointments to remove the deleted appointment
      setSelectedAppointments(prev => prev.filter(appointment => appointment.id !== selectedAppointment.id));
      setDeleteDialogOpen(false);
      setSelectedAppointment(null);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01 ${time}`).toLocaleTimeString('ro-RO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ];
  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

  return (
    <Box>
      {/* Calendar Header */}
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={2}
        flexDirection={{ xs: 'column', sm: 'row' }}
        gap={{ xs: 2, sm: 0 }}
      >
        <Typography 
          variant="h5" 
          component="h2" 
          sx={{ 
            fontWeight: 'bold',
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            textAlign: { xs: 'center', sm: 'left' }
          }}
        >
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </Typography>
        <Box display="flex" gap={1}>
          <IconButton onClick={handlePreviousMonth} size="small">
            <ChevronLeft />
          </IconButton>
          <IconButton onClick={handleToday} size="small">
            <Today />
          </IconButton>
          <IconButton onClick={handleNextMonth} size="small">
            <ChevronRight />
          </IconButton>
        </Box>
      </Box>

      {/* Calendar Grid */}
      <Paper sx={{ p: { xs: 1, sm: 2 }, overflow: 'hidden' }}>
        {/* Day Headers */}
        <Box 
          display="grid" 
          gridTemplateColumns="repeat(7, 1fr)" 
          gap={{ xs: 0.5, sm: 1 }} 
          mb={1}
        >
          {dayNames.map((day) => (
            <Typography
              key={day}
              variant="subtitle2"
              textAlign="center"
              sx={{ 
                fontWeight: 'bold', 
                color: 'text.secondary', 
                py: 1,
                fontSize: { xs: '0.75rem', sm: '0.875rem' }
              }}
            >
              {day}
            </Typography>
          ))}
        </Box>

        {/* Calendar Days */}
        <Box 
          display="grid" 
          gridTemplateColumns="repeat(7, 1fr)" 
          gap={{ xs: 0.5, sm: 1 }}
        >
          {days.map((date, index) => {
            if (!date) {
              return <Box key={index} sx={{ height: { xs: 80, sm: 100 } }} />;
            }

            const dayAppointments = getAppointmentsForDate(date);
            const isCurrentDay = isToday(date);
            const isPast = isPastDate(date);

            return (
              <Box
                key={date.toISOString()}
                sx={{
                  height: { xs: 80, sm: 100 },
                  minHeight: { xs: 80, sm: 100 },
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: { xs: 0.5, sm: 1 },
                  cursor: 'pointer',
                  backgroundColor: isCurrentDay ? 'primary.light' : 'transparent',
                  color: isCurrentDay ? 'primary.contrastText' : 'text.primary',
                  opacity: isPast ? 0.6 : 1,
                  overflow: 'hidden',
                  position: 'relative',
                  '&:hover': {
                    backgroundColor: isCurrentDay ? 'primary.main' : 'action.hover'
                  }
                }}
                onClick={() => handleDateClick(date)}
              >
                <Typography 
                  variant="body2" 
                  sx={{ 
                    fontWeight: isCurrentDay ? 'bold' : 'normal',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    mb: 0.5
                  }}
                >
                  {date.getDate()}
                </Typography>
                <Box 
                  sx={{ 
                    mt: 0.5,
                    maxHeight: { xs: '50px', sm: '60px' },
                    overflow: 'hidden'
                  }}
                >
                  {dayAppointments.slice(0, 2).map((appointment) => (
                    <Chip
                      key={appointment.id}
                      label={appointment.title}
                      size="small"
                      sx={{
                        fontSize: { xs: '0.6rem', sm: '0.7rem' },
                        height: { xs: 14, sm: 16 },
                        mb: 0.5,
                        backgroundColor: 'secondary.main',
                        color: 'secondary.contrastText',
                        maxWidth: '100%',
                        '& .MuiChip-label': {
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          px: 0.5
                        }
                      }}
                    />
                  ))}
                  {dayAppointments.length > 2 && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        fontSize: { xs: '0.6rem', sm: '0.7rem' },
                        display: 'block',
                        mt: 0.5
                      }}
                    >
                      +{dayAppointments.length - 2} în plus
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Selected Date Appointments Dialog */}
      <Dialog
        open={Boolean(selectedDate)}
        onClose={() => setSelectedDate(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <Schedule />
            <Typography variant="h6">
              {selectedDate && formatDate(selectedDate)}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAppointments.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={2}>
              Nu există programări pentru această zi
            </Typography>
          ) : (
            <List>
              {selectedAppointments.map((appointment, index) => (
                <React.Fragment key={appointment.id}>
                  <ListItem
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      py: 2
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" mb={1}>
                      <Typography variant="h6" component="h3">
                        {appointment.title}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                        </Typography>
                        {((typeof canEdit === 'function' ? canEdit(appointment) : canEdit) || 
                          (typeof canDelete === 'function' ? canDelete(appointment) : canDelete)) && (
                          <Box display="flex" gap={0.5}>
                            {(typeof canEdit === 'function' ? canEdit(appointment) : canEdit) && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  onEditAppointment(appointment);
                                  setSelectedDate(null);
                                }}
                                aria-label="edit appointment"
                              >
                                <Edit />
                              </IconButton>
                            )}
                            {(typeof canDelete === 'function' ? canDelete(appointment) : canDelete) && (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setDeleteDialogOpen(true);
                                }}
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
                  {index < selectedAppointments.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedDate(null)}>{t.common.close}</Button>
          {selectedDate && isDateTodayOrFuture(selectedDate) && (
            <Button 
              onClick={() => {
                onScheduleAppointment(selectedDate);
                setSelectedDate(null);
              }}
              variant="contained"
              startIcon={<Add />}
            >
              {t.appointments.scheduleAppointment}
            </Button>
          )}
        </DialogActions>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t.appointments.deleteAppointment}</DialogTitle>
        <DialogContent>
          <Typography>
            Sigur doriți să ștergeți programarea "{selectedAppointment?.title}"? Această acțiune nu poate fi anulată.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t.common.cancel}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t.common.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CalendarView;
