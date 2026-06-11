import { Case, Counselor } from '../../types';

export type WorkloadFilter = 'all' | 'low' | 'moderate' | 'high';

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
