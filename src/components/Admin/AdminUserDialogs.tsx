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
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { User, UserRole } from '../../types';
import { CreateUserData, generatePassword } from './adminUtils';
import { t } from '../../utils/translations';

interface AdminUserDialogsProps {
  createDialogOpen: boolean;
  editDialogOpen: boolean;
  showNextStepDialog: boolean;
  createUserData: CreateUserData;
  editUserData: Partial<CreateUserData>;
  selectedUser: User | null;
  currentUserRole?: UserRole;
  onCloseCreate: () => void;
  onCloseEdit: () => void;
  onCloseNextStep: () => void;
  onCreateUserDataChange: (data: CreateUserData) => void;
  onEditUserDataChange: (data: Partial<CreateUserData>) => void;
  onCreateUser: () => void;
  onEditUser: () => void;
  onCopyCredentials: () => void;
  onNextStepToCounselor: () => void;
}

const AdminUserDialogs: React.FC<AdminUserDialogsProps> = ({
  createDialogOpen,
  editDialogOpen,
  showNextStepDialog,
  createUserData,
  editUserData,
  selectedUser,
  currentUserRole,
  onCloseCreate,
  onCloseEdit,
  onCloseNextStep,
  onCreateUserDataChange,
  onEditUserDataChange,
  onCreateUser,
  onEditUser,
  onCopyCredentials,
  onNextStepToCounselor,
}) => (
  <>
    <Dialog open={createDialogOpen} onClose={onCloseCreate} maxWidth="sm" fullWidth>
      <DialogTitle>{t.admin.users.createNewUser}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
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
          />
          <TextField
            fullWidth
            label={t.admin.users.generatedPassword}
            value={createUserData.password}
            margin="normal"
            InputProps={{ readOnly: true }}
            helperText={t.admin.users.passwordHelperText}
          />
          <FormControl fullWidth margin="normal" required>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseCreate}>{t.common.cancel}</Button>
        <Button
          onClick={onCopyCredentials}
          variant="outlined"
          startIcon={<ContentCopy />}
          disabled={!createUserData.email || !createUserData.password}
          sx={{ mr: 1 }}
        >
          {t.admin.users.copyCredentials}
        </Button>
        <Button
          onClick={onCreateUser}
          variant="contained"
          disabled={!createUserData.email || !createUserData.fullName || !createUserData.password}
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

    <Dialog open={showNextStepDialog} onClose={onCloseNextStep} maxWidth="sm" fullWidth>
      <DialogTitle>Utilizator creat cu succes!</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Utilizatorul a fost creat cu succes. Dorești să îl legi la un cont de consilier?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Poți lega utilizatorul la un cont de consilier acum sau poți face acest lucru mai târziu
          din secțiunea de gestionare a consilierilor.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseNextStep}>{t.common.cancel}</Button>
        <Button onClick={onNextStepToCounselor} variant="contained">
          {t.counselors.addCounselor}
        </Button>
      </DialogActions>
    </Dialog>
  </>
);

export default AdminUserDialogs;
