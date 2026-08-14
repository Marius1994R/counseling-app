import { IssueType, UserRole } from '../../types';
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

/**
 * Old common specialty labels → new labels (read-time migration).
 * Custom specialties not listed here are left unchanged.
 */
export const SPECIALTY_RENAMES: Record<string, string> = {
  'Consiliere În Căsătorie': 'Căsătorie',
  'Terapie Familială': 'Familie & parenting',
  'Consiliere Privind Doliul': 'Doliu & pierdere',
  'Recuperare Dependențe': 'Dependențe',
  'Probleme Adolescenți': 'Adolescenți & tineri',
  'Îndrumare Spirituală': 'Îndrumare spirituală',
  'Anxietate & Depresie': 'Anxietate & stres',
  'Management Furiilor': 'Furie & conflicte',
  'Probleme Relaționale': 'Relații de cuplu',
  'Intervenție Crize': 'Criză & urgențe',
  // Optional demotions stay as custom labels if present; no rename required
};

export const COMMON_SPECIALTIES = [
  'Căsătorie',
  'Pregătire pentru căsătorie',
  'Familie & parenting',
  'Relații de cuplu',
  'Adolescenți & tineri',
  'Doliu & pierdere',
  'Dependențe',
  'Anxietate & stres',
  'Depresie & epuizare',
  'Furie & conflicte',
  'Traumă & abuz',
  'Criză & urgențe',
  'Îndrumare spirituală',
  'Mărturisire, pocăință, iertare',
  'Libertate în Cristos',
] as const;

export function renameSpecialty(specialty: string): string {
  const trimmed = specialty.trim();
  return SPECIALTY_RENAMES[trimmed] ?? trimmed;
}

/** Normalize specialties: drop legacy placeholders, rename old chips, dedupe. */
export function normalizeSpecialties(specialties: string[]): string[] {
  if (isLegacyAutoSpecialties(specialties)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const specialty of specialties) {
    const next = renameSpecialty(specialty);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    result.push(next);
  }
  return result;
}

/** Remap specialtyCategories keys after renames; drop keys now covered by common map. */
export function normalizeSpecialtyCategories(
  categories: Record<string, IssueType> | undefined | null,
  specialties: string[]
): Record<string, IssueType> | undefined {
  if (!categories || typeof categories !== 'object') return undefined;
  const specialtySet = new Set(specialties);
  const next: Record<string, IssueType> = {};
  for (const [key, value] of Object.entries(categories)) {
    if (value !== 'spiritual' && value !== 'relational' && value !== 'personal') continue;
    const newKey = renameSpecialty(key);
    if ((COMMON_SPECIALTIES as readonly string[]).includes(newKey)) continue;
    if (!specialtySet.has(newKey)) continue;
    next[newKey] = value;
  }
  return Object.keys(next).length > 0 ? next : undefined;
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
