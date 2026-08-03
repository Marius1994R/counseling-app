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
import { logCaseAssigned, logCaseProposed, logCaseCreated } from '../utils/activityLogger';
import { t } from '../utils/translations';
import { mapFirestoreCase } from '../components/Cases/casesUtils';
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
import { countByWorkload, dedupeCounselors, mapFirestoreCounselor } from '../components/Counselors/counselorsUtils';
import { syncLinkedUserAvatar } from '../utils/avatarUtils';
import { assertUserHasRole } from '../utils/roleAuth';

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
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [reactivatingUserId, setReactivatingUserId] = useState<string | null>(null);
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
  const [pendingProfileRequired, setPendingProfileRequired] = useState(false);

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

  const requireAdminAccess = useCallback(async () => {
    if (!currentUser?.id) {
      throw new Error(t.auth.notAuthenticated);
    }
    await assertUserHasRole(currentUser.id, ['leader', 'admin']);
  }, [currentUser?.id]);

  useEffect(() => {
    setActiveTab(parseAdminTabFromUrl(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('create') !== 'true') return;
    if (parseAdminTabFromUrl(searchParams.get('tab')) !== 2) return;

    setEditingCase(null);
    setCaseFormOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete('create');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

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

  const loadCounselors = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    try {
      if (!silent) {
        setCounselorsLoading(true);
      }
      setCounselorsError('');

      const counselorsSnapshot = await getDocs(
        query(collection(db, 'counselors'), orderBy('createdAt', 'desc'))
      );
      const casesSnapshot = await getDocs(
        query(collection(db, 'cases'), orderBy('createdAt', 'desc'))
      );

      const casesData: Case[] = [];
      casesSnapshot.forEach((caseDoc) => {
        casesData.push(mapFirestoreCase(caseDoc.id, caseDoc.data()));
      });

      const counselorsData: Counselor[] = [];
      counselorsSnapshot.forEach((counselorDoc) => {
        counselorsData.push(
          mapFirestoreCounselor(counselorDoc.id, counselorDoc.data(), {
            activeCases: 0,
            workloadLevel: 'low',
          })
        );
      });

      setCounselorCases(casesData);
      setCounselors(enrichCounselorsList(dedupeCounselors(counselorsData), casesData));
    } catch (error) {
      console.error('Error loading counselors:', error);
      setCounselorsError(t.counselors.loadError);
    } finally {
      if (!silent) {
        setCounselorsLoading(false);
      }
    }
  }, []);

  const loadCases = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    try {
      if (!silent) {
        setCasesLoading(true);
      }
      setCasesError('');

      const casesSnapshot = await getDocs(
        query(collection(db, 'cases'), orderBy('createdAt', 'desc'))
      );

      const casesData: Case[] = [];
      casesSnapshot.forEach((caseDoc) => {
        casesData.push(mapFirestoreCase(caseDoc.id, caseDoc.data()));
      });

      setAllCases(casesData);
      await loadLatestNotes(casesData);
    } catch (error) {
      console.error('Error loading cases:', error);
      setCasesError('Eroare la încărcarea cazurilor');
    } finally {
      if (!silent) {
        setCasesLoading(false);
      }
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
        await requireAdminAccess();

        if (editingCounselor) {
          await updateDoc(doc(db, 'counselors', editingCounselor.id), {
            fullName: counselorData.fullName,
            firstName: counselorData.firstName ?? null,
            lastName: counselorData.lastName ?? null,
            email: counselorData.email,
            phoneNumber: counselorData.phoneNumber,
            sex: counselorData.sex ?? null,
            birthDate: counselorData.birthDate ?? null,
            specialties: counselorData.specialties,
            specialtyCategories: counselorData.specialtyCategories ?? null,
            linkedUserId: counselorData.linkedUserId ?? null,
            avatarUrl: counselorData.avatarUrl ?? null,
            updatedAt: new Date(),
          });
          await syncLinkedUserAvatar(counselorData.linkedUserId, counselorData.avatarUrl);
          showSnackbar('Consilier actualizat cu succes', 'success');
        } else {
          await addDoc(collection(db, 'counselors'), {
            fullName: counselorData.fullName,
            firstName: counselorData.firstName ?? null,
            lastName: counselorData.lastName ?? null,
            email: counselorData.email,
            phoneNumber: counselorData.phoneNumber,
            sex: counselorData.sex ?? null,
            birthDate: counselorData.birthDate ?? null,
            specialties: counselorData.specialties,
            specialtyCategories: counselorData.specialtyCategories ?? null,
            linkedUserId: counselorData.linkedUserId ?? null,
            avatarUrl: counselorData.avatarUrl ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await syncLinkedUserAvatar(counselorData.linkedUserId, counselorData.avatarUrl);
          showSnackbar('Consilier creat cu succes', 'success');
        }
        setCounselorFormOpen(false);
        setEditingCounselor(null);
        setNewlyCreatedUserId(null);
        setPendingProfileRequired(false);
        await loadCounselors({ silent: true });
      } catch (error) {
        console.error('Error saving counselor:', error);
        const message =
          error instanceof Error && error.message === t.auth.permissionDenied
            ? error.message
            : t.counselors.saveError;
        showSnackbar(message, 'error');
      }
    },
    [editingCounselor, loadCounselors, requireAdminAccess, showSnackbar]
  );

  const handleDeleteCounselor = useCallback(
    async (counselorId: string) => {
      try {
        await requireAdminAccess();

        await deleteDoc(doc(db, 'counselors', counselorId));
        showSnackbar('Consilier șters cu succes', 'success');
        await loadCounselors({ silent: true });
      } catch (error) {
        console.error('Error deleting counselor:', error);
        const message =
          error instanceof Error && error.message === t.auth.permissionDenied
            ? error.message
            : t.counselors.deleteError;
        showSnackbar(message, 'error');
      }
    },
    [loadCounselors, requireAdminAccess, showSnackbar]
  );

  const handleCaseSubmit = useCallback(
    async (caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      try {
        await requireAdminAccess();

        const firestorePayload = {
          ...caseData,
          assignedCounselorId: caseData.assignedCounselorId ?? null,
          assignedCounselorName: caseData.assignedCounselorName ?? null,
          proposedCounselorId: caseData.proposedCounselorId ?? null,
          proposedCounselorName: caseData.proposedCounselorName ?? null,
          assignmentStatus: caseData.assignmentStatus ?? 'none',
          proposedByUserId:
            caseData.assignmentStatus === 'pending' && currentUser
              ? currentUser.id
              : null,
          proposedByUserName:
            caseData.assignmentStatus === 'pending' && currentUser
              ? currentUser.fullName || currentUser.email || null
              : null,
          referralSource: caseData.referralSource ?? null,
          priority: caseData.priority ?? 'normal',
          firstName: caseData.firstName ?? null,
          lastName: caseData.lastName ?? null,
          counseledName: caseData.counseledName,
          updatedAt: new Date(),
        };

        const notifyCounselor = async (
          caseId: string,
          caseTitle: string,
          counselorId: string | undefined,
          mode: 'proposed' | 'assigned'
        ) => {
          if (!counselorId || !currentUser) return;
          const counselor = counselors.find((c) => c.id === counselorId);
          const assignedToUserId = counselor?.linkedUserId || counselorId;
          const assignedToUserName = counselor?.fullName || 'Unknown Counselor';
          const byId = currentUser.id;
          const byName = currentUser.fullName || currentUser.email || 'Unknown User';
          if (mode === 'proposed') {
            await logCaseProposed(
              caseId,
              caseTitle,
              assignedToUserId,
              assignedToUserName,
              byId,
              byName
            );
          } else {
            await logCaseAssigned(
              caseId,
              caseTitle,
              assignedToUserId,
              assignedToUserName,
              byId,
              byName
            );
          }
        };

        if (editingCase) {
          const wasPending = editingCase.assignmentStatus === 'pending';
          const nowPending = caseData.assignmentStatus === 'pending';
          const nowForcedOrAssigned =
            caseData.assignmentStatus === 'forced' ||
            (caseData.assignmentStatus === 'accepted' && caseData.assignedCounselorId);
          const proposalChanged =
            nowPending &&
            caseData.proposedCounselorId &&
            caseData.proposedCounselorId !== editingCase.proposedCounselorId;
          const forceChanged =
            Boolean(caseData.assignedCounselorId) &&
            caseData.assignedCounselorId !== editingCase.assignedCounselorId &&
            (caseData.assignmentStatus === 'forced' ||
              (!wasPending && Boolean(caseData.assignedCounselorId)));

          await updateDoc(doc(db, 'cases', editingCase.id), firestorePayload);

          if (proposalChanged) {
            await notifyCounselor(
              editingCase.id,
              editingCase.title,
              caseData.proposedCounselorId || undefined,
              'proposed'
            );
          } else if (
            forceChanged ||
            (nowForcedOrAssigned &&
              caseData.assignedCounselorId &&
              caseData.assignedCounselorId !== editingCase.assignedCounselorId)
          ) {
            await notifyCounselor(
              editingCase.id,
              editingCase.title,
              caseData.assignedCounselorId,
              'assigned'
            );
          }

          showSnackbar(t.cases.updateSuccess, 'success');
        } else {
          const docRef = await addDoc(collection(db, 'cases'), {
            ...firestorePayload,
            createdBy: currentUser?.id || '',
            createdAt: new Date(),
          });

          if (currentUser) {
            await logCaseCreated(
              docRef.id,
              caseData.title,
              currentUser.id,
              currentUser.fullName || currentUser.email || 'Utilizator'
            );
          }

          if (caseData.assignmentStatus === 'pending' && caseData.proposedCounselorId) {
            await notifyCounselor(
              docRef.id,
              caseData.title,
              caseData.proposedCounselorId,
              'proposed'
            );
          } else if (caseData.assignedCounselorId) {
            await notifyCounselor(
              docRef.id,
              caseData.title,
              caseData.assignedCounselorId,
              'assigned'
            );
          }
          showSnackbar('Caz creat cu succes', 'success');
        }
        setCaseFormOpen(false);
        setEditingCase(null);
        await loadCases({ silent: true });
        await loadCounselors({ silent: true });
        await refetchDashboard();
      } catch (error) {
        console.error('Error saving case:', error);
        const message =
          error instanceof Error && error.message === t.auth.permissionDenied
            ? error.message
            : t.cases.updateError;
        showSnackbar(message, 'error');
      }
    },
    [
      editingCase,
      counselors,
      currentUser,
      loadCases,
      loadCounselors,
      requireAdminAccess,
      showSnackbar,
      refetchDashboard,
    ]
  );

  const handleDeleteCase = useCallback(
    async (caseId: string) => {
      try {
        await requireAdminAccess();

        await deleteDoc(doc(db, 'cases', caseId));
        showSnackbar('Caz șters cu succes', 'success');
        await loadCases({ silent: true });
        await refetchDashboard();
      } catch (error) {
        console.error('Error deleting case:', error);
        const message =
          error instanceof Error && error.message === t.auth.permissionDenied
            ? error.message
            : 'Eroare la ștergerea cazului';
        showSnackbar(message, 'error');
      }
    },
    [loadCases, requireAdminAccess, showSnackbar, refetchDashboard]
  );

  const handleCreateUser = useCallback(async () => {
    try {
      setCreateUserLoading(true);
      const createdRole = createUserData.role;
      const newUserId = await createUser(
        createUserData.email,
        createUserData.password,
        createUserData.fullName,
        createdRole
      );
      showSnackbar(t.admin.users.createUserSuccess, 'success');
      setCreateDialogOpen(false);
      setNewlyCreatedUserId(newUserId);
      setPendingProfileRequired(createdRole === 'counselor');
      setCreateUserData({ email: '', password: '', fullName: '', role: 'counselor' });
      setEditingCounselor(null);
      setTab(1);
      setCounselorFormOpen(true);
      loadUsers();
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error('Error creating user:', error);
      if (err.code === 'auth/email-already-in-use') {
        showSnackbar(t.admin.users.createUserError, 'error');
      } else {
        showSnackbar(err.message ?? t.admin.users.createUserError, 'error');
      }
    } finally {
      setCreateUserLoading(false);
    }
  }, [createUser, createUserData, loadUsers, showSnackbar, setTab]);

  const handleEditUser = useCallback(async () => {
    if (!selectedUser) return;
    try {
      setEditUserLoading(true);
      await updateUserRole(selectedUser.id, editUserData.role as UserRole);
      showSnackbar(t.admin.users.updateUserSuccess, 'success');
      setEditDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showSnackbar(t.admin.users.updateUserError, 'error');
    } finally {
      setEditUserLoading(false);
    }
  }, [selectedUser, editUserData.role, updateUserRole, loadUsers, showSnackbar]);

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      try {
        await deleteUser(userId);
        showSnackbar(t.admin.users.deleteUserSuccess, 'success');
        loadUsers();
        loadCounselors({ silent: true });
        loadCases({ silent: true });
      } catch (error) {
        console.error('Error deleting user:', error);
        showSnackbar(t.admin.users.deleteUserError, 'error');
      }
    },
    [deleteUser, loadUsers, loadCounselors, loadCases, showSnackbar]
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
        setReactivatingUserId(userId);
        await reactivateUser(userId);
        showSnackbar(t.admin.users.reactivateUserSuccess, 'success');
        loadUsers();
      } catch (error) {
        console.error('Error reactivating user:', error);
        showSnackbar(t.admin.users.reactivateUserError, 'error');
      } finally {
        setReactivatingUserId(null);
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

  const handleSkipCounselorProfile = useCallback(() => {
    if (pendingProfileRequired) return;
    setCounselorFormOpen(false);
    setNewlyCreatedUserId(null);
    setPendingProfileRequired(false);
    setEditingCounselor(null);
  }, [pendingProfileRequired]);

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
    createUserLoading,
    editUserLoading,
    reactivatingUserId,
    editDialogOpen,
    setEditDialogOpen,
    selectedUser,
    createUserData,
    setCreateUserData,
    editUserData,
    setEditUserData,
    newlyCreatedUserId,
    pendingProfileRequired,
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
    handleSkipCounselorProfile,
    handleCloseCounselorForm: () => {
      if (pendingProfileRequired && newlyCreatedUserId) return;
      setCounselorFormOpen(false);
      setEditingCounselor(null);
      setNewlyCreatedUserId(null);
      setPendingProfileRequired(false);
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
