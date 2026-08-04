import React from 'react';
import {
  UserIcon,
  UserGroupIcon,
  FolderIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { AdminTab } from './adminUtils';
import { t } from '../../utils/translations';

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  showReceivedReports?: boolean;
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition duration-200 active:scale-[0.98] ${
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
  showReceivedReports = false,
}) => (
  <div className="mb-6 flex flex-wrap gap-2">
    <TabButton
      active={activeTab === 0}
      onClick={() => onTabChange(0)}
      icon={<UserIcon className="h-4 w-4" />}
      label={t.admin.tabs.userManagement}
    />
    <TabButton
      active={activeTab === 1}
      onClick={() => onTabChange(1)}
      icon={<UserGroupIcon className="h-4 w-4" />}
      label={t.admin.tabs.counselorsManagement}
    />
    <TabButton
      active={activeTab === 2}
      onClick={() => onTabChange(2)}
      icon={<FolderIcon className="h-4 w-4" />}
      label={t.admin.tabs.allCases}
    />
    {showReceivedReports && (
      <TabButton
        active={activeTab === 3}
        onClick={() => onTabChange(3)}
        icon={<DocumentTextIcon className="h-4 w-4" />}
        label={t.admin.tabs.receivedReports}
      />
    )}
  </div>
);

export default AdminTabs;
