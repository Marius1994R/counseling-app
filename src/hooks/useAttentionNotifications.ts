import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  arrayUnion,
  collection,
  doc,
  DocumentData,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { ActivityRecord } from '../components/Dashboard/dashboardUtils';
import { Appointment, Case, ChurchEvent } from '../types';
import { t } from '../utils/translations';
import {
  formatMonthKeyLabel,
  getDueReportMonthKey,
  getMonthlyReportReminderPhase,
  monthlyReportDocId,
  monthlyReportDueDismissalId,
  monthlyReportOverdueDismissalId,
} from '../components/MonthlyReport/monthlyReportUtils';
import {
  isMeetingFrequencyOverdue,
  meetingFrequencyLabel,
  toMeetingDateKey,
} from '../utils/meetingFrequency';

const REPORT_ACTIVITY_TYPES = [
  'session_report_added',
  'monthly_report_submitted',
  'consent_uploaded',
] as const;

const MAX_LIVE_REPORT_ACTIVITIES = 40;

function mapReportActivityDoc(id: string, data: DocumentData): ActivityRecord | null {
  try {
    const rawTs = data.timestamp;
    const timestamp =
      typeof rawTs?.toDate === 'function'
        ? rawTs.toDate()
        : rawTs instanceof Date
          ? rawTs
          : new Date(rawTs || Date.now());
    if (Number.isNaN(timestamp.getTime())) return null;

    return {
      id,
      type: data.type,
      title: data.title,
      description: data.description,
      timestamp,
      userId: data.userId,
      userName: data.userName,
      metadata: data.metadata,
    };
  } catch (err) {
    console.error('Skipping malformed report activity:', id, err);
    return null;
  }
}

export type AttentionNotificationType =
  | 'event'
  | 'assignment'
  | 'assignment_outcome'
  | 'appointment'
  | 'stale_report'
  | 'frequency_overdue'
  | 'monthly_report'
  | 'session_report_submitted'
  | 'monthly_report_submitted'
  | 'consent_uploaded';

