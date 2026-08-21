import React, { useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import AppointmentForm from '../Calendar/AppointmentForm';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import { Appointment } from '../../types';
import {
  assertNoRoomConflict,
  createAppointment,
  AppointmentInput,
} from '../../utils/appointmentService';
import { t } from '../../utils/translations';

interface ScheduleAppointmentDialogProps {
  open: boolean;
  preSelectedCaseId?: string | null;
  preSelectedSessionNumber?: number | null;
  onClose: () => void;
  onScheduled: (appointment: Appointment) => void;
}

const ScheduleAppointmentDialog: React.FC<ScheduleAppointmentDialogProps> = ({
  open,
  preSelectedCaseId,
  preSelectedSessionNumber,
  onClose,
  onScheduled,
}) => {
  const { currentUser } = useAuth();
  const {
    cases,
    counselors,
    appointments,
    sessionReportCounts,
    upsertAppointment,
  } = useDashboardDataContext();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (appointmentData: AppointmentInput) => {
    try {
      await assertNoRoomConflict(appointmentData, { knownAppointments: appointments });
      const appointment = await createAppointment(appointmentData, currentUser);
      upsertAppointment(appointment);
      onScheduled(appointment);
    } catch (err) {
      console.error('Dashboard appointment save error:', err);
      if (!(err instanceof Error && err.message === t.appointments.roomConflict)) {
        setError(t.appointments.saveError);
      }
      throw err;
    }
  };

  return (
    <>
      <AppointmentForm
        open={open}
        onClose={onClose}
        onSubmit={handleSubmit}
        counselors={counselors}
        cases={cases}
        existingAppointments={appointments}
        currentUser={currentUser}
        preSelectedCaseId={preSelectedCaseId}
        preSelectedSessionNumber={preSelectedSessionNumber}
        sessionReportCounts={sessionReportCounts}
      />

      <Snackbar
        open={error !== null}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ScheduleAppointmentDialog;
