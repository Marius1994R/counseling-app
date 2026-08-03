import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { Counselor, User, IssueType, Sex } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { t } from '../../utils/translations';
import { COMMON_SPECIALTIES, normalizeSpecialties } from '../Profile/profileUtils';
import { isCommonSpecialty } from '../Cases/assignmentUtils';
import {
  composeDisplayName,
  formatPhoneDigitsInput,
  isValidRoPhoneDigits,
  parseDateInputValue,
  resolvePersonName,
  stripRoPhonePrefix,
  toDateInputValue,
  toE164RoPhone,
} from '../../utils/nameUtils';

interface CounselorFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    counselorData: Omit<Counselor, 'id' | 'createdAt' | 'updatedAt' | 'activeCases' | 'workloadLevel'>
  ) => void | Promise<void>;
  counselorData?: Counselor | null;
  preselectedUserId?: string;
  /** After creating a counselor user — profile step cannot be skipped */
  requireProfile?: boolean;
  /** After creating admin/leader — show skip CTA */
  allowSkipProfile?: boolean;
  onSkipProfile?: () => void;
}

const CaseCategoryOptions: { value: IssueType; label: string }[] = [
  { value: 'personal', label: t.issueTypes.personal },
  { value: 'relational', label: t.issueTypes.relational },
  { value: 'spiritual', label: t.issueTypes.spiritual },
];

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  sex: '' as Sex | '',
  birthDate: '',
  specialties: [] as string[],
  specialtyCategories: {} as Record<string, IssueType>,
  linkedUserId: '',
};

