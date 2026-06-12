import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  onSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { auth, db, functions, getSecondaryAuth } from '../firebase';
import { User, UserRole } from '../types';
import { SUPREME_LEADER_EMAIL } from '../components/Admin/adminUtils';
import { fetchFreshUserRole } from '../utils/roleAuth';
import { getRoleLabel } from '../components/Profile/profileUtils';
import { t } from '../utils/translations';

export interface RoleUpdateNotice {
  message: string;
  previousRole: UserRole;
  newRole: UserRole;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  roleUpdateNotice: RoleUpdateNotice | null;
  clearRoleUpdateNotice: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  createUser: (email: string, password: string, fullName: string, role: UserRole) => Promise<string>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  getAllUsers: () => Promise<User[]>;
  updateUserAvatar: (avatarUrl: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

function firestoreDataToUser(id: string, email: string, userData: DocumentData): User {
  return {
    id,
    email,
    fullName: userData.fullName,
    role: userData.role,
    isActive: userData.isActive ?? true,
    avatarUrl: userData.avatarUrl || undefined,
    createdAt: userData.createdAt.toDate(),
    lastLogin: userData.lastLogin?.toDate(),
    deactivatedAt: userData.deactivatedAt?.toDate(),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleUpdateNotice, setRoleUpdateNotice] = useState<RoleUpdateNotice | null>(null);
  const bootstrapCompleteRef = useRef(false);
  const currentUserRef = useRef<User | null>(null);

  const clearRoleUpdateNotice = useCallback(() => {
    setRoleUpdateNotice(null);
  }, []);

  const persistUser = useCallback((user: User) => {
    currentUserRef.current = user;
    setCurrentUser(user);
    localStorage.setItem('counselingAppUser', JSON.stringify(user));
  }, []);

  const clearSession = useCallback(async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignore sign-out errors (e.g. already signed out)
    }
    currentUserRef.current = null;
    setCurrentUser(null);
    setRoleUpdateNotice(null);
    localStorage.removeItem('counselingAppUser');
  }, []);

  const verifyPrivilege = useCallback(
    async (allowedRoles: UserRole[]): Promise<User> => {
      const cachedUser = currentUserRef.current;
      if (!cachedUser) {
        throw new Error(t.auth.notAuthenticated);
      }

      if (cachedUser.id.startsWith('demo-')) {
        if (!allowedRoles.includes(cachedUser.role)) {
          throw new Error(t.auth.permissionDenied);
        }
        return cachedUser;
      }

      const freshRole = await fetchFreshUserRole(cachedUser.id);
      if (!freshRole || !allowedRoles.includes(freshRole)) {
        if (freshRole && freshRole !== cachedUser.role) {
          persistUser({ ...cachedUser, role: freshRole });
        }
        throw new Error(t.auth.permissionDenied);
      }

      if (freshRole !== cachedUser.role) {
        persistUser({ ...cachedUser, role: freshRole });
      }

      return { ...cachedUser, role: freshRole };
    },
    [persistUser]
  );

