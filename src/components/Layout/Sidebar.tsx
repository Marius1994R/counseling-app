import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  FolderOpenIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import { t } from '../../utils/translations';
import WeeklyVerseCard from './WeeklyVerseCard';

interface SidebarProps {
  collapsed?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  roles?: Array<'counselor' | 'admin' | 'leader'>;
}

const CASES_PATH = '/cases';
const CALENDAR_PATH = '/calendar';

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: HomeIcon },
  { label: 'Cazuri', path: CASES_PATH, icon: FolderOpenIcon },
  { label: t.navigation.calendar, path: CALENDAR_PATH, icon: CalendarIcon },
  { label: t.navigation.sessionReports, path: '/session-reports', icon: ClipboardDocumentListIcon },
  { label: t.navigation.resources, path: '/resources', icon: BookOpenIcon },
];

function isActive(path: string, pathname: string, search: string): boolean {
  if (path === '/') return pathname === '/';
  const [base, query] = path.split('?');
  if (pathname !== base) return false;
  if (!query) return true;
  return search === `?${query}`;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, mobileOpen = false, onMobileClose }) => {
  const { currentUser } = useAuth();
  const { metrics } = useDashboardDataContext();
  const navigate = useNavigate();
  const location = useLocation();
  const waitingCasesCount = metrics.pendingCases;
  const futureAppointmentsCount = metrics.futureAppointmentsCount;

  const visibleItems = navItems.filter(
    (item) => !item.roles || (currentUser && item.roles.includes(currentUser.role))
  );

  const handleNav = (path: string) => {
    if (path === '/') {
      navigate(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(path);
    }
    onMobileClose?.();
  };

  const content = (
    <div className="flex h-full flex-col">
      <button
        type="button"
        onClick={() => handleNav('/')}
        className={`flex w-full items-center gap-3 border-b border-slate-200 px-4 py-5 text-left transition hover:bg-slate-50 ${collapsed ? 'justify-center' : ''}`}
        aria-label={t.navigation.dashboard}
      >
        <img
          src="/logo.svg"
          alt="Biserica Lumina"
          className={
            collapsed
              ? 'h-9 w-9 shrink-0 object-cover object-left mix-blend-multiply'
              : 'h-10 w-auto max-w-[180px] shrink-0 object-contain object-left mix-blend-multiply'
          }
        />
      </button>

      <nav className="space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const active = isActive(item.path, location.pathname, location.search);
          const Icon = item.icon;
          const showWaitingBadge =
            item.path === CASES_PATH && waitingCasesCount > 0;
          const showCalendarBadge =
            item.path === CALENDAR_PATH && futureAppointmentsCount > 0;
          const badgeCount = showWaitingBadge
            ? waitingCasesCount
            : showCalendarBadge
              ? futureAppointmentsCount
              : 0;
          const showBadge = badgeCount > 0;
          const badgeLabel = badgeCount > 9 ? '9+' : String(badgeCount);
          const ariaBadgeSuffix = showWaitingBadge
            ? `${waitingCasesCount} cazuri`
            : showCalendarBadge
              ? `${futureAppointmentsCount} programări viitoare`
              : '';

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNav(item.path)}
              title={collapsed ? item.label : undefined}
              aria-label={
                showBadge ? `${item.label}, ${ariaBadgeSuffix}` : item.label
              }
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200 ease-out ${
                active
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <span className="relative shrink-0">
                <Icon className="h-5 w-5" />
                {showBadge && (
                  <span
                    className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-white bg-amber-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm"
                    aria-hidden="true"
                  >
                    {badgeLabel}
                  </span>
                )}
              </span>
              {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <>
          <WeeklyVerseCard />
          <div className="flex flex-wrap justify-center gap-1.5 px-3 pb-4 sm:hidden">
            <button
              type="button"
              onClick={() => {
                navigate('/monthly-report');
                onMobileClose?.();
              }}
              className="inline-flex rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition duration-200 ease-out hover:bg-slate-50 active:scale-[0.98]"
            >
              + Raport lunar
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-full border-r border-slate-200 bg-white transition-all duration-200 ease-out ${
          collapsed ? 'w-[72px]' : 'w-[260px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {content}
      </aside>
    </>
  );
};

export default Sidebar;
