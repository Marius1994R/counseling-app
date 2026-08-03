import { Appointment, Case, CaseStatus, ChurchEvent } from '../../types';
import { t } from '../../utils/translations';

export interface ActivityRecord {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  metadata?: Record<string, unknown>;
}

export interface AppointmentGroup {
  label: string;
  items: Appointment[];
}

const STATUS_LABELS: Record<CaseStatus, string> = {
  waiting: 'În așteptare',
  active: 'Activ',
  unfinished: 'Neterminat',
  finished: 'Finalizat',
  cancelled: 'Anulat',
};

export function getStatusLabel(status: CaseStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getCaseDisplayId(caseItem: Case): string {
  return `#C-${caseItem.id.slice(-4).toUpperCase()}`;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function formatTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Chiar acum';
  if (diffMins < 60) return `${diffMins} min în urmă`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'oră' : 'ore'} în urmă`;
  if (diffDays === 1) return t.dashboard.yesterday;
  if (diffDays < 7) return `${diffDays} zile în urmă`;

  return timestamp.toLocaleDateString('ro-RO', {
    month: 'short',
    day: 'numeric',
    year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatDateLabel(timestamp: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());

  if (target.getTime() === today.getTime()) return t.dashboard.today;
  if (target.getTime() === tomorrow.getTime()) return 'Mâine';
  return timestamp.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'short' });
}

export type UpcomingScheduleItem =
  | { kind: 'appointment'; id: string; date: Date; startTime: string; label: string }
  | { kind: 'event'; id: string; date: Date; startTime: string; label: string; isMultiDay: boolean };

export interface UpcomingScheduleGroup {
  label: string;
  items: UpcomingScheduleItem[];
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function buildUpcomingScheduleItems(
  appointments: Appointment[],
  events: { event: ChurchEvent; displayDate: Date }[],
  now = new Date()
): UpcomingScheduleItem[] {
  const appointmentItems: UpcomingScheduleItem[] = appointments
    .filter((apt) => {
      const appointmentDateTime = new Date(apt.date);
      if (apt.startTime) {
        const [hours, minutes] = apt.startTime.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
      }
      return appointmentDateTime > now;
    })
    .map((apt) => ({
      kind: 'appointment' as const,
      id: apt.id,
      date: apt.date,
      startTime: apt.startTime,
      label: getAppointmentDisplayName(apt),
    }));

  const eventItems: UpcomingScheduleItem[] = events.map(({ event, displayDate }) => ({
    kind: 'event' as const,
    id: event.id,
    date: displayDate,
    startTime: event.startTime,
    label: event.name,
    isMultiDay: startOfDay(event.startDate).getTime() !== startOfDay(event.endDate).getTime(),
  }));

  return [...appointmentItems, ...eventItems].sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });
}

export function groupUpcomingScheduleByDay(items: UpcomingScheduleItem[]): UpcomingScheduleGroup[] {
  const groups = new Map<string, UpcomingScheduleItem[]>();

  items.forEach((item) => {
    const label = formatDateLabel(item.date);
    const existing = groups.get(label) ?? [];
    existing.push(item);
    groups.set(label, existing);
  });

  return Array.from(groups.entries()).map(([label, groupItems]) => ({
    label,
    items: groupItems.sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
}

export function groupAppointmentsByDay(appointments: Appointment[]): AppointmentGroup[] {
  const groups = new Map<string, Appointment[]>();

  appointments.forEach((apt) => {
    const label = formatDateLabel(apt.date);
    const existing = groups.get(label) ?? [];
    existing.push(apt);
    groups.set(label, existing);
  });

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    items: items.sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));
}

export function getActivityColor(type: string): string {
  switch (type) {
    case 'case_created':
      return 'bg-blue-500';
    case 'appointment_created':
      return 'bg-green-500';
    case 'session_report_added':
      return 'bg-purple-500';
    case 'case_assigned':
      return 'bg-brand-500';
    case 'case_proposed':
      return 'bg-indigo-500';
    case 'case_proposal_declined':
      return 'bg-rose-500';
    case 'meeting_notes_added':
      return 'bg-sky-500';
    case 'case_status_changed':
      return 'bg-amber-500';
    default:
      return 'bg-slate-400';
  }
}

export function translateActivityTitle(title: string): string {
  const titleMap: Record<string, string> = {
    'Case Assigned': 'Caz Alocat',
    'Meeting Notes Added': 'Note de Ședință Adăugate',
    'Session Report Added': 'Raport Post-Sesiune Adăugat',
    'Case Status Changed': 'Status Caz Schimbat',
    'Appointment Scheduled': 'Programare Creată',
    'New Case Created': 'Caz Nou Creat',
    'Case Created': 'Caz Creat',
    'Case Updated': 'Caz Actualizat',
    'Appointment Updated': 'Programare Actualizată',
    'Appointment Deleted': 'Programare Ștearsă',
    'Counselor Added': 'Consilier Adăugat',
    'Counselor Updated': 'Consilier Actualizat',
    'Raport Post-Sesiune Adăugat': 'Raport Post-Sesiune Adăugat',
  };
  return titleMap[title] ?? title;
}

export function translateActivityDescription(description: string): string {
  const translationMap: Record<string, string> = {
    assigned: 'alocat către',
    'Notes added for case': 'Note adăugate pentru cazul',
    'Raport post-sesiune': 'Raport post-sesiune',
    'adăugat pentru cazul': 'adăugat pentru cazul',
    'status changed from': 'status schimbat de la',
    'scheduled for case': 'creată pentru cazul',
  };

  let translated = description;
  Object.entries(translationMap).forEach(([en, ro]) => {
    translated = translated.replace(new RegExp(en, 'gi'), ro);
  });
  return translated;
}

/** Progress heuristic: ~15% per session report, capped at 100%. */
export function getCaseProgress(status: CaseStatus, sessionCount: number): number {
  if (status === 'finished') return 100;
  if (status === 'cancelled') return 0;
  if (sessionCount > 0) return Math.min(100, sessionCount * 15);
  if (status === 'active') return 10;
  return 0;
}

export function getAppointmentDisplayName(appointment: Appointment): string {
  return appointment.caseTitle ?? appointment.title;
}

export function getActiveCases(cases: Case[], limit?: number): Case[] {
  const active = cases
    .filter((c) => c.status === 'active')
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return limit !== undefined ? active.slice(0, limit) : active;
}

export function getLastActivityForCase(caseId: string, activities: ActivityRecord[]): Date | null {
  const match = activities.find(
    (a) =>
      a.metadata?.caseId === caseId ||
      a.description?.includes(caseId)
  );
  return match?.timestamp ?? null;
}
