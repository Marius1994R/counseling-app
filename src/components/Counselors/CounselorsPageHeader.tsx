import React from 'react';
import { UserGroupIcon, PlusIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

interface CounselorsPageHeaderProps {
  canAdd: boolean;
  onAdd: () => void;
}

const CounselorsPageHeader: React.FC<CounselorsPageHeaderProps> = ({ canAdd, onAdd }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:text-3xl">
        <UserGroupIcon className="h-7 w-7 text-brand-gold sm:h-8 sm:w-8" />
        {t.counselors.pageTitle}
      </h1>
      <p className="mt-1 text-sm text-slate-500">{t.counselors.subtitle}</p>
    </div>

    {canAdd && (
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98] sm:w-auto"
      >
        <PlusIcon className="h-4 w-4" />
        {t.counselors.addCounselor}
      </button>
    )}
  </div>
);

export default CounselorsPageHeader;
