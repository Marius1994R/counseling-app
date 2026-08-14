import { Counselor, IssueType, Sex } from '../../types';
import { COMMON_SPECIALTIES, getWorkloadLabel, renameSpecialty } from '../Profile/profileUtils';
import { t } from '../../utils/translations';

/** Static map: every COMMON_SPECIALTIES chip → one case category */
export const COMMON_SPECIALTY_ISSUE_TYPES: Record<string, IssueType> = {
  // Current chips
  Căsătorie: 'relational',
  'Pregătire pentru căsătorie': 'relational',
  'Familie & parenting': 'relational',
  'Relații de cuplu': 'relational',
  'Adolescenți & tineri': 'personal',
  'Doliu & pierdere': 'personal',
  Dependențe: 'personal',
  'Anxietate & stres': 'personal',
  'Depresie & epuizare': 'personal',
  'Furie & conflicte': 'personal',
  'Traumă & abuz': 'personal',
  'Criză & urgențe': 'personal',
  'Îndrumare spirituală': 'spiritual',
  'Vinovăție, iertare & restaurare': 'spiritual',
  // Legacy labels (if something bypasses normalizeSpecialties)
  'Probleme Relaționale': 'relational',
  'Consiliere În Căsătorie': 'relational',
  'Terapie Familială': 'relational',
  'Îndrumare Spirituală': 'spiritual',
  'Anxietate & Depresie': 'personal',
  'Recuperare Dependențe': 'personal',
  'Management Furiilor': 'personal',
  'Probleme Adolescenți': 'personal',
  'Consiliere Privind Doliul': 'personal',
  'Intervenție Crize': 'personal',
  'Consiliere Financiară': 'personal',
  'Îndrumare Carieră': 'personal',
};

const WORKLOAD_RANK: Record<Counselor['workloadLevel'], number> = {
  low: 0,
  moderate: 1,
  high: 2,
};

export function resolveSpecialtyIssueType(
  specialty: string,
  specialtyCategories?: Record<string, IssueType>
): IssueType | null {
  const key = renameSpecialty(specialty);
  if (COMMON_SPECIALTY_ISSUE_TYPES[key]) {
    return COMMON_SPECIALTY_ISSUE_TYPES[key];
  }
  if (specialtyCategories?.[key]) {
    return specialtyCategories[key];
  }
  if (specialtyCategories?.[specialty]) {
    return specialtyCategories[specialty];
  }
  return null;
}

export function isCommonSpecialty(specialty: string): boolean {
  return (COMMON_SPECIALTIES as readonly string[]).includes(renameSpecialty(specialty));
}

export function getCounselorIssueTypes(counselor: Counselor): Set<IssueType> {
  const types = new Set<IssueType>();
  for (const specialty of counselor.specialties) {
    const issueType = resolveSpecialtyIssueType(specialty, counselor.specialtyCategories);
    if (issueType) types.add(issueType);
  }
  return types;
}

export function computeSpecialtyMatchScore(
  issueTypes: IssueType[],
  counselor: Counselor
): number {
  if (issueTypes.length === 0) return 0;
  const counselorTypes = getCounselorIssueTypes(counselor);
  return issueTypes.filter((type) => counselorTypes.has(type)).length;
}

export function computeSexMatchScore(
  counseleeSex: Sex | undefined,
  counselor: Counselor
): number {
  if (!counseleeSex || !counselor.sex) return 0;
  return counselor.sex === counseleeSex ? 1 : 0;
}

export interface RankedCounselor extends Counselor {
  matchScore: number;
  sexMatch: number;
}

/** Drop counselors linked to deactivated users (keep currently selected on edit). */
export function filterAssignableCounselors(
  counselors: Counselor[],
  inactiveUserIds: ReadonlySet<string>,
  keepCounselorIds: ReadonlySet<string> = new Set()
): Counselor[] {
  if (inactiveUserIds.size === 0) return counselors;
  return counselors.filter((counselor) => {
    if (keepCounselorIds.has(counselor.id)) return true;
    if (!counselor.linkedUserId) return true;
    return !inactiveUserIds.has(counselor.linkedUserId);
  });
}

/**
 * Order all counselors by recommendation (does not hide anyone):
 * same-sex match → specialty match → lower workload → name.
 * Propose-by-default picks the first entry.
 */
export function rankCounselorsForCase(
  issueTypes: IssueType[],
  counselors: Counselor[],
  counseleeSex?: Sex
): RankedCounselor[] {
  return counselors
    .map((counselor) => ({
      ...counselor,
      matchScore: computeSpecialtyMatchScore(issueTypes, counselor),
      sexMatch: computeSexMatchScore(counseleeSex, counselor),
    }))
    .sort((a, b) => {
      if (b.sexMatch !== a.sexMatch) return b.sexMatch - a.sexMatch;
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      const workloadDiff = WORKLOAD_RANK[a.workloadLevel] - WORKLOAD_RANK[b.workloadLevel];
      if (workloadDiff !== 0) return workloadDiff;
      return a.fullName.localeCompare(b.fullName, 'ro');
    });
}

export function formatCounselorOptionLabel(
  counselor: RankedCounselor,
  options?: { recommended?: boolean }
): string {
  const base = `${counselor.fullName} · ${getWorkloadLabel(counselor.workloadLevel)}`;
  return options?.recommended ? `${base} (${t.assignments.recommendedLabel})` : base;
}
