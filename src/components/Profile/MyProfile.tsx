import React from 'react';
import {
  Box,
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { useProfileData } from '../../hooks/useProfileData';
import ProfilePageHeader from './ProfilePageHeader';
import ProfileHeroCard from './ProfileHeroCard';
import ProfileSpecialties from './ProfileSpecialties';
import ProfileSkeleton from './ProfileSkeleton';
import { t } from '../../utils/translations';
import ConfirmDialog from '../common/ConfirmDialog';

const MyProfile: React.FC = () => {
  const data = useProfileData();

  if (data.loading) {
    return (
      <div>
        <ProfilePageHeader />
        <ProfileSkeleton />
      </div>
    );
  }

  if (!data.counselor || data.loadError) {
    return (
      <div>
        <ProfilePageHeader />
        <Alert severity="error" className="rounded-xl">
          {t.profile.loadError}
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <ProfilePageHeader />
      <input
        ref={data.fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={data.handleAvatarFileChange}
      />

      <ProfileHeroCard
        counselor={data.counselor}
        role={data.currentUser?.role}
        avatarUploading={data.avatarUploading}
        onEdit={data.handleEditClick}
        onAvatarClick={data.handleAvatarClick}
        onRemoveAvatar={data.handleRequestRemoveAvatar}
      />

      <ConfirmDialog
        open={data.removeAvatarConfirmOpen}
        title={t.profile.removeAvatar}
        message={t.profile.removeAvatarConfirm}
        confirmLabel={t.profile.removeAvatar}
        variant="danger"
        loading={data.avatarUploading}
        onClose={data.handleCancelRemoveAvatar}
        onConfirm={data.handleConfirmRemoveAvatar}
      />
      <ProfileSpecialties specialties={data.counselor.specialties} />

      <Dialog
        open={data.editDialogOpen}
        onClose={(_, reason) => {
          if (data.saving) return;
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            data.setEditDialogOpen(false);
            return;
          }
          data.setEditDialogOpen(false);
        }}
        disableEscapeKeyDown={data.saving}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t.profile.editProfile}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, opacity: data.saving ? 0.45 : 1, pointerEvents: data.saving ? 'none' : 'auto' }}>
            <TextField
              fullWidth
              label={t.profile.phoneNumber}
              value={data.editData.phoneNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                const limitedDigits = digits.slice(0, 9);
                let formatted = limitedDigits;
                if (limitedDigits.length > 6) {
                  formatted = `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3, 6)} ${limitedDigits.slice(6)}`;
                } else if (limitedDigits.length > 3) {
                  formatted = `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3)}`;
                }
                data.setEditData((prev) => ({ ...prev, phoneNumber: formatted }));
              }}
              margin="normal"
              placeholder="123 456 789"
              disabled={data.saving}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>+40</Typography>,
              }}
            />

            <FormControl fullWidth margin="normal" required disabled={data.saving}>
              <InputLabel>{t.profile.sex}</InputLabel>
              <Select
                value={data.editData.sex}
                label={t.profile.sex}
                onChange={(e) =>
                  data.setEditData((prev) => ({
                    ...prev,
                    sex: e.target.value as '' | 'masculin' | 'feminin',
                  }))
                }
              >
                <MenuItem value="masculin">{t.cases.sexMasculin}</MenuItem>
                <MenuItem value="feminin">{t.cases.sexFeminin}</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t.profile.specialties}
              </Typography>

              <Box sx={{ mb: 2 }}>
                {data.editData.specialties.map((specialty) => (
                  <Chip
                    key={specialty}
                    label={specialty}
                    onDelete={() => data.handleRemoveSpecialty(specialty)}
                    color="primary"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>

              <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                <TextField
                  fullWidth
                  label={t.profile.addSpecialty}
                  value={data.newSpecialty}
                  onChange={(e) => data.setNewSpecialty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      data.handleAddSpecialty();
                    }
                  }}
                  size="small"
                  sx={{ flex: '1 1 160px' }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }} error={!!data.specialtyCategoryError}>
                  <InputLabel>{t.assignments.specialtyCategory}</InputLabel>
                  <Select
                    value={data.newSpecialtyCategory}
                    label={t.assignments.specialtyCategory}
                    onChange={(e) =>
                      data.setNewSpecialtyCategory(e.target.value as '' | 'personal' | 'relational' | 'spiritual')
                    }
                  >
                    <MenuItem value="personal">{t.issueTypes.personal}</MenuItem>
                    <MenuItem value="relational">{t.issueTypes.relational}</MenuItem>
                    <MenuItem value="spiritual">{t.issueTypes.spiritual}</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  onClick={data.handleAddSpecialty}
                  disabled={!data.newSpecialty.trim()}
                >
                  {t.common.add}
                </Button>
              </Box>
              {data.specialtyCategoryError && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                  {data.specialtyCategoryError}
                </Typography>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t.profile.commonSpecialties}:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {data.commonSpecialties
                  .filter((specialty) => !data.editData.specialties.includes(specialty))
                  .map((specialty) => (
                    <Chip
                      key={specialty}
                      label={specialty}
                      onClick={() => data.handleAddCommonSpecialty(specialty)}
                      variant="outlined"
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => data.setEditDialogOpen(false)}
            disabled={data.saving}
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={data.handleSave}
            variant="contained"
            disabled={data.saving || !data.editData.sex}
            startIcon={
              data.saving ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            sx={{ backgroundColor: '#C99700', '&:hover': { backgroundColor: '#B89A00' } }}
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={data.snackbar.open}
        autoHideDuration={6000}
        onClose={() => data.setSnackbar({ ...data.snackbar, open: false })}
      >
        <Alert
          onClose={() => data.setSnackbar({ ...data.snackbar, open: false })}
          severity={data.snackbar.severity}
          sx={{ width: '100%' }}
        >
          {data.snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MyProfile;
