import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  arrayUnion,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventsContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { ActivityRecord } from '../components/Dashboard/dashboardUtils';
import { Appointment, Case, ChurchEvent } from '../types';
import { t } from '../utils/translations';

export type AttentionNotificationType =
  | 'event'
  | 'assignment'
  | 'assignment_outcome'
  | 'appointment'
  | 'stale_report';

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

    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [
    unreadEvents,
    pendingAssignments,
    assignmentOutcomes,
    upcomingAppointments,
    cases,
    sessionReportCounts,
    dismissedIds,
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
