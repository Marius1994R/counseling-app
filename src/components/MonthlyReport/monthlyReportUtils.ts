import { DocumentData } from 'firebase/firestore';
import { MonthlyReport, MonthlyReportAnswers } from '../../types';
import { MONTH_NAMES_RO } from '../Calendar/calendarUtils';

/** Submission window: days 1–10 of the current month for the previous month's report. */
export const MONTHLY_REPORT_DUE_DAY_END = 10;

export type MonthlyReportReminderPhase = 'due' | 'overdue';

export function toMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Month key for the report that is currently due (previous calendar month). */
export function getDueReportMonthKey(now = new Date()): string {
  return toMonthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

export function parseMonthKey(monthKey: string): { year: number; monthIndex: number } {
  const [yearStr, monthStr] = monthKey.split('-');
  return {
    year: Number(yearStr),
    monthIndex: Number(monthStr) - 1,
  };
}

export function formatMonthKeyLabel(monthKey: string): string {
  const { year, monthIndex } = parseMonthKey(monthKey);
  if (Number.isNaN(year) || monthIndex < 0 || monthIndex > 11) return monthKey;
  return `${MONTH_NAMES_RO[monthIndex]} ${year}`;
}

export function monthlyReportDocId(userId: string, monthKey: string): string {
  return `${userId}_${monthKey}`;
}

export function monthlyReportDueDismissalId(monthKey: string): string {
  return `monthly_report:due:${monthKey}`;
}

export function monthlyReportOverdueDismissalId(monthKey: string): string {
  return `monthly_report:overdue:${monthKey}`;
}

/** Days 1–10 → due reminder; day 11+ → overdue. */
export function getMonthlyReportReminderPhase(now = new Date()): MonthlyReportReminderPhase {
  return now.getDate() <= MONTHLY_REPORT_DUE_DAY_END ? 'due' : 'overdue';
}

export function emptyMonthlyReportAnswers(): MonthlyReportAnswers {
  return {
    relationshipWithGod: '',
    mostAliveDiscipline: '',
    disciplineNeedsStrengthening: '',
    maritalStatus: 'casatorit',
    marriageFamilyNotes: '',
    closeRelationshipsNotes: '',
    needsPersonalRelationshipSupport: '',
    heartState: '',
    feelsTiredOrBurdened: '',
    howLeaderOrTeamCanHelp: '',
    departmentImprovements: '',
  };
}

export function validateMonthlyReportAnswers(
  answers: MonthlyReportAnswers
): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = (key: keyof MonthlyReportAnswers, message: string) => {
    if (!String(answers[key] ?? '').trim()) {
      errors[key] = message;
    }
  };

  required('relationshipWithGod', 'Câmp obligatoriu');
  required('mostAliveDiscipline', 'Câmp obligatoriu');
  required('disciplineNeedsStrengthening', 'Câmp obligatoriu');
  required('maritalStatus', 'Câmp obligatoriu');
  required('needsPersonalRelationshipSupport', 'Câmp obligatoriu');
  required('heartState', 'Câmp obligatoriu');
  required('feelsTiredOrBurdened', 'Câmp obligatoriu');
  required('howLeaderOrTeamCanHelp', 'Câmp obligatoriu');

  if (answers.maritalStatus === 'casatorit') {
    required('marriageFamilyNotes', 'Câmp obligatoriu');
  } else if (answers.maritalStatus === 'necasatorit') {
    required('closeRelationshipsNotes', 'Câmp obligatoriu');
  }

  return errors;
}

function coerceDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function mapFirestoreMonthlyReport(id: string, data: DocumentData): MonthlyReport {
  const answers = (data.answers || {}) as Partial<MonthlyReportAnswers>;
  return {
    id,
    userId: String(data.userId || ''),
    userName: String(data.userName || ''),
    userEmail: String(data.userEmail || ''),
    monthKey: String(data.monthKey || ''),
    answers: {
      ...emptyMonthlyReportAnswers(),
      ...answers,
    },
    submittedAt: coerceDate(data.submittedAt),
    createdAt: coerceDate(data.createdAt),
    updatedAt: coerceDate(data.updatedAt),
  };
}

/** Month keys for a leader picker (current due month + several previous). */
export function listRecentMonthKeys(count = 12, now = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= count; i++) {
    keys.push(toMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return keys;
}
