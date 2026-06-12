import { Case, CaseStatus } from '../../types';
import { getCutoffDate, TimeRangeFilter } from '../Activity/activityUtils';

export interface SessionReportRecord {
  id: string;
  caseId: string;
  sessionNumber: number;
  mainTheme: string;
  personResponse: string;
  previousTaskCompleted: 'yes' | 'no' | 'partial';
  previousTaskNotCompletedReason?: string;
  progressNoted: string;
  nextCommitments: 'yes' | 'no';
  nextCommitmentsDetails?: string;
  noCommitmentsReason?: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
}

export interface CaseReportSummary {
  case: Case;
  reportCount: number;
  lastReportDate: Date | null;
  reports: SessionReportRecord[];
}

export function parseSessionReportDoc(
  id: string,
  data: Record<string, unknown>
): SessionReportRecord {
  const createdAt = data.createdAt as { toDate: () => Date };
  return {
    id,
    caseId: data.caseId as string,
    sessionNumber: (data.sessionNumber as number) || 1,
    mainTheme: data.mainTheme as string,
    personResponse: data.personResponse as string,
    previousTaskCompleted: data.previousTaskCompleted as 'yes' | 'no' | 'partial',
    previousTaskNotCompletedReason: (data.previousTaskNotCompletedReason as string) || '',
    progressNoted: data.progressNoted as string,
    nextCommitments: data.nextCommitments as 'yes' | 'no',
    nextCommitmentsDetails: data.nextCommitmentsDetails as string | undefined,
    noCommitmentsReason: data.noCommitmentsReason as string | undefined,
    createdAt: createdAt.toDate(),
    createdBy: data.createdBy as string,
    createdByName: data.createdByName as string,
  };
}

export function buildCaseSummaries(
  cases: Case[],
  reportsByCaseId: Map<string, SessionReportRecord[]>
): CaseReportSummary[] {
  return cases
    .map((caseItem) => {
      const reports = [...(reportsByCaseId.get(caseItem.id) ?? [])].sort(
        (a, b) => b.sessionNumber - a.sessionNumber
      );
      const lastReportDate = reports.length > 0 ? reports[0].createdAt : null;
      return {
        case: caseItem,
        reportCount: reports.length,
        lastReportDate,
        reports,
      };
    })
    .filter((summary) => summary.reportCount > 0)
    .sort((a, b) => {
      const aTime = a.lastReportDate?.getTime() ?? 0;
      const bTime = b.lastReportDate?.getTime() ?? 0;
      return bTime - aTime;
    });
}

export interface SessionReportsFilterState {
  searchTerm: string;
  counselorFilter: string;
  timeRangeFilter: TimeRangeFilter;
  statusFilter: CaseStatus | 'all';
}

export function shouldUseAllTimeForDeepLink(lastReportDate: Date | null): boolean {
  if (!lastReportDate) return false;
  return lastReportDate < getCutoffDate('3months');
}

export function createEmptyCaseSummary(caseItem: Case): CaseReportSummary {
  return {
    case: caseItem,
    reportCount: 0,
    lastReportDate: null,
    reports: [],
  };
}

export function findCaseReportSummary(
  caseId: string,
  allSummaries: CaseReportSummary[],
  allCases: Case[]
): CaseReportSummary | null {
  const existing = allSummaries.find((s) => s.case.id === caseId);
  if (existing) return existing;

  const caseItem = allCases.find((c) => c.id === caseId);
  return caseItem ? createEmptyCaseSummary(caseItem) : null;
}

/** Pin a deep-linked case at the top when it would otherwise be hidden by filters. */
export function buildCaseListSummaries(
  filteredSummaries: CaseReportSummary[],
  selectedCaseId: string | null,
  allSummaries: CaseReportSummary[],
  allCases: Case[]
): CaseReportSummary[] {
  if (!selectedCaseId) return filteredSummaries;
  if (filteredSummaries.some((s) => s.case.id === selectedCaseId)) {
    return filteredSummaries;
  }

  const pinned = findCaseReportSummary(selectedCaseId, allSummaries, allCases);
  return pinned ? [pinned, ...filteredSummaries] : filteredSummaries;
}

export function filterCaseSummaries(
  summaries: CaseReportSummary[],
  filters: SessionReportsFilterState
): CaseReportSummary[] {
  const term = filters.searchTerm.trim().toLowerCase();
  const cutoff = getCutoffDate(filters.timeRangeFilter);

  return summaries.filter((summary) => {
    const { case: caseItem, reports, lastReportDate } = summary;

    if (filters.statusFilter !== 'all' && caseItem.status !== filters.statusFilter) {
      return false;
    }

    if (lastReportDate && lastReportDate < cutoff) {
      return false;
    }

    if (filters.counselorFilter !== 'all') {
      const hasCounselorReport = reports.some((r) => r.createdBy === filters.counselorFilter);
      if (!hasCounselorReport) {
        return false;
      }
    }

    if (!term) return true;

    const matchesCase =
      caseItem.title.toLowerCase().includes(term) ||
      caseItem.counseledName.toLowerCase().includes(term) ||
      (caseItem.assignedCounselorName?.toLowerCase().includes(term) ?? false);

    const matchesReport = reports.some(
      (r) =>
        r.mainTheme.toLowerCase().includes(term) ||
        r.createdByName.toLowerCase().includes(term) ||
        r.personResponse.toLowerCase().includes(term)
    );

    return matchesCase || matchesReport;
  });
}

export function computeSessionReportMetrics(summaries: CaseReportSummary[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let totalReports = 0;
  let reportsThisMonth = 0;

  summaries.forEach((summary) => {
    totalReports += summary.reportCount;
    summary.reports.forEach((report) => {
      if (report.createdAt >= monthStart) {
        reportsThisMonth += 1;
      }
    });
  });

  return {
    totalReports,
    casesWithReports: summaries.length,
    reportsThisMonth,
  };
}

export function formatReportDate(date: Date): string {
  return date.toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getTaskCompletedLabel(value: 'yes' | 'no' | 'partial'): string {
  if (value === 'yes') return 'Da';
  if (value === 'partial') return 'Parțial';
  return 'Nu';
}
