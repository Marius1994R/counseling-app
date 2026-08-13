import { ActivityRecord } from '../components/Dashboard/dashboardUtils';
import { Case } from '../types';

/** Pending case_assigned / case_proposed activities for the current counselor. */
export function filterPendingAssignments(
  activities: ActivityRecord[],
  userId: string,
  counselorRecordId: string | null,
  dismissedIds: Set<string>
): ActivityRecord[] {
  return activities.filter((activity) => {
    if (activity.type !== 'case_assigned' && activity.type !== 'case_proposed') {
      return false;
    }
    const matchesUser = activity.metadata?.assignedToUserId === userId;
    const matchesCounselor =
      Boolean(counselorRecordId) &&
      activity.metadata?.assignedToUserId === counselorRecordId;
    if (!(matchesUser || matchesCounselor)) return false;

    const isProposalAcceptance =
      activity.type === 'case_assigned' &&
      activity.metadata?.assignmentSource === 'proposal_accept';
    if (isProposalAcceptance) return false;

    // Dismissed (including auto-cleared deleted cases) stay hidden.
    if (dismissedIds.has(activity.id)) return false;

    return true;
  });
}

/**
 * Keep only proposals that are still pending on the live case for this counselor.
 * Newest activity per case wins.
 * Missing case in cache: keep briefly so live notify works while warmCases runs;
 * older orphans are dropped (deleted cases are also auto-dismissed).
 */
export function filterActiveProposals(
  activities: ActivityRecord[],
  cases: Case[],
  counselorRecordId: string | null,
  options?: { missingCaseGraceMs?: number; now?: number }
): ActivityRecord[] {
  const graceMs = options?.missingCaseGraceMs ?? 90_000;
  const now = options?.now ?? Date.now();

  const active = activities.filter((activity) => {
    if (activity.type !== 'case_proposed') return false;
    const caseId = String(activity.metadata?.caseId || '');
    if (!caseId) return false;
    const caseItem = cases.find((c) => c.id === caseId);
    if (!caseItem) {
      return now - activity.timestamp.getTime() < graceMs;
    }
    if (caseItem.assignmentStatus !== 'pending') return false;
    if (counselorRecordId && caseItem.proposedCounselorId !== counselorRecordId) {
      return false;
    }
    return true;
  });

  const seenCaseIds = new Set<string>();
  return active.filter((activity) => {
    const caseId = String(activity.metadata?.caseId || '');
    if (seenCaseIds.has(caseId)) return false;
    seenCaseIds.add(caseId);
    return true;
  });
}

/** Outcomes of proposals for the leader/admin who proposed (bell notifications). */
export function filterAssignmentOutcomes(
  activities: ActivityRecord[],
  userId: string,
  dismissedIds: Set<string>
): ActivityRecord[] {
  return activities.filter((activity) => {
    if (dismissedIds.has(activity.id)) return false;
    if (activity.metadata?.notifyUserId !== userId) return false;

    if (activity.type === 'case_proposal_declined') return true;
    if (
      activity.type === 'case_assigned' &&
      activity.metadata?.assignmentSource === 'proposal_accept'
    ) {
      return true;
    }
    return false;
  });
}
