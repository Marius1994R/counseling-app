import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { db } from '../firebase';
import { Appointment, Case, Counselor } from '../types';
import { logAppointmentCreated } from '../utils/activityLogger';
import {
  getAppointmentsForDate,
  findCounselorForUser,
  hasRoomConflict,
} from '../components/Calendar/calendarUtils';
import { mapFirestoreCase } from '../components/Cases/casesUtils';
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
  const { refetch: refetchDashboard } = useDashboardDataContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [counselorFilter, setCounselorFilter] = useState<string>('all');
  const [preSelectedDate, setPreSelectedDate] = useState<Date | null>(null);
  const [preSelectedCaseId, setPreSelectedCaseId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    let staticReady = false;
    let appointmentsReady = false;

    const maybeFinishLoading = () => {
      if (!cancelled && staticReady && appointmentsReady) {
        setLoading(false);
      }
    };

    const loadStaticData = async () => {
      try {
        setLoading(true);

        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, orderBy('fullName', 'asc'));
        const counselorsSnapshot = await getDocs(counselorsQuery);

        const counselorsData: Counselor[] = [];
        counselorsSnapshot.forEach((counselorDoc) => {
          const data = counselorDoc.data();
          counselorsData.push({
            id: counselorDoc.id,
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber || '',
            sex: data.sex === 'feminin' || data.sex === 'masculin' ? data.sex : undefined,
            specialties: data.specialties || [],
            activeCases: data.activeCases || 0,
            workloadLevel: data.workloadLevel || 'low',
            linkedUserId: data.linkedUserId,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          });
        });

        const casesRef = collection(db, 'cases');
        const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
        const casesSnapshot = await getDocs(casesQuery);

        const casesData: Case[] = [];
        casesSnapshot.forEach((caseDoc) => {
          casesData.push(mapFirestoreCase(caseDoc.id, caseDoc.data()));
        });

        if (cancelled) return;

        setCounselors(counselorsData);
        setCases(casesData);
        staticReady = true;
        maybeFinishLoading();
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load calendar data');
          console.error('Calendar loading error:', err);
          setLoading(false);
        }
      }
    };

    void loadStaticData();

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
        appointmentsReady = true;
        maybeFinishLoading();
      },
      (err) => {
        if (cancelled) return;
        console.error('Appointments listener error:', err);
        setError('Failed to load calendar data');
        appointmentsReady = true;
        maybeFinishLoading();
      }
    );

    return () => {
      cancelled = true;
      unsubscribeAppointments();
    };
  }, []);

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
        // Live listener updates local state
        void refetchDashboard();
      } catch (err) {
        console.error('Delete error:', err);
        setError('Failed to delete appointment');
        throw err;
      }
    },
    [appointments, currentUser, refetchDashboard]
  );

  const assertNoRoomConflict = useCallback(
    async (
      appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'createdBy'>,
      excludeId?: string
    ) => {
      const appointmentsSnapshot = await getDocs(
        query(collection(db, 'appointments'), orderBy('date', 'asc'))
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
    []
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
        }
        setFormOpen(false);
        setEditingAppointment(null);
        setPreSelectedDate(null);
        setPreSelectedCaseId(null);
        await refetchDashboard();
      } catch (err) {
        console.error('Form submit error:', err);
        if (err instanceof Error && err.message === t.appointments.roomConflict) {
          throw err;
        }
        setError('Failed to save appointment');
        throw err;
      }
    },
    [editingAppointment, currentUser, refetchDashboard, assertNoRoomConflict]
  );

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleScheduleFromDate = useCallback((date: Date) => {
    setEditingAppointment(null);
    setPreSelectedDate(date);
    setFormOpen(true);
    setSelectedDate(null);
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
