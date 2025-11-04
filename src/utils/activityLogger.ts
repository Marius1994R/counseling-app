import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface ActivityLog {
  id?: string;
  type: 'case_created' | 'case_status_changed' | 'case_assigned' | 'meeting_notes_added' | 'session_report_added' | 'appointment_created' | 'appointment_updated' | 'appointment_deleted';
  title: string;
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
  relatedId: string; // ID of the case, appointment, etc.
  relatedTitle: string; // Title of the case, appointment, etc.
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    counselorId?: string;
    counselorName?: string;
    caseId?: string;
    caseTitle?: string;
    assignedToUserId?: string;
    assignedToUserName?: string;
    sessionNumber?: number;
  };
}

export const logActivity = async (activity: Omit<ActivityLog, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'activities'), {
      ...activity,
      timestamp: activity.timestamp
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error to avoid breaking the main functionality
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
      caseTitle
    }
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
      caseTitle
    }
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
      sessionNumber
    }
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
      caseTitle
    }
  });
};

export const logCaseAssigned = async (
  caseId: string,
  caseTitle: string,
  assignedToUserId: string,
  assignedToUserName: string,
  assignedByUserId: string,
  assignedByUserName: string
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
      assignedToUserName
    }
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
      caseTitle
    }
  });
};
