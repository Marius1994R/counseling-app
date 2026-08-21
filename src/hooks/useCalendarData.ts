import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { db } from '../firebase';
import { Appointment } from '../types';
import {
  assertNoRoomConflict,
  createAppointment,
  mapFirestoreAppointment,
} from '../utils/appointmentService';
import {
  getAppointmentsForDate,
  findCounselorForUser,
  isPastAppointment,
} from '../components/Calendar/calendarUtils';
import { isAdminOrLeader } from '../utils/roleAuth';
import { t } from '../utils/translations';

interface UseCalendarDataOptions {
  /** @deprecated unused — kept for call-site compatibility */
  isAdminView?: boolean;
}

export function useCalendarData(_options: UseCalendarDataOptions = {}) {
  const { currentUser } = useAuth();
  const {
    cases: cachedCases,
    counselors: cachedCounselors,
    appointments: cachedAppointments,
    loading: dashboardLoading,
    counselorRecordId,
    upsertAppointment,
    removeAppointment,
    replaceAppointments,
  } = useDashboardDataContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [counselorFilter, setCounselorFilter] = useState<string>('all');
  const [preSelectedDate, setPreSelectedDate] = useState<Date | null>(null);
  const [preSelectedCaseId, setPreSelectedCaseId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());

  const cases = cachedCases;
  const counselors = cachedCounselors;

  useEffect(() => {
    const newParam = searchParams.get('new');
    const dateParam = searchParams.get('date');

    if (newParam === 'true') {
      setFormOpen(true);
      const caseId = searchParams.get('caseId');
      if (caseId) {
        setPreSelectedCaseId(caseId);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      next.delete('caseId');
      setSearchParams(next, { replace: true });
    } else if (dateParam) {
      const parsed = new Date(`${dateParam}T12:00:00`);
      if (!Number.isNaN(parsed.getTime())) {
        setSelectedDate(parsed);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('date');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Seed from shared cache while waiting for the live listener
  useEffect(() => {
    if (!dashboardLoading && cachedAppointments.length > 0 && appointments.length === 0) {
      setAppointments(cachedAppointments);
    }
    if (!dashboardLoading) {
      setLoading(false);
    }
  }, [dashboardLoading, cachedAppointments, appointments.length]);

  useEffect(() => {
    let cancelled = false;

    const appointmentsQuery = query(collection(db, 'appointments'), orderBy('date', 'asc'));
    const unsubscribeAppointments = onSnapshot(
      appointmentsQuery,
      (snapshot) => {
        if (cancelled) return;
        const appointmentsData: Appointment[] = [];
        snapshot.forEach((aptDoc) => {
          appointmentsData.push(mapFirestoreAppointment(aptDoc.id, aptDoc.data()));
        });
        setAppointments(appointmentsData);
        setLoading(false);

        // Keep dashboard cache in sync for this user's visible appointments
        const visibleForDashboard = appointmentsData.filter((apt) => {
          if (!currentUser) return false;
          if (counselorRecordId) {
            return (
              apt.counselorId === counselorRecordId || apt.counselorId === currentUser.id
            );
          }
          return apt.counselorId === currentUser.id;
        });
        replaceAppointments(visibleForDashboard);
      },
      (err) => {
        if (cancelled) return;
        console.error('Appointments listener error:', err);
        setError('Failed to load calendar data');
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribeAppointments();
    };
  }, [currentUser, counselorRecordId, replaceAppointments]);

  useEffect(() => {
    let filtered = appointments;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const linkedCounselorId = currentUser
        ? findCounselorForUser(counselors, currentUser)?.id
        : undefined;

      filtered = filtered.filter((appointment) => {
        const matchesBasic =
          appointment.title.toLowerCase().includes(term) ||
          appointment.counselorName.toLowerCase().includes(term);

        const isOwnAppointment =
          appointment.createdBy === currentUser?.id ||
          (linkedCounselorId != null && appointment.counselorId === linkedCounselorId);

        // Case titles are private — only searchable on own appointments.
        const matchesCase =
          isOwnAppointment &&
          !!appointment.caseTitle &&
          appointment.caseTitle.toLowerCase().includes(term);

        return matchesBasic || matchesCase;
      });
    }

    if (counselorFilter !== 'all') {
      filtered = filtered.filter((appointment) => appointment.counselorId === counselorFilter);
    }

    setFilteredAppointments(filtered);
  }, [appointments, searchTerm, counselorFilter, currentUser, counselors]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return getAppointmentsForDate(filteredAppointments, selectedDate);
  }, [filteredAppointments, selectedDate]);

  const isOwnAppointmentForUser = useCallback(
    (appointment: Appointment) => {
      if (!currentUser) return false;
      if (
        appointment.createdBy === currentUser.id ||
        (appointment.createdBy === 'current-user' && currentUser.role === 'counselor')
      ) {
        return true;
      }
      const linkedCounselor = findCounselorForUser(counselors, currentUser);
      return !!linkedCounselor && appointment.counselorId === linkedCounselor.id;
    },
    [currentUser, counselors]
  );

  /** Case title / description — only for appointments that belong to the current user. */
  const canViewAppointmentCaseDetails = useCallback(
    (appointment: Appointment) => isOwnAppointmentForUser(appointment),
    [isOwnAppointmentForUser]
  );

  /** Edit only own (non-past) appointments — including for admin/leader. */
  const canEditAppointment = useCallback(
    (appointment: Appointment) => {
      if (isPastAppointment(appointment)) return false;
      if (!currentUser) return false;
      return (
        appointment.createdBy === currentUser.id ||
        (appointment.createdBy === 'current-user' && currentUser.role === 'counselor')
      );
    },
    [currentUser]
  );

  /** Counselors: delete own only. Admin/leader: delete any non-past appointment. */
  const canDeleteAppointment = useCallback(
    (appointment: Appointment) => {
      if (isPastAppointment(appointment)) return false;
      if (!currentUser) return false;
      if (isAdminOrLeader(currentUser.role)) return true;
      return (
        appointment.createdBy === currentUser.id ||
        (appointment.createdBy === 'current-user' && currentUser.role === 'counselor')
      );
    },
    [currentUser]
  );

  const handleAddAppointment = useCallback(() => {
    setEditingAppointment(null);
    setFormOpen(true);
  }, []);

  const handleEditAppointment = useCallback(
    (appointment: Appointment) => {
      if (isPastAppointment(appointment)) {
        setError(t.appointments.pastCannotModify);
        return;
      }
      const isCreator =
        appointment.createdBy === currentUser?.id ||
        (appointment.createdBy === 'current-user' && currentUser?.role === 'counselor');

      if (!currentUser || !isCreator) {
        setError('You can only edit appointments created by you');
        return;
      }
      setEditingAppointment(appointment);
      setFormOpen(true);
    },
    [currentUser]
  );

  const handleDeleteAppointment = useCallback(
    async (appointmentId: string) => {
      const appointment = appointments.find((a) => a.id === appointmentId);
      if (appointment && isPastAppointment(appointment)) {
        setError(t.appointments.pastCannotModify);
        throw new Error(t.appointments.pastCannotModify);
      }
      const isCreator =
        appointment &&
        (appointment.createdBy === currentUser?.id ||
          (appointment.createdBy === 'current-user' && currentUser?.role === 'counselor'));

      if (
        currentUser &&
        appointment &&
        !isCreator &&
        !isAdminOrLeader(currentUser.role)
      ) {
        setError('You can only delete appointments created by you');
        throw new Error('You can only delete appointments created by you');
      }

      try {
        await deleteDoc(doc(db, 'appointments', appointmentId));
        removeAppointment(appointmentId);
      } catch (err) {
        console.error('Delete error:', err);
        setError('Failed to delete appointment');
        throw err;
      }
    },
    [appointments, currentUser, removeAppointment]
  );

  const handleFormSubmit = useCallback(
    async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'createdBy'>) => {
      try {
        if (editingAppointment) {
          await assertNoRoomConflict(appointmentData, {
            knownAppointments: appointments,
            excludeId: editingAppointment.id,
          });

          const appointmentRef = doc(db, 'appointments', editingAppointment.id);
          await updateDoc(appointmentRef, {
            ...appointmentData,
            updatedAt: new Date(),
          });
          upsertAppointment({
            ...editingAppointment,
            ...appointmentData,
          });
        } else {
          await assertNoRoomConflict(appointmentData, { knownAppointments: appointments });
          upsertAppointment(await createAppointment(appointmentData, currentUser));
        }
        setFormOpen(false);
        setEditingAppointment(null);
        setPreSelectedDate(null);
        setPreSelectedCaseId(null);
      } catch (err) {
        console.error('Form submit error:', err);
        if (err instanceof Error && err.message === t.appointments.roomConflict) {
          throw err;
        }
        setError('Failed to save appointment');
        throw err;
      }
    },
    [editingAppointment, appointments, currentUser, upsertAppointment]
  );

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleScheduleFromDate = useCallback((date: Date) => {
    setEditingAppointment(null);
    setPreSelectedDate(date);
    setFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setEditingAppointment(null);
    setPreSelectedDate(null);
    setPreSelectedCaseId(null);
  }, []);

  return {
    currentUser,
    appointments,
    filteredAppointments,
    cases,
    counselors,
    loading,
    error,
    setError,
    searchTerm,
    setSearchTerm,
    counselorFilter,
    setCounselorFilter,
    formOpen,
    editingAppointment,
    preSelectedDate,
    preSelectedCaseId,
    selectedDate,
    setSelectedDate,
    selectedDayAppointments,
    handleAddAppointment,
    handleEditAppointment,
    handleDeleteAppointment,
    handleFormSubmit,
    handleDateClick,
    handleScheduleFromDate,
    handleCloseForm,
    canEditAppointment,
    canDeleteAppointment,
    canViewAppointmentCaseDetails,
  };
}
