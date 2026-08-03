import React, { useState } from 'react';
import {
  EllipsisVerticalIcon,
  EnvelopeIcon,
  PhoneIcon,
  ClockIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Counselor, Case } from '../../types';
import { t } from '../../utils/translations';
import { getStatusLabel, getStatusBadgeClass } from '../Cases/casesUtils';
import { getWorkloadLabel, getWorkloadBadgeClass, normalizeSpecialties } from '../Profile/profileUtils';
import UserAvatar from '../common/UserAvatar';
import { formatCounselorDate } from './counselorsUtils';
import CounselorDeleteDialog from './CounselorDeleteDialog';
import CounselorCaseHistoryDialog from './CounselorCaseHistoryDialog';

interface CounselorListCardProps {
  counselor: Counselor;
  assignedCases: Case[];
  onEdit: (counselor: Counselor) => void;
  onDelete: (counselorId: string) => void | Promise<void>;
  canEdit: boolean;
  canDelete: boolean;
}

const CounselorListCard: React.FC<CounselorListCardProps> = ({
  counselor,
  assignedCases,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const specialties = normalizeSpecialties(counselor.specialties);
  const activeCases = assignedCases.filter((c) => c.status === 'active');
  const waitingCases = assignedCases.filter((c) => c.status === 'waiting');
  const recentCases = assignedCases.slice(-2);
  const showMenu = canEdit || canDelete;

  return (
    <>
      <article className="relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md">
        {showMenu && (
          <div className="absolute right-3 top-3">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label={t.common.actions}
            >
              <EllipsisVerticalIcon className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        onEdit(counselor);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      {t.common.edit}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                      {t.common.delete}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex items-start gap-3 pr-8">
          <UserAvatar name={counselor.fullName} avatarUrl={counselor.avatarUrl} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-slate-900">{counselor.fullName}</h2>
            <span
              className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getWorkloadBadgeClass(counselor.workloadLevel)}`}
            >
              {getWorkloadLabel(counselor.workloadLevel)}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{counselor.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span>{counselor.phoneNumber || t.profile.phoneNotProvided}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ClockIcon className="h-3.5 w-3.5 shrink-0" />
            <span>
              {t.common.created}: {formatCounselorDate(counselor.createdAt)}
            </span>
          </div>
        </div>

        {specialties.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.counselors.specialtiesTitle}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {specialties.map((specialty) => (
                <span
                  key={specialty}
                  className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-600">{activeCases.length}</p>
            <p className="text-xs text-slate-500">{t.counselors.activeCasesTitle}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{waitingCases.length}</p>
            <p className="text-xs text-slate-500">{t.counselors.waitingCases}</p>
          </div>
        </div>

        {recentCases.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.counselors.recentCases}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {recentCases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="rounded-lg border border-slate-200 bg-white p-2.5"
                >
                  <p className="truncate text-sm font-medium text-slate-900">{caseItem.title}</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(caseItem.status)}`}
                  >
                    {getStatusLabel(caseItem.status)}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="mt-3 w-full rounded-lg border border-slate-200 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {t.counselors.seeHistory} ({assignedCases.length})
            </button>
          </div>
        )}
      </article>

      <CounselorDeleteDialog
        open={deleteOpen}
        counselor={counselor}
        assignedCases={assignedCases}
        loading={deleteLoading}
        onClose={() => {
          if (!deleteLoading) setDeleteOpen(false);
        }}
        onConfirm={async () => {
          try {
            setDeleteLoading(true);
            await onDelete(counselor.id);
            setDeleteOpen(false);
          } finally {
            setDeleteLoading(false);
          }
        }}
      />

      <CounselorCaseHistoryDialog
        open={historyOpen}
        counselor={counselor}
        assignedCases={assignedCases}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
};

export default CounselorListCard;
