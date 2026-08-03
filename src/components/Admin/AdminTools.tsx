import React, { useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useAdminData } from '../../hooks/useAdminData';
import CounselorForm from '../Counselors/CounselorForm';
import CaseForm from '../Cases/CaseForm';
import SessionReport from '../Cases/SessionReport';
import AdminPageHeader from './AdminPageHeader';
import AdminTabs from './AdminTabs';
import AdminUsersPanel from './AdminUsersPanel';
import AdminCounselorsPanel from './AdminCounselorsPanel';
import AdminCasesPanel from './AdminCasesPanel';
import AdminUserDialogs from './AdminUserDialogs';
import ConfirmDialog from '../common/ConfirmDialog';
import { t } from '../../utils/translations';

type PendingConfirm =
  | { type: 'deleteUser'; userId: string; message: string }
  | { type: 'deactivateUser'; userId: string };

const AdminTools: React.FC = () => {
  const data = useAdminData();
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleConfirmAction = async () => {
    if (!pendingConfirm) return;

    try {
      setConfirmLoading(true);
      if (pendingConfirm.type === 'deleteUser') {
        await data.handleDeleteUser(pendingConfirm.userId);
      } else {
        await data.handleDeactivateUser(pendingConfirm.userId);
      }
      setPendingConfirm(null);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (!data.canManageUsers) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Nu ai permisiunea de a accesa uneltele admin.
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader />
      <AdminTabs activeTab={data.activeTab} onTabChange={data.setTab} />

      {data.activeTab === 0 && (
        <AdminUsersPanel
          users={data.users}
          loading={data.usersLoading}
          canCreateUsers={data.canCreateUsers}
          currentUserId={data.currentUser?.id}
          currentUserRole={data.currentUser?.role}
          isSupremeLeader={data.isSupremeLeader}
          onCreateUser={() => data.setCreateDialogOpen(true)}
          onEdit={data.openEditDialog}
          onDeactivate={(userId) => setPendingConfirm({ type: 'deactivateUser', userId })}
          onReactivate={data.handleReactivateUser}
          onDelete={(userId) => {
            const isDeletingSelf = userId === data.currentUser?.id;
            setPendingConfirm({
              type: 'deleteUser',
              userId,
              message: isDeletingSelf
                ? t.admin.users.deleteUserSelfConfirm
                : t.admin.users.deleteUserConfirm,
            });
          }}
        />
      )}

      {data.activeTab === 1 && (
        <AdminCounselorsPanel
          loading={data.counselorsLoading}
          error={data.counselorsError}
          searchTerm={data.counselorSearchTerm}
          onSearchChange={data.setCounselorSearchTerm}
          workloadFilter={data.counselorWorkloadFilter}
          onWorkloadFilterChange={data.setCounselorWorkloadFilter}
          filteredCounselors={data.filteredCounselors}
          workloadCounts={data.counselorWorkloadCounts}
          onAdd={() => {
            data.setEditingCounselor(null);
            data.setCounselorFormOpen(true);
          }}
          onEdit={(counselor) => {
            data.setEditingCounselor(counselor);
            data.setCounselorFormOpen(true);
          }}
          onDelete={data.handleDeleteCounselor}
          getCasesForCounselor={data.getCasesForCounselor}
        />
      )}

      {data.activeTab === 2 && (
        <AdminCasesPanel
          loading={data.casesLoading}
          error={data.casesError}
          cases={data.filteredCases}
          counselors={data.counselors}
          caseNotes={data.caseNotes}
          searchTerm={data.caseSearchTerm}
          onSearchChange={data.setCaseSearchTerm}
          statusFilter={data.caseStatusFilter}
          onStatusFilterChange={data.setCaseStatusFilter}
          counselorFilter={data.caseCounselorFilter}
          onCounselorFilterChange={data.setCaseCounselorFilter}
          onAdd={() => {
            data.setEditingCase(null);
            data.setCaseFormOpen(true);
          }}
          onEdit={(caseItem) => {
            data.setEditingCase(caseItem);
            data.setCaseFormOpen(true);
          }}
          onDelete={data.handleDeleteCase}
          onOpenSessionReport={data.handleOpenSessionReport}
          isLeader={data.currentUser?.role === 'leader'}
        />
      )}

      <ConfirmDialog
        open={pendingConfirm !== null}
        title={
          pendingConfirm?.type === 'deleteUser'
            ? t.admin.users.deleteUserTitle
            : t.admin.users.deactivateUser
        }
        message={
          pendingConfirm?.type === 'deleteUser'
            ? pendingConfirm.message
            : t.admin.users.deactivateUserConfirm
        }
        variant={pendingConfirm?.type === 'deleteUser' ? 'danger' : 'default'}
        confirmLabel={
          pendingConfirm?.type === 'deleteUser'
            ? t.common.delete
            : t.admin.users.deactivateUser
        }
        loading={confirmLoading}
        onClose={() => {
          if (!confirmLoading) setPendingConfirm(null);
        }}
        onConfirm={handleConfirmAction}
      />

      <AdminUserDialogs
        createDialogOpen={data.createDialogOpen}
        editDialogOpen={data.editDialogOpen}
        createUserLoading={data.createUserLoading}
        createUserData={data.createUserData}
        editUserData={data.editUserData}
        selectedUser={data.selectedUser}
        currentUserRole={data.currentUser?.role}
        onCloseCreate={() => {
          if (data.createUserLoading) return;
          data.setCreateDialogOpen(false);
          data.setCreateUserData({ email: '', password: '', fullName: '', role: 'counselor' });
        }}
        onCloseEdit={() => data.setEditDialogOpen(false)}
        onCreateUserDataChange={data.setCreateUserData}
        onEditUserDataChange={data.setEditUserData}
        onCreateUser={data.handleCreateUser}
        onEditUser={data.handleEditUser}
        onCopyCredentials={data.copyUserCredentials}
      />

      <CounselorForm
        open={data.counselorFormOpen}
        onClose={data.handleCloseCounselorForm}
        onSubmit={data.handleCounselorSubmit}
        counselorData={data.editingCounselor}
        preselectedUserId={data.editingCounselor ? undefined : data.newlyCreatedUserId || undefined}
        requireProfile={Boolean(data.newlyCreatedUserId && data.pendingProfileRequired)}
        allowSkipProfile={Boolean(data.newlyCreatedUserId && !data.pendingProfileRequired)}
        onSkipProfile={data.handleSkipCounselorProfile}
      />

      <CaseForm
        open={data.caseFormOpen}
        onClose={data.handleCloseCaseForm}
        onSubmit={data.handleCaseSubmit}
        caseData={data.editingCase}
        counselors={data.counselors}
        inactiveUserIds={data.users.filter((u) => !u.isActive).map((u) => u.id)}
      />

      <SessionReport
        open={data.sessionReportOpen}
        onClose={data.handleCloseSessionReport}
        caseId={data.selectedCaseForSessionReport?.id || ''}
        caseTitle={data.selectedCaseForSessionReport?.title || ''}
        onReportAdded={() => undefined}
        hideAddButton
        caseStatus={data.selectedCaseForSessionReport?.status}
      />

      <Snackbar
        open={data.snackbar.open}
        autoHideDuration={6000}
        onClose={() => data.setSnackbar({ ...data.snackbar, open: false })}
      >
        <Alert
          onClose={() => data.setSnackbar({ ...data.snackbar, open: false })}
          severity={data.snackbar.severity}
          sx={{ width: '100%' }}
          className="rounded-xl"
        >
          {data.snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default AdminTools;
