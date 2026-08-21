import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Case } from '../../types';
import {
  getAvatarColorClass,
  getInitials,
  getStatusBadgeClass,
  getStatusLabel,
} from './dashboardUtils';
import { t } from '../../utils/translations';

const SEARCH_THRESHOLD = 6;

interface CaseSelectionDialogProps {
  open: boolean;
  title: string;
  cases: Case[];
  loading?: boolean;
  emptyMessage: string;
  onSelect: (caseItem: Case) => void;
  onClose: () => void;
}

const CaseSelectionDialog: React.FC<CaseSelectionDialogProps> = ({
  open,
  title,
  cases,
  loading = false,
  emptyMessage,
  onSelect,
  onClose,
}) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return cases;
    return cases.filter(
      (caseItem) =>
        caseItem.counseledName.toLowerCase().includes(term) ||
        caseItem.title.toLowerCase().includes(term)
    );
  }, [cases, search]);

  if (!open) return null;

  const showSearch = !loading && cases.length > SEARCH_THRESHOLD;

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-selection-title"
    >
      <div className="absolute inset-0 bg-slate-900/40" aria-hidden="true" onClick={onClose} />
      <div className="relative flex max-h-[min(85vh,100%)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <h2 id="case-selection-title" className="text-base font-semibold text-slate-900">
            {title}
          </h2>
          {!loading && cases.length > 0 && (
            <p className="mt-1 text-sm text-slate-500">
              {cases.length === 1
                ? t.dashboard.caseSelectionCountSingular
                : t.dashboard.caseSelectionCountPlural.replace('{n}', String(cases.length))}
            </p>
          )}

          {showSearch && (
            <div className="relative mt-3">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.dashboard.caseSelectionSearch}
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 sm:text-sm"
              />
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : filteredCases.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {cases.length === 0 ? emptyMessage : t.dashboard.caseSelectionNoMatch}
            </p>
          ) : (
            <ul className="space-y-2">
              {filteredCases.map((caseItem) => (
                <li key={caseItem.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(caseItem)}
                    className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition duration-200 ease-out hover:border-brand-300 hover:bg-brand-50 active:scale-[0.99]"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${getAvatarColorClass(
                        caseItem.counseledName
                      )}`}
                    >
                      {getInitials(caseItem.counseledName)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">
                        {caseItem.counseledName}
                      </span>
                      <span className="block truncate text-sm text-slate-500">
                        {caseItem.title}
                      </span>
                    </span>

                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(
                        caseItem.status
                      )}`}
                    >
                      {getStatusLabel(caseItem.status)}
                    </span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 justify-end border-t border-slate-100 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {t.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseSelectionDialog;
