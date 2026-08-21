import { DocumentData } from 'firebase/firestore';
import { Case, MeetingNote } from '../../types';
import { t } from '../../utils/translations';

export const MEETING_NOTES_DIALOG_LIMIT = 5;

/** Sentinel for session-rail filter: notes without sessionNumber. */
export const SESSION_FILTER_UNASSIGNED = 'unassigned' as const;
export type SessionRailFilter = number | typeof SESSION_FILTER_UNASSIGNED;

export interface CaseNoteSummary {
  case: Case;
  noteCount: number;
  lastNoteDate: Date | null;
  notes: MeetingNote[];
}

export function coerceNoteDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

export function parseMeetingNoteSessionNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.floor(value);
  }
  return null;
}

export function parseMeetingNoteDoc(id: string, data: DocumentData): MeetingNote {
  return {
    id,
    caseId: String(data.caseId || ''),
    content: String(data.content || ''),
    sessionNumber: parseMeetingNoteSessionNumber(data.sessionNumber),
    createdBy: String(data.createdBy || ''),
    createdByName: String(data.createdByName || ''),
    createdAt: coerceNoteDate(data.createdAt),
    updatedAt: coerceNoteDate(data.updatedAt),
  };
}

export function sessionLabel(sessionNumber: number | null): string {
  if (sessionNumber == null) return t.meetingNotes.noSession;
  return t.meetingNotes.sessionLabel.replace('{n}', String(sessionNumber));
}

/**
 * Dropdown label: the session one ahead of saved reports is marked „în curs”.
 * `inProgressSession` is typically `reportCount` (0-based next session index).
 */
export function sessionSelectLabel(
  sessionNumber: number,
  inProgressSession: number
): string {
  if (sessionNumber === inProgressSession) {
    return t.meetingNotes.sessionInProgress.replace('{n}', String(sessionNumber));
  }
  return sessionLabel(sessionNumber);
}

/**
 * Session choices for the add/edit dropdown.
 * Allows one session ahead of saved reports (note during session, report later),
 * plus any sessions already used on notes.
 */
export function buildSessionSelectOptions(
  reportCount: number,
  existingNotes: MeetingNote[]
): number[] {
  const count = Math.max(0, Math.floor(reportCount));
  /** Next unfinished road session index (= one ahead of last completed report). */
  const aheadSession = count;
  let maxFromNotes = -1;
  for (const note of existingNotes) {
    if (note.sessionNumber != null && note.sessionNumber > maxFromNotes) {
      maxFromNotes = note.sessionNumber;
    }
  }
  const max = Math.max(aheadSession, maxFromNotes, 0);
  return Array.from({ length: max + 1 }, (_, i) => i);
}

/** Prefer the in-progress (highest) session when adding a new note. */
export function defaultSessionForNewNote(options: number[]): number {
  if (options.length === 0) return 0;
  return options[options.length - 1];
}

export function takeLatestNotes(notes: MeetingNote[], limit = MEETING_NOTES_DIALOG_LIMIT): MeetingNote[] {
  return [...notes]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export function buildCaseNoteSummaries(
  cases: Case[],
  notesByCaseId: Map<string, MeetingNote[]>
): CaseNoteSummary[] {
  return cases
    .map((caseItem) => {
      const notes = [...(notesByCaseId.get(caseItem.id) ?? [])].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );
      return {
        case: caseItem,
        noteCount: notes.length,
        lastNoteDate: notes[0]?.createdAt ?? null,
        notes,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastNoteDate?.getTime() ?? 0;
      const bTime = b.lastNoteDate?.getTime() ?? 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.case.counseledName.localeCompare(b.case.counseledName, 'ro');
    });
}

export function filterCaseNoteSummaries(
  summaries: CaseNoteSummary[],
  searchTerm: string,
  statusFilter: 'active' | 'others'
): CaseNoteSummary[] {
  const term = searchTerm.trim().toLowerCase();
  return summaries.filter((summary) => {
    if (statusFilter === 'active' && summary.case.status !== 'active') return false;
    if (statusFilter === 'others' && summary.case.status === 'active') return false;
    if (!term) return true;
    return (
      summary.case.counseledName.toLowerCase().includes(term) ||
      summary.case.title.toLowerCase().includes(term) ||
      (summary.case.assignedCounselorName || '').toLowerCase().includes(term)
    );
  });
}

/** Distinct session keys for the rail, newest sessions first; unassigned last if present. */
export function listSessionRailFilters(notes: MeetingNote[]): SessionRailFilter[] {
  const sessions = new Set<number>();
  let hasUnassigned = false;
  for (const note of notes) {
    if (note.sessionNumber == null) hasUnassigned = true;
    else sessions.add(note.sessionNumber);
  }
  const sorted = Array.from(sessions).sort((a, b) => b - a);
  if (hasUnassigned) return [...sorted, SESSION_FILTER_UNASSIGNED];
  return sorted;
}

export function filterNotesBySessionRail(
  notes: MeetingNote[],
  filter: SessionRailFilter | null
): MeetingNote[] {
  if (filter == null) return notes;
  if (filter === SESSION_FILTER_UNASSIGNED) {
    return notes.filter((n) => n.sessionNumber == null);
  }
  return notes.filter((n) => n.sessionNumber === filter);
}

export function formatNoteDate(date: Date): string {
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}

export function formatNoteDateTime(date: Date): string {
  return `${formatNoteDate(date)} · ${date.toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
