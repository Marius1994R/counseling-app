import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Case, CaseStatus } from '../types';
import { loadVisibleCasesForUser } from '../components/Cases/casesUtils';
import { TimeRangeFilter } from '../components/Activity/activityUtils';
import {
  buildCaseSummaries,
  computeSessionReportMetrics,
  filterCaseSummaries,
  parseSessionReportDoc,
  SessionReportRecord,
} from '../components/SessionReports/sessionReportsUtils';
import { t } from '../utils/translations';

export interface CounselorOption {
  userId: string;
  name: string;
}

export function useSessionReportsData() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allCases, setAllCases] = useState<Case[]>([]);
  const [allSummaries, setAllSummaries] = useState<ReturnType<typeof buildCaseSummaries>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [counselorFilter, setCounselorFilter] = useState('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>('3months');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');

  const selectedCaseId = searchParams.get('caseId');

  const loadData = useCallback(async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      setError(null);

      const visibleCases = await loadVisibleCasesForUser(currentUser.id);
      const visibleCaseIds = new Set(visibleCases.map((c) => c.id));

      const reportsRef = collection(db, 'sessionReports');
      const reportsSnapshot = await getDocs(reportsRef);

      const reportsByCaseId = new Map<string, SessionReportRecord[]>();
      const isLeaderOrAdmin =
        currentUser.role === 'leader' || currentUser.role === 'admin';

      reportsSnapshot.forEach((docSnap) => {
        const report = parseSessionReportDoc(docSnap.id, docSnap.data());
        if (!visibleCaseIds.has(report.caseId)) return;

        if (isLeaderOrAdmin && report.createdBy !== currentUser.id) {
          return;
        }

        const existing = reportsByCaseId.get(report.caseId) ?? [];
        existing.push(report);
        reportsByCaseId.set(report.caseId, existing);
      });

      const summaries = buildCaseSummaries(visibleCases, reportsByCaseId);
      setAllCases(visibleCases);
      setAllSummaries(summaries);
    } catch (err) {
      console.error('Error loading session reports:', err);
      setError(t.sessionReports.loadError);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSummaries = useMemo(
    () =>
      filterCaseSummaries(allSummaries, {
        searchTerm,
        counselorFilter,
        timeRangeFilter,
        statusFilter,
      }),
    [allSummaries, searchTerm, counselorFilter, timeRangeFilter, statusFilter]
  );

  const metrics = useMemo(
    () => computeSessionReportMetrics(filteredSummaries),
    [filteredSummaries]
  );

  const counselorOptions = useMemo((): CounselorOption[] => {
    const map = new Map<string, string>();
    allSummaries.forEach((summary) => {
      summary.reports.forEach((report) => {
        if (!map.has(report.createdBy)) {
          map.set(report.createdBy, report.createdByName);
        }
      });
    });
    return Array.from(map.entries())
      .map(([userId, name]) => ({ userId, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ro'));
  }, [allSummaries]);

  const selectedSummary = useMemo(() => {
    if (filteredSummaries.length === 0) return null;
    if (selectedCaseId) {
      return filteredSummaries.find((s) => s.case.id === selectedCaseId) ?? filteredSummaries[0];
    }
    return filteredSummaries[0];
  }, [filteredSummaries, selectedCaseId]);

  useEffect(() => {
    if (!loading && filteredSummaries.length > 0 && selectedCaseId) {
      const exists = filteredSummaries.some((s) => s.case.id === selectedCaseId);
      if (!exists) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('caseId');
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [loading, filteredSummaries, selectedCaseId, searchParams, setSearchParams]);

  const selectCase = useCallback(
    (caseId: string) => {
      setSearchParams({ caseId }, { replace: true });
    },
    [setSearchParams]
  );

  return {
    currentUser,
    allCases,
    filteredSummaries,
    selectedSummary,
    selectedCaseId,
    loading,
    error,
    metrics,
    searchTerm,
    setSearchTerm,
    counselorFilter,
    setCounselorFilter,
    timeRangeFilter,
    setTimeRangeFilter,
    statusFilter,
    setStatusFilter,
    counselorOptions,
    showCounselorFilter: false,
    selectCase,
    refetch: loadData,
  };
}
