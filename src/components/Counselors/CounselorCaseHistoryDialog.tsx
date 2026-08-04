import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { Case, Counselor } from '../../types';
import { t } from '../../utils/translations';
import {
  getStatusLabel,
  getStatusBadgeClass,
  translateIssueType,
} from '../Cases/casesUtils';
import { formatCounselorDate } from './counselorsUtils';

type HistoryStatusFilter = 'all' | 'active' | 'others';

interface CounselorCaseHistoryDialogProps {
  open: boolean;
  counselor: Counselor | null;
  assignedCases: Case[];
  onClose: () => void;
}

function matchesHistoryFilter(caseItem: Case, filter: HistoryStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return caseItem.status === 'active';
  return caseItem.status !== 'active';
}

function sortNewestFirst(cases: Case[]): Case[] {
  return [...cases].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 active:scale-[0.98] ${
      active
        ? 'bg-brand-50 text-brand-600'
        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
    }`}
  >
    {label}
  </button>
);

const CounselorCaseHistoryDialog: React.FC<CounselorCaseHistoryDialogProps> = ({
  open,
  counselor,
  assignedCases,
  onClose,
}) => {
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');

  useEffect(() => {
    if (open) setStatusFilter('all');
  }, [open, counselor?.id]);

  const counts = useMemo(() => {
    const all = assignedCases.length;
    const active = assignedCases.filter((c) => c.status === 'active').length;
    return { all, active, others: all - active };
  }, [assignedCases]);

  const filteredCases = useMemo(
    () =>
      sortNewestFirst(
        assignedCases.filter((c) => matchesHistoryFilter(c, statusFilter))
      ),
    [assignedCases, statusFilter]
  );

  if (!counselor) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {t.counselors.caseHistory} — {counselor.fullName}
      </DialogTitle>
      <DialogContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <FilterPill
            label={`${t.adminTools.allStatuses} (${counts.all})`}
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          />
          <FilterPill
            label={`${t.sessionReports.statusActive} (${counts.active})`}
            active={statusFilter === 'active'}
            onClick={() => setStatusFilter('active')}
          />
          <FilterPill
            label={`${t.sessionReports.statusOthers} (${counts.others})`}
            active={statusFilter === 'others'}
            onClick={() => setStatusFilter('others')}
          />
        </div>

        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-0.5">
          {filteredCases.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {t.counselors.historyEmptyFilter}
            </p>
          ) : (
            filteredCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="rounded-lg border-l-[3px] border-brand-600 bg-slate-50"
              >
                <div className="flex items-start gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {caseItem.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {caseItem.counseledName} · {caseItem.age} ani
                      {caseItem.issueTypes.length > 0
                        ? ` · ${caseItem.issueTypes.map(translateIssueType).join(', ')}`
                        : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatCounselorDate(caseItem.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(caseItem.status)}`}
                  >
                    {getStatusLabel(caseItem.status)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t.common.close}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CounselorCaseHistoryDialog;
