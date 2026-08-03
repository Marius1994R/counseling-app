import { Counselor } from '../../types';
import {
  getActivityColor,
  translateActivityDescription,
  translateActivityTitle,
} from '../Dashboard/dashboardUtils';

export type ActivityType =
  | 'case_created'
  | 'case_status_changed'
  | 'case_assigned'
  | 'case_proposed'
  | 'case_proposal_declined'
  | 'case_updated'
  | 'case_deleted'
  | 'counselor_created'
  | 'counselor_updated'
  | 'counselor_deleted'
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_deleted'
  | 'meeting_notes_added'
  | 'session_report_added';

export type TimeRangeFilter = '3months' | '6months' | '9months' | 'alltime';

export interface ActivityTimelineItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
  relatedId: string;
  relatedTitle: string;
  status?: string;
  counselorId?: string;
  counselorName?: string;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    caseId?: string;
    caseTitle?: string;
    assignedToUserId?: string;
    assignedToUserName?: string;
  };
}

export interface ActivityFilterState {
  searchTerm: string;
  typeFilter: string;
  counselorFilter: string;
}

export function getCutoffDate(range: TimeRangeFilter): Date {
  const now = new Date();
  switch (range) {
    case '6months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d;
    }
    case '9months': {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 9);
      return d;
    }
    case 'alltime':
      return new Date(0);
    case '3months':
    default: {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
  }
}

export function shouldIncludeActivityForUser(
  activity: ActivityTimelineItem,
  userId: string | undefined,
  role: string | undefined
): boolean {
  if (role === 'leader') return true;
  if (role === 'counselor' || role === 'admin') {
    return (
      activity.userId === userId ||
      (activity.type === 'case_assigned' && activity.metadata?.assignedToUserId === userId)
    );
  }
  return true;
}

export function filterActivities(
  activities: ActivityTimelineItem[],
  { searchTerm, typeFilter, counselorFilter }: ActivityFilterState,
  counselors: Counselor[]
): ActivityTimelineItem[] {
  let filtered = activities;

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (activity) =>
        activity.title.toLowerCase().includes(term) ||
        activity.description.toLowerCase().includes(term) ||
        activity.relatedTitle.toLowerCase().includes(term) ||
        activity.userName.toLowerCase().includes(term) ||
        (activity.counselorName?.toLowerCase().includes(term) ?? false)
    );
  }

  if (typeFilter !== 'all') {
    filtered = filtered.filter((activity) => activity.type === typeFilter);
  }

  if (counselorFilter !== 'all') {
    const selectedCounselor = counselors.find((c) => c.id === counselorFilter);
    const counselorUserId = selectedCounselor?.linkedUserId ?? counselorFilter;
    filtered = filtered.filter((activity) => activity.userId === counselorUserId);
  }

  return filtered;
}

export function formatActivityDate(timestamp: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const activityDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());

  if (activityDate.getTime() === today.getTime()) return 'Astăzi';
  if (activityDate.getTime() === yesterday.getTime()) return 'Ieri';

  return timestamp.toLocaleDateString('ro-RO', {
    month: 'short',
    day: 'numeric',
    year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function translateStatus(status: string): string {
  const statusMap: Record<string, string> = {
    waiting: 'așteptare',
    active: 'activ',
    finished: 'terminat',
    unfinished: 'neterminat',
  };
  return statusMap[status.toLowerCase()] ?? status;
}

export { getActivityColor, translateActivityDescription, translateActivityTitle };
