import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardDataContext } from '../contexts/DashboardDataContext';
import { db } from '../firebase';
import { Case, CaseStatus } from '../types';
import { TimeRangeFilter } from '../utils/timeRange';
import {
  buildCaseListSummaries,
  buildCaseSummaries,
  computeSessionReportMetrics,
  filterCaseSummaries,
  findCaseReportSummary,
  parseSessionReportDoc,
  SessionReportRecord,
  shouldUseAllTimeForDeepLink,
} from '../components/SessionReports/sessionReportsUtils';
import { t } from '../utils/translations';

export interface CounselorOption {
  userId: string;
  name: string;
}

const VALID_TIME_RANGES: TimeRangeFilter[] = ['3months', '6months', '9months', 'alltime'];

function parseTimeRangeFromParams(params: URLSearchParams): TimeRangeFilter {
  const value = params.get('timeRange');
  return value && VALID_TIME_RANGES.includes(value as TimeRangeFilter)
    ? (value as TimeRangeFilter)
    : '3months';
}

export function useSessionReportsData() {
  const { currentUser } = useAuth();
  const { cases: cachedCases, loading: dashboardLoading } = useDashboardDataContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allCases, setAllCases] = useState<Case[]>([]);
  const [allSummaries, setAllSummaries] = useState<ReturnType<typeof buildCaseSummaries>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [counselorFilter, setCounselorFilter] = useState('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>(() =>
    parseTimeRangeFromParams(searchParams)
  );
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('active');

  const selectedCaseId = searchParams.get('caseId');
  const deepLinkProcessedRef = useRef<string | null>(null);
  const prevCaseIdRef = useRef<string | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser?.id || dashboardLoading) return;

    try {
      setLoading(true);
      setError(null);

      const visibleCases = cachedCases;
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
  }, [currentUser?.id, currentUser?.role, cachedCases, dashboardLoading]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const urlTimeRange = searchParams.get('timeRange');
    const caseIdChanged = selectedCaseId !== prevCaseIdRef.current;
    prevCaseIdRef.current = selectedCaseId;

    if (urlTimeRange && VALID_TIME_RANGES.includes(urlTimeRange as TimeRangeFilter)) {
      setTimeRangeFilter(urlTimeRange as TimeRangeFilter);
      return;
    }

    if (caseIdChanged && selectedCaseId) {
      setTimeRangeFilter('3months');
      deepLinkProcessedRef.current = null;
    }
  }, [searchParams, selectedCaseId]);

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

  const caseListSummaries = useMemo(
    () => buildCaseListSummaries(filteredSummaries, selectedCaseId, allSummaries, allCases),
    [filteredSummaries, selectedCaseId, allSummaries, allCases]
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
    if (selectedCaseId) {
      return findCaseReportSummary(selectedCaseId, allSummaries, allCases);
    }
    if (filteredSummaries.length === 0) return null;
    return filteredSummaries[0];
  }, [selectedCaseId, allSummaries, allCases, filteredSummaries]);

  useEffect(() => {
    if (loading || !selectedCaseId) return;
    if (deepLinkProcessedRef.current === selectedCaseId) return;

    const targetSummary = allSummaries.find((s) => s.case.id === selectedCaseId);
    if (
      targetSummary &&
      shouldUseAllTimeForDeepLink(targetSummary.lastReportDate) &&
      timeRangeFilter !== 'alltime'
    ) {
      setTimeRangeFilter('alltime');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('caseId', selectedCaseId);
      nextParams.set('timeRange', 'alltime');
      setSearchParams(nextParams, { replace: true });
    }

    deepLinkProcessedRef.current = selectedCaseId;
  }, [loading, selectedCaseId, allSummaries, timeRangeFilter, searchParams, setSearchParams]);

  const selectCase = useCallback(
    (caseId: string) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('caseId', caseId);
      setSearchParams(nextParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return {
    currentUser,
    allCases,
    filteredSummaries: caseListSummaries,
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
