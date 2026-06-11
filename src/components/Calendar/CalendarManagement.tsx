import React from 'react';
import { Alert } from '@mui/material';
import { useCalendarData } from '../../hooks/useCalendarData';
import AppointmentForm from './AppointmentForm';
import CalendarPageHeader from './CalendarPageHeader';
import CalendarToolbar from './CalendarToolbar';
import CalendarMonthGrid from './CalendarMonthGrid';
import CalendarDayDialog from './CalendarDayDialog';
import CalendarSkeleton from './CalendarSkeleton';
import { countFutureAppointments } from './calendarUtils';

interface CalendarManagementProps {
  isAdminView?: boolean;
}

const CalendarManagement: React.FC<CalendarManagementProps> = ({ isAdminView = true }) => {
  const data = useCalendarData({ isAdminView });

  if (data.loading) {
    return (
      <div>
        <CalendarPageHeader />
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div>
      <CalendarPageHeader />

      {data.error && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {data.error}
        </Alert>
      )}

      <CalendarToolbar
        searchTerm={data.searchTerm}
        onSearchChange={data.setSearchTerm}
        counselorFilter={data.counselorFilter}
        onCounselorFilterChange={data.setCounselorFilter}
        counselors={data.counselors}
        filteredCount={countFutureAppointments(data.filteredAppointments)}
        onSchedule={data.handleAddAppointment}
      />

      <CalendarMonthGrid
        appointments={data.filteredAppointments}
        onDateClick={data.handleDateClick}
      />

      <CalendarDayDialog
        selectedDate={data.selectedDate}
        appointments={data.selectedDayAppointments}
        onClose={() => data.setSelectedDate(null)}
        onEditAppointment={data.handleEditAppointment}
        onDeleteAppointment={data.handleDeleteAppointment}
        onScheduleAppointment={data.handleScheduleFromDate}
        canEdit={data.canEditAppointment}
        canDelete={data.canDeleteAppointment}
      />

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
    </div>
  );
};

export default CalendarManagement;
