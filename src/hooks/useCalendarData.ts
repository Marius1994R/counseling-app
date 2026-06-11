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
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { db } from '../firebase';
import { Appointment, Case, Counselor } from '../types';
import { logAppointmentCreated } from '../utils/activityLogger';
import { getAppointmentsForDate } from '../components/Calendar/calendarUtils';

interface UseCalendarDataOptions {
  isAdminView?: boolean;
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
    if (newParam === 'true') {
      setFormOpen(true);
      const caseId = searchParams.get('caseId');
      if (caseId) {
        setPreSelectedCaseId(caseId);
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const loadData = async () => {
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
            specialties: data.specialties || [],
            activeCases: data.activeCases || 0,
            workloadLevel: data.workloadLevel || 'low',
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          });
        });

        const casesRef = collection(db, 'cases');
        const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
        const casesSnapshot = await getDocs(casesQuery);

        const casesData: Case[] = [];
        casesSnapshot.forEach((caseDoc) => {
          const data = caseDoc.data();
          casesData.push({
            id: caseDoc.id,
            title: data.title,
            counseledName: data.counseledName,
            age: data.age,
            sex: data.sex,
            civilStatus: data.civilStatus,
            issueTypes: data.issueTypes,
            phoneNumber: data.phoneNumber,
            description: data.description || '',
            status: data.status,
            assignedCounselorId: data.assignedCounselorId,
            assignedCounselorName: data.assignedCounselorName,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            createdBy: data.createdBy,
          });
        });

        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(appointmentsRef, orderBy('date', 'asc'));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);

        const appointmentsData: Appointment[] = [];
        appointmentsSnapshot.forEach((aptDoc) => {
          const data = aptDoc.data();
          appointmentsData.push({
            id: aptDoc.id,
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
          });
        });

        setCounselors(counselorsData);
        setCases(casesData);
        setAppointments(appointmentsData);
        setFilteredAppointments(appointmentsData);
      } catch (err) {
        setError('Failed to load calendar data');
        console.error('Calendar loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = appointments;

    if (searchTerm) {
      filtered = filtered.filter(
        (appointment) =>
          appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appointment.counselorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (appointment.caseTitle &&
            appointment.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (counselorFilter !== 'all') {
      filtered = filtered.filter((appointment) => appointment.counselorId === counselorFilter);
    }

    setFilteredAppointments(filtered);
  }, [appointments, searchTerm, counselorFilter]);

  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return getAppointmentsForDate(filteredAppointments, selectedDate);
  }, [filteredAppointments, selectedDate]);

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
        return;
      }

      try {
        await deleteDoc(doc(db, 'appointments', appointmentId));
        setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
        await refetchDashboard();
      } catch (err) {
        console.error('Delete error:', err);
        setError('Failed to delete appointment');
      }
    },
    [appointments, currentUser, refetchDashboard]
  );

  const handleFormSubmit = useCallback(
    async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'createdBy'>) => {
      try {
        if (editingAppointment) {
          const appointmentRef = doc(db, 'appointments', editingAppointment.id);
          await updateDoc(appointmentRef, {
            ...appointmentData,
            updatedAt: new Date(),
          });

          const updatedAppointment: Appointment = {
            ...editingAppointment,
            ...appointmentData,
          };
          setAppointments((prev) =>
            prev.map((a) => (a.id === editingAppointment.id ? updatedAppointment : a))
          );
        } else {
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

          const newAppointment: Appointment = {
            ...appointmentData,
            id: docRef.id,
            createdAt: new Date(),
            createdBy: currentUser?.id || 'unknown',
          };
          setAppointments((prev) => [newAppointment, ...prev]);
        }
        setFormOpen(false);
        setEditingAppointment(null);
        setPreSelectedDate(null);
        setPreSelectedCaseId(null);
        await refetchDashboard();
      } catch (err) {
        console.error('Form submit error:', err);
        setError('Failed to save appointment');
      }
    },
    [editingAppointment, currentUser, refetchDashboard]
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
  };
}
