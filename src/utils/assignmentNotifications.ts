import { ActivityRecord } from '../components/Dashboard/dashboardUtils';

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
    const notDismissed = !dismissedIds.has(activity.id);
    const isProposalAcceptance =
      activity.type === 'case_assigned' &&
      activity.metadata?.assignmentSource === 'proposal_accept';
    return (matchesUser || matchesCounselor) && notDismissed && !isProposalAcceptance;
  });
}
