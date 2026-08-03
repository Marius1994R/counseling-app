export type CaseTimelineKind =
  | 'opened'
  | 'status'
  | 'assignment'
  | 'note'
  | 'report'
  | 'appointment';

export interface CaseTimelineItem {
  id: string;
  kind: CaseTimelineKind;
  at: Date;
  title: string;
  summary?: string;
  sourceId?: string;
  authorName?: string;
}

const STATUS_ASSIGNMENT_TYPES = new Set([
  'case_status_changed',
  'case_assigned',
  'case_proposed',
  'case_proposal_declined',
]);

export function isCaseLifecycleActivityType(type: string): boolean {
  return STATUS_ASSIGNMENT_TYPES.has(type);
}

export function getTimelineDotClass(kind: CaseTimelineKind): string {
  switch (kind) {
    case 'opened':
      return 'bg-blue-500';
    case 'status':
      return 'bg-amber-500';
    case 'assignment':
      return 'bg-brand-500';
    case 'note':
      return 'bg-sky-500';
    case 'report':
      return 'bg-purple-500';
    case 'appointment':
      return 'bg-green-500';
    default:
      return 'bg-slate-400';
  }
}

export function formatTimelineDate(date: Date): string {
  return date.toLocaleString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function combineAppointmentAt(date: Date, startTime?: string): Date {
  if (!startTime || !/^\d{1,2}:\d{2}$/.test(startTime)) return date;
  const [hours, minutes] = startTime.split(':').map(Number);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export function sortTimelineNewestFirst(items: CaseTimelineItem[]): CaseTimelineItem[] {
  return [...items].sort((a, b) => b.at.getTime() - a.at.getTime());
}
