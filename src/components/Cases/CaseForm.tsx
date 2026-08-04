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
  Chip,
  Box,
  Typography,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { Case, CaseStatus, IssueType, CivilStatus, Sex, Counselor, CasePriority, ReferralSource } from '../../types';
import { t } from '../../utils/translations';
import {
  filterAssignableCounselors,
  formatCounselorOptionLabel,
  rankCounselorsForCase,
} from './assignmentUtils';
import { REFERRAL_SOURCE_OPTIONS } from './casesUtils';
import {
  composeDisplayName,
  formatPhoneDigitsInput,
  isValidRoPhoneDigits,
  resolvePersonName,
  stripRoPhonePrefix,
  toE164RoPhone,
} from '../../utils/nameUtils';

export type CaseFormSubmitData = Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;

interface CaseFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (caseData: CaseFormSubmitData) => void | Promise<void>;
  caseData?: Case | null;
  counselors: Counselor[];
  /** User IDs with isActive === false — excluded from counselor suggestions */
  inactiveUserIds?: ReadonlySet<string> | string[];
}

const CaseForm: React.FC<CaseFormProps> = ({
  open,
  onClose,
  onSubmit,
  caseData,
  counselors,
  inactiveUserIds,
}) => {
  const initialCaseName = resolvePersonName({
    firstName: caseData?.firstName,
    lastName: caseData?.lastName,
    fullName: caseData?.counseledName,
  });
  const [formData, setFormData] = useState({
    firstName: initialCaseName.firstName,
    lastName: initialCaseName.lastName,
    age: caseData?.age || '',
    sex: (caseData?.sex || 'masculin') as Sex,
    civilStatus: caseData?.civilStatus || 'unmarried',
    issueTypes: caseData?.issueTypes || ([] as IssueType[]),
    phoneNumber: caseData?.phoneNumber ? stripRoPhonePrefix(caseData.phoneNumber) : '',
    description: caseData?.description || '',
    referralSource: (caseData?.referralSource || '') as ReferralSource | '',
    priority: (caseData?.priority || 'normal') as CasePriority,
    status: (caseData?.status || 'waiting') as CaseStatus,
    counselorId:
      caseData?.proposedCounselorId ||
      caseData?.assignedCounselorId ||
      '',
  });
  const [forceAssign, setForceAssign] = useState(
    caseData?.assignmentStatus === 'forced' || caseData?.assignmentStatus === 'accepted'
  );
  const [counselorTouched, setCounselorTouched] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const issueTypeOptions: IssueType[] = ['spiritual', 'relational', 'personal'];
  const civilStatusOptions: CivilStatus[] = [
    'unmarried',
    'married',
    'divorced',
    'engaged',
    'widowed',
  ];
  const statusOptions: CaseStatus[] = [
    'waiting',
    'active',
    'unfinished',
    'finished',
    'cancelled',
  ];

  const rankedCounselors = useMemo(() => {
    const inactive =
      inactiveUserIds instanceof Set
        ? inactiveUserIds
        : new Set(inactiveUserIds ?? []);
    const keep = new Set(
      [caseData?.proposedCounselorId, caseData?.assignedCounselorId].filter(
        (id): id is string => Boolean(id)
      )
    );
    const assignable = filterAssignableCounselors(counselors, inactive, keep);
    return rankCounselorsForCase(formData.issueTypes, assignable, formData.sex);
  }, [
    formData.issueTypes,
    formData.sex,
    counselors,
    inactiveUserIds,
    caseData?.proposedCounselorId,
    caseData?.assignedCounselorId,
  ]);

  const translateCivilStatus = (status: string, sex?: Sex) => {
    const isFeminin = sex === 'feminin';
    const statusMap: Record<string, { masculin: string; feminin: string }> = {
      unmarried: { masculin: 'Necăsătorit', feminin: 'Necăsătorită' },
      married: { masculin: 'Căsătorit', feminin: 'Căsătorită' },
      divorced: { masculin: 'Divorțat', feminin: 'Divorțată' },
      engaged: { masculin: 'Logodit', feminin: 'Logodită' },
      widowed: { masculin: 'Văduv', feminin: 'Văduvă' },
    };
    const translations = statusMap[status];
    if (translations) {
      return isFeminin ? translations.feminin : translations.masculin;
    }
    return status;
  };

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      waiting: 'În Așteptare',
      active: 'Activ',
      unfinished: 'Nefinalizat',
      finished: 'Terminat',
      cancelled: 'Anulat',
    };
    return statusMap[status] || status;
  };

  const handleChange = (field: string) => (event: { target: { value: unknown } }) => {
    let value = event.target.value;
    if (field === 'phoneNumber') {
      value = formatPhoneDigitsInput(String(value ?? ''));
    }
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleIssueTypeChange = (issueType: IssueType) => {
    setFormData((prev) => ({
      ...prev,
      issueTypes: prev.issueTypes.includes(issueType)
        ? prev.issueTypes.filter((type) => type !== issueType)
        : [...prev.issueTypes, issueType],
    }));
  };

  useEffect(() => {
    if (caseData) {
      const name = resolvePersonName({
        firstName: caseData.firstName,
        lastName: caseData.lastName,
        fullName: caseData.counseledName,
      });
      setFormData({
        firstName: name.firstName,
        lastName: name.lastName,
        age: caseData.age,
        sex: caseData.sex || 'masculin',
        civilStatus: caseData.civilStatus,
        issueTypes: caseData.issueTypes,
        phoneNumber: stripRoPhonePrefix(caseData.phoneNumber || ''),
        status: caseData.status,
        counselorId:
          caseData.proposedCounselorId || caseData.assignedCounselorId || '',
        description: caseData.description,
        referralSource: caseData.referralSource || '',
        priority: caseData.priority || 'normal',
      });
      setForceAssign(
        caseData.assignmentStatus === 'forced' ||
          (caseData.assignmentStatus === 'accepted' && Boolean(caseData.assignedCounselorId))
      );
      setCounselorTouched(true);
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        age: '',
        sex: 'masculin',
        civilStatus: 'unmarried',
        issueTypes: [],
        phoneNumber: '',
        status: 'waiting',
        counselorId: '',
        description: '',
        referralSource: '',
        priority: 'normal',
      });
      setForceAssign(false);
      setCounselorTouched(false);
    }
    setErrors({});
    setSubmitting(false);
  }, [caseData, open]);

  // Propose by default: prefill top-ranked counselor once basics + issue type are set
  useEffect(() => {
    if (caseData || counselorTouched) return;

    const basicsReady =
      formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0 &&
      Boolean(formData.age) &&
      Number(formData.age) >= 1 &&
      Number(formData.age) <= 120 &&
      formData.issueTypes.length > 0;

    if (!basicsReady) {
      setFormData((prev) => (prev.counselorId ? { ...prev, counselorId: '' } : prev));
      return;
    }

    const suggestedId = rankedCounselors[0]?.id;
    if (!suggestedId) return;

    setFormData((prev) =>
      prev.counselorId === suggestedId ? prev : { ...prev, counselorId: suggestedId }
    );
  }, [
    caseData,
    counselorTouched,
    formData.firstName,
    formData.lastName,
    formData.age,
    formData.issueTypes,
    rankedCounselors,
  ]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.lastName.trim()) newErrors.lastName = 'Numele este obligatoriu';
    if (!formData.firstName.trim()) newErrors.firstName = 'Prenumele este obligatoriu';
    if (!formData.age || Number(formData.age) < 1 || Number(formData.age) > 120) {
      newErrors.age = 'Valid age is required';
    }
    if (formData.issueTypes.length === 0) newErrors.issueTypes = 'At least one issue type is required';
    if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
    else if (!isValidRoPhoneDigits(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Introdu exact 9 cifre pentru numărul de telefon românesc';
    }
    if (!formData.description.trim()) newErrors.description = 'Problem description is required';

    if (
      (formData.status === 'active' || formData.status === 'finished' || forceAssign) &&
      !formData.counselorId
    ) {
      newErrors.counselorId = 'Counselor is required for active and finished cases';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildAssignmentFields = (): Pick<
    Case,
    | 'assignedCounselorId'
    | 'assignedCounselorName'
    | 'proposedCounselorId'
    | 'proposedCounselorName'
    | 'assignmentStatus'
    | 'status'
  > => {
    const selected = counselors.find((c) => c.id === formData.counselorId);
    const name = selected?.fullName;

    if (!formData.counselorId || !selected) {
      return {
        assignedCounselorId: undefined,
        assignedCounselorName: undefined,
        proposedCounselorId: null,
        proposedCounselorName: null,
        assignmentStatus: 'none',
        status: formData.status as CaseStatus,
      };
    }

    if (forceAssign) {
      return {
        assignedCounselorId: formData.counselorId,
        assignedCounselorName: name,
        proposedCounselorId: null,
        proposedCounselorName: null,
        assignmentStatus: 'forced',
        status:
          formData.status === 'waiting' ? 'active' : (formData.status as CaseStatus),
      };
    }

    // Propose: keep waiting until counselor accepts
    return {
      assignedCounselorId: undefined,
      assignedCounselorName: undefined,
      proposedCounselorId: formData.counselorId,
      proposedCounselorName: name ?? null,
      assignmentStatus: 'pending',
      status: 'waiting',
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting || !validateForm()) return;

    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const counseledName = composeDisplayName(firstName, lastName);
    const generatedTitle = `${counseledName} - Caz`;
    const assignment = buildAssignmentFields();

    try {
      setSubmitting(true);
      await onSubmit({
        title: generatedTitle,
        firstName,
        lastName,
        counseledName,
        age: Number(formData.age),
        sex: formData.sex,
        civilStatus: formData.civilStatus as CivilStatus,
        issueTypes: formData.issueTypes,
        phoneNumber: toE164RoPhone(formData.phoneNumber),
        description: formData.description.trim(),
        referralSource: formData.referralSource || null,
        priority: formData.priority,
        ...assignment,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setFormData({
      firstName: '',
      lastName: '',
      sex: 'masculin',
      age: '',
      civilStatus: 'unmarried',
      issueTypes: [],
      phoneNumber: '',
      description: '',
      referralSource: '',
      priority: 'normal',
      status: 'waiting',
      counselorId: '',
    });
    setForceAssign(false);
    setCounselorTouched(false);
    setErrors({});
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (submitting) return;
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          handleClose();
          return;
        }
        handleClose();
      }}
      disableEscapeKeyDown={submitting}
      maxWidth="md"
      fullWidth
      fullScreen={false}
      sx={{
        '& .MuiDialog-paper': {
          m: { xs: 1, sm: 2 },
          maxHeight: { xs: '95vh', sm: '90vh' },
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          pb: { xs: 1, sm: 2 },
        }}
      >
        {caseData ? t.cases.editCase : t.cases.createCase}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent
          sx={{
            px: { xs: 1.5, sm: 3 },
            py: { xs: 1, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 }, pt: 1 }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              <TextField
                fullWidth
                label={t.cases.lastName}
                value={formData.lastName}
                onChange={handleChange('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName}
                required
                size="small"
              />
              <TextField
                fullWidth
                label={t.cases.firstName}
                value={formData.firstName}
                onChange={handleChange('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName}
                required
                size="small"
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              <TextField
                fullWidth
                label={t.cases.age}
                type="number"
                value={formData.age}
                onChange={handleChange('age')}
                error={!!errors.age}
                helperText={errors.age}
                required
                size="small"
              />

              <FormControl fullWidth size="small">
                <InputLabel>{t.cases.sex}</InputLabel>
                <Select
                  value={formData.sex}
                  onChange={handleChange('sex')}
                  label={t.cases.sex}
                >
                  <MenuItem value="masculin">{t.cases.sexMasculin}</MenuItem>
                  <MenuItem value="feminin">{t.cases.sexFeminin}</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>{t.cases.civilStatus}</InputLabel>
                <Select
                  value={formData.civilStatus}
                  onChange={handleChange('civilStatus')}
                  label={t.cases.civilStatus}
                >
                  {civilStatusOptions.map((status) => (
                    <MenuItem key={status} value={status}>
                      {translateCivilStatus(status, formData.sex)}
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
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 0.75, sm: 1 } }}>
                {issueTypeOptions.map((issueType) => (
                  <Chip
                    key={issueType}
                    label={t.issueTypes[issueType]}
                    onClick={() => handleIssueTypeChange(issueType)}
                    color={formData.issueTypes.includes(issueType) ? 'primary' : 'default'}
                    variant={formData.issueTypes.includes(issueType) ? 'filled' : 'outlined'}
                    size="small"
                  />
                ))}
              </Box>
              {errors.issueTypes && (
                <Typography color="error" variant="caption">
                  {errors.issueTypes}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              <FormControl fullWidth size="small">
                <InputLabel>{t.cases.referralSourceOptional}</InputLabel>
                <Select
                  value={formData.referralSource}
                  onChange={handleChange('referralSource')}
                  label={t.cases.referralSourceOptional}
                >
                  <MenuItem value="">
                    <em>{t.referralSources.none}</em>
                  </MenuItem>
                  {REFERRAL_SOURCE_OPTIONS.map((source) => (
                    <MenuItem key={source} value={source}>
                      {t.referralSources[source]}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>{t.cases.priority}</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={handleChange('priority')}
                  label={t.cases.priority}
                >
                  <MenuItem value="normal">{t.casePriority.normal}</MenuItem>
                  <MenuItem value="high">{t.casePriority.high}</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <FormControl fullWidth size="small">
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

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1.5, sm: 2 },
              }}
            >
              <TextField
                fullWidth
                label={t.cases.phoneNumber}
                value={formData.phoneNumber}
                onChange={handleChange('phoneNumber')}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber || 'Introdu 9 cifre după +40'}
                required
                size="small"
                placeholder="700 123 456"
                InputProps={{
                  startAdornment: (
                    <Typography sx={{ mr: 1, color: 'text.secondary' }}>+40</Typography>
                  ),
                }}
              />

              <FormControl fullWidth error={!!errors.counselorId} size="small">
                <InputLabel sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  {t.cases.assignedCounselor}
                  {(formData.status === 'active' ||
                    formData.status === 'finished' ||
                    forceAssign) &&
                    ' *'}
                </InputLabel>
                <Select
                  value={formData.counselorId}
                  onChange={(event) => {
                    setCounselorTouched(true);
                    handleChange('counselorId')(event);
                  }}
                  label={t.cases.assignedCounselor}
                >
                  <MenuItem value="">
                    <em>Nealocat</em>
                  </MenuItem>
                  {rankedCounselors.map((counselor, index) => (
                    <MenuItem key={counselor.id} value={counselor.id}>
                      {formatCounselorOptionLabel(counselor, { recommended: index === 0 })}
                    </MenuItem>
                  ))}
                </Select>
                {errors.counselorId && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, ml: 1.75, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                  >
                    {errors.counselorId}
                  </Typography>
                )}
              </FormControl>
            </Box>

            {formData.counselorId && (
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Checkbox
                  id="force-assign-checkbox"
                  checked={forceAssign}
                  onChange={(e) => setForceAssign(e.target.checked)}
                  size="small"
                  sx={{ pt: 0.25 }}
                />
                <Box>
                  <Typography
                    component="label"
                    htmlFor="force-assign-checkbox"
                    variant="body2"
                    sx={{ cursor: 'pointer', display: 'inline-block' }}
                  >
                    {t.assignments.forceAssign}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t.assignments.forceAssignHint}
                  </Typography>
                </Box>
              </Box>
            )}

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

        <DialogActions
          sx={{
            px: { xs: 1.5, sm: 3 },
            py: { xs: 1, sm: 2 },
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            gap: { xs: 1, sm: 0 },
          }}
        >
          <Button
            onClick={handleClose}
            disabled={submitting}
            sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 2, sm: 1 } }}
          >
            {t.common.cancel}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={
              submitting ||
              !formData.lastName.trim() ||
              !formData.firstName.trim() ||
              !formData.age ||
              Number(formData.age) < 1 ||
              Number(formData.age) > 120 ||
              formData.issueTypes.length === 0 ||
              !formData.phoneNumber.trim() ||
              !isValidRoPhoneDigits(formData.phoneNumber) ||
              !formData.description.trim() ||
              ((formData.status === 'active' ||
                formData.status === 'finished' ||
                forceAssign) &&
                !formData.counselorId)
            }
            startIcon={
              submitting ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            sx={{ width: { xs: '100%', sm: 'auto' }, order: { xs: 1, sm: 2 } }}
          >
            {caseData ? t.common.save : t.common.add}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CaseForm;
