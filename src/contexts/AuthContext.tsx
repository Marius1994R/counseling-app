import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  deleteUser as firebaseDeleteUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, getSecondaryAuth } from '../firebase';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  createUser: (email: string, password: string, fullName: string, role: UserRole) => Promise<string>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  getAllUsers: () => Promise<User[]>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = useRef(false);

  // Debug currentUser changes
  useEffect(() => {
    console.log('AuthContext: currentUser changed to:', currentUser);
  }, [currentUser]);

  // Restore user from localStorage on app load
  useEffect(() => {
    if (initializedRef.current) return; // Prevent multiple initializations
    initializedRef.current = true;
    
    console.log('AuthContext: Starting to restore user from localStorage...');
    const savedUser = localStorage.getItem('counselingAppUser');
    console.log('AuthContext: Saved user found:', !!savedUser);
    
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('AuthContext: Parsed user data:', userData);
        
        // Check if the saved user is still valid (not expired)
        if (userData.id && userData.email) {
          // Convert date strings back to Date objects
          const restoredUser = {
            ...userData,
            createdAt: new Date(userData.createdAt),
            lastLogin: new Date(userData.lastLogin)
          };
          console.log('AuthContext: Setting current user:', restoredUser);
          setCurrentUser(restoredUser);
        } else {
          console.log('AuthContext: Invalid user data, missing id or email');
        }
      } catch (error) {
        console.error('AuthContext: Error parsing saved user data:', error);
        localStorage.removeItem('counselingAppUser');
      }
    } else {
      console.log('AuthContext: No saved user found');
    }
    console.log('AuthContext: Setting loading to false');
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Hardcoded demo credentials
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
        setCurrentUser(user);
        // Save to localStorage for persistence
        localStorage.setItem('counselingAppUser', JSON.stringify(user));
        return;
      }

      // Try Firebase authentication as fallback
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Check if user is active
        if (!userData.isActive) {
          throw new Error('Account has been deactivated. Please contact an administrator.');
        }
        
        const user = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          fullName: userData.fullName,
          role: userData.role,
          isActive: userData.isActive,
          createdAt: userData.createdAt.toDate(),
          lastLogin: new Date(),
          deactivatedAt: userData.deactivatedAt?.toDate()
        };
        setCurrentUser(user);
        // Save to localStorage for persistence
        localStorage.setItem('counselingAppUser', JSON.stringify(user));
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      console.log('AuthContext: Logging out user');
      setCurrentUser(null);
      // Clear localStorage on logout
      localStorage.removeItem('counselingAppUser');
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      const userData = {
        email: user.email,
        fullName,
        role,
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      
      setCurrentUser({
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
      // Check if current user has permission to create users
      if (currentUser?.role !== 'leader') {
        throw new Error('Only leaders can create new users');
      }

      // Use secondary auth instance to create user without affecting main session
      const secondaryAuth = getSecondaryAuth();
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const user = userCredential.user;
      
      // Create user document in Firestore
      const userData = {
        email: user.email,
        fullName,
        role,
        isActive: true,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      
      // Sign out from the secondary auth instance to clean up
      await signOut(secondaryAuth);
      
      console.log(`✅ User created successfully: ${email} (${role})`);
      console.log(`✅ You remain logged in as: ${currentUser?.email} (${currentUser?.role})`);
      
      // Return the newly created user ID
      return user.uid;
      
    } catch (error: any) {
      console.error('Create user error:', error);
      
      // Sign out from secondary auth instance in case of error
      try {
        const secondaryAuth = getSecondaryAuth();
        await signOut(secondaryAuth);
      } catch (signOutError) {
        // Ignore sign out errors
      }
      
      // If email already exists in Firebase Auth, provide more specific error
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered in Firebase Authentication. The user may exist in Firebase Auth but not in your Firestore database. Please use a different email or contact an administrator to clean up orphaned accounts.');
      }
      
      throw error;
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      // Check if current user has permission to update roles
      if (currentUser?.role !== 'leader' && currentUser?.role !== 'admin') {
        throw new Error('Only leaders and admins can update user roles');
      }

      // Prevent non-leaders from creating other leaders
      if (newRole === 'leader' && currentUser?.role !== 'leader') {
        throw new Error('Only leaders can assign leader role');
      }

      // Get user data to check their current role
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Prevent admins from changing the role of leader accounts
        if (currentUser?.role === 'admin' && userData.role === 'leader') {
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
      // Check if current user has permission to delete users
      if (currentUser?.role !== 'leader') {
        throw new Error('Only leaders can delete users');
      }

      // Allow supreme leader to delete themselves
      const isSupremeLeader = currentUser?.email === 'marius.rasbici@biserica-lumina.ro';
      if (userId === currentUser?.id && !isSupremeLeader) {
        throw new Error('Cannot delete your own account');
      }

      // Get user data first to get the Firebase Auth UID
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Delete user from Firebase Auth (if it's a real Firebase user, not demo)
        if (!userId.startsWith('demo-')) {
          try {
            // Note: This requires admin privileges in Firebase Auth
            // For now, we'll just delete from Firestore
            console.warn('Firebase Auth user deletion requires admin privileges');
          } catch (authError) {
            console.warn('Could not delete from Firebase Auth:', authError);
          }
        }
      }

      // Delete user document from Firestore
      await deleteDoc(doc(db, 'users', userId));
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      // Check if current user has permission to deactivate users
      if (currentUser?.role !== 'leader' && currentUser?.role !== 'admin') {
        throw new Error('Only leaders and admins can deactivate users');
      }

      // Allow supreme leader to deactivate themselves
      const isSupremeLeader = currentUser?.email === 'marius.rasbici@biserica-lumina.ro';
      if (userId === currentUser?.id && !isSupremeLeader) {
        throw new Error('Cannot deactivate your own account');
      }

      // Get user data to check their role
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Prevent admins from deactivating leaders
        if (currentUser?.role === 'admin' && userData.role === 'leader') {
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
      // Check if current user has permission to reactivate users
      if (currentUser?.role !== 'leader' && currentUser?.role !== 'admin') {
        throw new Error('Only leaders and admins can reactivate users');
      }

      // Allow supreme leader to reactivate themselves
      const isSupremeLeader = currentUser?.email === 'marius.rasbici@biserica-lumina.ro';

      // Get user data to check their role
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Prevent admins from reactivating leaders
        if (currentUser?.role === 'admin' && userData.role === 'leader') {
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
      // Check if current user has permission to view all users
      if (currentUser?.role !== 'leader' && currentUser?.role !== 'admin') {
        throw new Error('Only leaders and admins can view all users');
      }

      const usersList: User[] = [];
      
      // Get Firebase users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          email: userData.email,
          fullName: userData.fullName,
          role: userData.role,
          isActive: userData.isActive ?? true, // Default to true for existing users
          createdAt: userData.createdAt.toDate(),
          lastLogin: userData.lastLogin?.toDate(),
          deactivatedAt: userData.deactivatedAt?.toDate()
        });
      });

      return usersList.sort((a, b) => {
        // First sort by role priority: leader > admin > counselor
        const roleOrder = { leader: 0, admin: 1, counselor: 2 };
        const roleComparison = roleOrder[a.role] - roleOrder[b.role];
        
        // If roles are the same, sort by name
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
      console.log('Firebase auth state changed:', firebaseUser ? 'user logged in' : 'user logged out');
      
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const firebaseUserData = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              fullName: userData.fullName,
              role: userData.role,
              isActive: userData.isActive ?? true,
              createdAt: userData.createdAt.toDate(),
              lastLogin: userData.lastLogin?.toDate(),
              deactivatedAt: userData.deactivatedAt?.toDate()
            };
            console.log('Firebase: Setting user from Firebase:', firebaseUserData);
            setCurrentUser(firebaseUserData);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        // Only clear currentUser if we don't have a localStorage user
        const savedUser = localStorage.getItem('counselingAppUser');
        if (!savedUser) {
          console.log('Firebase: No Firebase user and no localStorage user, clearing currentUser');
          setCurrentUser(null);
        } else {
          console.log('Firebase: No Firebase user but localStorage user exists, keeping currentUser');
        }
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    login,
    logout,
    register,
    createUser,
    updateUserRole,
    deleteUser,
    deactivateUser,
    reactivateUser,
    getAllUsers
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
