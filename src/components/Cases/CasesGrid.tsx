import React from 'react';
import { FolderIcon } from '@heroicons/react/24/outline';
import { Case } from '../../types';
import { t } from '../../utils/translations';
import CaseListCard from './CaseListCard';

interface CasesGridProps {
  cases: Case[];
  loading: boolean;
  caseNotes: Record<string, string>;
  caseReportsCount: Record<string, number>;
  hasActiveFilters: boolean;
  onOpenNotes: (caseItem: Case) => void;
  onOpenReports: (caseItem: Case) => void;
  onEdit: (caseItem: Case) => void;
  onOpenDescription: (caseItem: Case) => void;
  onDelete?: (caseItem: Case) => void;
}

const CasesGrid: React.FC<CasesGridProps> = ({
  cases,
  loading,
  caseNotes,
  caseReportsCount,
  hasActiveFilters,
  onOpenNotes,
  onOpenReports,
  onEdit,
  onOpenDescription,
  onDelete,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-[28rem] animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
        <FolderIcon className="mb-4 h-14 w-14 text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-700">{t.cases.noCases}</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          {hasActiveFilters ? t.cases.noCasesMessage : t.cases.noCasesMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {cases.map((caseItem) => (
        <CaseListCard
          key={caseItem.id}
          caseItem={caseItem}
          latestNote={caseNotes[caseItem.id] ?? ''}
          reportsCount={caseReportsCount[caseItem.id] ?? 0}
          onOpenNotes={() => onOpenNotes(caseItem)}
          onOpenReports={() => onOpenReports(caseItem)}
          onEdit={() => onEdit(caseItem)}
          onOpenDescription={() => onOpenDescription(caseItem)}
          onDelete={onDelete ? () => onDelete(caseItem) : undefined}
        />
      ))}
    </div>
  );
};

export default CasesGrid;
