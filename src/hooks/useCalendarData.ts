import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { db } from '../firebase';
import { Appointment } from '../types';
import { logAppointmentCreated } from '../utils/activityLogger';
import {
  getAppointmentsForDate,
  findCounselorForUser,
  hasRoomConflict,
} from '../components/Calendar/calendarUtils';
import { isAdminOrLeader } from '../utils/roleAuth';
import { t } from '../utils/translations';

interface UseCalendarDataOptions {
  /** @deprecated unused — kept for call-site compatibility */
  isAdminView?: boolean;
}

function mapFirestoreAppointment(id: string, data: DocumentData): Appointment {
  return {
    id,
    title: data.title,
    description: data.description,
    date: data.date.toDate(),
    startTime: data.startTime,
    endTime: data.endTime,
    counselorId: data.counselorId,
    counselorName: data.counselorName,
    caseId: data.caseId,
    caseTitle: data.caseTitle,
    room: data.room,
    createdBy: data.createdBy,
    createdAt: data.createdAt.toDate(),
  };
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
      const canViewAllCaseTitles = isAdminOrLeader(currentUser?.role);

      filtered = filtered.filter((appointment) => {
        const matchesBasic =
          appointment.title.toLowerCase().includes(term) ||
          appointment.counselorName.toLowerCase().includes(term);

        const isOwnAppointment =
          appointment.createdBy === currentUser?.id ||
          (linkedCounselorId != null && appointment.counselorId === linkedCounselorId);
        const canMatchCaseTitle = canViewAllCaseTitles || isOwnAppointment;

        const matchesCase =
          canMatchCaseTitle &&
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

  const canViewAppointmentCaseDetails = useCallback(
    (appointment: Appointment) => {
      if (isAdminOrLeader(currentUser?.role)) return true;
      if (!currentUser) return false;
      if (appointment.createdBy === currentUser.id) return true;
      const linkedCounselor = findCounselorForUser(counselors, currentUser);
      return !!linkedCounselor && appointment.counselorId === linkedCounselor.id;
    },
    [currentUser, counselors]
  );

  const canEditAppointment = useCallback(
    (appointment: Appointment) => {
      const isOwnAppointment =
        appointment.createdBy === currentUser?.id ||
        (appointment.createdBy === 'current-user' && currentUser?.role === 'counselor');
      return (
        isOwnAppointment || currentUser?.role === 'leader' || currentUser?.role === 'admin'
      );
    },
    [currentUser]
  );

  const canDeleteAppointment = useCallback(
    (appointment: Appointment) => canEditAppointment(appointment),
    [canEditAppointment]
  );

  const handleAddAppointment = useCallback(() => {
    setEditingAppointment(null);
    setFormOpen(true);
  }, []);

  const handleEditAppointment = useCallback(
    (appointment: Appointment) => {
      const isOwnAppointment =
        appointment.createdBy === currentUser?.id ||
        (appointment.createdBy === 'current-user' && currentUser?.role === 'counselor');

      if (
        currentUser &&
        !isOwnAppointment &&
        currentUser.role !== 'leader' &&
        currentUser.role !== 'admin'
      ) {
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
      const isOwnAppointment =
        appointment &&
        (appointment.createdBy === currentUser?.id ||
          (appointment.createdBy === 'current-user' && currentUser?.role === 'counselor'));

      if (
        currentUser &&
        appointment &&
        !isOwnAppointment &&
        currentUser.role !== 'leader' &&
        currentUser.role !== 'admin'
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

  const assertNoRoomConflict = useCallback(
    async (
      appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'createdBy'>,
      excludeId?: string
    ) => {
      // Prefer in-memory listener data; fall back to a day-scoped query for races.
      const dayStart = new Date(appointmentData.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(appointmentData.date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayAppointments = appointments.filter((apt) => {
        const d = new Date(apt.date);
        return d >= dayStart && d <= dayEnd;
      });

      if (
        hasRoomConflict({
          appointments: dayAppointments,
          room: appointmentData.room || '',
          date: appointmentData.date,
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          excludeId,
        })
      ) {
        throw new Error(t.appointments.roomConflict);
      }

      const appointmentsSnapshot = await getDocs(
        query(
          collection(db, 'appointments'),
          where('date', '>=', Timestamp.fromDate(dayStart)),
          where('date', '<=', Timestamp.fromDate(dayEnd))
        )
      );
      const latest: Appointment[] = [];
      appointmentsSnapshot.forEach((aptDoc) => {
        latest.push(mapFirestoreAppointment(aptDoc.id, aptDoc.data()));
      });

      if (
        hasRoomConflict({
          appointments: latest,
          room: appointmentData.room || '',
          date: appointmentData.date,
          startTime: appointmentData.startTime,
          endTime: appointmentData.endTime,
          excludeId,
        })
      ) {
        throw new Error(t.appointments.roomConflict);
      }
    },
    [appointments]
  );

  const handleFormSubmit = useCallback(
    async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'createdBy'>) => {
      try {
        if (editingAppointment) {
          await assertNoRoomConflict(appointmentData, editingAppointment.id);

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
          await assertNoRoomConflict(appointmentData);

          const appointmentsRef = collection(db, 'appointments');
          const docRef = await addDoc(appointmentsRef, {
            ...appointmentData,
            createdAt: new Date(),
            createdBy: currentUser?.id || 'unknown',
          });

          if (currentUser && appointmentData.caseId && appointmentData.caseTitle) {
            await logAppointmentCreated(
              docRef.id,
              appointmentData.title,
              appointmentData.caseId,
              appointmentData.caseTitle,
              currentUser.id,
              currentUser.fullName || currentUser.email || 'Unknown User'
            );
          }
          upsertAppointment({
            ...appointmentData,
            id: docRef.id,
            createdAt: new Date(),
            createdBy: currentUser?.id || 'unknown',
          });
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
    [editingAppointment, currentUser, assertNoRoomConflict, upsertAppointment]
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
