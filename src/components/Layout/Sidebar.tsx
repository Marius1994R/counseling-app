import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  FolderIcon,
  FolderOpenIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../utils/translations';

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

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: HomeIcon },
  { label: 'Cazuri în așteptare', path: '/cases?status=waiting', icon: FolderIcon },
  { label: 'Toate cazurile', path: '/cases?status=all', icon: FolderOpenIcon },
  { label: t.navigation.calendar, path: '/calendar', icon: CalendarIcon },
  { label: 'Echipa', path: '/counselors', icon: UserGroupIcon, roles: ['admin', 'leader'] },
  { label: 'Rapoarte', path: '/activity', icon: ChartBarIcon },
];

function isActive(path: string, pathname: string, search: string): boolean {
  if (path === '/') return pathname === '/';
  const [base, query] = path.split('?');
  if (pathname !== base) return false;
  if (!query) return pathname === base && !search;
  return search === `?${query}`;
}

const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, mobileOpen = false, onMobileClose }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleItems = navItems.filter(
    (item) => !item.roles || (currentUser && item.roles.includes(currentUser.role))
  );

  const handleNav = (path: string) => {
    navigate(path);
    onMobileClose?.();
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 border-b border-slate-200 px-4 py-5 ${collapsed ? 'justify-center' : ''}`}>
        <img
          src="/favicon.svg"
          alt="Lumina Consiliere"
          className="h-9 w-9 shrink-0 rounded-lg"
        />
        {!collapsed && (
          <div>
            <p className="text-base font-semibold text-slate-900">Lumina</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Consiliere</p>
          </div>
        )}
      </div>

      <nav className="space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const active = isActive(item.path, location.pathname, location.search);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNav(item.path)}
              title={collapsed ? item.label : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition duration-200 ease-out ${
                active
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mx-3 mt-2 mb-6 rounded-xl bg-indigo-50/60 p-4">
          <p className="text-xs italic leading-relaxed text-slate-500">
            „Domnul este aproape de cei cu inima zdrobită.” — Psalm 34:18
          </p>
        </div>
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
