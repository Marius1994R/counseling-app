import React, { useState, useEffect } from 'react';
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
  Alert
} from '@mui/material';
import { Counselor, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../utils/translations';

interface CounselorFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (counselorData: Omit<Counselor, 'id' | 'createdAt' | 'updatedAt' | 'activeCases' | 'workloadLevel'>) => void;
  counselorData?: Counselor | null;
  preselectedUserId?: string;
}

const CounselorForm: React.FC<CounselorFormProps> = ({
  open,
  onClose,
  onSubmit,
  counselorData,
  preselectedUserId
}) => {
  const { getAllUsers } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [formData, setFormData] = useState<{
    fullName: string;
    email: string;
    phoneNumber: string;
    specialties: string[];
    linkedUserId?: string;
  }>({
    fullName: '',
    email: '',
    phoneNumber: '',
    specialties: [],
    linkedUserId: ''
  });

  const [newSpecialty, setNewSpecialty] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load users when component mounts
  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const allUsers = await getAllUsers();
        // Show all users (not just counselors) so they can be linked to counselors
        setUsers(allUsers);
        console.log('Loaded users for counselor linking:', allUsers);
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
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
      // Remove +40 prefix from existing phone number for editing
      const phoneWithoutPrefix = counselorData.phoneNumber?.replace(/^\+40\s?/, '') || '';
      setFormData({
        fullName: counselorData.fullName || '',
        email: counselorData.email || '',
        phoneNumber: phoneWithoutPrefix,
        specialties: counselorData.specialties || [],
        linkedUserId: counselorData.linkedUserId || ''
      });
    } else if (preselectedUserId && users.length > 0) {
      // Pre-select the user if preselectedUserId is provided
      const preselectedUser = users.find(u => u.id === preselectedUserId);
      if (preselectedUser) {
        setFormData({
          fullName: preselectedUser.fullName || '',
          email: preselectedUser.email || '',
          phoneNumber: '',
          specialties: [],
          linkedUserId: preselectedUserId
        });
      } else {
        // Reset form for new counselor
        setFormData({
          fullName: '',
          email: '',
          phoneNumber: '',
          specialties: [],
          linkedUserId: preselectedUserId // Still set the linkedUserId even if user not found yet
        });
      }
    } else {
      // Reset form for new counselor
      setFormData({
        fullName: '',
        email: '',
        phoneNumber: '',
        specialties: [],
        linkedUserId: preselectedUserId || ''
      });
    }
    setNewSpecialty('');
    setErrors({});
  }, [counselorData, preselectedUserId, users]);

  const commonSpecialties = [
    'Consiliere Căsnicie',
    'Terapie Familială',
    'Consiliere Doliu',
    'Recuperare Dependențe',
    'Probleme Adolescenți',
    'Orientare Spirituală',
    'Anxietate și Depresie',
    'Managementul Mâniei',
    'Consiliere Financiară',
    'Orientare Carieră',
    'Probleme Relațiilor',
    'Intervenție în Criză'
  ];

  const handleChange = (field: string) => (event: any) => {
    let value = event.target.value;
    
    // Format phone number input
    if (field === 'phoneNumber') {
      // Remove all non-digits
      const digits = value.replace(/\D/g, '');
      // Limit to 9 digits
      const limitedDigits = digits.slice(0, 9);
      // Format as XXX XXX XXX
      if (limitedDigits.length > 6) {
        value = `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3, 6)} ${limitedDigits.slice(6)}`;
      } else if (limitedDigits.length > 3) {
        value = `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3)}`;
      } else {
        value = limitedDigits;
      }
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
      setFormData(prev => ({
        ...prev,
        linkedUserId: userId,
        fullName: selectedUser.fullName,
        email: selectedUser.email
      }));
    }
  };

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !formData.specialties.includes(newSpecialty.trim())) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }));
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const handleAddCommonSpecialty = (specialty: string) => {
    if (!formData.specialties.includes(specialty)) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty]
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.linkedUserId) newErrors.linkedUserId = 'User account selection is required';
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Valid email is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    else {
      const digits = formData.phoneNumber.replace(/\D/g, '');
      if (digits.length !== 9) {
        newErrors.phoneNumber = 'Introdu exact 9 cifre pentru numărul de telefon românesc';
      }
    }
    if (formData.specialties.length === 0) newErrors.specialties = 'Este necesară cel puțin o specialitate';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    onSubmit({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phoneNumber: `+40${formData.phoneNumber.replace(/[\s\-\(\)]/g, '')}`,
      specialties: formData.specialties,
      linkedUserId: formData.linkedUserId || undefined
    });

    onClose();
  };

  const handleClose = () => {
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      specialties: [],
      linkedUserId: ''
    });
    setNewSpecialty('');
    setErrors({});
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={false}
      sx={{
        '& .MuiDialog-paper': {
          m: { xs: 1, sm: 2 },
          maxHeight: { xs: '95vh', sm: '90vh' }
        }
      }}
    >
      <DialogTitle sx={{ 
        fontSize: { xs: '1.25rem', sm: '1.5rem' },
        pb: { xs: 1, sm: 2 }
      }}>
        {counselorData ? 'Editează Consilier' : 'Creează Profil Consilier'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ 
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1, sm: 2 }
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
                  ) : users.length === 0 ? (
                    <MenuItem disabled>Nu există utilizatori disponibili. Creează utilizatori în Unelte Admin.</MenuItem>
                  ) : (
                    users.map((user) => (
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
                        label={t.profile.fullName}
                        value={formData.fullName}
                        onChange={handleChange('fullName')}
                        error={!!errors.fullName}
                        helperText={errors.fullName}
                        required
                        size="small"
                      />
                      
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
                    </Box>
                    
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
              <Box display="flex" gap={1} mb={{ xs: 1, sm: 2 }}>
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
                />
                <Button
                  variant="outlined"
                  onClick={handleAddSpecialty}
                  disabled={!newSpecialty.trim()}
                >
                  {t.common.add}
                </Button>
              </Box>
              
              {/* Common specialties */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 0.5, sm: 1 } }}>
                {t.profile.commonSpecialties}:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {commonSpecialties
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
          py: { xs: 1, sm: 2 },
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}>
          <Button 
            onClick={handleClose}
            fullWidth={false}
            sx={{ 
              width: { xs: '100%', sm: 'auto' },
              order: { xs: 2, sm: 1 }
            }}
          >
            {t.common.cancel}
          </Button>
          <Button 
            type="submit" 
            variant="contained"
            fullWidth={false}
            disabled={
              !formData.linkedUserId ||
              !formData.fullName.trim() ||
              !formData.email.trim() ||
              !formData.phoneNumber.trim() ||
              formData.specialties.length === 0 ||
              (formData.phoneNumber.replace(/\D/g, '').length !== 9)
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
