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
  Chip,
  Box,
  Typography,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Case, CaseStatus, IssueType, CivilStatus } from '../../types';
import { t } from '../../utils/translations';

interface CaseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  caseData?: Case | null;
  counselors: Array<{ id: string; fullName: string }>;
}

const CaseForm: React.FC<CaseFormProps> = ({
  open,
  onClose,
  onSubmit,
  caseData,
  counselors
}) => {
  const [formData, setFormData] = useState({
    counseledName: caseData?.counseledName || '',
    age: caseData?.age || '',
    civilStatus: caseData?.civilStatus || 'unmarried',
    issueTypes: caseData?.issueTypes || [],
    phoneNumber: caseData?.phoneNumber || '',
    description: caseData?.description || '',
    status: caseData?.status || 'waiting',
    assignedCounselorId: caseData?.assignedCounselorId || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const issueTypeOptions: IssueType[] = ['spiritual', 'relational', 'personal'];
  const civilStatusOptions: CivilStatus[] = ['unmarried', 'married', 'divorced', 'engaged', 'widowed'];
  const statusOptions: CaseStatus[] = ['waiting', 'active', 'unfinished', 'finished', 'cancelled'];

  // Translation functions
  const translateCivilStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'unmarried': 'Necăsătorit/ă', 
      'married': 'Căsătorit/ă',
      'divorced': 'Divorțat/ă',
      'engaged': 'Logodit/ă',
      'widowed': 'Văduv/ă'
    };
    return statusMap[status] || status;
  };

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'waiting': 'În Așteptare',
      'active': 'Activ',
      'unfinished': 'Nefinalizat',
      'finished': 'Terminat',
      'cancelled': 'Anulat'
    };
    return statusMap[status] || status;
  };

  const handleChange = (field: string) => (event: any) => {
    const value = event.target.value;
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

  const handleIssueTypeChange = (issueType: IssueType) => {
    setFormData(prev => ({
      ...prev,
      issueTypes: prev.issueTypes.includes(issueType)
        ? prev.issueTypes.filter(type => type !== issueType)
        : [...prev.issueTypes, issueType]
    }));
  };

  // Populate form with existing data when editing
  useEffect(() => {
    if (caseData) {
      setFormData({
        counseledName: caseData.counseledName,
        age: caseData.age,
        civilStatus: caseData.civilStatus,
        issueTypes: caseData.issueTypes,
        phoneNumber: caseData.phoneNumber,
        status: caseData.status,
        assignedCounselorId: caseData.assignedCounselorId || '',
        description: caseData.description
      });
    } else {
      // Reset form for new case
      setFormData({
        counseledName: '',
        age: '',
        civilStatus: 'unmarried',
        issueTypes: [],
        phoneNumber: '',
        status: 'waiting',
        assignedCounselorId: '',
        description: ''
      });
    }
    setErrors({});
  }, [caseData, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.counseledName.trim()) newErrors.counseledName = 'Name is required';
    if (!formData.age || Number(formData.age) < 1 || Number(formData.age) > 120) newErrors.age = 'Valid age is required';
    if (formData.issueTypes.length === 0) newErrors.issueTypes = 'At least one issue type is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.description.trim()) newErrors.description = 'Problem description is required';
    
    // Counselor is required for active and finished cases
    if ((formData.status === 'active' || formData.status === 'finished') && !formData.assignedCounselorId) {
      newErrors.assignedCounselorId = 'Counselor is required for active and finished cases';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Auto-generate title from counseled name
    const generatedTitle = `${formData.counseledName.trim()} - Caz`;

    onSubmit({
      title: generatedTitle,
      counseledName: formData.counseledName.trim(),
      age: Number(formData.age),
      civilStatus: formData.civilStatus as CivilStatus,
      issueTypes: formData.issueTypes,
      phoneNumber: formData.phoneNumber.trim(),
      description: formData.description.trim(),
      status: formData.status as CaseStatus,
      assignedCounselorId: formData.assignedCounselorId || undefined,
      assignedCounselorName: formData.assignedCounselorId 
        ? counselors.find(c => c.id === formData.assignedCounselorId)?.fullName
        : undefined
    });

    onClose();
  };

  const handleClose = () => {
    setFormData({
      counseledName: '',
      age: '',
      civilStatus: 'unmarried',
      issueTypes: [],
      phoneNumber: '',
      description: '',
      status: 'waiting',
      assignedCounselorId: ''
    });
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
        {caseData ? t.cases.editCase : t.cases.createCase}
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
            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 }
            }}>
              <TextField
                fullWidth
                label={t.cases.counseledName}
                value={formData.counseledName}
                onChange={handleChange('counseledName')}
                error={!!errors.counseledName}
                helperText={errors.counseledName}
                required
                size="small"
              />
              
              <TextField
                fullWidth
                label={t.cases.age}
                type="number"
                value={formData.age}
                onChange={handleChange('age')}
                error={!!errors.age}
                helperText={errors.age}
                required
                inputProps={{ min: 1, max: 120 }}
                size="small"
                sx={{ maxWidth: { xs: '100%', sm: '150px' } }}
              />
            </Box>
            
            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 }
            }}>
              <FormControl fullWidth required size="small">
                <InputLabel>{t.cases.civilStatus}</InputLabel>
                <Select
                  value={formData.civilStatus}
                  onChange={handleChange('civilStatus')}
                  label={t.cases.civilStatus}
                >
                  {civilStatusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {translateCivilStatus(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth required size="small">
                <InputLabel>{t.cases.status}</InputLabel>
                <Select
                  value={formData.status}
                  onChange={handleChange('status')}
                  label={t.cases.status}
                >
                  {statusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {translateStatus(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            
            <Box>
              <Typography 
                variant="subtitle2" 
                gutterBottom
                sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
              >
                {t.cases.issueTypes} *
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: { xs: 0.75, sm: 1 }
              }}>
                {issueTypeOptions.map((issueType) => (
                  <Chip
                    key={issueType}
                    label={issueType.charAt(0).toUpperCase() + issueType.slice(1)}
                    onClick={() => handleIssueTypeChange(issueType)}
                    color={formData.issueTypes.includes(issueType) ? 'primary' : 'default'}
                    variant={formData.issueTypes.includes(issueType) ? 'filled' : 'outlined'}
                    size="small"
                    sx={{ 
                      fontSize: { xs: '0.75rem', sm: '0.875rem' },
                      minHeight: { xs: '28px', sm: '32px' }
                    }}
                  />
                ))}
              </Box>
              {errors.issueTypes && (
                <Typography 
                  color="error" 
                  variant="caption"
                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                >
                  {errors.issueTypes}
                </Typography>
              )}
            </Box>
            
            <Box sx={{ 
              display: "flex", 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 }
            }}>
              <TextField
                fullWidth
                label={t.cases.phoneNumber}
                value={formData.phoneNumber}
                onChange={handleChange('phoneNumber')}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber}
                required
                size="small"
              />
              
              <FormControl 
                fullWidth 
                error={!!errors.assignedCounselorId}
                size="small"
              >
                <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  {t.cases.assignedCounselor}
                  {(formData.status === 'active' || formData.status === 'finished') && ' *'}
                </InputLabel>
                  <Select
                    value={formData.assignedCounselorId}
                    onChange={handleChange('assignedCounselorId')}
                    label={t.cases.assignedCounselor}
                  >
                  <MenuItem value="">
                    <em>Nealocat</em>
                  </MenuItem>
                  {counselors.map((counselor) => (
                    <MenuItem key={counselor.id} value={counselor.id}>
                      {counselor.fullName}
                    </MenuItem>
                  ))}
                </Select>
                {errors.assignedCounselorId ? (
                  <Typography 
                    variant="caption" 
                    color="error" 
                    sx={{ 
                      mt: 0.5, 
                      ml: 1.75,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                    }}
                  >
                    {errors.assignedCounselorId}
                  </Typography>
                ) : (formData.status === 'active' || formData.status === 'finished') ? (
                  <Typography 
                    variant="caption" 
                    color="text.secondary" 
                    sx={{ 
                      mt: 0.5, 
                      ml: 1.75,
                      fontSize: { xs: '0.7rem', sm: '0.75rem' }
                    }}
                  >
                    Required for active and finished cases
                  </Typography>
                ) : null}
              </FormControl>
            </Box>
            
            <TextField
              fullWidth
              label={t.cases.description}
              multiline
              rows={4}
              value={formData.description}
              onChange={handleChange('description')}
              error={!!errors.description}
              helperText={errors.description}
              placeholder="Descrie problemele și dificultățile pe care le întâmpină persoana..."
              size="small"
              required
            />
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
              !formData.counseledName.trim() ||
              !formData.age ||
              Number(formData.age) < 1 ||
              Number(formData.age) > 120 ||
              formData.issueTypes.length === 0 ||
              !formData.phoneNumber.trim() ||
              !formData.description.trim() ||
              ((formData.status === 'active' || formData.status === 'finished') && !formData.assignedCounselorId)
            }
            sx={{ 
              width: { xs: '100%', sm: 'auto' },
              order: { xs: 1, sm: 2 }
            }}
          >
            {caseData ? t.common.save : t.common.add}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CaseForm;
