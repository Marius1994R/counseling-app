import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface ActivityLog {
  id?: string;
  type:
    | 'case_created'
    | 'case_status_changed'
    | 'case_assigned'
    | 'case_proposed'
    | 'case_proposal_declined'
    | 'meeting_notes_added'
    | 'session_report_added'
    | 'monthly_report_submitted'
    | 'appointment_created'
    | 'appointment_updated'
    | 'appointment_deleted';
  title: string;
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
  relatedId: string;
  relatedTitle: string;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    counselorId?: string;
    counselorName?: string;
    caseId?: string;
    caseTitle?: string;
    monthKey?: string;
    assignedToUserId?: string;
    assignedToUserName?: string;
    assignmentSource?: 'direct' | 'proposal_accept';
    sessionNumber?: number;
    /** Leader/admin who should see accept/refuse in the bell */
    notifyUserId?: string;
  };
}

export const logActivity = async (activity: Omit<ActivityLog, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'activities'), {
      ...activity,
      timestamp: activity.timestamp,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

export const logCaseStatusChange = async (
  caseId: string,
  caseTitle: string,
  oldStatus: string,
  newStatus: string,
  userId: string,
  userName: string
): Promise<void> => {
  await logActivity({
    type: 'case_status_changed',
    title: 'Status Caz Schimbat',
    description: `Statusul cazului "${caseTitle}" a fost schimbat de la ${oldStatus} la ${newStatus}`,
    timestamp: new Date(),
    userId,
    userName,
    relatedId: caseId,
    relatedTitle: caseTitle,
    metadata: {
      oldStatus,
      newStatus,
      caseId,
      caseTitle,
    },
  });
};

export const logMeetingNotesAdded = async (
  caseId: string,
  caseTitle: string,
  userId: string,
  userName: string
): Promise<void> => {
  await logActivity({
    type: 'meeting_notes_added',
    title: 'Note de Ședință Adăugate',
    description: `Note adăugate pentru cazul "${caseTitle}"`,
    timestamp: new Date(),
    userId,
    userName,
    relatedId: caseId,
    relatedTitle: caseTitle,
    metadata: {
      caseId,
      caseTitle,
    },
  });
};

export const logSessionReportAdded = async (
  caseId: string,
  caseTitle: string,
  sessionNumber: number,
  userId: string,
  userName: string
): Promise<void> => {
  await logActivity({
    type: 'session_report_added',
    title: 'Raport Post-Sesiune Adăugat',
    description: `Raport post-sesiune nr. ${sessionNumber} adăugat pentru cazul "${caseTitle}"`,
    timestamp: new Date(),
    userId,
    userName,
    relatedId: caseId,
    relatedTitle: caseTitle,
    metadata: {
      caseId,
      caseTitle,
      sessionNumber,
    },
  });
};

export const logMonthlyReportSubmitted = async (
  monthKey: string,
  monthLabel: string,
  userId: string,
  userName: string
): Promise<void> => {
  await logActivity({
    type: 'monthly_report_submitted',
    title: 'Raport Lunar Trimis',
    description: `${userName} a trimis raportul lunar pentru ${monthLabel}`,
    timestamp: new Date(),
    userId,
    userName,
    relatedId: monthKey,
    relatedTitle: monthLabel,
    metadata: {
      monthKey,
    },
  });
};

export const logCaseCreated = async (
  caseId: string,
  caseTitle: string,
  userId: string,
  userName: string
): Promise<void> => {
  await logActivity({
    type: 'case_created',
    title: 'Caz Nou Creat',
    description: `Caz "${caseTitle}" creat`,
    timestamp: new Date(),
    userId,
    userName,
    relatedId: caseId,
    relatedTitle: caseTitle,
    metadata: {
      caseId,
      caseTitle,
    },
  });
};

export const logCaseAssigned = async (
  caseId: string,
  caseTitle: string,
  assignedToUserId: string,
  assignedToUserName: string,
  assignedByUserId: string,
  assignedByUserName: string,
  assignmentSource: 'direct' | 'proposal_accept' = 'direct',
  notifyUserId?: string | null
): Promise<void> => {
  await logActivity({
    type: 'case_assigned',
    title: 'Caz Alocat',
    description: `Cazul "${caseTitle}" a fost alocat către ${assignedToUserName}`,
    timestamp: new Date(),
    userId: assignedByUserId,
    userName: assignedByUserName,
    relatedId: caseId,
    relatedTitle: caseTitle,
    metadata: {
      caseId,
      caseTitle,
      assignedToUserId,
      assignedToUserName,
      assignmentSource,
      ...(notifyUserId ? { notifyUserId } : {}),
    },
  });
};

export const logCaseProposed = async (
  caseId: string,
  caseTitle: string,
  assignedToUserId: string,
  assignedToUserName: string,
  assignedByUserId: string,
  assignedByUserName: string
): Promise<void> => {
  await logActivity({
    type: 'case_proposed',
    title: 'Caz Propus',
    description: `Cazul "${caseTitle}" a fost propus către ${assignedToUserName}`,
    timestamp: new Date(),
    userId: assignedByUserId,
    userName: assignedByUserName,
    relatedId: caseId,
    relatedTitle: caseTitle,
    metadata: {
      caseId,
      caseTitle,
      assignedToUserId,
      assignedToUserName,
    },
  });
};

export const logCaseProposalDeclined = async (
  caseId: string,
  caseTitle: string,
  counselorUserId: string,
  counselorUserName: string,
  notifyUserId?: string | null
): Promise<void> => {
  await logActivity({
    type: 'case_proposal_declined',
    title: 'Propunere Refuzată',
    description: `${counselorUserName} a refuzat propunerea pentru cazul "${caseTitle}"`,
    timestamp: new Date(),
    userId: counselorUserId,
    userName: counselorUserName,
    relatedId: caseId,
    relatedTitle: caseTitle,
    metadata: {
      caseId,
      caseTitle,
      assignedToUserId: counselorUserId,
      assignedToUserName: counselorUserName,
      ...(notifyUserId ? { notifyUserId } : {}),
    },
  });
};

export const logAppointmentCreated = async (
  appointmentId: string,
  appointmentTitle: string,
  caseId: string,
  caseTitle: string,
  userId: string,
  userName: string
): Promise<void> => {
  await logActivity({
    type: 'appointment_created',
    title: 'Programare Creată',
    description: `Programarea "${appointmentTitle}" a fost creată pentru cazul "${caseTitle}"`,
    timestamp: new Date(),
    userId,
    userName,
    relatedId: appointmentId,
    relatedTitle: appointmentTitle,
    metadata: {
      caseId,
      caseTitle,
    },
  });
};
