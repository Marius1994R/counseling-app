import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Case, Appointment, CaseStatus, Counselor } from '../types';
import { ActivityRecord } from '../components/Dashboard/dashboardUtils';
import { countFutureAppointments } from '../components/Calendar/calendarUtils';
import { mapFirestoreCase, isCaseVisibleToCounselor } from '../components/Cases/casesUtils';
import { mapFirestoreCounselor, dedupeCounselors } from '../components/Counselors/counselorsUtils';
import {
  logCaseAssigned,
  logCaseProposalDeclined,
} from '../utils/activityLogger';
import { filterPendingAssignments, filterActiveProposals, filterAssignmentOutcomes } from '../utils/assignmentNotifications';
import { t } from '../utils/translations';

export interface DashboardMetricsComputed {
  totalCases: number;
  activeCases: number;
  completedCases: number;
  pendingCases: number;
  totalAppointments: number;
  futureAppointmentsCount: number;
  casesByStatus: Record<CaseStatus, number>;
}

export function useDashboardData() {
  const { currentUser } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [sessionReportCounts, setSessionReportCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counselorRecordId, setCounselorRecordId] = useState<string | null>(null);
  const [newAssignmentModal, setNewAssignmentModal] = useState<ActivityRecord | null>(null);
  const [dismissedAssignments, setDismissedAssignments] = useState<Set<string>>(new Set());
  const [dismissedAssignmentsLoaded, setDismissedAssignmentsLoaded] = useState(false);
  const [rawPendingAssignments, setRawPendingAssignments] = useState<ActivityRecord[]>([]);
  const [assignmentOutcomes, setAssignmentOutcomes] = useState<ActivityRecord[]>([]);

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

  const loadData = useCallback(async () => {
    if (!currentUser) return;

    const findCounselorRecordId = async (user: NonNullable<typeof currentUser>) => {
      if (user.role !== 'leader' && user.role !== 'admin' && user.role !== 'counselor') {
        return null;
      }

      try {
        const counselorsRef = collection(db, 'counselors');
        const linkedQuery = query(counselorsRef, where('linkedUserId', '==', user.id));
        const linkedSnapshot = await getDocs(linkedQuery);

        if (!linkedSnapshot.empty) {
          return linkedSnapshot.docs[0].id;
        }

        const emailQuery = query(counselorsRef, where('email', '==', user.email));
        const emailSnapshot = await getDocs(emailQuery);
        if (!emailSnapshot.empty) {
          return emailSnapshot.docs[0].id;
        }
      } catch (err) {
        console.error('Error finding counselor record:', err);
      }
      return null;
    };

    try {
      setLoading(true);
      setError(null);

      const counselorId = await findCounselorRecordId(currentUser);
      setCounselorRecordId(counselorId);

      const casesRef = collection(db, 'cases');
      const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
      const casesSnapshot = await getDocs(casesQuery);

      const casesData: Case[] = [];
      casesSnapshot.forEach((caseDoc) => {
        const caseItem = mapFirestoreCase(caseDoc.id, caseDoc.data());
        if (isCaseVisibleToCounselor(caseItem, counselorId, currentUser.id)) {
          casesData.push(caseItem);
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
      const activitiesQuery = query(
        activitiesRef,
        orderBy('timestamp', 'desc'),
        limit(30)
      );
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
      if (currentUser.role === 'counselor') {
        userActivities = activitiesData.filter((activity) => {
          const isUserCreated = activity.userId === currentUser.id;
          const isCaseAssignedToUser =
            activity.type === 'case_assigned' &&
            (activity.metadata?.assignedToUserId === currentUser.id ||
              (counselorId && activity.metadata?.assignedToUserId === counselorId));
          return isUserCreated || isCaseAssignedToUser;
        });
      }
      // leader / admin: keep full team pulse (already capped)

      let counselorsData: Counselor[] = [];
      const counselorsSnapshot = await getDocs(collection(db, 'counselors'));
      counselorsSnapshot.forEach((docSnap) => {
        counselorsData.push(mapFirestoreCounselor(docSnap.id, docSnap.data()));
      });
      counselorsData = dedupeCounselors(counselorsData).sort((a, b) =>
        a.fullName.localeCompare(b.fullName, 'ro')
      );

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
      setCounselors(counselorsData);
      setSessionReportCounts(reportCounts);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

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
            where('type', 'in', [
              'case_assigned',
              'case_proposed',
              'case_proposal_declined',
            ]),
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
              if (
                data.type === 'case_assigned' ||
                data.type === 'case_proposed' ||
                data.type === 'case_proposal_declined'
              ) {
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

        const caseAssignedActivities = filterPendingAssignments(
          allCaseAssignments,
          currentUser.id,
          counselorRecordId,
          dismissedAssignments
        );

        setRawPendingAssignments(caseAssignedActivities);
        setAssignmentOutcomes(
          filterAssignmentOutcomes(
            allCaseAssignments,
            currentUser.id,
            dismissedAssignments
          )
        );
        // Keep an open force-assign dialog only if still pending; proposals sync separately.
        setNewAssignmentModal((current) => {
          if (!current) return null;
          if (current.type === 'case_proposed') return current;
          const stillPending = caseAssignedActivities.some((a) => a.id === current.id);
          return stillPending ? current : null;
        });
      } catch (err) {
        console.error('Error loading case assignments:', err);
      }
    };

    loadCaseAssignments();
  }, [currentUser, counselorRecordId, dismissedAssignments, dismissedAssignmentsLoaded]);

  const pendingAssignments = useMemo(() => {
    const proposals = filterActiveProposals(
      rawPendingAssignments,
      cases,
      counselorRecordId
    );
    const assigned = rawPendingAssignments.filter((a) => a.type === 'case_assigned');
    return [...proposals, ...assigned];
  }, [rawPendingAssignments, cases, counselorRecordId]);

  const pendingAssignmentCount = pendingAssignments.length;

  // Propunere caz: auto-open and keep until Accept / Refuse (survives reload & login).
  useEffect(() => {
    if (loading || !dismissedAssignmentsLoaded) return;

    const proposals = pendingAssignments.filter((a) => a.type === 'case_proposed');
    const firstProposal = proposals[0] ?? null;

    setNewAssignmentModal((current) => {
      if (firstProposal) {
        if (
          current?.type === 'case_proposed' &&
          proposals.some((p) => p.id === current.id)
        ) {
          return current;
        }
        if (current?.type === 'case_assigned') return current;
        return firstProposal;
      }
      if (current?.type === 'case_proposed') return null;
      return current;
    });
  }, [loading, dismissedAssignmentsLoaded, pendingAssignments]);

  const dismissAssignment = useCallback(
    async (activityId: string) => {
      if (!currentUser?.id) return;
      setDismissedAssignments((prev) => new Set(Array.from(prev).concat(activityId)));
      await saveDismissedAssignment(currentUser.id, activityId);
      setNewAssignmentModal(null);
      setRawPendingAssignments((prev) => prev.filter((a) => a.id !== activityId));
      setAssignmentOutcomes((prev) => prev.filter((a) => a.id !== activityId));
    },
    [currentUser?.id]
  );

  const [assignmentActionLoading, setAssignmentActionLoading] = useState<'accept' | 'refuse' | null>(null);
  const [assignmentActionError, setAssignmentActionError] = useState<string | null>(null);

  const openAssignment = useCallback((activity: ActivityRecord) => {
    setAssignmentActionError(null);
    setNewAssignmentModal(activity);
  }, []);

  const acceptProposal = useCallback(async () => {
    if (!currentUser || !newAssignmentModal?.metadata?.caseId) return;
    const caseId = String(newAssignmentModal.metadata.caseId);
    const activityId = newAssignmentModal.id;

    try {
      setAssignmentActionLoading('accept');
      setAssignmentActionError(null);

      const caseRef = doc(db, 'cases', caseId);
      const caseSnap = await getDoc(caseRef);
      if (!caseSnap.exists()) {
        throw new Error(t.assignments.acceptError);
      }
      const data = caseSnap.data();
      const proposedId = data.proposedCounselorId;
      const proposedName = data.proposedCounselorName || currentUser.fullName;
      const notifyUserId =
        (data.proposedByUserId as string | undefined) ||
        newAssignmentModal.userId ||
        null;

      await updateDoc(caseRef, {
        assignedCounselorId: proposedId,
        assignedCounselorName: proposedName,
        proposedCounselorId: null,
        proposedCounselorName: null,
        proposedByUserId: null,
        proposedByUserName: null,
        assignmentStatus: 'accepted',
        status: 'active',
        updatedAt: new Date(),
      });

      await logCaseAssigned(
        caseId,
        data.title || String(newAssignmentModal.metadata.caseTitle || ''),
        currentUser.id,
        currentUser.fullName || currentUser.email || 'Unknown',
        currentUser.id,
        currentUser.fullName || currentUser.email || 'Unknown',
        'proposal_accept',
        notifyUserId
      );

      await dismissAssignment(activityId);
      await loadData();
    } catch (err) {
      console.error('Accept proposal error:', err);
      setAssignmentActionError(t.assignments.acceptError);
    } finally {
      setAssignmentActionLoading(null);
    }
  }, [currentUser, newAssignmentModal, dismissAssignment, loadData]);

  const refuseProposal = useCallback(async () => {
    if (!currentUser || !newAssignmentModal?.metadata?.caseId) return;
    const caseId = String(newAssignmentModal.metadata.caseId);
    const activityId = newAssignmentModal.id;

    try {
      setAssignmentActionLoading('refuse');
      setAssignmentActionError(null);

      const caseRef = doc(db, 'cases', caseId);
      const caseSnap = await getDoc(caseRef);
      if (!caseSnap.exists()) {
        throw new Error(t.assignments.refuseError);
      }
      const data = caseSnap.data();
      const notifyUserId =
        (data.proposedByUserId as string | undefined) ||
        newAssignmentModal.userId ||
        null;

      await updateDoc(caseRef, {
        proposedCounselorId: null,
        proposedCounselorName: null,
        proposedByUserId: null,
        proposedByUserName: null,
        assignmentStatus: 'none',
        updatedAt: new Date(),
      });

      await logCaseProposalDeclined(
        caseId,
        data.title || String(newAssignmentModal.metadata.caseTitle || ''),
        currentUser.id,
        currentUser.fullName || currentUser.email || 'Unknown',
        notifyUserId
      );

      await dismissAssignment(activityId);
      await loadData();
    } catch (err) {
      console.error('Refuse proposal error:', err);
      setAssignmentActionError(t.assignments.refuseError);
    } finally {
      setAssignmentActionLoading(null);
    }
  }, [currentUser, newAssignmentModal, dismissAssignment, loadData]);

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
        futureAppointmentsCount: countFutureAppointments(appointments),
        casesByStatus,
      };
    }, [cases, appointments]);

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

  const upsertCase = useCallback((caseItem: Case) => {
    setCases((prev) => {
      const index = prev.findIndex((c) => c.id === caseItem.id);
      if (index === -1) {
        return [caseItem, ...prev];
      }
      const next = [...prev];
      next[index] = caseItem;
      return next;
    });
  }, []);

  const removeCase = useCallback((caseId: string) => {
    setCases((prev) => prev.filter((c) => c.id !== caseId));
    setSessionReportCounts((prev) => {
      if (!(caseId in prev)) return prev;
      const next = { ...prev };
      delete next[caseId];
      return next;
    });
  }, []);

  const upsertAppointment = useCallback((appointment: Appointment) => {
    setAppointments((prev) => {
      const index = prev.findIndex((a) => a.id === appointment.id);
      if (index === -1) {
        return [...prev, appointment].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      }
      const next = [...prev];
      next[index] = appointment;
      return next;
    });
  }, []);

  const removeAppointment = useCallback((appointmentId: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
  }, []);

  const replaceAppointments = useCallback((next: Appointment[]) => {
    setAppointments(next);
  }, []);

  const incrementSessionReportCount = useCallback((caseId: string) => {
    setSessionReportCounts((prev) => ({
      ...prev,
      [caseId]: (prev[caseId] ?? 0) + 1,
    }));
  }, []);

  const replaceCounselors = useCallback((next: Counselor[]) => {
    setCounselors(next);
  }, []);

  return {
    cases,
    appointments,
    activities,
    counselors,
    sessionReportCounts,
    metrics,
    upcomingAppointments,
    activeCasesList,
    loading,
    error,
    counselorRecordId,
    newAssignmentModal,
    setNewAssignmentModal,
    openAssignment,
    dismissAssignment,
    acceptProposal,
    refuseProposal,
    assignmentActionLoading,
    assignmentActionError,
    pendingAssignments,
    pendingAssignmentCount,
    assignmentOutcomes,
    refetch: loadData,
    upsertCase,
    removeCase,
    upsertAppointment,
    removeAppointment,
    replaceAppointments,
    incrementSessionReportCount,
    replaceCounselors,
  };
}
