import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  CalendarIcon,
  DocumentChartBarIcon,
  DocumentTextIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface QuickAction {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
  disabled?: boolean;
  roles?: Array<'counselor' | 'admin' | 'leader'>;
}

interface QuickActionsProps {
  onRaportCaz: () => void;
  onSchedule: () => void;
  onAddCase?: () => void;
  onUpdateProfile?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onRaportCaz,
  onSchedule,
  onAddCase,
  onUpdateProfile,
}) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      label: 'Adaugă caz nou',
      icon: PlusIcon,
      onClick: onAddCase,
      roles: ['admin', 'leader'],
    },
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
      label: 'Actualizează profil',
      icon: UserIcon,
      onClick: onUpdateProfile,
    },
  ];

  const visible = actions.filter(
    (a) => !a.roles || (currentUser && a.roles.includes(currentUser.role))
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Acțiuni rapide</h2>
      <div className="flex flex-col gap-2">
        {visible.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={action.disabled ? undefined : action.onClick}
              disabled={action.disabled}
              title={action.disabled ? 'În curând' : undefined}
              className={`flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-left text-sm font-medium transition duration-200 ease-out active:scale-[0.98] ${
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
      </div>
    </section>
  );
};

export default QuickActions;
