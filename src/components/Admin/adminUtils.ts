import { Case, CaseStatus, Counselor, User, UserRole } from '../../types';
import { WorkloadFilter, enrichCounselorWithWorkload, filterCounselors, countByWorkload } from '../Counselors/counselorsUtils';

export const SUPREME_LEADER_EMAIL = 'marius.rasbici@biserica-lumina.ro';

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export type AdminTab = 0 | 1 | 2;
export type CaseStatusFilter = CaseStatus | 'all';

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

  return filtered;
}

export function parseAdminTabFromUrl(tabParam: string | null): AdminTab {
  if (tabParam === '1') return 1;
  if (tabParam === '2') return 2;
  return 0;
}

export function adminTabToSearchParam(tab: AdminTab): Record<string, string> {
  if (tab === 1) return { tab: '1' };
  if (tab === 2) return { tab: '2' };
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
  isSupremeLeader: boolean
): boolean {
  if (!canCreateUsers) return false;
  return user.id !== currentUserId || isSupremeLeader;
}
