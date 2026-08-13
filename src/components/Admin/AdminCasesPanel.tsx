import React, { useState } from 'react';
import { MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import { Alert } from '@mui/material';
import { Case, Counselor } from '../../types';
import { AdminCaseStatusCounts, CaseStatusFilter } from './adminUtils';
import { t } from '../../utils/translations';
import CasesGrid from '../Cases/CasesGrid';
import AdminSkeleton from './AdminSkeleton';
import ConfirmDialog from '../common/ConfirmDialog';
import AdminCasesFilterTabs from './AdminCasesFilterTabs';

interface AdminCasesPanelProps {
  loading: boolean;
  error: string;
  cases: Case[];
  counselors: Counselor[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: CaseStatusFilter;
  onStatusFilterChange: (value: CaseStatusFilter) => void;
  statusCounts: AdminCaseStatusCounts;
  counselorFilter: string;
  onCounselorFilterChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (caseItem: Case) => void;
  onDelete: (caseId: string) => void | Promise<void>;
  onOpenSessionReport: (caseItem: Case) => void;
  onOpenTimeline: (caseItem: Case) => void;
  /** Admin role: blur description and restrict session report content. */
  blurSensitiveContent?: boolean;
}

const AdminCasesPanel: React.FC<AdminCasesPanelProps> = ({
  loading,
  error,
  cases,
  counselors,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusCounts,
  counselorFilter,
  onCounselorFilterChange,
  onAdd,
  onEdit,
  onDelete,
  onOpenSessionReport,
  onOpenTimeline,
  blurSensitiveContent = false,
}) => {
  const [deleteTarget, setDeleteTarget] = useState<Case | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const hasFilters =
    searchTerm.trim() !== '' || statusFilter !== 'all' || counselorFilter !== 'all';
  const countLabel = cases.length === 1 ? 'caz' : 'cazuri';

  if (loading) {
    return <AdminSkeleton />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          {t.adminTools.allCasesManagement}
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
        >
          <PlusIcon className="h-4 w-4" />
          {t.adminTools.addCase}
        </button>
      </div>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {error}
        </Alert>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="admin-cases-search"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t.cases.searchLabel}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                id="admin-cases-search"
                type="search"
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={t.adminTools.searchCases}
                className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-cases-counselor"
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              {t.cases.assignedCounselor}
            </label>
            <select
              id="admin-cases-counselor"
              value={counselorFilter}
              onChange={(e) => onCounselorFilterChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="all">{t.adminTools.allCounselors}</option>
              {counselors.map((counselor) => (
                <option key={counselor.id} value={counselor.id}>
                  {counselor.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <span className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            {cases.length} {countLabel}
          </span>
        </div>
      </div>

      <AdminCasesFilterTabs
        activeFilter={statusFilter}
        onFilterChange={onStatusFilterChange}
        counts={statusCounts}
      />

      {cases.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-base font-medium text-slate-700">
            {hasFilters ? t.adminTools.noMatchFound : t.adminTools.noCasesFound}
          </p>
        </div>
      ) : (
        <CasesGrid
          cases={cases}
          loading={false}
          caseNotes={{}}
          caseReportsCount={{}}
          hasActiveFilters={hasFilters}
          onOpenNotes={onEdit}
          onOpenAddReport={onOpenSessionReport}
          onOpenReports={onOpenSessionReport}
          onOpenTimeline={onOpenTimeline}
          onEdit={onEdit}
          onOpenDescription={onEdit}
          onDelete={(caseItem) => setDeleteTarget(caseItem)}
          hideMeetingNotes
          showCaseId
          blurSensitiveContent={blurSensitiveContent}
        />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t.deleteWarnings.deleteCase}
        message={t.deleteWarnings.deleteCaseConfirm.replace(
          '{title}',
          deleteTarget?.title ?? ''
        )}
        variant="danger"
        loading={deleteLoading}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={async () => {
          if (!deleteTarget) return;
          try {
            setDeleteLoading(true);
            await onDelete(deleteTarget.id);
            setDeleteTarget(null);
          } finally {
            setDeleteLoading(false);
          }
        }}
      />
    </div>
  );
};

export default AdminCasesPanel;
