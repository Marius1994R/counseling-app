import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { db } from '../firebase';
import { Case, CaseStatus, IssueType } from '../types';
import { logCaseStatusChange } from '../utils/activityLogger';
import { t } from '../utils/translations';
import { getStatusFilterFromUrl } from '../components/Cases/casesUtils';
import { loadLatestNotesByCaseIds } from '../components/Cases/meetingNotesUtils';

const COMMON_ISSUE_TYPES: IssueType[] = ['spiritual', 'relational', 'personal'];

export function useCasesData() {
  const { currentUser } = useAuth();
  const {
    cases: cachedCases,
    sessionReportCounts,
    loading: dashboardLoading,
    upsertCase,
    incrementSessionReportCount,
  } = useDashboardDataContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState('');
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
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [selectedCaseForDescription, setSelectedCaseForDescription] = useState<Case | null>(null);

  const caseIdFilter = searchParams.get('caseId');
  const caseIdsFilter = useMemo(
    () =>
      searchParams
        .get('caseIds')
        ?.split(',')
        .map((id) => id.trim())
        .filter(Boolean) ?? [],
    [searchParams]
  );
  const focusFilter = searchParams.get('focus');

  // Reuse dashboard cache — no second full cases scan
  useEffect(() => {
    if (dashboardLoading) {
      setLoading(true);
      return;
    }
    setCases(cachedCases);
    setFilteredCases(cachedCases);
    setLoading(false);

    const ids = cachedCases.map((c) => c.id);
    void loadLatestNotesByCaseIds(ids)
      .then(setCaseNotes)
      .catch((err) => console.error('Error loading latest notes:', err));
  }, [dashboardLoading, cachedCases]);

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
    nextParams.delete('caseIds');
    nextParams.delete('focus');
    nextParams.delete('openNotes');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setStatusFilter(getStatusFilterFromUrl(searchParams));
  }, [searchParams]);

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

  useEffect(() => {
    let filtered = cases;

    if (caseIdFilter) {
      filtered = filtered.filter((caseItem) => caseItem.id === caseIdFilter);
    } else if (caseIdsFilter.length > 0) {
      const idSet = new Set(caseIdsFilter);
      filtered = filtered.filter((caseItem) => idSet.has(caseItem.id));
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
  }, [cases, searchTerm, statusFilter, caseIdFilter, caseIdsFilter]);

  const focusFilterLabel =
    focusFilter === 'reportsNeeded'
      ? 'Rapoarte necesare'
      : focusFilter === 'consentMissing'
        ? 'Fără consimțământ'
        : focusFilter === 'frequencyOverdue'
          ? 'Frecvență depășită'
          : null;

  const handleEditCase = useCallback((caseItem: Case) => {
    setSelectedCase(caseItem);
    setEditData({
      issueTypes: caseItem.issueTypes || [],
      status: caseItem.status,
      description: caseItem.description || '',
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

      const updated: Case = {
        ...selectedCase,
        ...editData,
        updatedAt: new Date(),
      };

      setCases((prevCases) =>
        prevCases.map((caseItem) => (caseItem.id === selectedCase.id ? updated : caseItem))
      );

      upsertCase(updated);

      setEditDialogOpen(false);
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
  }, [selectedCase, editData, currentUser, upsertCase, saveLoading]);

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
    if (cases.length === 0) return;
    try {
      const notes = await loadLatestNotesByCaseIds(cases.map((c) => c.id));
      setCaseNotes(notes);
    } catch (err) {
      console.error('Error refreshing notes:', err);
    }
  }, [cases]);

  const handleSessionReportSaved = useCallback(async () => {
    if (selectedCaseForNotes?.id) {
      incrementSessionReportCount(selectedCaseForNotes.id);
    }
    await handleNoteAdded();
    setSessionReportOpen(false);
    setSelectedCaseForNotes(null);
  }, [selectedCaseForNotes, incrementSessionReportCount, handleNoteAdded]);

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
      const exists = prev.issueTypes.includes(issueType);
      return {
        ...prev,
        issueTypes: exists
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
    caseIdsFilter,
    focusFilterLabel,
    caseNotes,
    caseReportsCount: sessionReportCounts,
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
    handleSessionReportSaved,
    handleCloseMeetingNotes,
    handleCloseSessionReport,
    handleOpenDescription,
    handleIssueTypeToggle,
  };
}
