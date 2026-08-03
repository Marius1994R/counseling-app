import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { User, UserRole } from '../../types';
import { CreateUserData, generatePassword } from './adminUtils';
import { t } from '../../utils/translations';

interface AdminUserDialogsProps {
  createDialogOpen: boolean;
  editDialogOpen: boolean;
  createUserLoading?: boolean;
  createUserData: CreateUserData;
  editUserData: Partial<CreateUserData>;
  selectedUser: User | null;
  currentUserRole?: UserRole;
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  onCreateUserDataChange: (data: CreateUserData) => void;
  onEditUserDataChange: (data: Partial<CreateUserData>) => void;
  onCreateUser: () => void;
  onEditUser: () => void;
  onCopyCredentials: () => void;
}

const AdminUserDialogs: React.FC<AdminUserDialogsProps> = ({
  createDialogOpen,
  editDialogOpen,
  createUserLoading = false,
  createUserData,
  editUserData,
  selectedUser,
  currentUserRole,
  onCloseCreate,
  onCloseEdit,
  onCreateUserDataChange,
  onEditUserDataChange,
  onCreateUser,
  onEditUser,
  onCopyCredentials,
}) => (
  <>
    <Dialog
      open={createDialogOpen}
      onClose={(_, reason) => {
        if (createUserLoading) return;
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          onCloseCreate();
          return;
        }
        onCloseCreate();
      }}
      disableEscapeKeyDown={createUserLoading}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{t.admin.users.createNewUser}</DialogTitle>
      <DialogContent sx={{ position: 'relative' }}>
        <Box sx={{ pt: 1, opacity: createUserLoading ? 0.45 : 1, pointerEvents: createUserLoading ? 'none' : 'auto' }}>
          <TextField
            fullWidth
            label={t.admin.users.fullName}
            value={createUserData.fullName}
            onChange={(e) => {
              const fullName = e.target.value;
              onCreateUserDataChange({
                ...createUserData,
                fullName,
                password: generatePassword(fullName),
              });
            }}
            margin="normal"
            required
            disabled={createUserLoading}
          />
          <TextField
            fullWidth
            label={t.admin.users.email}
            type="email"
            value={createUserData.email}
            onChange={(e) =>
              onCreateUserDataChange({ ...createUserData, email: e.target.value })
            }
            margin="normal"
            required
            disabled={createUserLoading}
          />
          <TextField
            fullWidth
            label={t.admin.users.generatedPassword}
            value={createUserData.password}
            margin="normal"
            InputProps={{ readOnly: true }}
            helperText={t.admin.users.passwordHelperText}
            disabled={createUserLoading}
          />
          <FormControl fullWidth margin="normal" required disabled={createUserLoading}>
            <InputLabel>{t.admin.users.role}</InputLabel>
            <Select
              value={createUserData.role}
              onChange={(e) =>
                onCreateUserDataChange({
                  ...createUserData,
                  role: e.target.value as UserRole,
                })
              }
              label={t.admin.users.role}
            >
              <MenuItem value="counselor">{t.roles.counselor}</MenuItem>
              <MenuItem value="admin">{t.roles.admin}</MenuItem>
              <MenuItem value="leader">{t.roles.leader}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {createUserLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
              bgcolor: 'rgba(255,255,255,0.72)',
              zIndex: 1,
            }}
            role="status"
            aria-live="polite"
          >
            <CircularProgress size={36} sx={{ color: '#C99700' }} />
            <Typography variant="body2" color="text.secondary">
              {t.admin.users.createUserInProgress}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseCreate} disabled={createUserLoading}>
          {t.common.cancel}
        </Button>
        <Button
          onClick={onCopyCredentials}
          variant="outlined"
          startIcon={<ContentCopy />}
          disabled={createUserLoading || !createUserData.email || !createUserData.password}
          sx={{ mr: 1 }}
        >
          {t.admin.users.copyCredentials}
        </Button>
        <Button
          onClick={onCreateUser}
          variant="contained"
          disabled={
            createUserLoading ||
            !createUserData.email ||
            !createUserData.fullName ||
            !createUserData.password
          }
          startIcon={
            createUserLoading ? (
              <CircularProgress size={16} color="inherit" />
            ) : undefined
          }
        >
          {t.admin.users.createUser}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={editDialogOpen} onClose={onCloseEdit} maxWidth="sm" fullWidth>
      <DialogTitle>{t.admin.users.editUser}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <TextField
            fullWidth
            label={t.admin.users.fullName}
            value={editUserData.fullName}
            onChange={(e) => onEditUserDataChange({ ...editUserData, fullName: e.target.value })}
            margin="normal"
            required
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>{t.admin.users.role}</InputLabel>
            <Select
              value={editUserData.role}
              onChange={(e) =>
                onEditUserDataChange({ ...editUserData, role: e.target.value as UserRole })
              }
              label={t.admin.users.role}
              disabled={currentUserRole === 'admin' && selectedUser?.role === 'leader'}
            >
              <MenuItem value="counselor">{t.roles.counselor}</MenuItem>
              <MenuItem value="admin">{t.roles.admin}</MenuItem>
              {currentUserRole === 'leader' && (
                <MenuItem value="leader">{t.roles.leader}</MenuItem>
              )}
            </Select>
          </FormControl>
          {currentUserRole === 'admin' && selectedUser?.role === 'leader' && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              {t.admin.users.adminsCannotModifyLeaders}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseEdit}>{t.common.cancel}</Button>
        <Button
          onClick={onEditUser}
          variant="contained"
          disabled={!editUserData.fullName || !editUserData.role}
        >
          {t.admin.users.updateUser}
        </Button>
      </DialogActions>
    </Dialog>
  </>
);

export default AdminUserDialogs;
