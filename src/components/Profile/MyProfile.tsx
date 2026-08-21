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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useProfileData } from '../../hooks/useProfileData';
import ProfilePageHeader from './ProfilePageHeader';
import ProfileHeroCard from './ProfileHeroCard';
import ProfileSpecialties from './ProfileSpecialties';
import ProfileSkeleton from './ProfileSkeleton';
import { t } from '../../utils/translations';
import ConfirmDialog from '../common/ConfirmDialog';

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Box>
    <Typography
      component="h3"
      sx={{
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
      }}
    >
      {title}
    </Typography>
    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</Box>
  </Box>
);

const MyProfile: React.FC = () => {
  const data = useProfileData();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

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

      <ProfileSpecialties
        specialties={data.counselor.specialties}
        onEdit={data.handleEditSpecialtiesClick}
      />

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
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{
          sx: {
            borderRadius: fullScreen ? 0 : 3,
            border: fullScreen ? 'none' : '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <DialogTitle
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography component="span" sx={{ display: 'block', fontSize: '1rem', fontWeight: 600 }}>
            {t.profile.editProfile}
          </Typography>
          <Typography
            component="span"
            noWrap
            sx={{ mt: 0.5, display: 'block', fontSize: '0.875rem', color: 'text.secondary' }}
          >
            {data.counselor.fullName || t.profile.formSubtitle}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              opacity: data.saving ? 0.45 : 1,
              pointerEvents: data.saving ? 'none' : 'auto',
            }}
          >
            <FormSection title={t.profile.sectionContact}>
              <TextField
                fullWidth
                label={t.profile.email}
                value={data.counselor.email}
                disabled
                helperText="Email-ul contului nu poate fi modificat."
              />

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
                placeholder="123 456 789"
                disabled={data.saving}
                InputProps={{
                  startAdornment: (
                    <Typography sx={{ mr: 1, color: 'text.secondary' }}>+40</Typography>
                  ),
                }}
              />

              <FormControl fullWidth required disabled={data.saving}>
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

              <TextField
                fullWidth
                type="date"
                label={t.profile.birthDate}
                value={data.editData.birthDate}
                onChange={(e) =>
                  data.setEditData((prev) => ({ ...prev, birthDate: e.target.value }))
                }
                disabled={data.saving}
                InputLabelProps={{ shrink: true }}
              />
            </FormSection>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            gap: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            onClick={() => data.setEditDialogOpen(false)}
            disabled={data.saving}
            variant="outlined"
            color="inherit"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={data.handleSaveProfile}
            variant="contained"
            disableElevation
            disabled={data.saving || !data.editData.sex}
            startIcon={
              data.saving ? <CircularProgress size={16} color="inherit" /> : undefined
            }
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={data.specialtiesDialogOpen}
        onClose={(_, reason) => {
          if (data.saving) return;
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            data.setSpecialtiesDialogOpen(false);
            return;
          }
          data.setSpecialtiesDialogOpen(false);
        }}
        disableEscapeKeyDown={data.saving}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{
          sx: {
            borderRadius: fullScreen ? 0 : 3,
            border: fullScreen ? 'none' : '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        <DialogTitle
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography component="span" sx={{ display: 'block', fontSize: '1rem', fontWeight: 600 }}>
            {t.profile.editSpecialties}
          </Typography>
          <Typography
            component="span"
            noWrap
            sx={{ mt: 0.5, display: 'block', fontSize: '0.875rem', color: 'text.secondary' }}
          >
            {data.counselor.fullName || t.profile.specialtiesFormSubtitle}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2.5 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              opacity: data.saving ? 0.45 : 1,
              pointerEvents: data.saving ? 'none' : 'auto',
            }}
          >
            <FormSection title={t.profile.specialties}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {data.specialtiesData.specialties.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t.profile.noSpecialties}
                  </Typography>
                ) : (
                  data.specialtiesData.specialties.map((specialty) => (
                    <Chip
                      key={specialty}
                      label={specialty}
                      onDelete={() => data.handleRemoveSpecialty(specialty)}
                      color="primary"
                    />
                  ))
                )}
              </Box>

              <Box display="flex" gap={1} flexWrap="wrap">
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
                      data.setNewSpecialtyCategory(
                        e.target.value as '' | 'personal' | 'relational' | 'spiritual'
                      )
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
                <Typography variant="caption" color="error">
                  {data.specialtyCategoryError}
                </Typography>
              )}
            </FormSection>

            <FormSection title={t.profile.commonSpecialties}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                {data.commonSpecialties
                  .filter((specialty) => !data.specialtiesData.specialties.includes(specialty))
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
            </FormSection>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            gap: 1,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            onClick={() => data.setSpecialtiesDialogOpen(false)}
            disabled={data.saving}
            variant="outlined"
            color="inherit"
          >
            {t.common.cancel}
          </Button>
          <Button
            onClick={data.handleSaveSpecialties}
            variant="contained"
            disableElevation
            disabled={data.saving}
            startIcon={
              data.saving ? <CircularProgress size={16} color="inherit" /> : undefined
            }
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
