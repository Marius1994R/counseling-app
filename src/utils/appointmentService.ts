import {
  addDoc,
  collection,
  DocumentData,
  getDocs,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Appointment } from '../types';
import { hasRoomConflict } from '../components/Calendar/calendarUtils';
import { logAppointmentCreated } from './activityLogger';
import { t } from './translations';

export type AppointmentInput = Omit<Appointment, 'id' | 'createdAt' | 'createdBy'>;

interface AppointmentAuthor {
  id: string;
  fullName?: string;
  email?: string;
}

export function mapFirestoreAppointment(id: string, data: DocumentData): Appointment {
  return {
    id,
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
  };
}

/**
 * Throws `t.appointments.roomConflict` when the slot is taken. Checks the caller's
 * in-memory appointments first, then a day-scoped query to catch concurrent bookings
 * (and rooms booked by counselors whose appointments the caller cannot see).
 */
export async function assertNoRoomConflict(
  appointmentData: AppointmentInput,
  options: { knownAppointments?: Appointment[]; excludeId?: string } = {}
): Promise<void> {
  const { knownAppointments = [], excludeId } = options;

  const dayStart = new Date(appointmentData.date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(appointmentData.date);
  dayEnd.setHours(23, 59, 59, 999);

  const conflictArgs = {
    room: appointmentData.room || '',
    date: appointmentData.date,
    startTime: appointmentData.startTime,
    endTime: appointmentData.endTime,
    excludeId,
  };

  const dayAppointments = knownAppointments.filter((apt) => {
    const d = new Date(apt.date);
    return d >= dayStart && d <= dayEnd;
  });

  if (hasRoomConflict({ appointments: dayAppointments, ...conflictArgs })) {
    throw new Error(t.appointments.roomConflict);
  }

  const appointmentsSnapshot = await getDocs(
    query(
      collection(db, 'appointments'),
      where('date', '>=', Timestamp.fromDate(dayStart)),
      where('date', '<=', Timestamp.fromDate(dayEnd))
    )
  );
  const latest: Appointment[] = [];
  appointmentsSnapshot.forEach((aptDoc) => {
    latest.push(mapFirestoreAppointment(aptDoc.id, aptDoc.data()));
  });

  if (hasRoomConflict({ appointments: latest, ...conflictArgs })) {
    throw new Error(t.appointments.roomConflict);
  }
}

export async function createAppointment(
  appointmentData: AppointmentInput,
  author: AppointmentAuthor | null
): Promise<Appointment> {
  const createdAt = new Date();
  const createdBy = author?.id || 'unknown';

  const docRef = await addDoc(collection(db, 'appointments'), {
    ...appointmentData,
    createdAt,
    createdBy,
  });

  if (author && appointmentData.caseId && appointmentData.caseTitle) {
    await logAppointmentCreated(
      docRef.id,
      appointmentData.title,
      appointmentData.caseId,
      appointmentData.caseTitle,
      author.id,
      author.fullName || author.email || 'Unknown User'
    );
  }

  return {
    ...appointmentData,
    id: docRef.id,
    createdAt,
    createdBy,
  };
}
