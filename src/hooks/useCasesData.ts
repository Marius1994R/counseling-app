import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { db } from '../firebase';
import { Case, CaseStatus, IssueType } from '../types';
import { logCaseStatusChange } from '../utils/activityLogger';
import { t } from '../utils/translations';
import { getStatusFilterFromUrl, mapFirestoreCase, isCaseVisibleToCounselor } from '../components/Cases/casesUtils';

const COMMON_ISSUE_TYPES: IssueType[] = ['spiritual', 'relational', 'personal'];

export function useCasesData() {
  const { currentUser } = useAuth();
  const { refetch: refetchDashboard } = useDashboardDataContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>(() =>
    getStatusFilterFromUrl(searchParams)
  );

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [editData, setEditData] = useState({
    issueTypes: [] as IssueType[],
    status: 'active' as CaseStatus,
    description: '',
  });

  const [meetingNotesOpen, setMeetingNotesOpen] = useState(false);
  const [sessionReportOpen, setSessionReportOpen] = useState(false);
  const [selectedCaseForNotes, setSelectedCaseForNotes] = useState<Case | null>(null);
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({});
  const [caseReportsCount, setCaseReportsCount] = useState<Record<string, number>>({});
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [selectedCaseForDescription, setSelectedCaseForDescription] = useState<Case | null>(null);

  const caseIdFilter = searchParams.get('caseId');

  const loadLatestNotes = useCallback(async (casesToLoad: Case[]) => {
    try {
      const notesPromises = casesToLoad.map(async (caseItem) => {
        const notesRef = collection(db, 'meetingNotes');
        const notesQuery = query(notesRef, where('caseId', '==', caseItem.id));
        const notesSnapshot = await getDocs(notesQuery);

        if (!notesSnapshot.empty) {
          const notesData = notesSnapshot.docs.map((noteDoc) => {
            const data = noteDoc.data();
            return {
              id: noteDoc.id,
              content: data.content,
              createdAt: data.createdAt.toDate(),
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
    } catch (err) {
      console.error('Error loading latest notes:', err);
    }
  }, []);

  const loadSessionReportsCount = useCallback(async (casesToLoad: Case[]) => {
    try {
      const reportsPromises = casesToLoad.map(async (caseItem) => {
        const reportsRef = collection(db, 'sessionReports');
        const reportsQuery = query(reportsRef, where('caseId', '==', caseItem.id));
        const reportsSnapshot = await getDocs(reportsQuery);
        return { caseId: caseItem.id, count: reportsSnapshot.size };
      });

      const reportsResults = await Promise.all(reportsPromises);
      const reportsMap: Record<string, number> = {};
      reportsResults.forEach(({ caseId, count }) => {
        reportsMap[caseId] = count;
      });
      setCaseReportsCount(reportsMap);
    } catch (err) {
      console.error('Error loading session reports count:', err);
    }
  }, []);

  const refetch = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);

      let counselorId: string | null = null;
      const counselorsRef = collection(db, 'counselors');
      const counselorsQuery = query(counselorsRef, where('linkedUserId', '==', currentUser.id));
      const counselorsSnapshot = await getDocs(counselorsQuery);

      if (!counselorsSnapshot.empty) {
        counselorId = counselorsSnapshot.docs[0].id;
      }

      const casesRef = collection(db, 'cases');
      const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
      const casesSnapshot = await getDocs(casesQuery);

      const casesData: Case[] = [];
      casesSnapshot.forEach((caseDoc) => {
        const caseItem = mapFirestoreCase(caseDoc.id, caseDoc.data());
        if (isCaseVisibleToCounselor(caseItem, counselorId, currentUser.id)) {
          casesData.push(caseItem);
        }
      });

      setCases(casesData);
      setFilteredCases(casesData);
      await loadLatestNotes(casesData);
      await loadSessionReportsCount(casesData);
    } catch (err) {
      console.error('Error loading cases:', err);
      setError('Error loading cases');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, loadLatestNotes, loadSessionReportsCount]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleStatusFilterChange = useCallback(
    (status: CaseStatus | 'all') => {
      setStatusFilter(status);
      setSearchParams({ status }, { replace: true });
    },
    [setSearchParams]
  );

  const clearCaseIdFilter = useCallback(() => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('caseId');
    nextParams.delete('openNotes');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setStatusFilter(getStatusFilterFromUrl(searchParams));
  }, [searchParams]);

  useEffect(() => {
    let filtered = cases;

    if (caseIdFilter) {
      filtered = filtered.filter((caseItem) => caseItem.id === caseIdFilter);
    } else {
      if (searchTerm) {
        filtered = filtered.filter(
          (caseItem) =>
            caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            caseItem.counseledName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            caseItem.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter((caseItem) => caseItem.status === statusFilter);
      }
    }

    setFilteredCases(filtered);
  }, [cases, searchTerm, statusFilter, caseIdFilter]);

  useEffect(() => {
    if (loading || searchParams.get('openNotes') !== 'true') return;

    const targetId = searchParams.get('caseId');
    if (!targetId) return;

    const caseItem = cases.find((c) => c.id === targetId);
    if (caseItem) {
      setSelectedCaseForNotes(caseItem);
      setMeetingNotesOpen(true);
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('openNotes');
    setSearchParams(nextParams, { replace: true });
  }, [loading, cases, searchParams, setSearchParams]);

  const handleEditCase = useCallback((caseItem: Case) => {
    setSelectedCase(caseItem);
    setEditData({
      issueTypes: [...caseItem.issueTypes],
      status: caseItem.status,
      description: caseItem.description,
    });
    setEditDialogOpen(true);
  }, []);

  const handleSaveCase = useCallback(async () => {
    if (!selectedCase || saveLoading) return;

    try {
      setSaveLoading(true);
      const oldStatus = selectedCase.status;
      const newStatus = editData.status;

      const caseRef = doc(db, 'cases', selectedCase.id);
      await updateDoc(caseRef, {
        issueTypes: editData.issueTypes,
        status: editData.status,
        description: editData.description,
        updatedAt: new Date(),
      });

      if (oldStatus !== newStatus && currentUser) {
        await logCaseStatusChange(
          selectedCase.id,
          selectedCase.title,
          oldStatus,
          newStatus,
          currentUser.id,
          currentUser.fullName || currentUser.email || 'Unknown User'
        );
      }

      setCases((prevCases) =>
        prevCases.map((caseItem) =>
          caseItem.id === selectedCase.id
            ? { ...caseItem, ...editData, updatedAt: new Date() }
            : caseItem
        )
      );

      setEditDialogOpen(false);
      await refetchDashboard();
      setSnackbar({
        open: true,
        message: t.cases.updateSuccess || 'Caz actualizat cu succes',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error updating case:', err);
      setSnackbar({
        open: true,
        message: t.cases.updateError || 'Eroare la actualizarea cazului',
        severity: 'error',
      });
    } finally {
      setSaveLoading(false);
    }
  }, [selectedCase, editData, currentUser, refetchDashboard, saveLoading]);

  const handleCloseEditDialog = useCallback(() => {
    if (saveLoading) return;
    setEditDialogOpen(false);
    setSelectedCase(null);
    setEditData({
      issueTypes: [],
      status: 'active',
      description: '',
    });
  }, [saveLoading]);

  const handleOpenMeetingNotes = useCallback((caseItem: Case) => {
    setSelectedCaseForNotes(caseItem);
    setMeetingNotesOpen(true);
  }, []);

  const handleOpenSessionReport = useCallback((caseItem: Case) => {
    setSelectedCaseForNotes(caseItem);
    setSessionReportOpen(true);
  }, []);

  const handleNoteAdded = useCallback(async () => {
    if (cases.length > 0) {
      await loadLatestNotes(cases);
      await loadSessionReportsCount(cases);
    }
  }, [cases, loadLatestNotes, loadSessionReportsCount]);

  const handleCloseMeetingNotes = useCallback(() => {
    setMeetingNotesOpen(false);
    setSelectedCaseForNotes(null);
  }, []);

  const handleCloseSessionReport = useCallback(() => {
    setSessionReportOpen(false);
    setSelectedCaseForNotes(null);
  }, []);

  const handleOpenDescription = useCallback((caseItem: Case) => {
    setSelectedCaseForDescription(caseItem);
    setDescriptionModalOpen(true);
  }, []);

  const handleIssueTypeToggle = useCallback((issueType: IssueType) => {
    setEditData((prev) => {
      const isSelected = prev.issueTypes.includes(issueType);
      return {
        ...prev,
        issueTypes: isSelected
          ? prev.issueTypes.filter((type) => type !== issueType)
          : [...prev.issueTypes, issueType],
      };
    });
  }, []);

  const activeCasesCount = cases.filter((c) => c.status === 'active').length;
  const waitingCasesCount = cases.filter((c) => c.status === 'waiting').length;

  return {
    cases,
    filteredCases,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    caseIdFilter,
    caseNotes,
    caseReportsCount,
    activeCasesCount,
    waitingCasesCount,
    editDialogOpen,
    saveLoading,
    selectedCase,
    editData,
    setEditData,
    meetingNotesOpen,
    sessionReportOpen,
    selectedCaseForNotes,
    descriptionModalOpen,
    setDescriptionModalOpen,
    selectedCaseForDescription,
    snackbar,
    setSnackbar,
    commonIssueTypes: COMMON_ISSUE_TYPES,
    handleStatusFilterChange,
    clearCaseIdFilter,
    handleEditCase,
    handleSaveCase,
    handleCloseEditDialog,
    handleOpenMeetingNotes,
    handleOpenSessionReport,
    handleNoteAdded,
    handleCloseMeetingNotes,
    handleCloseSessionReport,
    handleOpenDescription,
    handleIssueTypeToggle,
    refetch,
  };
}
