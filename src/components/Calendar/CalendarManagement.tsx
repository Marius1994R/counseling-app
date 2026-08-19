import React, { useState, useMemo, useCallback } from 'react';
import { Alert, Snackbar, useMediaQuery, useTheme } from '@mui/material';
import { useCalendarData } from '../../hooks/useCalendarData';
import { useEvents } from '../../contexts/EventsContext';
import { ChurchEvent } from '../../types';
import AppointmentForm from './AppointmentForm';
import EventForm from './EventForm';
import CalendarPageHeader from './CalendarPageHeader';
import CalendarToolbar from './CalendarToolbar';
import CalendarMonthGrid from './CalendarMonthGrid';
import CalendarDayDialog from './CalendarDayDialog';
import CalendarSkeleton from './CalendarSkeleton';
import { countFutureAppointments } from './calendarUtils';
import { getEventsForDate } from './eventUtils';
import { t } from '../../utils/translations';

const CalendarManagement: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'), { noSsr: true });
  const data = useCalendarData();
  const { handleDeleteAppointment: deleteAppointment, handleDateClick: selectCalendarDate } = data;
  const {
    events,
    canManageEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();

  const [eventFormOpen, setEventFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ChurchEvent | null>(null);
  const [preSelectedEventDate, setPreSelectedEventDate] = useState<Date | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [mobileDayOpen, setMobileDayOpen] = useState(false);

  const selectedDayEvents = useMemo(
    () => (data.selectedDate ? getEventsForDate(events, data.selectedDate) : []),
    [events, data.selectedDate]
  );

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleDateClick = useCallback(
    (date: Date, options?: { openMobileDay?: boolean }) => {
      selectCalendarDate(date);
      if (options?.openMobileDay !== false) {
        setMobileDayOpen(true);
      }
    },
    [selectCalendarDate]
  );

  const handleAddEventFromDate = useCallback((date: Date) => {
    setEditingEvent(null);
    setPreSelectedEventDate(date);
    setEventFormOpen(true);
  }, []);

  const handleEditEvent = useCallback(
    (event: ChurchEvent) => {
      setEditingEvent(event);
      setPreSelectedEventDate(null);
      setEventFormOpen(true);
    },
    []
  );

  const handleCloseEventForm = useCallback(() => {
    setEventFormOpen(false);
    setEditingEvent(null);
    setPreSelectedEventDate(null);
  }, []);

  const handleEventSubmit = useCallback(
    async (eventData: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      try {
        if (editingEvent) {
          await updateEvent(editingEvent.id, eventData);
          showSnackbar(t.events.updateSuccess, 'success');
        } else {
          await createEvent(eventData);
          showSnackbar(t.events.createSuccess, 'success');
        }
        handleCloseEventForm();
      } catch (error) {
        console.error('Event save error:', error);
        showSnackbar(t.events.saveError, 'error');
      }
    },
    [editingEvent, updateEvent, createEvent, showSnackbar, handleCloseEventForm]
  );

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      try {
        await deleteEvent(eventId);
        showSnackbar(t.events.deleteSuccess, 'success');
      } catch (error) {
        console.error('Event delete error:', error);
        showSnackbar(t.events.deleteError, 'error');
        throw error;
      }
    },
    [deleteEvent, showSnackbar]
  );

  const handleDeleteAppointment = useCallback(
    async (appointmentId: string) => {
      try {
        await deleteAppointment(appointmentId);
        showSnackbar(t.appointments.deleteSuccess, 'success');
      } catch (error) {
        showSnackbar(t.appointments.deleteError, 'error');
        throw error;
      }
    },
    [deleteAppointment, showSnackbar]
  );

  if (data.loading) {
    return (
      <div>
        <CalendarPageHeader />
        <CalendarSkeleton />
      </div>
    );
  }

  const dayPanelProps = {
    selectedDate: data.selectedDate,
    appointments: data.selectedDayAppointments,
    events: selectedDayEvents,
    onEditAppointment: data.handleEditAppointment,
    onDeleteAppointment: handleDeleteAppointment,
    onScheduleAppointment: data.handleScheduleFromDate,
    onEditEvent: handleEditEvent,
    onDeleteEvent: handleDeleteEvent,
    onAddEvent: handleAddEventFromDate,
    canEdit: data.canEditAppointment,
    canDelete: data.canDeleteAppointment,
    canManageEvents,
    canViewCaseDetails: data.canViewAppointmentCaseDetails,
  };

  return (
    <div>
      <CalendarPageHeader />

      {data.error && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {data.error}
        </Alert>
      )}

      <div
        className={
          isMobile
            ? ''
            : 'grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,400px)] lg:items-start'
        }
      >
        <CalendarMonthGrid
          appointments={data.filteredAppointments}
          events={events}
          selectedDate={data.selectedDate}
          onDateClick={handleDateClick}
          canViewCaseDetails={data.canViewAppointmentCaseDetails}
        />

        {!isMobile && <CalendarDayDialog variant="panel" {...dayPanelProps} />}
      </div>

      <div className="mt-4">
        <CalendarToolbar
          searchTerm={data.searchTerm}
          onSearchChange={data.setSearchTerm}
          counselorFilter={data.counselorFilter}
          onCounselorFilterChange={data.setCounselorFilter}
          counselors={data.counselors}
          filteredCount={countFutureAppointments(data.filteredAppointments)}
        />
      </div>

      {isMobile && (
        <CalendarDayDialog
          variant="drawer"
          open={mobileDayOpen}
          onClose={() => setMobileDayOpen(false)}
          {...dayPanelProps}
        />
      )}

      <AppointmentForm
        open={data.formOpen}
        onClose={data.handleCloseForm}
        onSubmit={data.handleFormSubmit}
        appointmentData={data.editingAppointment}
        counselors={data.counselors}
        cases={data.cases}
        existingAppointments={data.appointments}
        currentUser={data.currentUser}
        preSelectedDate={data.preSelectedDate}
        preSelectedCaseId={data.preSelectedCaseId}
      />

      <EventForm
        open={eventFormOpen}
        onClose={handleCloseEventForm}
        onSubmit={handleEventSubmit}
        eventData={editingEvent}
        preSelectedDate={preSelectedEventDate}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          className="rounded-xl"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default CalendarManagement;
