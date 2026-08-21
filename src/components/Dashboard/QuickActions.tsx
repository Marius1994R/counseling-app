import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  DocumentArrowUpIcon,
  PencilSquareIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../utils/translations';

interface QuickAction {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
  disabled?: boolean;
  roles?: Array<'counselor' | 'admin' | 'leader'>;
}

interface QuickActionsProps {
  onRaportCaz: () => void;
  onAddNote: () => void;
  onAddConsent: () => void;
  onSchedule: () => void;
  onAddCase?: () => void;
  onUpdateProfile?: () => void;
}

const MOBILE_PREVIEW_COUNT = 2;

const QuickActions: React.FC<QuickActionsProps> = ({
  onRaportCaz,
  onAddNote,
  onAddConsent,
  onSchedule,
  onAddCase,
  onUpdateProfile,
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const actions: QuickAction[] = [
    {
      label: 'Programare nouă',
      icon: CalendarIcon,
      onClick: onSchedule,
    },
    {
      label: 'Raport lunar',
      icon: DocumentChartBarIcon,
      onClick: () => navigate('/monthly-report'),
    },
    {
      label: 'Raport caz',
      icon: DocumentTextIcon,
      onClick: onRaportCaz,
    },
    {
      label: t.meetingNotes.addNote,
      icon: PencilSquareIcon,
      onClick: onAddNote,
    },
    {
      label: t.cases.addConsent,
      icon: DocumentArrowUpIcon,
      onClick: onAddConsent,
    },
    {
      label: 'Actualizează profil',
      icon: UserIcon,
      onClick: onUpdateProfile,
    },
    {
      label: 'Adaugă caz nou',
      icon: PlusIcon,
      onClick: onAddCase,
      roles: ['admin', 'leader'],
    },
  ];

  const visible = actions.filter(
    (a) => !a.roles || (currentUser && a.roles.includes(currentUser.role))
  );
  const hasMore = visible.length > MOBILE_PREVIEW_COUNT;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Acțiuni rapide</h2>
      <div className="flex flex-col gap-2">
        {visible.map((action, index) => {
          const Icon = action.icon;
          const hideOnMobileCollapsed =
            hasMore && !expanded && index >= MOBILE_PREVIEW_COUNT;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.disabled ? undefined : action.onClick}
              disabled={action.disabled}
              title={action.disabled ? 'În curând' : undefined}
              className={`items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-left text-sm font-medium transition duration-200 ease-out active:scale-[0.98] ${
                hideOnMobileCollapsed ? 'hidden lg:flex' : 'flex'
              } ${
                action.disabled
                  ? 'cursor-not-allowed text-slate-400 opacity-70'
                  : 'text-slate-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {action.label}
            </button>
          );
        })}
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50 lg:hidden"
          >
            {expanded ? (
              <>
                Vezi mai puțin
                <ChevronUpIcon className="h-4 w-4" />
              </>
            ) : (
              <>
                Vezi mai mult
                <ChevronDownIcon className="h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
    </section>
  );
};

export default QuickActions;
