import { Appointment, Case, CaseStatus, Counselor } from '../../types';

export const SCHEDULABLE_CASE_STATUSES: CaseStatus[] = ['waiting', 'active'];

export function isSchedulableCase(caseItem: Case): boolean {
  return SCHEDULABLE_CASE_STATUSES.includes(caseItem.status);
}

export function filterSchedulableCases(cases: Case[]): Case[] {
  return cases.filter(isSchedulableCase);
}

export function findCounselorForUser(
  counselors: Counselor[],
  user: { id: string; email: string }
): Counselor | undefined {
  return (
    counselors.find((c) => c.linkedUserId === user.id) ||
    counselors.find((c) => c.email === user.email)
  );
}

export const APPOINTMENT_ROOM_OUTSIDE = 'În afara Bisericii';

export const APPOINTMENT_ROOMS = [
  'Grupa Școlarii Mari',
  'Grupa Școlarii Mici',
  'Consiliu',
  'Multifuncțională',
  APPOINTMENT_ROOM_OUTSIDE,
] as const;

export function isBookableRoom(room: string): boolean {
  return room !== APPOINTMENT_ROOM_OUTSIDE;
}

/** Same calendar day in local time (YYYY-MM-DD). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** True when [startA, endA) overlaps [startB, endB) for HH:mm strings. */
export function timesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export function hasRoomConflict(options: {
  appointments: Appointment[];
  room: string;
  date: Date;
  startTime: string;
  endTime: string;
  excludeId?: string;
}): boolean {
  const { appointments, room, date, startTime, endTime, excludeId } = options;
  if (!room || !isBookableRoom(room)) return false;

  const dateKey = toDateKey(date);

  return appointments.some((appointment) => {
    if (excludeId && appointment.id === excludeId) return false;
    if (appointment.room !== room) return false;
    if (toDateKey(new Date(appointment.date)) !== dateKey) return false;
    return timesOverlap(startTime, endTime, appointment.startTime, appointment.endTime);
  });
}

export interface RoomColorStyles {
  bg: string;
  text: string;
  border: string;
  dot: string;
  accent: string;
}

const ROOM_COLOR_MAP: Record<string, RoomColorStyles> = {
  'Grupa Școlarii Mari': {
    bg: 'bg-sky-100',
    text: 'text-sky-900',
    border: 'border-sky-300',
    dot: 'bg-sky-500',
    accent: '#0ea5e9',
  },
  'Grupa Școlarii Mici': {
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
    accent: '#10b981',
  },
  Consiliu: {
    bg: 'bg-violet-100',
    text: 'text-violet-900',
    border: 'border-violet-300',
    dot: 'bg-violet-500',
    accent: '#8b5cf6',
  },
  Multifuncțională: {
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    accent: '#f59e0b',
  },
  [APPOINTMENT_ROOM_OUTSIDE]: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300 border-dashed',
    dot: 'bg-slate-400',
    accent: '#94a3b8',
  },
};

const DEFAULT_ROOM_COLORS: RoomColorStyles = {
  bg: 'bg-brand-100',
  text: 'text-brand-800',
  border: 'border-brand-200',
  dot: 'bg-brand-500',
  accent: '#C99700',
};

export function getRoomColorStyles(room?: string): RoomColorStyles {
  if (!room) return DEFAULT_ROOM_COLORS;
  return ROOM_COLOR_MAP[room] ?? DEFAULT_ROOM_COLORS;
}

export function sortAppointmentsByTime(appointments: Appointment[]): Appointment[] {
  return [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime));
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

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
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