  useEffect(() => {
    if (bootstrapCompleteRef.current) return;
    bootstrapCompleteRef.current = true;

    const bootstrap = async () => {
      const savedUser = localStorage.getItem('counselingAppUser');

      if (!savedUser) {
        setLoading(false);
        return;
      }

      try {
        const userData = JSON.parse(savedUser);

        if (!userData.id || !userData.email) {
          localStorage.removeItem('counselingAppUser');
          setLoading(false);
          return;
        }

        if (userData.id.startsWith('demo-')) {
          persistUser({
            ...userData,
            createdAt: new Date(userData.createdAt),
            lastLogin: new Date(userData.lastLogin),
          });
          setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', userData.id));
        if (!userDoc.exists() || userDoc.data()?.isActive === false) {
          await clearSession();
        } else {
          const data = userDoc.data();
          persistUser(firestoreDataToUser(userData.id, userData.email, data));
        }
      } catch (error) {
        console.error('AuthContext: Error validating saved user:', error);
        localStorage.removeItem('counselingAppUser');
      }

      setLoading(false);
    };

    bootstrap();
  }, [clearSession, persistUser]);

  const login = async (email: string, password: string) => {
    try {
      const demoUsers = {
        'marius.rasbici@biserica-lumina.ro': { password: 'm.rasbici@BLT2024', fullName: 'Marius Rasbici', role: 'leader' as UserRole, isActive: true },
        'admin@church.com': { password: 'a.admin@BLT2024', fullName: 'Admin User', role: 'admin' as UserRole, isActive: true },
        'counselor@church.com': { password: 'c.counselor@BLT2024', fullName: 'Counselor User', role: 'counselor' as UserRole, isActive: true }
      };

      if (demoUsers[email as keyof typeof demoUsers] && demoUsers[email as keyof typeof demoUsers].password === password) {
        const userData = demoUsers[email as keyof typeof demoUsers];
        const user = {
          id: `demo-${email.replace('@', '-at-').replace('.', '-dot-')}`,
          email: email,
          fullName: userData.fullName,
          role: userData.role,
          isActive: userData.isActive,
          createdAt: new Date(),
          lastLogin: new Date()
        };
        persistUser(user);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (!userData.isActive) {
          throw new Error('Account has been deactivated. Please contact an administrator.');
        }

        persistUser(firestoreDataToUser(firebaseUser.uid, firebaseUser.email!, userData));
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await clearSession();
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        email: user.email,
        fullName,
        role,
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userData);

      persistUser({
        id: user.uid,
        email: user.email!,
        fullName,
        role,
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      });
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const createUser = async (email: string, password: string, fullName: string, role: UserRole): Promise<string> => {
    try {
      await verifyPrivilege(['leader']);

      const secondaryAuth = getSecondaryAuth();
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const user = userCredential.user;

      const userData = {
        email: user.email,
        fullName,
        role,
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      await signOut(secondaryAuth);

      return user.uid;
    } catch (error: any) {
      console.error('Create user error:', error);

      try {
        const secondaryAuth = getSecondaryAuth();
        await signOut(secondaryAuth);
      } catch {
        // Ignore sign out errors
      }

      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered in Firebase Authentication. The user may exist in Firebase Auth but not in your Firestore database. Please use a different email or contact an administrator to clean up orphaned accounts.');
      }

      throw error;
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const caller = await verifyPrivilege(['leader', 'admin']);

      if (newRole === 'leader' && caller.role !== 'leader') {
        throw new Error('Only leaders can assign leader role');
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (caller.role === 'admin' && userData.role === 'leader') {
          throw new Error('Admins cannot modify leader account roles');
        }
      }

      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Update user role error:', error);
      throw error;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const caller = await verifyPrivilege(['leader']);

      const isSupremeLeader = caller.email === SUPREME_LEADER_EMAIL;
      if (userId === caller.id && !isSupremeLeader) {
        throw new Error('Cannot delete your own account');
      }

      const deleteAuthUserFn = httpsCallable(functions, 'deleteAuthUser');
      await deleteAuthUserFn({ userId });

      if (userId === caller.id) {
        await clearSession();
      }
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      const caller = await verifyPrivilege(['leader', 'admin']);

      const isSupremeLeader = caller.email === SUPREME_LEADER_EMAIL;
      if (userId === caller.id && !isSupremeLeader) {
        throw new Error('Cannot deactivate your own account');
      }

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (caller.role === 'admin' && userData.role === 'leader') {
          throw new Error('Admins cannot deactivate leader accounts');
        }
      }

      await updateDoc(doc(db, 'users', userId), {
        isActive: false,
        deactivatedAt: new Date(),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      throw error;
    }
  };

  const reactivateUser = async (userId: string) => {
    try {
      const caller = await verifyPrivilege(['leader', 'admin']);

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (caller.role === 'admin' && userData.role === 'leader') {
          throw new Error('Admins cannot reactivate leader accounts');
        }
      }

      await updateDoc(doc(db, 'users', userId), {
        isActive: true,
        deactivatedAt: null,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Reactivate user error:', error);
      throw error;
    }
  };

  const getAllUsers = async (): Promise<User[]> => {
    try {
      await verifyPrivilege(['leader', 'admin']);

      const usersList: User[] = [];

      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        usersList.push({
          id: userDoc.id,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role,
          isActive: userData.isActive ?? true,
          avatarUrl: userData.avatarUrl || undefined,
          createdAt: userData.createdAt.toDate(),
          lastLogin: userData.lastLogin?.toDate(),
          deactivatedAt: userData.deactivatedAt?.toDate()
        });
      });

      return usersList.sort((a, b) => {
        const roleOrder = { leader: 0, admin: 1, counselor: 2 };
        const roleComparison = roleOrder[a.role] - roleOrder[b.role];

        if (roleComparison === 0) {
          return a.fullName.localeCompare(b.fullName);
        }

        return roleComparison;
      });
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.isActive === false) {
              await clearSession();
              return;
            }
            persistUser(firestoreDataToUser(firebaseUser.uid, firebaseUser.email!, userData));
          } else {
            await clearSession();
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        const savedUser = localStorage.getItem('counselingAppUser');
        if (!savedUser) {
          setCurrentUser(null);
          return;
        }

        try {
          const parsed = JSON.parse(savedUser);
          if (!parsed.id?.startsWith('demo-')) {
            setCurrentUser(null);
            localStorage.removeItem('counselingAppUser');
          }
        } catch {
          setCurrentUser(null);
          localStorage.removeItem('counselingAppUser');
        }
      }
    });

    return unsubscribe;
  }, [clearSession, persistUser]);

  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId || userId.startsWith('demo-')) {
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'users', userId), (userDoc) => {
      if (!userDoc.exists() || userDoc.data()?.isActive === false) {
        clearSession();
        return;
      }

      const data = userDoc.data();
      const prev = currentUserRef.current;
      if (!prev || prev.id !== userId) {
        return;
      }

      const updatedUser = firestoreDataToUser(userId, prev.email, data);
      const roleChanged = data.role !== prev.role;

      persistUser(updatedUser);

      if (roleChanged) {
        setRoleUpdateNotice({
          message: t.auth.roleUpdated.replace('{{role}}', getRoleLabel(data.role as UserRole)),
          previousRole: prev.role,
          newRole: data.role as UserRole,
        });
      }
    });

    return unsubscribe;
  }, [currentUser?.id, clearSession, persistUser]);

  const updateUserAvatar = async (avatarUrl: string | null) => {
    if (!currentUser) return;

    if (!currentUser.id.startsWith('demo-')) {
      await updateDoc(doc(db, 'users', currentUser.id), {
        avatarUrl: avatarUrl ?? null,
        updatedAt: new Date(),
      });
    }

    const updatedUser: User = {
      ...currentUser,
      avatarUrl: avatarUrl ?? undefined,
    };
    persistUser(updatedUser);
  };

  const value = {
    currentUser,
    loading,
    roleUpdateNotice,
    clearRoleUpdateNotice,
    login,
    logout,
    register,
    createUser,
    updateUserRole,
    deleteUser,
    deactivateUser,
    reactivateUser,
    getAllUsers,
    updateUserAvatar,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
