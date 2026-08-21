import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { db } from '../firebase';
import { Case, MeetingNote } from '../types';
import {
  buildCaseNoteSummaries,
  filterCaseNoteSummaries,
  listSessionRailFilters,
  parseMeetingNoteDoc,
  SessionRailFilter,
  CaseNoteSummary,
} from '../components/MeetingNotes/meetingNotesUtils';
import { t } from '../utils/translations';

export function useMeetingNotesData() {
  const { currentUser } = useAuth();
  const { cases: cachedCases, loading: dashboardLoading, sessionReportCounts } =
    useDashboardDataContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allSummaries, setAllSummaries] = useState<CaseNoteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'others'>('active');
  const [selectedSessionFilter, setSelectedSessionFilter] =
    useState<SessionRailFilter | null>(null);

  const selectedCaseId = searchParams.get('caseId');
  const prevCaseIdRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id || dashboardLoading) return;

    try {
      setLoading(true);
      setError(null);

      const visibleCases = cachedCases;
      const visibleCaseIds = new Set(visibleCases.map((c) => c.id));

      const notesSnap = await getDocs(collection(db, 'meetingNotes'));
      const notesByCaseId = new Map<string, MeetingNote[]>();

      notesSnap.forEach((docSnap) => {
        const note = parseMeetingNoteDoc(docSnap.id, docSnap.data());
        if (!visibleCaseIds.has(note.caseId)) return;
        const list = notesByCaseId.get(note.caseId) ?? [];
        list.push(note);
        notesByCaseId.set(note.caseId, list);
      });

      setAllSummaries(buildCaseNoteSummaries(visibleCases, notesByCaseId));
    } catch (err) {
      console.error('Error loading meeting notes page:', err);
      setError(t.meetingNotes.loadError);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, cachedCases, dashboardLoading]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredSummaries = useMemo(
    () => filterCaseNoteSummaries(allSummaries, searchTerm, statusFilter),
    [allSummaries, searchTerm, statusFilter]
  );

  const selectedSummary = useMemo(() => {
    if (!selectedCaseId) return null;
    return (
      filteredSummaries.find((s) => s.case.id === selectedCaseId) ??
      allSummaries.find((s) => s.case.id === selectedCaseId) ??
      null
    );
  }, [selectedCaseId, filteredSummaries, allSummaries]);

  const sessionRailFilters = useMemo(
    () => (selectedSummary ? listSessionRailFilters(selectedSummary.notes) : []),
    [selectedSummary]
  );

  useEffect(() => {
    const caseChanged = selectedCaseId !== prevCaseIdRef.current;
    prevCaseIdRef.current = selectedCaseId;

    if (!selectedSummary) {
      setSelectedSessionFilter(null);
      return;
    }

    const filters = listSessionRailFilters(selectedSummary.notes);
    if (filters.length === 0) {
      setSelectedSessionFilter(null);
      return;
    }

    setSelectedSessionFilter((current) => {
      if (!caseChanged && current != null && filters.includes(current)) {
        return current;
      }
      return filters[0];
    });
  }, [selectedCaseId, selectedSummary]);

  const selectCase = useCallback(
    (caseId: string) => {
      const next = new URLSearchParams(searchParams);
      next.set('caseId', caseId);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const reportCountForSelected = selectedSummary
    ? sessionReportCounts[selectedSummary.case.id] ?? 0
    : 0;

  return {
    loading,
    error,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    filteredSummaries,
    selectedCaseId,
    selectedSummary,
    selectCase,
    selectedSessionFilter,
    setSelectedSessionFilter,
    sessionRailFilters,
    reportCountForSelected,
    refetch: loadData,
    getReportCount: (caseItem: Case) => sessionReportCounts[caseItem.id] ?? 0,
  };
}
