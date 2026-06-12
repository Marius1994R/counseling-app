import { Case } from '../../types';
import {
  buildCaseSummaries,
  computeSessionReportMetrics,
  filterCaseSummaries,
  SessionReportRecord,
} from './sessionReportsUtils';

const mockCase = (id: string, title: string): Case => ({
  id,
  title,
  counseledName: 'Maria P.',
  age: 30,
  sex: 'feminin',
  civilStatus: 'married',
  issueTypes: ['spiritual'],
  phoneNumber: '+40123456789',
  description: 'Test',
  status: 'active',
  assignedCounselorId: 'counselor-1',
  assignedCounselorName: 'Ion Popescu',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-06-01'),
  createdBy: 'user-1',
});

const mockReport = (
  id: string,
  caseId: string,
  sessionNumber: number,
  createdAt: Date
): SessionReportRecord => ({
  id,
  caseId,
  sessionNumber,
  mainTheme: 'Rugăciune',
  personResponse: 'Deschis',
  previousTaskCompleted: 'yes',
  progressNoted: 'Progres bun',
  nextCommitments: 'yes',
  nextCommitmentsDetails: 'Citește zilnic',
  createdAt,
  createdBy: 'user-1',
  createdByName: 'Ion Popescu',
});

describe('sessionReportsUtils', () => {
  it('groups reports by case and sorts by latest session', () => {
    const cases = [mockCase('case-1', 'Anxietate')];
    const map = new Map<string, SessionReportRecord[]>([
      [
        'case-1',
        [
          mockReport('r1', 'case-1', 1, new Date('2026-05-01')),
          mockReport('r2', 'case-1', 2, new Date('2026-06-01')),
        ],
      ],
    ]);

    const summaries = buildCaseSummaries(cases, map);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].reportCount).toBe(2);
    expect(summaries[0].reports[0].sessionNumber).toBe(2);
  });

  it('filters summaries by search term', () => {
    const cases = [mockCase('case-1', 'Anxietate'), mockCase('case-2', 'Doliu')];
    const map = new Map<string, SessionReportRecord[]>([
      ['case-1', [mockReport('r1', 'case-1', 1, new Date('2026-06-01'))]],
      ['case-2', [mockReport('r2', 'case-2', 1, new Date('2026-06-02'))]],
    ]);
    const summaries = buildCaseSummaries(cases, map);

    const filtered = filterCaseSummaries(summaries, {
      searchTerm: 'doliu',
      counselorFilter: 'all',
      timeRangeFilter: 'alltime',
      statusFilter: 'all',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].case.id).toBe('case-2');
  });

  it('computes metrics from summaries', () => {
    const now = new Date();
    const summaries = buildCaseSummaries(
      [mockCase('case-1', 'Test')],
      new Map([
        [
          'case-1',
          [mockReport('r1', 'case-1', 1, now), mockReport('r2', 'case-1', 2, now)],
        ],
      ])
    );

    const metrics = computeSessionReportMetrics(summaries);
    expect(metrics.totalReports).toBe(2);
    expect(metrics.casesWithReports).toBe(1);
    expect(metrics.reportsThisMonth).toBeGreaterThanOrEqual(0);
  });
});
