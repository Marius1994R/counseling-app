import { Case, Counselor, Sex } from '../../types';
import { normalizeSpecialties } from '../Profile/profileUtils';
import { resolvePersonName } from '../../utils/nameUtils';

export type WorkloadFilter = 'all' | 'low' | 'moderate' | 'high';

export function parseCounselorBirthDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') {
      try {
        // Must call as method — unbound toDate() loses `this` and throws toMillis
        const date = maybeTimestamp.toDate();
        return Number.isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }
  }
  return null;
}

/** Map a Firestore counselor doc into the Counselor type (legacy fullName safe). */
export function mapFirestoreCounselor(
  id: string,
  data: Record<string, any>,
  overrides?: Partial<Counselor>
): Counselor {
  const name = resolvePersonName({
    firstName: data.firstName,
    lastName: data.lastName,
    fullName: data.fullName,
  });

  return {
    id,
    fullName: name.fullName,
    firstName: name.firstName || undefined,
    lastName: name.lastName || undefined,
    email: data.email || '',
    phoneNumber: data.phoneNumber || '',
    sex: data.sex === 'feminin' || data.sex === 'masculin' ? (data.sex as Sex) : undefined,
    birthDate: parseCounselorBirthDate(data.birthDate),
    specialties: normalizeSpecialties(data.specialties || []),
    specialtyCategories: data.specialtyCategories || undefined,
    activeCases: data.activeCases || 0,
    workloadLevel: data.workloadLevel || 'low',
    linkedUserId: data.linkedUserId || undefined,
    avatarUrl: data.avatarUrl || undefined,
    createdAt: data.createdAt?.toDate?.() ?? new Date(),
    updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    ...overrides,
  };
}

export function computeWorkload(activeCases: number): {
  activeCases: number;
  workloadLevel: 'low' | 'moderate' | 'high';
} {
  const workloadLevel: 'low' | 'moderate' | 'high' =
    activeCases >= 3 ? 'high' : activeCases >= 2 ? 'moderate' : 'low';
  return { activeCases, workloadLevel };
}

export function enrichCounselorWithWorkload(
  counselor: Omit<Counselor, 'activeCases' | 'workloadLevel'> & Partial<Pick<Counselor, 'activeCases' | 'workloadLevel'>>,
  cases: Case[]
): Counselor {
  const assignedCases = cases.filter((c) => c.assignedCounselorId === counselor.id);
  const activeCases = assignedCases.filter((c) => c.status === 'active').length;
  const { workloadLevel } = computeWorkload(activeCases);
  return {
    ...counselor,
    activeCases,
    workloadLevel,
  } as Counselor;
}

export function getCounselorCases(counselorId: string, cases: Case[]): Case[] {
  return cases.filter((c) => c.assignedCounselorId === counselorId);
}

export function pickNewestCounselorDoc<
  T extends { data: () => { updatedAt?: { toDate: () => Date } } },
>(docs: T[]): T | null {
  if (docs.length === 0) return null;
  return [...docs].sort((a, b) => {
    const aTime = a.data().updatedAt?.toDate?.()?.getTime() ?? 0;
    const bTime = b.data().updatedAt?.toDate?.()?.getTime() ?? 0;
    return bTime - aTime;
  })[0];
}

export function getEarliestDate(dates: Date[]): Date {
  return dates.reduce(
    (earliest, date) => (date.getTime() < earliest.getTime() ? date : earliest),
    dates[0]
  );
}

/** Newest data, earliest createdAt — hides duplicates without shifting the creation date. */
export function dedupeCounselors(counselors: Counselor[]): Counselor[] {
  const byKey = new Map<string, Counselor[]>();

  for (const counselor of counselors) {
    const key = counselor.linkedUserId || counselor.email.trim().toLowerCase();
    const group = byKey.get(key) ?? [];
    group.push(counselor);
    byKey.set(key, group);
  }

  return Array.from(byKey.values()).map((group) => {
    const preferred = [...group].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    )[0];
    const createdAt = getEarliestDate(group.map((c) => c.createdAt));
    return { ...preferred, createdAt };
  });
}

export function filterCounselors(
  counselors: Counselor[],
  searchTerm: string,
  workloadFilter: WorkloadFilter
): Counselor[] {
  let filtered = counselors;

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (counselor) =>
        counselor.fullName.toLowerCase().includes(term) ||
        counselor.email.toLowerCase().includes(term) ||
        counselor.phoneNumber.toLowerCase().includes(term) ||
        counselor.specialties.some((s) => s.toLowerCase().includes(term))
    );
  }

  if (workloadFilter !== 'all') {
    filtered = filtered.filter((c) => c.workloadLevel === workloadFilter);
  }

  return filtered;
}

export function countByWorkload(
  counselors: Counselor[],
  workload: 'low' | 'moderate' | 'high'
): number {
  return counselors.filter((c) => c.workloadLevel === workload).length;
}

export function formatCounselorDate(date: Date): string {
  return date.toLocaleDateString('ro-RO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
