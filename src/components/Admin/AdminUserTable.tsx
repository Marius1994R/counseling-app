import React from 'react';
import {
  PencilSquareIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { User, UserRole } from '../../types';
import { t } from '../../utils/translations';
import {
  getRoleBadgeClass,
  getRoleLabel,
  canEditUser,
  canDeactivateUser,
  canDeleteUser,
} from './adminUtils';

interface AdminUserTableProps {
  users: User[];
  loading: boolean;
  currentUserId?: string;
  currentUserRole?: UserRole;
  canCreateUsers: boolean;
  isSupremeLeader: boolean;
  onEdit: (user: User) => void;
  onDeactivate: (userId: string) => void;
  onReactivate: (userId: string) => void;
  reactivatingUserId?: string | null;
  onDelete: (userId: string) => void;
}

const AdminUserTable: React.FC<AdminUserTableProps> = ({
  users,
  loading,
  currentUserId,
  currentUserRole,
  canCreateUsers,
  isSupremeLeader,
  onEdit,
  onDeactivate,
  onReactivate,
  reactivatingUserId = null,
  onDelete,
}) => {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.admin.users.name}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.admin.users.email}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.admin.users.role}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.admin.users.status}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.admin.users.created}
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t.admin.users.actions}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {users.map((user) => {
            const editable = canEditUser(user, currentUserId, currentUserRole, isSupremeLeader);
            const deactivatable = canDeactivateUser(
              user,
              currentUserId,
              currentUserRole,
              isSupremeLeader
            );
            const deletable = canDeleteUser(user, currentUserId, canCreateUsers, isSupremeLeader);

            return (
              <tr key={user.id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-900">{user.fullName}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(user.role)}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {user.isActive ? 'Activ' : 'Inactiv'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {user.createdAt.toLocaleDateString('ro-RO')}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(user)}
                      disabled={!editable}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                      title={t.common.edit}
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    {user.isActive ? (
                      <button
                        type="button"
                        onClick={() => onDeactivate(user.id)}
                        disabled={!deactivatable}
                        className="rounded-lg p-2 text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title={t.admin.users.deactivateUser}
                      >
                        <NoSymbolIcon className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onReactivate(user.id)}
                        disabled={!deactivatable || reactivatingUserId === user.id}
                        className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                        title={t.admin.users.reactivateUserSuccess}
                      >
                        {reactivatingUserId === user.id ? (
                          <span
                            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-green-600 border-t-transparent"
                            role="status"
                            aria-label="Se reactivează…"
                          />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    {deletable && (
                      <button
                        type="button"
                        onClick={() => onDelete(user.id)}
                        className="rounded-lg p-2 text-red-600 transition hover:bg-red-50"
                        title={t.common.delete}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AdminUserTable;
