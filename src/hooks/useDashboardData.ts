import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Case, Appointment, CaseStatus } from '../types';
import { ActivityRecord } from '../components/Dashboard/dashboardUtils';

export interface DashboardMetricsComputed {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  pendingCases: number;
  totalAppointments: number;
  casesByStatus: Record<CaseStatus, number>;
}

export function useDashboardData() {
  const { currentUser } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [sessionReportCounts, setSessionReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counselorRecordId, setCounselorRecordId] = useState<string | null>(null);
  const [newAssignmentModal, setNewAssignmentModal] = useState<ActivityRecord | null>(null);
  const [dismissedAssignments, setDismissedAssignments] = useState<Set<string>>(new Set());
  const [dismissedAssignmentsLoaded, setDismissedAssignmentsLoaded] = useState(false);
  const [pendingAssignmentCount, setPendingAssignmentCount] = useState(0);

  const loadDismissedAssignments = async (userId: string) => {
    try {
      const dismissedRef = doc(db, 'dismissedAssignments', userId);
      const dismissedSnap = await getDoc(dismissedRef);

      if (dismissedSnap.exists()) {
        const data = dismissedSnap.data();
        setDismissedAssignments(new Set(data.activityIds || []));
      } else {
        setDismissedAssignments(new Set());
      }
    } catch (err) {
      console.error('Error loading dismissed assignments:', err);
      setDismissedAssignments(new Set());
    } finally {
      setDismissedAssignmentsLoaded(true);
    }
  };

  const saveDismissedAssignment = async (userId: string, activityId: string) => {
    try {
      const dismissedRef = doc(db, 'dismissedAssignments', userId);
      const dismissedSnap = await getDoc(dismissedRef);

      if (dismissedSnap.exists()) {
        await updateDoc(dismissedRef, {
          activityIds: arrayUnion(activityId),
          updatedAt: new Date(),
        });
      } else {
        await setDoc(dismissedRef, {
          userId,
          activityIds: [activityId],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Error saving dismissed assignment:', err);
    }
  };

  const ensureCounselorRecord = useCallback(async (user: NonNullable<typeof currentUser>) => {
    if (user.role !== 'leader' && user.role !== 'admin' && user.role !== 'counselor') {
      return null;
    }

    try {
      const counselorsRef = collection(db, 'counselors');
      const q = query(counselorsRef, where('linkedUserId', '==', user.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }

      if (user.role === 'leader' || user.role === 'admin') {
        const counselorData = {
          fullName: user.fullName || user.email,
          email: user.email,
          phoneNumber: '',
          specialties: user.role === 'leader' ? ['Leadership', 'Administration'] : ['Administration'],
          activeCases: 0,
          workloadLevel: 'low',
          linkedUserId: user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const counselorRef = collection(db, 'counselors');
        const docRef = await addDoc(counselorRef, counselorData);
        return docRef.id;
      }
    } catch (err) {
      console.error('Error ensuring counselor record:', err);
    }
    return null;
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      const counselorId = await ensureCounselorRecord(currentUser);
      setCounselorRecordId(counselorId);

      const casesRef = collection(db, 'cases');
      const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
      const casesSnapshot = await getDocs(casesQuery);

      const casesData: Case[] = [];
      casesSnapshot.forEach((caseDoc) => {
        const data = caseDoc.data();
        let isUserCase = false;

        if (counselorId) {
          isUserCase = data.assignedCounselorId === counselorId;
        } else {
          isUserCase = data.assignedCounselorId === currentUser.id;
        }

        if (isUserCase) {
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
        }
      });

      const appointmentsRef = collection(db, 'appointments');
      const appointmentsQuery = query(appointmentsRef, orderBy('date', 'asc'));
      const appointmentsSnapshot = await getDocs(appointmentsQuery);

      const appointmentsData: Appointment[] = [];
      appointmentsSnapshot.forEach((aptDoc) => {
        const data = aptDoc.data();
        let isUserAppointment = false;

        if (counselorId) {
          isUserAppointment = data.counselorId === counselorId || data.counselorId === currentUser.id;
        } else {
          isUserAppointment = data.counselorId === currentUser.id || data.clientId === currentUser.id;
        }

        if (isUserAppointment) {
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
        }
      });

      const activitiesRef = collection(db, 'activities');
      const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
      const activitiesSnapshot = await getDocs(activitiesQuery);

      const activitiesData: ActivityRecord[] = [];
      activitiesSnapshot.forEach((actDoc) => {
        const data = actDoc.data();
        activitiesData.push({
          id: actDoc.id,
          type: data.type,
          title: data.title,
          description: data.description,
          timestamp: data.timestamp.toDate(),
          userId: data.userId,
          userName: data.userName,
          metadata: data.metadata,
        });
      });

      let userActivities = activitiesData;
      if (
        currentUser.role === 'counselor' ||
        currentUser.role === 'admin' ||
        currentUser.role === 'leader'
      ) {
        userActivities = activitiesData.filter((activity) => {
          const isUserCreated = activity.userId === currentUser.id;
          const isCaseAssignedToUser =
            activity.type === 'case_assigned' &&
            (activity.metadata?.assignedToUserId === currentUser.id ||
              (counselorId && activity.metadata?.assignedToUserId === counselorId));
          return isUserCreated || isCaseAssignedToUser;
        });
      }

      const reportsRef = collection(db, 'sessionReports');
      const reportsSnapshot = await getDocs(reportsRef);
      const reportCounts: Record<string, number> = {};
      reportsSnapshot.forEach((reportDoc) => {
        const data = reportDoc.data();
        const caseId = data.caseId as string;
        if (caseId) {
          reportCounts[caseId] = (reportCounts[caseId] ?? 0) + 1;
        }
      });

      setCases(casesData);
      setAppointments(appointmentsData);
      setActivities(userActivities);
      setSessionReportCounts(reportCounts);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, ensureCounselorRecord]);

  useEffect(() => {
    loadData();
    if (currentUser?.id) {
      loadDismissedAssignments(currentUser.id);
    }
  }, [currentUser?.id, loadData]);

  useEffect(() => {
    if (
      !currentUser ||
      (currentUser.role !== 'counselor' &&
        currentUser.role !== 'admin' &&
        currentUser.role !== 'leader')
    ) {
      return;
    }

    if (!dismissedAssignmentsLoaded) return;

    const loadCaseAssignments = async () => {
      try {
        const activitiesRef = collection(db, 'activities');
        let allCaseAssignments: ActivityRecord[] = [];

        try {
          const activitiesQuery = query(
            activitiesRef,
            where('type', '==', 'case_assigned'),
            orderBy('timestamp', 'desc')
          );
          const activitiesSnapshot = await getDocs(activitiesQuery);

          activitiesSnapshot.forEach((actDoc) => {
            const data = actDoc.data();
            allCaseAssignments.push({
              id: actDoc.id,
              type: data.type,
              title: data.title,
              description: data.description,
              timestamp: data.timestamp.toDate(),
              userId: data.userId,
              userName: data.userName,
              metadata: data.metadata,
            });
          });
        } catch (queryError: unknown) {
          const err = queryError as { code?: string; message?: string };
          if (err.code === 'failed-precondition' || err.message?.includes('index')) {
            const allActivitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
            const allActivitiesSnapshot = await getDocs(allActivitiesQuery);

            allActivitiesSnapshot.forEach((actDoc) => {
              const data = actDoc.data();
              if (data.type === 'case_assigned') {
                allCaseAssignments.push({
                  id: actDoc.id,
                  type: data.type,
                  title: data.title,
                  description: data.description,
                  timestamp: data.timestamp.toDate(),
                  userId: data.userId,
                  userName: data.userName,
                  metadata: data.metadata,
                });
              }
            });
          } else {
            throw queryError;
          }
        }

        const caseAssignedActivities = allCaseAssignments.filter((activity) => {
          const matchesUser = activity.metadata?.assignedToUserId === currentUser.id;
          const matchesCounselor =
            counselorRecordId && activity.metadata?.assignedToUserId === counselorRecordId;
          const notDismissed = !dismissedAssignments.has(activity.id);
          return (matchesUser || matchesCounselor) && notDismissed;
        });

        setPendingAssignmentCount(caseAssignedActivities.length);

        if (caseAssignedActivities.length > 0) {
          setNewAssignmentModal(caseAssignedActivities[0]);
        } else {
          setNewAssignmentModal(null);
        }
      } catch (err) {
        console.error('Error loading case assignments:', err);
      }
    };

    loadCaseAssignments();
  }, [currentUser, counselorRecordId, dismissedAssignments, dismissedAssignmentsLoaded]);

  const dismissAssignment = useCallback(
    async (activityId: string) => {
      if (!currentUser?.id) return;
      setDismissedAssignments((prev) => new Set(Array.from(prev).concat(activityId)));
      await saveDismissedAssignment(currentUser.id, activityId);
      setNewAssignmentModal(null);
      setPendingAssignmentCount((c) => Math.max(0, c - 1));
    },
    [currentUser?.id]
  );

  const metrics: DashboardMetricsComputed = useMemo(() => {
      const casesByStatus = cases.reduce(
        (acc, caseItem) => {
          acc[caseItem.status] = (acc[caseItem.status] || 0) + 1;
          return acc;
        },
        {} as Record<CaseStatus, number>
      );

      return {
        totalCases: cases.length,
        activeCases: cases.filter((c) => c.status === 'active').length,
        completedCases: cases.filter((c) => c.status === 'finished').length,
        pendingCases: cases.filter((c) => c.status === 'waiting').length,
        totalAppointments: appointments.length,
        casesByStatus,
      };
    }, [cases, appointments.length]);

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((apt) => {
          const appointmentDateTime = new Date(apt.date);
          if (apt.startTime) {
            const [hours, minutes] = apt.startTime.split(':').map(Number);
            appointmentDateTime.setHours(hours, minutes, 0, 0);
          }
          return appointmentDateTime > new Date();
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [appointments]
  );

  const activeCasesList = useMemo(
    () =>
      cases
        .filter((c) => c.status === 'active')
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
    [cases]
  );

  return {
    cases,
    appointments,
    activities,
    sessionReportCounts,
    metrics,
    upcomingAppointments,
    activeCasesList,
    loading,
    error,
    counselorRecordId,
    newAssignmentModal,
    setNewAssignmentModal,
    dismissAssignment,
    pendingAssignmentCount,
    refetch: loadData,
  };
}
