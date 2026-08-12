import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';
import { Assignment } from '@mui/icons-material';
import {
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  BellIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardDataContext } from '../../contexts/DashboardDataContext';
import { useAttentionNotifications } from '../../hooks/useAttentionNotifications';
import { t } from '../../utils/translations';
import UserAvatar from '../common/UserAvatar';
import NotificationsPanel from './NotificationsPanel';
import CaseProposalDialog from '../Dashboard/CaseProposalDialog';

interface TopbarProps {
  title?: string;
  subtitle?: string;
  onMenuClick?: () => void;
  showReportActions?: boolean;
}

const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  onMenuClick,
  showReportActions = true,
}) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const {
    cases,
    newAssignmentModal,
    openAssignment,
    dismissAssignment,
    acceptProposal,
    refuseProposal,
    assignmentActionLoading,
    assignmentActionError,
  } = useDashboardDataContext();
  const { count: notificationCount, items: notificationItems, dismiss: dismissNotification } =
    useAttentionNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const firstName = currentUser?.fullName?.split(' ')[0] ?? 'Utilizator';
  const roleLabel =
    currentUser?.role === 'leader'
      ? 'Lider'
      : currentUser?.role === 'admin'
        ? 'Coordonator'
        : 'Consilier';

  const proposedCase = cases.find(
    (caseItem) => caseItem.id === String(newAssignmentModal?.metadata?.caseId ?? '')
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setNotificationsOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleGoHome = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.blur();
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSeeCase = async () => {
    if (!newAssignmentModal?.metadata?.caseId) return;
    const activityId = newAssignmentModal.id;
    const caseId = String(newAssignmentModal.metadata.caseId);
    await dismissAssignment(activityId);
    navigate(`/cases?caseId=${caseId}`);
  };

  return (
    <header className="relative sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-slate-200 bg-white px-4 sm:gap-3 lg:gap-4 lg:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="relative z-10 rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Deschide meniul"
      >
        <Bars3Icon className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={handleGoHome}
        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg p-0.5 active:bg-slate-100 lg:hidden"
        aria-label={t.navigation.dashboard}
      >
        <img
          src="/logo.svg"
          alt="Biserica Lumina"
          className="h-8 w-auto max-w-[140px] object-contain mix-blend-multiply"
        />
      </button>

      <div className="hidden min-w-0 flex-1 lg:block">
        <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
          {title ?? `Bine ai venit, ${firstName}!`}
        </h1>
        <p className="truncate text-xs text-slate-500">
          {subtitle ?? 'Panou de control – Departamentul de Consiliere'}
        </p>
      </div>

      <div className="relative z-10 ml-auto flex items-center gap-2 sm:gap-3">
        {showReportActions && (
          <button
            type="button"
            onClick={() => navigate('/monthly-report')}
            className="hidden rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition duration-200 ease-out hover:bg-slate-50 active:scale-[0.98] min-[800px]:inline-flex"
          >
            + Raport lunar
          </button>
        )}

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            className={`relative rounded-lg p-2 hover:bg-slate-100 ${
              notificationsOpen ? 'bg-slate-100 text-brand-700' : 'text-slate-500'
            }`}
            aria-label="Notificări"
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
            onClick={() => {
              setMenuOpen(false);
              setNotificationsOpen((o) => !o);
            }}
          >
            <BellIcon
              className={`h-5 w-5 origin-top ${
                notificationCount > 0 && !notificationsOpen ? 'animate-bell-dance' : ''
              }`}
            />
            {notificationCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>

          <NotificationsPanel
            open={notificationsOpen}
            onClose={() => setNotificationsOpen(false)}
            items={notificationItems}
            onDismiss={dismissNotification}
            onOpenAssignment={openAssignment}
            onDismissAssignment={dismissAssignment}
          />
        </div>

        <CaseProposalDialog
          open={newAssignmentModal?.type === 'case_proposed'}
          caseItem={proposedCase}
          fallbackTitle={
            newAssignmentModal?.metadata?.caseTitle
              ? String(newAssignmentModal.metadata.caseTitle)
              : undefined
          }
          loading={assignmentActionLoading}
          error={assignmentActionError}
          onAccept={acceptProposal}
          onRefuse={refuseProposal}
        />

        <Dialog
          open={Boolean(newAssignmentModal && newAssignmentModal.type !== 'case_proposed')}
          disableEscapeKeyDown
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <Assignment sx={{ mr: 1, color: 'primary.main' }} />
            {t.dashboard.newCaseAssigned}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              {t.dashboard.newCaseAssignedMessage}
              {newAssignmentModal?.metadata?.caseTitle
                ? ` ${t.cases.caseTitle}: ${String(newAssignmentModal.metadata.caseTitle)}`
                : ''}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 3, pb: 2 }}>
            <Button
              variant="contained"
              onClick={handleSeeCase}
              startIcon={<Assignment />}
              sx={{ backgroundColor: '#C99700', '&:hover': { backgroundColor: '#B89A00' } }}
            >
              {t.dashboard.seeCase}
            </Button>
          </DialogActions>
        </Dialog>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(false);
              setMenuOpen((o) => !o);
            }}
            className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-50"
          >
            <UserAvatar
              name={currentUser?.fullName ?? 'Utilizator'}
              avatarUrl={currentUser?.avatarUrl}
              size="sm"
            />
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
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <UserCircleIcon className="h-4 w-4 shrink-0 text-slate-400" />
                {t.navigation.myProfile}
              </button>
              {(currentUser?.role === 'leader' || currentUser?.role === 'admin') && (
                <button
                  type="button"
                  onClick={() => {
                    navigate('/admin');
                    setMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Cog6ToothIcon className="h-4 w-4 shrink-0 text-slate-400" />
                  {t.navigation.adminTools}
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 shrink-0" />
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
