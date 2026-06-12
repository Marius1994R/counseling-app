import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole } from '../types';
import { t } from './translations';

export function isAdminOrLeader(role?: UserRole): boolean {
  return role === 'admin' || role === 'leader';
}

export async function fetchFreshUserRole(userId: string): Promise<UserRole | null> {
  if (userId.startsWith('demo-')) {
    return null;
  }

  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists() || userDoc.data()?.isActive === false) {
    return null;
  }

  return userDoc.data()?.role as UserRole;
}

export async function assertUserHasRole(
  userId: string,
  allowedRoles: UserRole[],
  errorMessage = t.auth.permissionDenied
): Promise<UserRole> {
  const role = await fetchFreshUserRole(userId);
  if (!role || !allowedRoles.includes(role)) {
    throw new Error(errorMessage);
  }
  return role;
}

export function getAuthenticatedUserId(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error(t.auth.notAuthenticated);
  }
  return uid;
}