const CounselorForm: React.FC<CounselorFormProps> = ({
  open,
  onClose,
  onSubmit,
  counselorData,
  preselectedUserId,
  requireProfile = false,
  allowSkipProfile = false,
  onSkipProfile,
}) => {
  const { getAllUsers } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [linkedUserIdsWithProfile, setLinkedUserIdsWithProfile] = useState<Set<string>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    sex: Sex | '';
    birthDate: string;
    specialties: string[];
    specialtyCategories: Record<string, IssueType>;
    linkedUserId?: string;
  }>({ ...emptyForm });

  const [newSpecialty, setNewSpecialty] = useState('');
  const [newSpecialtyCategory, setNewSpecialtyCategory] = useState<IssueType | ''>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const selectableUsers = useMemo(() => {
    const allowIds = new Set<string>();
    if (counselorData?.linkedUserId) allowIds.add(counselorData.linkedUserId);
    if (preselectedUserId) allowIds.add(preselectedUserId);

    return users.filter(
      (user) => allowIds.has(user.id) || !linkedUserIdsWithProfile.has(user.id)
    );
  }, [users, linkedUserIdsWithProfile, counselorData?.linkedUserId, preselectedUserId]);

  // Load users + existing counselor links when dialog opens
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const [allUsers, counselorsSnapshot] = await Promise.all([
          getAllUsers(),
          getDocs(collection(db, 'counselors')),
        ]);
        const taken = new Set<string>();
        counselorsSnapshot.forEach((counselorDoc) => {
          const linkedUserId = counselorDoc.data().linkedUserId;
          if (typeof linkedUserId === 'string' && linkedUserId) {
            taken.add(linkedUserId);
          }
        });
        setLinkedUserIdsWithProfile(taken);
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
        setLinkedUserIdsWithProfile(new Set());
      } finally {
        setLoadingUsers(false);
      }
    };

    if (open) {
      loadUsers();
    }
  }, [open, getAllUsers]);

  // Populate form data when editing or when preselectedUserId is provided
  useEffect(() => {
    if (counselorData) {
      const name = resolvePersonName({
        firstName: counselorData.firstName,
        lastName: counselorData.lastName,
        fullName: counselorData.fullName,
      });
      setFormData({
        firstName: name.firstName,
        lastName: name.lastName,
        email: counselorData.email || '',
        phoneNumber: stripRoPhonePrefix(counselorData.phoneNumber || ''),
        sex: counselorData.sex || '',
        birthDate: toDateInputValue(counselorData.birthDate),
        specialties: normalizeSpecialties(counselorData.specialties || []),
        specialtyCategories: counselorData.specialtyCategories || {},
        linkedUserId: counselorData.linkedUserId || '',
      });
    } else if (preselectedUserId && users.length > 0) {
      const preselectedUser = users.find(u => u.id === preselectedUserId);
      if (preselectedUser) {
        const name = resolvePersonName({ fullName: preselectedUser.fullName || '' });
        setFormData({
          ...emptyForm,
          firstName: name.firstName,
          lastName: name.lastName,
          email: preselectedUser.email || '',
          linkedUserId: preselectedUserId,
        });
      } else {
        setFormData({
          ...emptyForm,
          linkedUserId: preselectedUserId,
        });
      }
    } else {
      setFormData({
        ...emptyForm,
        linkedUserId: preselectedUserId || '',
      });
    }
    setNewSpecialty('');
    setNewSpecialtyCategory('');
    setErrors({});
  }, [counselorData, preselectedUserId, users]);

  const handleChange = (field: string) => (event: any) => {
    let value = event.target.value;
    
    if (field === 'phoneNumber') {
      value = formatPhoneDigitsInput(String(value));
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find(user => user.id === userId);
    if (selectedUser) {
      const name = resolvePersonName({ fullName: selectedUser.fullName || '' });
      setFormData(prev => ({
        ...prev,
        linkedUserId: userId,
        firstName: name.firstName,
        lastName: name.lastName,
        email: selectedUser.email,
      }));
    }
  };

  const handleAddSpecialty = () => {
    const trimmed = newSpecialty.trim();
    if (!trimmed || formData.specialties.includes(trimmed)) return;
    if (!newSpecialtyCategory) {
      setErrors((prev) => ({
        ...prev,
        specialtyCategory: t.assignments.specialtyCategoryRequired,
      }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      specialties: [...prev.specialties, trimmed],
      specialtyCategories: {
        ...prev.specialtyCategories,
        [trimmed]: newSpecialtyCategory,
      },
    }));
    setNewSpecialty('');
    setNewSpecialtyCategory('');
    setErrors((prev) => ({ ...prev, specialtyCategory: '', specialties: '' }));
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setFormData((prev) => {
      const nextCategories = { ...prev.specialtyCategories };
      delete nextCategories[specialty];
      return {
        ...prev,
        specialties: prev.specialties.filter((s) => s !== specialty),
        specialtyCategories: nextCategories,
      };
    });
  };

  const handleAddCommonSpecialty = (specialty: string) => {
    if (!formData.specialties.includes(specialty)) {
      setFormData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, specialty],
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.linkedUserId) newErrors.linkedUserId = 'User account selection is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Numele este obligatoriu';
    if (!formData.firstName.trim()) newErrors.firstName = 'Prenumele este obligatoriu';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Valid email is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    else if (!isValidRoPhoneDigits(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Introdu exact 9 cifre pentru numărul de telefon românesc';
    }
    if (!formData.sex) newErrors.sex = 'Sexul este obligatoriu';
    if (!formData.birthDate) newErrors.birthDate = 'Data nașterii este obligatorie';
    if (formData.specialties.length === 0) newErrors.specialties = 'Este necesară cel puțin o specialitate';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting || !validateForm()) return;

    const specialtyCategories: Record<string, IssueType> = {};
    for (const specialty of formData.specialties) {
      if (!isCommonSpecialty(specialty) && formData.specialtyCategories[specialty]) {
        specialtyCategories[specialty] = formData.specialtyCategories[specialty];
      }
    }

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    try {
      setSubmitting(true);
      await onSubmit({
        firstName,
        lastName,
        fullName: composeDisplayName(firstName, lastName),
        email: formData.email.trim(),
        phoneNumber: toE164RoPhone(formData.phoneNumber),
        sex: formData.sex as Sex,
        birthDate: parseDateInputValue(formData.birthDate),
        specialties: formData.specialties,
        specialtyCategories:
          Object.keys(specialtyCategories).length > 0 ? specialtyCategories : undefined,
        linkedUserId: formData.linkedUserId || undefined,
        ...(counselorData?.avatarUrl ? { avatarUrl: counselorData.avatarUrl } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (requireProfile || submitting) return;
    setFormData({ ...emptyForm });
    setNewSpecialty('');
    setNewSpecialtyCategory('');
    setErrors({});
    onClose();
  };

  const handleSkip = () => {
    if (requireProfile || !allowSkipProfile || submitting) return;
    setFormData({ ...emptyForm });
    setNewSpecialty('');
    setNewSpecialtyCategory('');
    setErrors({});
    onSkipProfile?.();
  };

  const isPostUserCreateStep = Boolean(preselectedUserId && !counselorData);

  return (
    <Dialog 
      open={open} 
      onClose={(_, reason) => {
        if (requireProfile || submitting) return;
        // Post-create step: only explicit skip / complete — not backdrop/escape
        if (isPostUserCreateStep) return;
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          handleClose();
          return;
        }
        handleClose();
      }}
      disableEscapeKeyDown={requireProfile || isPostUserCreateStep || submitting}
      maxWidth="md" 
      fullWidth
      fullScreen={false}
      sx={{
        '& .MuiDialog-paper': {
          m: { xs: 0, sm: 2 },
          maxHeight: { xs: '100vh', sm: '90vh' },
          height: { xs: '100vh', sm: 'auto' },
          maxWidth: { xs: '100%', sm: '600px' }
        },
        '& .MuiDialog-container': {
          alignItems: { xs: 'flex-end', sm: 'center' }
        }
      }}
    >
      <DialogTitle sx={{ 
        fontSize: { xs: '1.25rem', sm: '1.5rem' },
        pb: { xs: 1, sm: 2 }
      }}>
        {counselorData
          ? t.counselors.editCounselor
          : isPostUserCreateStep
            ? t.admin.users.createProfileStepTitle
            : t.adminTools.addCounselor}
      </DialogTitle>
      {isPostUserCreateStep && (
        <Box sx={{ px: { xs: 1.5, sm: 3 }, pb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t.admin.users.createProfileStepHint}
          </Typography>
        </Box>
      )}
      <form onSubmit={handleSubmit}>
      <DialogContent sx={{ 
        px: { xs: 1.5, sm: 3 },
        py: { xs: 1, sm: 2 },
        pb: { xs: 2, sm: 2 },
        overflow: 'auto',
        flex: '1 1 auto'
      }}>
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: { xs: 1.5, sm: 2 }, 
            mt: 1 
          }}>
            {/* Link to User Account */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {'Leagă la Cont Utilizator *'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Selectează un cont utilizator pentru a completa automat numele și email-ul. Poți să le editezi manual.
              </Typography>
              <FormControl fullWidth size="small" required error={!!errors.linkedUserId}>
                <InputLabel>Selectează Cont Utilizator *</InputLabel>
                <Select
                  value={formData.linkedUserId || ''}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  label="Selectează Cont Utilizator *"
                  disabled={loadingUsers}
                >
                  {loadingUsers ? (
                    <MenuItem disabled>{t.common.loading}</MenuItem>
                  ) : selectableUsers.length === 0 ? (
                    <MenuItem disabled>
                      Nu există utilizatori disponibili fără profil de consilier.
                    </MenuItem>
                  ) : (
                    selectableUsers.map((user) => (
                      <MenuItem key={user.id} value={user.id}>
                        {user.fullName} ({user.email}) - {user.role}
                      </MenuItem>
                    ))
                  )}
                </Select>
                {errors.linkedUserId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                    {errors.linkedUserId}
                  </Typography>
                )}
              </FormControl>
            </Box>

            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 }
            }}>
                      <TextField
                        fullWidth
                        label={t.profile.lastName}
                        value={formData.lastName}
                        onChange={handleChange('lastName')}
                        error={!!errors.lastName}
                        helperText={errors.lastName}
                        required
                        size="small"
                      />
                      <TextField
                        fullWidth
                        label={t.profile.firstName}
                        value={formData.firstName}
                        onChange={handleChange('firstName')}
                        error={!!errors.firstName}
                        helperText={errors.firstName}
                        required
                        size="small"
                      />
                    </Box>

            <TextField
              fullWidth
              label={t.login.emailLabel}
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
              required
              size="small"
            />
                    
                    <TextField
                      fullWidth
                      label={t.cases.phoneNumber}
                      value={formData.phoneNumber}
                      onChange={handleChange('phoneNumber')}
                      error={!!errors.phoneNumber}
                      helperText={errors.phoneNumber || "Introdu 9 cifre după +40"}
                      required
                      size="small"
                      placeholder="700 123 456"
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>+40</Typography>
                      }}
                    />

            <Box sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 },
            }}>
            <FormControl fullWidth size="small" required error={!!errors.sex}>
              <InputLabel>{t.profile.sex}</InputLabel>
              <Select
                value={formData.sex}
                onChange={handleChange('sex')}
                label={t.profile.sex}
              >
                <MenuItem value="masculin">{t.cases.sexMasculin}</MenuItem>
                <MenuItem value="feminin">{t.cases.sexFeminin}</MenuItem>
              </Select>
              {errors.sex && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.sex}
                </Typography>
              )}
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label={t.profile.birthDate}
                value={formData.birthDate ? dayjs(formData.birthDate) : null}
                onChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    birthDate: value && value.isValid() ? value.format('YYYY-MM-DD') : '',
                  }));
                  if (errors.birthDate) {
                    setErrors((prev) => ({ ...prev, birthDate: '' }));
                  }
                }}
                format="DD/MM/YYYY"
                views={['year', 'month', 'day']}
                openTo="year"
                yearsOrder="desc"
                maxDate={dayjs()}
                minDate={dayjs().subtract(100, 'year')}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    size: 'small',
                    error: !!errors.birthDate,
                    helperText: errors.birthDate,
                    placeholder: 'zz/ll/aaaa',
                  },
                }}
              />
            </LocalizationProvider>
            </Box>
            
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t.profile.specialties} *
              </Typography>
              
              {/* Current specialties */}
              <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                {formData.specialties.map((specialty) => (
                  <Chip
                    key={specialty}
                    label={specialty}
                    onDelete={() => handleRemoveSpecialty(specialty)}
                    color="primary"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
              
              {/* Add new specialty */}
              <Box display="flex" gap={1} mb={{ xs: 1, sm: 2 }} flexWrap="wrap">
                <TextField
                  fullWidth
                  label={t.profile.addSpecialty}
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSpecialty();
                    }
                  }}
                  size="small"
                  sx={{ flex: '1 1 180px' }}
                />
                <FormControl size="small" sx={{ minWidth: 140 }} error={!!errors.specialtyCategory}>
                  <InputLabel>{t.assignments.specialtyCategory}</InputLabel>
                  <Select
                    value={newSpecialtyCategory}
                    label={t.assignments.specialtyCategory}
                    onChange={(e) =>
                      setNewSpecialtyCategory(e.target.value as IssueType | '')
                    }
                  >
                    {CaseCategoryOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  onClick={handleAddSpecialty}
                  disabled={!newSpecialty.trim()}
                >
                  {t.common.add}
                </Button>
              </Box>
              {errors.specialtyCategory && (
                <Typography variant="caption" color="error" sx={{ display: 'block', mb: 1 }}>
                  {errors.specialtyCategory}
                </Typography>
              )}
              
              {/* Common specialties */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 0.5, sm: 1 } }}>
                {t.profile.commonSpecialties}:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {COMMON_SPECIALTIES
                  .filter(specialty => !formData.specialties.includes(specialty))
                  .map((specialty) => (
                    <Chip
                      key={specialty}
                      label={specialty}
                      onClick={() => handleAddCommonSpecialty(specialty)}
                      variant="outlined"
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
              </Box>
              
              {errors.specialties && (
                <Alert severity="error" sx={{ mt: { xs: 0.5, sm: 1 } }}>
                  {errors.specialties}
                </Alert>
              )}
            </Box>
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ 
          px: { xs: 1.5, sm: 3 },
          pt: { xs: 2, sm: 2 },
          pb: { xs: 'max(1rem, calc(1rem + env(safe-area-inset-bottom)))', sm: 2 },
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: { xs: 1, sm: 0 },
          flexShrink: 0,
          borderTop: { xs: '1px solid', sm: 'none' },
          borderColor: { xs: 'divider', sm: 'transparent' },
          backgroundColor: 'background.paper'
        }}>
          {!requireProfile && (
            <Button 
              onClick={allowSkipProfile ? handleSkip : handleClose}
              disabled={submitting}
              fullWidth={false}
              sx={{ 
                width: { xs: '100%', sm: 'auto' },
                order: { xs: 2, sm: 1 }
              }}
            >
              {allowSkipProfile ? t.admin.users.skipCounselorProfile : t.common.cancel}
            </Button>
          )}
          <Button 
            type="submit" 
            variant="contained"
            fullWidth={false}
            disabled={
              submitting ||
              !formData.linkedUserId ||
              !formData.lastName.trim() ||
              !formData.firstName.trim() ||
              !formData.email.trim() ||
              !formData.phoneNumber.trim() ||
              !formData.sex ||
              !formData.birthDate ||
              formData.specialties.length === 0 ||
              !isValidRoPhoneDigits(formData.phoneNumber)
            }
            startIcon={
              submitting ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            sx={{ 
              width: { xs: '100%', sm: 'auto' },
              order: { xs: 1, sm: 2 }
            }}
          >
            {counselorData ? t.common.save : t.common.add}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CounselorForm;
