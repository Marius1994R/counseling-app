import { Case, UserRole } from '../../types';
import { getInitials } from '../Dashboard/dashboardUtils';
import { t } from '../../utils/translations';

export { getInitials };

const LEGACY_AUTO_SPECIALTIES = new Set(['Leadership', 'Administration']);

/** Placeholder specialties from an old auto-create bug — treat as unset. */
export function isLegacyAutoSpecialties(specialties: string[]): boolean {
  return (
    specialties.length > 0 && specialties.every((specialty) => LEGACY_AUTO_SPECIALTIES.has(specialty))
  );
}

export function normalizeSpecialties(specialties: string[]): string[] {
  return isLegacyAutoSpecialties(specialties) ? [] : specialties;
}

export const COMMON_SPECIALTIES = [
  'Consiliere În Căsătorie',
  'Terapie Familială',
  'Consiliere Privind Doliul',
  'Recuperare Dependențe',
  'Probleme Adolescenți',
  'Îndrumare Spirituală',
  'Anxietate & Depresie',
  'Management Furiilor',
  'Consiliere Financiară',
  'Îndrumare Carieră',
  'Probleme Relaționale',
  'Intervenție Crize',
];

export interface CaseStats {
  active: number;
  finished: number;
  unfinished: number;
  waiting: number;
}

export function computeCaseStats(cases: Case[]): CaseStats {
  return {
    active: cases.filter((c) => c.status === 'active').length,
    finished: cases.filter((c) => c.status === 'finished').length,
    unfinished: cases.filter((c) => c.status === 'unfinished').length,
    waiting: cases.filter((c) => c.status === 'waiting').length,
  };
}

export function getWorkloadLabel(level: 'low' | 'moderate' | 'high'): string {
  switch (level) {
    case 'high':
      return t.profile.workloadHigh;
    case 'moderate':
      return t.profile.workloadModerate;
    case 'low':
    default:
      return t.profile.workloadLow;
  }
}

export function getWorkloadBadgeClass(level: 'low' | 'moderate' | 'high'): string {
  switch (level) {
    case 'high':
      return 'bg-red-50 text-red-700';
    case 'moderate':
      return 'bg-amber-50 text-amber-700';
    case 'low':
    default:
      return 'bg-green-50 text-green-700';
  }
}

export function getRoleLabel(role?: UserRole): string {
  switch (role) {
    case 'leader':
      return t.profile.roleLeader;
    case 'admin':
      return t.profile.roleAdmin;
    case 'counselor':
    default:
      return t.profile.roleCounselor;
  }
}
