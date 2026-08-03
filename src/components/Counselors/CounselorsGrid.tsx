import React from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';
import { Counselor } from '../../types';
import CounselorListCard from './CounselorListCard';
import { t } from '../../utils/translations';

interface CounselorsGridProps {
  counselors: Counselor[];
  getCasesForCounselor: (counselorId: string) => import('../../types').Case[];
  onEdit: (counselor: Counselor) => void;
  onDelete: (counselorId: string) => void | Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
  hasFilters: boolean;
  canAdd: boolean;
  onAdd: () => void;
}

const CounselorsGrid: React.FC<CounselorsGridProps> = ({
  counselors,
  getCasesForCounselor,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  hasFilters,
  canAdd,
  onAdd,
}) => {
  if (counselors.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
        <UserGroupIcon className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-4 text-base font-medium text-slate-700">{t.counselors.noCounselorsFound}</p>
        <p className="mt-1 text-sm text-slate-500">
          {hasFilters ? t.counselors.adjustFilters : t.counselors.addFirstCounselor}
        </p>
        {canAdd && !hasFilters && (
          <button
            type="button"
            onClick={onAdd}
            className="mt-6 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {t.counselors.addCounselor}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:gap-6">
      {counselors.map((counselor) => (
        <CounselorListCard
          key={counselor.id}
          counselor={counselor}
          assignedCases={getCasesForCounselor(counselor.id)}
          onEdit={onEdit}
          onDelete={onDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ))}
    </div>
  );
};

export default CounselorsGrid;
