import { Case, CaseStatus, Counselor, User, UserRole } from '../../types';
import { WorkloadFilter, enrichCounselorWithWorkload, filterCounselors, countByWorkload } from '../Counselors/counselorsUtils';

export const SUPREME_LEADER_EMAIL = 'marius.rasbici@biserica-lumina.ro';

export interface CreateUserData {
  email: string;
  password: string;
  /** Prenume */
  firstName: string;
  /** Nume de familie */
  lastName: string;
  /** Composed display name: Prenume Nume */
  fullName: string;
  role: UserRole;
}

export function emptyCreateUserData(): CreateUserData {
  return {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    fullName: '',
    role: 'counselor',
  };
}

export type AdminTab = 0 | 1 | 2 | 3 | 4;
export type CaseStatusFilter = CaseStatus | 'all';

/** Basic email format check (local@domain.tld). */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

export function generatePassword(fullName: string): string {
  if (!fullName.trim()) return '';

  const nameParts = fullName.trim().split(' ');
  if (nameParts.length < 2) return '';

  const firstName = nameParts[0].toLowerCase();
  const lastName = nameParts[nameParts.length - 1].toLowerCase();
  const randomNumbers = Math.floor(1000 + Math.random() * 9000);

  return `${firstName.charAt(0)}.${lastName}@BLT${randomNumbers}`;
}

export function getRoleBadgeClass(role: UserRole): string {
  switch (role) {
    case 'leader':
      return 'bg-red-50 text-red-700';
    case 'admin':
      return 'bg-amber-50 text-amber-700';
    case 'counselor':
    default:
      return 'bg-brand-50 text-brand-800';
  }
}

export function getRoleLabel(role: UserRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function filterAdminCases(
  cases: Case[],
  searchTerm: string,
  statusFilter: CaseStatusFilter,
  counselorFilter: string
): Case[] {
  let filtered = cases;

  if (searchTerm.trim()) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (caseItem) =>
        caseItem.title.toLowerCase().includes(term) ||
        caseItem.counseledName.toLowerCase().includes(term) ||
        caseItem.description.toLowerCase().includes(term)
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter((c) => c.status === statusFilter);
  }

  if (counselorFilter !== 'all') {
    filtered = filtered.filter((c) => c.assignedCounselorId === counselorFilter);
  }

  return [...filtered].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export type AdminCaseStatusCounts = {
  all: number;
  waiting: number;
  active: number;
  unfinished: number;
  finished: number;
  cancelled: number;
};

/** Counts by status after search + counselor filters (status ignored). */
export function countAdminCasesByStatus(
  cases: Case[],
  searchTerm: string,
  counselorFilter: string
): AdminCaseStatusCounts {
  const base = filterAdminCases(cases, searchTerm, 'all', counselorFilter);
  const counts: AdminCaseStatusCounts = {
    all: base.length,
    waiting: 0,
    active: 0,
    unfinished: 0,
    finished: 0,
    cancelled: 0,
  };
  base.forEach((c) => {
    counts[c.status] += 1;
  });
  return counts;
}

export function parseAdminTabFromUrl(tabParam: string | null): AdminTab {
  if (tabParam === '1') return 1;
  if (tabParam === '2') return 2;
  if (tabParam === '3') return 3;
  if (tabParam === '4') return 4;
  return 0;
}

export function adminTabToSearchParam(tab: AdminTab): Record<string, string> {
  if (tab === 1) return { tab: '1' };
  if (tab === 2) return { tab: '2' };
  if (tab === 3) return { tab: '3' };
  if (tab === 4) return { tab: '4' };
  return {};
}

export function enrichCounselorsList(counselors: Counselor[], cases: Case[]): Counselor[] {
  return counselors.map((c) => enrichCounselorWithWorkload(c, cases));
}

export { filterCounselors, countByWorkload };
export type { WorkloadFilter };

export function canEditUser(
  user: User,
  currentUserId: string | undefined,
  currentUserRole: UserRole | undefined,
  isSupremeLeader: boolean
): boolean {
  if (user.id === currentUserId && !isSupremeLeader) return false;
  if (currentUserRole === 'admin' && user.role === 'leader') return false;
  return true;
}

export function canDeactivateUser(
  user: User,
  currentUserId: string | undefined,
  currentUserRole: UserRole | undefined,
  isSupremeLeader: boolean
): boolean {
  return canEditUser(user, currentUserId, currentUserRole, isSupremeLeader);
}

export function canDeleteUser(
  user: User,
  currentUserId: string | undefined,
  canCreateUsers: boolean,
  isSupremeLeader: boolean,
  currentUserRole?: UserRole
): boolean {
  // Only leaders can delete user accounts; admins may edit/deactivate only
  if (currentUserRole === 'admin') return false;
  if (!canCreateUsers) return false;
  return user.id !== currentUserId || isSupremeLeader;
}
