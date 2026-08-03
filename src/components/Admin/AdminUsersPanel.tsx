import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { User, UserRole } from '../../types';
import { t } from '../../utils/translations';
import AdminUserTable from './AdminUserTable';
import AdminRoleCards from './AdminRoleCards';

interface AdminUsersPanelProps {
  users: User[];
  loading: boolean;
  canCreateUsers: boolean;
  currentUserId?: string;
  currentUserRole?: UserRole;
  isSupremeLeader: boolean;
  onCreateUser: () => void;
  onEdit: (user: User) => void;
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
  reactivatingUserId?: string | null;
  onDelete: (userId: string) => void;
}

const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({
  users,
  loading,
  canCreateUsers,
  currentUserId,
  currentUserRole,
  isSupremeLeader,
  onCreateUser,
  onEdit,
  onDeactivate,
  onReactivate,
  reactivatingUserId = null,
  onDelete,
}) => (
  <div className="space-y-6">
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-900">{t.adminTools.userManagement}</h2>
        {canCreateUsers && (
          <button
            type="button"
            onClick={onCreateUser}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
          >
            <PlusIcon className="h-4 w-4" />
            {t.admin.users.createUser}
          </button>
        )}
      </div>

      <AdminUserTable
        users={users}
        loading={loading}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        canCreateUsers={canCreateUsers}
        isSupremeLeader={isSupremeLeader}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onReactivate={onReactivate}
        reactivatingUserId={reactivatingUserId}
        onDelete={onDelete}
      />
    </section>

    <AdminRoleCards />
  </div>
);

export default AdminUsersPanel;