export interface AttentionNotification {
  id: string;
  type: AttentionNotificationType;
  title: string;
  detail: string;
  /** For navigation / action */
  payload: {
    event?: ChurchEvent;
    activity?: ActivityRecord;
    appointment?: Appointment;
    caseItem?: Case;
    monthKey?: string;
    caseId?: string;
  };
  createdAt: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_REPORT_DAYS = 30;

function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

function appointmentDateTime(apt: Appointment): Date {
  const dt = new Date(apt.date);
  if (apt.startTime) {
    const [hours, minutes] = apt.startTime.split(':').map(Number);
    dt.setHours(hours, minutes, 0, 0);
  }
  return dt;
}

async function loadDismissedIds(userId: string): Promise<Set<string>> {
  try {
    const ref = doc(db, 'notificationDismissals', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return new Set();
    return new Set((snap.data().ids as string[]) || []);
  } catch (err) {
    console.error('Error loading notification dismissals:', err);
    return new Set();
  }
}

async function saveDismissedId(userId: string, id: string): Promise<void> {
  const ref = doc(db, 'notificationDismissals', userId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, {
      ids: arrayUnion(id),
      updatedAt: new Date(),
    });
  } else {
    await setDoc(ref, {
      userId,
      ids: [id],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

export function useAttentionNotifications() {
  const { currentUser } = useAuth();
  const { unreadEvents } = useEvents();
  const {
    upcomingAppointments,
    cases,
    sessionReportCounts,
    pendingAssignments,
    assignmentOutcomes,
  } = useDashboardDataContext();

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [dismissalsLoaded, setDismissalsLoaded] = useState(false);
  const [monthlyReportMissing, setMonthlyReportMissing] = useState(false);
  /** Live feed for leader report-submit notifications (not the one-shot dashboard activities). */
  const [liveReportActivities, setLiveReportActivities] = useState<ActivityRecord[]>([]);
  const dueMonthKey = getDueReportMonthKey();

  useEffect(() => {
    if (!currentUser?.id || currentUser.id.startsWith('demo-')) {
      setDismissedIds(new Set());
      setDismissalsLoaded(true);
      return;
    }

    let cancelled = false;
    setDismissalsLoaded(false);
    loadDismissedIds(currentUser.id).then((ids) => {
      if (!cancelled) {
        setDismissedIds(ids);
        setDismissalsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  // Leaders: live listener so session/monthly submit alerts appear without reload
  useEffect(() => {
    if (
      !currentUser?.id ||
      currentUser.id.startsWith('demo-') ||
      currentUser.role !== 'leader'
    ) {
      setLiveReportActivities([]);
      return;
    }

    const reportQuery = query(
      collection(db, 'activities'),
      where('type', 'in', [...REPORT_ACTIVITY_TYPES])
    );

    const unsubscribe = onSnapshot(
      reportQuery,
      (snapshot) => {
        const items: ActivityRecord[] = [];
        snapshot.forEach((docSnap) => {
          const mapped = mapReportActivityDoc(docSnap.id, docSnap.data());
          if (mapped) items.push(mapped);
        });
        items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setLiveReportActivities(items.slice(0, MAX_LIVE_REPORT_ACTIVITIES));
      },
      (err) => {
        console.error('Error listening to report activities:', err);
      }
    );

    return unsubscribe;
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!currentUser?.id || currentUser.id.startsWith('demo-')) {
      setMonthlyReportMissing(false);
      return;
    }

    let cancelled = false;
    const check = async () => {
      try {
        const id = monthlyReportDocId(currentUser.id, dueMonthKey);
        const snap = await getDoc(doc(db, 'monthlyReports', id));
        if (!cancelled) {
          setMonthlyReportMissing(!snap.exists());
        }
      } catch (err) {
        console.error('Error checking monthly report:', err);
        if (!cancelled) setMonthlyReportMissing(false);
      }
    };
    void check();

    const onSubmitted = () => {
      void check();
    };
    window.addEventListener('monthly-report-submitted', onSubmitted);

    return () => {
      cancelled = true;
      window.removeEventListener('monthly-report-submitted', onSubmitted);
    };
  }, [currentUser?.id, dueMonthKey]);

  const items = useMemo(() => {
    const list: AttentionNotification[] = [];
    const now = Date.now();

    for (const event of unreadEvents) {
      list.push({
        id: `event:${event.id}`,
        type: 'event',
        title: event.name,
        detail: t.notifications.eventDetail,
        payload: { event },
        createdAt: event.createdAt,
      });
    }

    for (const activity of pendingAssignments) {
      const caseTitle = String(activity.metadata?.caseTitle || activity.title || '');
      const isProposal = activity.type === 'case_proposed';
      list.push({
        id: `assignment:${activity.id}`,
        type: 'assignment',
        title: isProposal
          ? t.notifications.assignmentProposedTitle
          : t.notifications.assignmentAssignedTitle,
        detail: caseTitle
          ? t.notifications.assignmentDetail.replace('{title}', caseTitle)
          : t.notifications.assignmentDetailFallback,
        payload: { activity },
        createdAt: activity.timestamp,
      });
    }

    for (const activity of assignmentOutcomes) {
      const caseTitle = String(activity.metadata?.caseTitle || activity.title || '');
      const counselorName = String(
        activity.metadata?.assignedToUserName || activity.userName || ''
      );
      const accepted =
        activity.type === 'case_assigned' &&
        activity.metadata?.assignmentSource === 'proposal_accept';
      list.push({
        id: `assignment_outcome:${activity.id}`,
        type: 'assignment_outcome',
        title: accepted
          ? t.notifications.proposalAcceptedTitle
          : t.notifications.proposalRejectedTitle,
        detail: (accepted
          ? t.notifications.proposalAcceptedDetail
          : t.notifications.proposalRejectedDetail
        )
          .replace('{name}', counselorName || 'Consilierul')
          .replace('{title}', caseTitle || 'caz'),
        payload: { activity },
        createdAt: activity.timestamp,
      });
    }

    const in24h = now + DAY_MS;
    for (const apt of upcomingAppointments) {
      const when = appointmentDateTime(apt);
      const ts = when.getTime();
      if (ts <= now || ts > in24h) continue;
      const id = `appointment:${apt.id}:${toDateKey(when)}`;
      if (dismissedIds.has(id)) continue;
      list.push({
        id,
        type: 'appointment',
        title: t.notifications.appointmentTitle,
        detail: t.notifications.appointmentDetail
          .replace('{case}', apt.caseTitle || apt.title)
          .replace('{time}', apt.startTime || ''),
        payload: { appointment: apt },
        createdAt: apt.createdAt,
      });
    }

    const staleCutoff = now - STALE_REPORT_DAYS * DAY_MS;
    for (const caseItem of cases) {
      if (caseItem.status !== 'active') continue;
      const reportCount = sessionReportCounts[caseItem.id] ?? 0;
      if (reportCount > 0) continue;
      if (caseItem.updatedAt.getTime() > staleCutoff) continue;
      const id = `stale_report:${caseItem.id}`;
      if (dismissedIds.has(id)) continue;
      list.push({
        id,
        type: 'stale_report',
        title: t.notifications.staleReportTitle,
        detail: t.notifications.staleReportDetail.replace(
          '{name}',
          caseItem.counseledName
        ),
        payload: { caseItem },
        createdAt: caseItem.updatedAt,
      });
    }

    for (const caseItem of cases) {
      if (caseItem.status !== 'active') continue;
      const frequency = caseItem.meetingFrequencyWeeks;
      const lastMeeting = caseItem.lastMeetingDate;
      if (!frequency || !lastMeeting) continue;
      if (!isMeetingFrequencyOverdue(lastMeeting, frequency)) continue;
      const id = `frequency_overdue:${caseItem.id}:${toMeetingDateKey(lastMeeting)}`;
      if (dismissedIds.has(id)) continue;
      list.push({
        id,
        type: 'frequency_overdue',
        title: t.notifications.frequencyOverdueTitle,
        detail: t.notifications.frequencyOverdueDetail
          .replace('{name}', caseItem.counseledName)
          .replace('{frequency}', meetingFrequencyLabel(frequency)),
        payload: { caseItem },
        createdAt: lastMeeting,
      });
    }

    if (monthlyReportMissing) {
      const phase = getMonthlyReportReminderPhase();
      const id =
        phase === 'due'
          ? monthlyReportDueDismissalId(dueMonthKey)
          : monthlyReportOverdueDismissalId(dueMonthKey);
      if (!dismissedIds.has(id)) {
        const monthLabel = formatMonthKeyLabel(dueMonthKey);
        list.push({
          id,
          type: 'monthly_report',
          title:
            phase === 'due'
              ? t.notifications.monthlyReportDueTitle
              : t.notifications.monthlyReportOverdueTitle,
          detail: (phase === 'due'
            ? t.notifications.monthlyReportDueDetail
            : t.notifications.monthlyReportOverdueDetail
          ).replace('{month}', monthLabel),
          payload: { monthKey: dueMonthKey },
          createdAt: new Date(),
        });
      }
    }

    // Leaders only: live session / monthly reports submitted by others
    if (currentUser?.role === 'leader') {
      for (const activity of liveReportActivities) {
        if (activity.userId && activity.userId === currentUser.id) continue;

        if (activity.type === 'session_report_added') {
          const id = `session_report_submitted:${activity.id}`;
          if (dismissedIds.has(id)) continue;
          const caseTitle = String(
            activity.metadata?.caseTitle || activity.title || 'caz'
          );
          const counselorName = String(activity.userName || 'Un consilier');
          const caseId = String(activity.metadata?.caseId || '');
          list.push({
            id,
            type: 'session_report_submitted',
            title: t.notifications.sessionReportSubmittedTitle,
            detail: t.notifications.sessionReportSubmittedDetail
              .replace('{name}', counselorName)
              .replace('{case}', caseTitle),
            payload: { activity, caseId: caseId || undefined },
            createdAt: activity.timestamp,
          });
        }

        if (activity.type === 'monthly_report_submitted') {
          const id = `monthly_report_submitted:${activity.id}`;
          if (dismissedIds.has(id)) continue;
          const monthKey = String(activity.metadata?.monthKey || '');
          const monthLabel = monthKey ? formatMonthKeyLabel(monthKey) : '';
          const counselorName = String(activity.userName || 'Un consilier');
          list.push({
            id,
            type: 'monthly_report_submitted',
            title: t.notifications.monthlyReportSubmittedTitle,
            detail: t.notifications.monthlyReportSubmittedDetail
              .replace('{name}', counselorName)
              .replace('{month}', monthLabel || monthKey || 'luna curentă'),
            payload: { activity, monthKey: monthKey || undefined },
            createdAt: activity.timestamp,
          });
        }

        if (activity.type === 'consent_uploaded') {
          const id = `consent_uploaded:${activity.id}`;
          if (dismissedIds.has(id)) continue;
          const caseTitle = String(
            activity.metadata?.caseTitle || activity.title || 'caz'
          );
          const counselorName = String(activity.userName || 'Un consilier');
          const caseId = String(activity.metadata?.caseId || '');
          list.push({
            id,
            type: 'consent_uploaded',
            title: t.notifications.consentUploadedTitle,
            detail: t.notifications.consentUploadedDetail
              .replace('{name}', counselorName)
              .replace('{case}', caseTitle),
            payload: { activity, caseId: caseId || undefined },
            createdAt: activity.timestamp,
          });
        }
      }
    }

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [
    unreadEvents,
    pendingAssignments,
    assignmentOutcomes,
    upcomingAppointments,
    cases,
    sessionReportCounts,
    dismissedIds,
    monthlyReportMissing,
    dueMonthKey,
    liveReportActivities,
    currentUser?.role,
    currentUser?.id,
  ]);

  const dismiss = useCallback(
    async (id: string) => {
      if (!currentUser?.id) return;
      setDismissedIds((prev) => new Set(Array.from(prev).concat(id)));
      try {
        await saveDismissedId(currentUser.id, id);
      } catch (err) {
        console.error('Error dismissing notification:', err);
      }
    },
    [currentUser?.id]
  );

  return {
    items,
    count: items.length,
    dismiss,
    dismissalsLoaded,
  };
}
