import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  Bars3Icon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardReport } from '../../contexts/DashboardReportContext';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import { t } from '../../utils/translations';

/** Re-enable when in-app notifications are implemented. */
const SHOW_NOTIFICATIONS = false;

interface TopbarProps {
  title?: string;
  subtitle?: string;
  notificationCount?: number;
  onMenuClick?: () => void;
  showReportActions?: boolean;
}

const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  notificationCount = 0,
  onMenuClick,
  showReportActions = true,
}) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { openCaseReportModal } = useDashboardReport();
  const { refetch } = useDashboardDataContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const firstName = currentUser?.fullName?.split(' ')[0] ?? 'Utilizator';
  const roleLabel =
    currentUser?.role === 'leader'
      ? 'Coordonator'
      : currentUser?.role === 'admin'
        ? 'Administrator'
        : 'Consilier';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleGoHome = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    navigate('/');
    refetch();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-4 sm:gap-3 lg:gap-4 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Deschide meniul"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={handleGoHome}
        className="shrink-0 rounded-lg p-0.5 active:bg-slate-100 lg:hidden"
        aria-label={t.navigation.dashboard}
      >
        <img
          src="/favicon.svg"
          alt=""
          className="h-9 w-9 rounded-lg"
          aria-hidden="true"
        />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
          {title ?? `Bine ai venit, ${firstName}!`}
        </h1>
        <p className="hidden truncate text-xs text-slate-500 sm:block">
          {subtitle ?? 'Panou de control – Departamentul de Consiliere'}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {showReportActions && (
          <>
            <button
              type="button"
              title="În curând"
              className="hidden cursor-not-allowed rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-400 opacity-70 sm:inline-flex active:scale-[0.98]"
            >
              + Raport lunar
            </button>
            <button
              type="button"
              onClick={openCaseReportModal}
              className="hidden rounded-full bg-brand-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition duration-200 ease-out hover:bg-brand-700 active:scale-[0.98] sm:inline-flex"
            >
              + Raport caz
            </button>
          </>
        )}

        {SHOW_NOTIFICATIONS && (
          <button
            type="button"
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Notificări"
          >
            <BellIcon className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        )}

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
              {currentUser?.fullName
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2) ?? 'U'}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium text-slate-900">{currentUser?.fullName}</p>
              <p className="text-[10px] text-slate-500">{roleLabel}</p>
            </div>
            <ChevronDownIcon className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  navigate('/profile');
                  setMenuOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {t.navigation.myProfile}
              </button>
              {(currentUser?.role === 'leader' || currentUser?.role === 'admin') && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/admin');
                    setMenuOpen(false);
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {t.navigation.adminTools}
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                {t.navigation.logout}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
