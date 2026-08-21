import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { ChurchEvent } from '../../types';
import { t } from '../../utils/translations';
import { validateEventForm } from './eventUtils';

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
    <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>{children}</Box>
  </Box>
);

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
  ) => void | Promise<void>;
  eventData?: ChurchEvent | null;
  preSelectedDate?: Date | null;
}

const EventForm: React.FC<EventFormProps> = ({
  open,
  onClose,
  onSubmit,
  eventData,
  preSelectedDate,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Dayjs | null>(dayjs());
  const [endDate, setEndDate] = useState<Dayjs | null>(dayjs());
  const [startTime, setStartTime] = useState<Dayjs | null>(null);
  const [endTime, setEndTime] = useState<Dayjs | null>(null);
  const [registrationUrl, setRegistrationUrl] = useState('');
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false);
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (eventData) {
      setName(eventData.name);
      setDescription(eventData.description);
      setStartDate(dayjs(eventData.startDate));
      setEndDate(dayjs(eventData.endDate));
      const [sh, sm] = eventData.startTime.split(':').map(Number);
      const [eh, em] = eventData.endTime.split(':').map(Number);
      setStartTime(dayjs().hour(sh).minute(sm));
      setEndTime(dayjs().hour(eh).minute(em));
      setRegistrationUrl(eventData.registrationUrl || '');
    } else {
      const initialDate = preSelectedDate ? dayjs(preSelectedDate) : dayjs();
      const safeDate = initialDate.isBefore(dayjs().startOf('day')) ? dayjs() : initialDate;
      setName('');
      setDescription('');
      setStartDate(safeDate);
      setEndDate(safeDate);
      setStartTime(null);
      setEndTime(null);
      setRegistrationUrl('');
    }
    setErrors({});
    setSubmitting(false);
    setStartTimePickerOpen(false);
    setEndTimePickerOpen(false);
  }, [open, eventData, preSelectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const validationErrors = validateEventForm(
      { name, description, startDate, endDate, startTime, endTime, registrationUrl },
      Boolean(eventData)
    );
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      setSubmitting(true);
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        startDate: startDate!.toDate(),
        endDate: endDate!.toDate(),
        startTime: startTime!.format('HH:mm'),
        endTime: endTime!.format('HH:mm'),
        registrationUrl: registrationUrl.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const isFormComplete =
    name.trim() &&
    description.trim() &&
    startDate &&
    endDate &&
    startTime &&
    endTime &&
    Object.keys(
      validateEventForm(
        { name, description, startDate, endDate, startTime, endTime, registrationUrl },
        Boolean(eventData)
      )
    ).length === 0;

  const subtitle = name.trim() || t.events.formSubtitle;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
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
            {eventData ? t.events.editEvent : t.events.addEvent}
          </Typography>
          <Typography
            component="span"
            noWrap
            sx={{ mt: 0.5, display: 'block', fontSize: '0.875rem', color: 'text.secondary' }}
          >
            {subtitle}
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ px: { xs: 2, sm: 2.5 }, py: 2.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormSection title={t.events.sectionDetails}>
                <Box sx={{ flex: '1 1 100%' }}>
                  <TextField
                    fullWidth
                    required
                    label={t.events.name}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    error={!!errors.name}
                    helperText={errors.name}
                  />
                </Box>
                <Box sx={{ flex: '1 1 100%' }}>
                  <TextField
                    fullWidth
                    required
                    label={t.events.description}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                    }}
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description}
                  />
                </Box>
              </FormSection>

              <FormSection title={t.events.sectionSchedule}>
                <Box sx={{ flex: '1 1 200px', minWidth: '160px' }}>
                  <DatePicker
                    label={t.events.startDate}
                    value={startDate}
                    onChange={(value) => {
                      setStartDate(value);
                      if (value && endDate && endDate.isBefore(value, 'day')) {
                        setEndDate(value);
                      }
                      if (errors.startDate) setErrors((prev) => ({ ...prev, startDate: '' }));
                    }}
                    minDate={eventData ? undefined : dayjs().startOf('day')}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.startDate,
                        helperText: errors.startDate,
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: '1 1 200px', minWidth: '160px' }}>
                  <DatePicker
                    label={t.events.endDate}
                    value={endDate}
                    onChange={(value) => {
                      setEndDate(value);
                      if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: '' }));
                    }}
                    minDate={startDate ?? (eventData ? undefined : dayjs().startOf('day'))}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.endDate,
                        helperText: errors.endDate,
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: '1 1 140px', minWidth: '120px' }}>
                  <TimePicker
                    label={t.events.startTime}
                    value={startTime}
                    onChange={(value) => {
                      setStartTime(value);
                      if (value && !endTime) {
                        setEndTime(value.add(30, 'minute'));
                      }
                      if (errors.startTime) setErrors((prev) => ({ ...prev, startTime: '' }));
                    }}
                    ampm={false}
                    format="HH:mm"
                    views={['hours', 'minutes']}
                    open={startTimePickerOpen}
                    onOpen={() => setStartTimePickerOpen(true)}
                    onClose={() => setStartTimePickerOpen(false)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.startTime,
                        helperText: errors.startTime,
                        onClick: () => setStartTimePickerOpen(true),
                      },
                      layout: {
                        sx: { minWidth: 260, maxWidth: 260 },
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: '1 1 140px', minWidth: '120px' }}>
                  <TimePicker
                    label={t.events.endTime}
                    value={endTime}
                    onChange={(value) => {
                      setEndTime(value);
                      if (errors.endTime) setErrors((prev) => ({ ...prev, endTime: '' }));
                    }}
                    disabled={!startTime}
                    ampm={false}
                    format="HH:mm"
                    views={['hours', 'minutes']}
                    open={endTimePickerOpen}
                    onOpen={() => setEndTimePickerOpen(true)}
                    onClose={() => setEndTimePickerOpen(false)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.endTime,
                        helperText: errors.endTime,
                        onClick: () => {
                          if (startTime) setEndTimePickerOpen(true);
                        },
                      },
                      layout: {
                        sx: { minWidth: 260, maxWidth: 260 },
                      },
                    }}
                  />
                </Box>
              </FormSection>

              <FormSection title={t.events.sectionRegistration}>
                <Box sx={{ flex: '1 1 100%' }}>
                  <TextField
                    fullWidth
                    label={t.events.registrationUrl}
                    value={registrationUrl}
                    onChange={(e) => {
                      setRegistrationUrl(e.target.value);
                      if (errors.registrationUrl) {
                        setErrors((prev) => ({ ...prev, registrationUrl: '' }));
                      }
                    }}
                    placeholder="https://..."
                    error={!!errors.registrationUrl}
                    helperText={errors.registrationUrl || t.events.registrationUrlHint}
                  />
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
            <Button onClick={handleClose} disabled={submitting} variant="outlined" color="inherit">
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={submitting || !isFormComplete}
              startIcon={
                submitting ? <CircularProgress size={16} color="inherit" /> : undefined
              }
            >
              {eventData ? t.common.save : t.events.save}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
};

export default EventForm;
