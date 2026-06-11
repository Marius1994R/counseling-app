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
} from '@mui/material';
import { useProfileData } from '../../hooks/useProfileData';
import { computeCaseStats } from './profileUtils';
import ProfilePageHeader from './ProfilePageHeader';
import ProfileHeroCard from './ProfileHeroCard';
import ProfileStatsRow from './ProfileStatsRow';
import ProfileSpecialties from './ProfileSpecialties';
import ProfileSkeleton from './ProfileSkeleton';
import { t } from '../../utils/translations';

const MyProfile: React.FC = () => {
  const data = useProfileData();
  const stats = computeCaseStats(data.cases);

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
      <ProfileHeroCard
        counselor={data.counselor}
        role={data.currentUser?.role}
        onEdit={data.handleEditClick}
      />
      <ProfileStatsRow stats={stats} />
      <ProfileSpecialties specialties={data.counselor.specialties} />

      <Dialog
        open={data.editDialogOpen}
        onClose={() => data.setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t.profile.editProfile}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
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
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>+40</Typography>,
              }}
            />

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

              <Box display="flex" gap={1} mb={2}>
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
                />
                <Button
                  variant="outlined"
                  onClick={data.handleAddSpecialty}
                  disabled={!data.newSpecialty.trim()}
                >
                  {t.common.add}
                </Button>
              </Box>

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
          <Button onClick={() => data.setEditDialogOpen(false)}>{t.common.cancel}</Button>
          <Button
            onClick={data.handleSave}
            variant="contained"
            sx={{ backgroundColor: '#C99700', '&:hover': { backgroundColor: '#B8860B' } }}
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
