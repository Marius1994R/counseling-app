import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { db } from '../firebase';
import { Case, Counselor, User, UserRole } from '../types';
import { logCaseAssigned } from '../utils/activityLogger';
import { t } from '../utils/translations';
import {
  CreateUserData,
  AdminTab,
  CaseStatusFilter,
  WorkloadFilter,
  SUPREME_LEADER_EMAIL,
  parseAdminTabFromUrl,
  adminTabToSearchParam,
  filterCounselors,
  filterAdminCases,
  enrichCounselorsList,
} from '../components/Admin/adminUtils';
import { countByWorkload } from '../components/Counselors/counselorsUtils';

export function useAdminData() {
  const {
    currentUser,
    createUser,
    updateUserRole,
    deleteUser,
    deactivateUser,
    reactivateUser,
    getAllUsers,
  } = useAuth();
  const { refetch: refetchDashboard } = useDashboardDataContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<AdminTab>(0);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    email: '',
    password: '',
    fullName: '',
    role: 'counselor',
  });
  const [editUserData, setEditUserData] = useState<Partial<CreateUserData>>({
    fullName: '',
    role: 'counselor',
  });
  const [newlyCreatedUserId, setNewlyCreatedUserId] = useState<string | null>(null);
  const [showNextStepDialog, setShowNextStepDialog] = useState(false);

  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [counselorCases, setCounselorCases] = useState<Case[]>([]);
  const [counselorsLoading, setCounselorsLoading] = useState(true);
  const [counselorsError, setCounselorsError] = useState('');
  const [counselorFormOpen, setCounselorFormOpen] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState<Counselor | null>(null);
  const [counselorSearchTerm, setCounselorSearchTerm] = useState('');
  const [counselorWorkloadFilter, setCounselorWorkloadFilter] = useState<WorkloadFilter>('all');

  const [allCases, setAllCases] = useState<Case[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState('');
  const [caseSearchTerm, setCaseSearchTerm] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState<CaseStatusFilter>('all');
  const [caseCounselorFilter, setCaseCounselorFilter] = useState('all');
  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({});
  const [sessionReportOpen, setSessionReportOpen] = useState(false);
  const [selectedCaseForSessionReport, setSelectedCaseForSessionReport] = useState<Case | null>(
    null
  );

  const isSupremeLeader = currentUser?.email === SUPREME_LEADER_EMAIL;
  const canManageUsers = currentUser?.role === 'leader' || currentUser?.role === 'admin';
  const canCreateUsers = currentUser?.role === 'leader';

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  useEffect(() => {
    setActiveTab(parseAdminTabFromUrl(searchParams.get('tab')));
  }, [searchParams]);

  const loadUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const usersList = await getAllUsers();
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      showSnackbar(t.admin.users.createUserError, 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [getAllUsers, showSnackbar]);

  const loadLatestNotes = async (cases: Case[]) => {
    try {
      const notesPromises = cases.map(async (caseItem) => {
        const notesRef = collection(db, 'meetingNotes');
        const notesQuery = query(notesRef, where('caseId', '==', caseItem.id));
        const notesSnapshot = await getDocs(notesQuery);

        if (!notesSnapshot.empty) {
          const notesData = notesSnapshot.docs.map((noteDoc) => {
            const data = noteDoc.data();
            return {
              content: data.content as string,
              createdAt: data.createdAt.toDate() as Date,
            };
          });
          notesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return { caseId: caseItem.id, content: notesData[0].content };
        }
        return { caseId: caseItem.id, content: '' };
      });

      const notesResults = await Promise.all(notesPromises);
      const notesMap: Record<string, string> = {};
      notesResults.forEach(({ caseId, content }) => {
        notesMap[caseId] = content;
      });
      setCaseNotes(notesMap);
    } catch (error) {
      console.error('Error loading latest notes:', error);
    }
  };

  const loadCounselors = useCallback(async () => {
    try {
      setCounselorsLoading(true);
      setCounselorsError('');

      const counselorsSnapshot = await getDocs(
        query(collection(db, 'counselors'), orderBy('createdAt', 'desc'))
      );
      const casesSnapshot = await getDocs(
        query(collection(db, 'cases'), orderBy('createdAt', 'desc'))
      );

      const casesData: Case[] = [];
      casesSnapshot.forEach((caseDoc) => {
        const data = caseDoc.data();
        casesData.push({
          id: caseDoc.id,
          title: data.title,
          counseledName: data.counseledName,
          age: data.age,
          sex: data.sex,
          civilStatus: data.civilStatus,
          issueTypes: data.issueTypes || [],
          phoneNumber: data.phoneNumber || '',
          description: data.description,
          status: data.status,
          assignedCounselorId: data.assignedCounselorId,
          assignedCounselorName: data.assignedCounselorName,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          createdBy: data.createdBy || '',
        });
      });

      const counselorsData: Counselor[] = [];
      counselorsSnapshot.forEach((counselorDoc) => {
        const data = counselorDoc.data();
        counselorsData.push({
          id: counselorDoc.id,
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber || '',
          specialties: data.specialties || [],
          activeCases: 0,
          workloadLevel: 'low',
          linkedUserId: data.linkedUserId || undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
        });
      });

      setCounselorCases(casesData);
      setCounselors(enrichCounselorsList(counselorsData, casesData));
    } catch (error) {
      console.error('Error loading counselors:', error);
      setCounselorsError(t.counselors.loadError);
    } finally {
      setCounselorsLoading(false);
    }
  }, []);

  const loadCases = useCallback(async () => {
    try {
      setCasesLoading(true);
      setCasesError('');

      const casesSnapshot = await getDocs(
        query(collection(db, 'cases'), orderBy('createdAt', 'desc'))
      );

      const casesData: Case[] = [];
      casesSnapshot.forEach((caseDoc) => {
        const data = caseDoc.data();
        casesData.push({
          id: caseDoc.id,
          title: data.title,
          counseledName: data.counseledName,
          age: data.age,
          sex: data.sex,
          civilStatus: data.civilStatus,
          issueTypes: data.issueTypes || [],
          phoneNumber: data.phoneNumber || '',
          description: data.description,
          status: data.status,
          assignedCounselorId: data.assignedCounselorId,
          assignedCounselorName: data.assignedCounselorName,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          createdBy: data.createdBy || '',
        });
      });

      setAllCases(casesData);
      await loadLatestNotes(casesData);
    } catch (error) {
      console.error('Error loading cases:', error);
      setCasesError('Eroare la încărcarea cazurilor');
    } finally {
      setCasesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser && canManageUsers) {
      loadUsers();
    }
  }, [currentUser, canManageUsers, loadUsers]);

  useEffect(() => {
    if (activeTab === 1) {
      loadCounselors();
    } else if (activeTab === 2) {
      loadCases();
      loadCounselors();
    }
  }, [activeTab, loadCases, loadCounselors]);

  const filteredCounselors = useMemo(
    () => filterCounselors(counselors, counselorSearchTerm, counselorWorkloadFilter),
    [counselors, counselorSearchTerm, counselorWorkloadFilter]
  );

  const counselorWorkloadCounts = useMemo(
    () => ({
      all: counselors.length,
      low: countByWorkload(counselors, 'low'),
      moderate: countByWorkload(counselors, 'moderate'),
      high: countByWorkload(counselors, 'high'),
    }),
    [counselors]
  );

  const filteredCases = useMemo(
    () => filterAdminCases(allCases, caseSearchTerm, caseStatusFilter, caseCounselorFilter),
    [allCases, caseSearchTerm, caseStatusFilter, caseCounselorFilter]
  );

  const setTab = useCallback(
    (tab: AdminTab) => {
      setActiveTab(tab);
      setSearchParams(adminTabToSearchParam(tab));
    },
    [setSearchParams]
  );

  const handleCounselorSubmit = useCallback(
    async (
      counselorData: Omit<Counselor, 'id' | 'createdAt' | 'updatedAt' | 'activeCases' | 'workloadLevel'>
    ) => {
      try {
        if (editingCounselor) {
          await updateDoc(doc(db, 'counselors', editingCounselor.id), {
            ...counselorData,
            updatedAt: new Date(),
          });
          showSnackbar('Consilier actualizat cu succes', 'success');
        } else {
          await addDoc(collection(db, 'counselors'), {
            ...counselorData,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          showSnackbar('Consilier creat cu succes', 'success');
        }
        setCounselorFormOpen(false);
        setEditingCounselor(null);
        setNewlyCreatedUserId(null);
        loadCounselors();
      } catch (error) {
        console.error('Error saving counselor:', error);
        showSnackbar(t.counselors.saveError, 'error');
      }
    },
    [editingCounselor, loadCounselors, showSnackbar]
  );

  const handleDeleteCounselor = useCallback(
    async (counselorId: string) => {
      try {
        await deleteDoc(doc(db, 'counselors', counselorId));
        showSnackbar('Consilier șters cu succes', 'success');
        loadCounselors();
      } catch (error) {
        console.error('Error deleting counselor:', error);
        showSnackbar(t.counselors.deleteError, 'error');
      }
    },
    [loadCounselors, showSnackbar]
  );

  const handleCaseSubmit = useCallback(
    async (caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      try {
        if (editingCase) {
          const counselorChanged =
            editingCase.assignedCounselorId !== caseData.assignedCounselorId &&
            caseData.assignedCounselorId;

          await updateDoc(doc(db, 'cases', editingCase.id), {
            ...caseData,
            updatedAt: new Date(),
          });

          if (counselorChanged && caseData.assignedCounselorId && currentUser) {
            const assignedCounselor = counselors.find((c) => c.id === caseData.assignedCounselorId);
            const assignedToUserId =
              assignedCounselor?.linkedUserId || caseData.assignedCounselorId;

            await logCaseAssigned(
              editingCase.id,
              editingCase.title,
              assignedToUserId,
              assignedCounselor?.fullName || 'Unknown Counselor',
              currentUser.id,
              currentUser.fullName || currentUser.email || 'Unknown User'
            );
          }
          showSnackbar(t.cases.updateSuccess, 'success');
        } else {
          const docRef = await addDoc(collection(db, 'cases'), {
            ...caseData,
            createdBy: currentUser?.id || '',
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          if (caseData.assignedCounselorId && currentUser) {
            const assignedCounselor = counselors.find((c) => c.id === caseData.assignedCounselorId);
            const assignedToUserId =
              assignedCounselor?.linkedUserId || caseData.assignedCounselorId;

            await logCaseAssigned(
              docRef.id,
              caseData.title,
              assignedToUserId,
              assignedCounselor?.fullName || 'Unknown Counselor',
              currentUser.id,
              currentUser.fullName || currentUser.email || 'Unknown User'
            );
          }
          showSnackbar('Caz creat cu succes', 'success');
        }
        setCaseFormOpen(false);
        setEditingCase(null);
        await loadCases();
        await refetchDashboard();
      } catch (error) {
        console.error('Error saving case:', error);
        showSnackbar(t.cases.updateError, 'error');
      }
    },
    [editingCase, counselors, currentUser, loadCases, showSnackbar, refetchDashboard]
  );

  const handleDeleteCase = useCallback(
    async (caseId: string) => {
      try {
        await deleteDoc(doc(db, 'cases', caseId));
        showSnackbar('Caz șters cu succes', 'success');
        await loadCases();
        await refetchDashboard();
      } catch (error) {
        console.error('Error deleting case:', error);
        showSnackbar('Eroare la ștergerea cazului', 'error');
      }
    },
    [loadCases, showSnackbar, refetchDashboard]
  );

  const handleCreateUser = useCallback(async () => {
    try {
      const newUserId = await createUser(
        createUserData.email,
        createUserData.password,
        createUserData.fullName,
        createUserData.role
      );
      showSnackbar(t.admin.users.createUserSuccess, 'success');
      setCreateDialogOpen(false);
      setNewlyCreatedUserId(newUserId);
      setShowNextStepDialog(true);
      setCreateUserData({ email: '', password: '', fullName: '', role: 'counselor' });
      loadUsers();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error('Error creating user:', error);
      if (err.code === 'auth/email-already-in-use') {
        showSnackbar(t.admin.users.createUserError, 'error');
      } else {
        showSnackbar(err.message ?? t.admin.users.createUserError, 'error');
      }
    }
  }, [createUser, createUserData, loadUsers, showSnackbar]);

  const handleEditUser = useCallback(async () => {
    if (!selectedUser) return;
    try {
      await updateUserRole(selectedUser.id, editUserData.role as UserRole);
      showSnackbar(t.admin.users.updateUserSuccess, 'success');
      setEditDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showSnackbar(t.admin.users.updateUserError, 'error');
    }
  }, [selectedUser, editUserData.role, updateUserRole, loadUsers, showSnackbar]);

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      try {
        await deleteUser(userId);
        showSnackbar(t.admin.users.deleteUserSuccess, 'success');
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        showSnackbar(t.admin.users.deleteUserError, 'error');
      }
    },
    [deleteUser, loadUsers, showSnackbar]
  );

  const handleDeactivateUser = useCallback(
    async (userId: string) => {
      try {
        await deactivateUser(userId);
        showSnackbar(t.admin.users.deactivateUserSuccess, 'success');
        loadUsers();
      } catch (error) {
        console.error('Error deactivating user:', error);
        showSnackbar(t.admin.users.deactivateUserError, 'error');
      }
    },
    [deactivateUser, loadUsers, showSnackbar]
  );

  const handleReactivateUser = useCallback(
    async (userId: string) => {
      try {
        await reactivateUser(userId);
        showSnackbar(t.admin.users.reactivateUserSuccess, 'success');
        loadUsers();
      } catch (error) {
        console.error('Error reactivating user:', error);
        showSnackbar(t.admin.users.reactivateUserError, 'error');
      }
    },
    [reactivateUser, loadUsers, showSnackbar]
  );

  const copyUserCredentials = useCallback(() => {
    const credentials = `Email: ${createUserData.email}
Password: ${createUserData.password}
Link app: https://consiliere360.vercel.app/`;

    navigator.clipboard
      .writeText(credentials)
      .then(() => showSnackbar(t.admin.users.copyCredentials + '!', 'success'))
      .catch(() => showSnackbar(t.admin.users.createUserError, 'error'));
  }, [createUserData.email, createUserData.password, showSnackbar]);

  const openEditDialog = useCallback((user: User) => {
    setSelectedUser(user);
    setEditUserData({ fullName: user.fullName, role: user.role });
    setEditDialogOpen(true);
  }, []);

  const handleNextStepToCounselor = useCallback(() => {
    setShowNextStepDialog(false);
    setTab(1);
    setEditingCounselor(null);
    setCounselorFormOpen(true);
  }, [setTab]);

  const getCasesForCounselor = useCallback(
    (counselorId: string) => counselorCases.filter((c) => c.assignedCounselorId === counselorId),
    [counselorCases]
  );

  return {
    currentUser,
    canManageUsers,
    canCreateUsers,
    isSupremeLeader,
    activeTab,
    setTab,
    users,
    usersLoading,
    snackbar,
    setSnackbar,
    showSnackbar,
    createDialogOpen,
    setCreateDialogOpen,
    editDialogOpen,
    setEditDialogOpen,
    selectedUser,
    createUserData,
    setCreateUserData,
    editUserData,
    setEditUserData,
    newlyCreatedUserId,
    showNextStepDialog,
    setShowNextStepDialog,
    counselors,
    counselorsLoading,
    counselorsError,
    counselorFormOpen,
    setCounselorFormOpen,
    editingCounselor,
    setEditingCounselor,
    counselorSearchTerm,
    setCounselorSearchTerm,
    counselorWorkloadFilter,
    setCounselorWorkloadFilter,
    filteredCounselors,
    counselorWorkloadCounts,
    allCases,
    casesLoading,
    casesError,
    caseSearchTerm,
    setCaseSearchTerm,
    caseStatusFilter,
    setCaseStatusFilter,
    caseCounselorFilter,
    setCaseCounselorFilter,
    filteredCases,
    caseFormOpen,
    setCaseFormOpen,
    editingCase,
    setEditingCase,
    caseNotes,
    sessionReportOpen,
    setSessionReportOpen,
    selectedCaseForSessionReport,
    setSelectedCaseForSessionReport,
    loadUsers,
    handleCounselorSubmit,
    handleDeleteCounselor,
    handleCaseSubmit,
    handleDeleteCase,
    handleCreateUser,
    handleEditUser,
    handleDeleteUser,
    handleDeactivateUser,
    handleReactivateUser,
    copyUserCredentials,
    openEditDialog,
    handleNextStepToCounselor,
    handleSkipCounselorLink: () => {
      setShowNextStepDialog(false);
      setNewlyCreatedUserId(null);
    },
    handleCloseCounselorForm: () => {
      setCounselorFormOpen(false);
      setEditingCounselor(null);
      setNewlyCreatedUserId(null);
    },
    handleCloseCaseForm: () => {
      setCaseFormOpen(false);
      setEditingCase(null);
    },
    handleOpenSessionReport: (caseItem: Case) => {
      setSelectedCaseForSessionReport(caseItem);
      setSessionReportOpen(true);
    },
    handleCloseSessionReport: () => {
      setSessionReportOpen(false);
      setSelectedCaseForSessionReport(null);
    },
    getCasesForCounselor,
  };
}
