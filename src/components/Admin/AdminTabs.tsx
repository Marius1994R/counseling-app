import React, { useEffect, useRef } from 'react';
import {
  UserIcon,
  UserGroupIcon,
  FolderIcon,
  DocumentTextIcon,
  DocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { AdminTab } from './adminUtils';
import { t } from '../../utils/translations';

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  showLeaderExtras?: boolean;
}

interface TabButtonProps {
  tab: AdminTab;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ tab, active, onClick, icon, label }) => (
  <button
    type="button"
    data-admin-tab={tab}
    onClick={onClick}
    className={`inline-flex shrink-0 snap-center items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition duration-200 active:scale-[0.98] sm:gap-2 sm:px-4 ${
      active
        ? 'bg-brand-50 text-brand-700'
        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
    }`}
  >
    {icon}
    {label}
  </button>
);

const AdminTabs: React.FC<AdminTabsProps> = ({
  activeTab,
  onTabChange,
  showLeaderExtras = false,
}) => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 768px)').matches) return;

    const button = listRef.current?.querySelector<HTMLElement>(
      `[data-admin-tab="${activeTab}"]`
    );
    button?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeTab]);

  return (
    <div
      ref={listRef}
      className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 md:snap-none [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label={t.adminTools.title}
    >
      <TabButton
        tab={0}
        active={activeTab === 0}
        onClick={() => onTabChange(0)}
        icon={<UserIcon className="h-4 w-4 shrink-0" />}
        label={t.admin.tabs.userManagement}
      />
      <TabButton
        tab={1}
        active={activeTab === 1}
        onClick={() => onTabChange(1)}
        icon={<UserGroupIcon className="h-4 w-4 shrink-0" />}
        label={t.admin.tabs.counselorsManagement}
      />
      <TabButton
        tab={2}
        active={activeTab === 2}
        onClick={() => onTabChange(2)}
        icon={<FolderIcon className="h-4 w-4 shrink-0" />}
        label={t.admin.tabs.allCases}
      />
      {showLeaderExtras && (
        <TabButton
          tab={3}
          active={activeTab === 3}
          onClick={() => onTabChange(3)}
          icon={<DocumentTextIcon className="h-4 w-4 shrink-0" />}
          label={t.admin.tabs.receivedReports}
        />
      )}
      {showLeaderExtras && (
        <TabButton
          tab={4}
          active={activeTab === 4}
          onClick={() => onTabChange(4)}
          icon={<DocumentCheckIcon className="h-4 w-4 shrink-0" />}
          label={t.admin.tabs.manageConsents}
        />
      )}
    </div>
  );
};

export default AdminTabs;
