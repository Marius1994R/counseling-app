import React from 'react';
import { FolderIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

interface CasesPageHeaderProps {
  caseIdFilter: string | null;
  onClearCaseFilter: () => void;
}

const CasesPageHeader: React.FC<CasesPageHeaderProps> = ({ caseIdFilter, onClearCaseFilter }) => {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            <FolderIcon className="h-7 w-7 text-brand-gold sm:h-8 sm:w-8" />
            {t.cases.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t.cases.subtitle}</p>
        </div>

        {caseIdFilter && (
          <button
            type="button"
            onClick={onClearCaseFilter}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition duration-200 hover:bg-brand-100"
          >
            {t.cases.singleCaseView}
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CasesPageHeader;
