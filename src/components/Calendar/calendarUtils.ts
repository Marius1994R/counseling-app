import { Appointment, Case, CaseStatus } from '../../types';

export const SCHEDULABLE_CASE_STATUSES: CaseStatus[] = ['waiting', 'active'];

export function isSchedulableCase(caseItem: Case): boolean {
  return SCHEDULABLE_CASE_STATUSES.includes(caseItem.status);
}

export function filterSchedulableCases(cases: Case[]): Case[] {
  return cases.filter(isSchedulableCase);
}

export const MONTH_NAMES_RO = [
  'Ianuarie',
  'Februarie',
  'Martie',
  'Aprilie',
  'Mai',
  'Iunie',
  'Iulie',
  'August',
  'Septembrie',
  'Octombrie',
  'Noiembrie',
  'Decembrie',
];

export const DAY_NAMES_RO = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];

export function getDaysInMonth(date: Date): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (Date | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day));
  }
  return days;
}

export function getAppointmentsForDate(appointments: Appointment[], date: Date): Appointment[] {
  return appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date);
    return appointmentDate.toDateString() === date.toDateString();
  });
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);
  return compare < today;
}

export function isDateTodayOrFuture(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);
  return compare >= today;
}

export function formatCalendarDate(date: Date): string {
  return date.toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(time: string): string {
  return new Date(`2000-01-01 ${time}`).toLocaleTimeString('ro-RO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
}

/** Combines appointment date with a HH:mm time string. */
export function getAppointmentDateTime(appointment: Appointment, time: string): Date {
  const result = new Date(appointment.date);
  const [hours, minutes] = time.split(':').map(Number);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/** True while the appointment end time is still in the future. */
export function isFutureAppointment(appointment: Appointment, now = new Date()): boolean {
  return getAppointmentDateTime(appointment, appointment.endTime) > now;
}

export function countFutureAppointments(appointments: Appointment[]): number {
  return appointments.filter((appointment) => isFutureAppointment(appointment)).length;
}
