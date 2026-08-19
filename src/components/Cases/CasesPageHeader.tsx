import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

interface CasesPageHeaderProps {
  caseIdFilter: string | null;
  caseIdsFilter?: string[];
  focusFilterLabel?: string | null;
  onClearCaseFilter: () => void;
}

const CasesPageHeader: React.FC<CasesPageHeaderProps> = ({
  caseIdFilter,
  caseIdsFilter = [],
  focusFilterLabel,
  onClearCaseFilter,
}) => {
  const hasFilteredCases = Boolean(caseIdFilter) || caseIdsFilter.length > 0;
  if (!hasFilteredCases) return null;

  return (
    <div className="mb-4 flex justify-end">
      <button
        type="button"
        onClick={onClearCaseFilter}
        className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 transition duration-200 hover:bg-brand-100"
      >
        {focusFilterLabel ?? t.cases.singleCaseView}
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

export default CasesPageHeader;
