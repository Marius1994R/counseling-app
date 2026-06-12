import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { ChurchEvent } from '../../types';
import { t } from '../../utils/translations';
import { validateEventForm } from './eventUtils';

interface EventFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
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
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  }, [open, eventData, preSelectedDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateEventForm(
      { name, description, startDate, endDate, startTime, endTime, registrationUrl },
      Boolean(eventData)
    );
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      startDate: startDate!.toDate(),
      endDate: endDate!.toDate(),
      startTime: startTime!.format('HH:mm'),
      endTime: endTime!.format('HH:mm'),
      registrationUrl: registrationUrl.trim() || undefined,
    });
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

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {eventData ? t.events.editEvent : t.events.addEvent}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
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

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 200px' }}>
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
                <Box sx={{ flex: '1 1 200px' }}>
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
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 150px' }}>
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
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.startTime,
                        helperText: errors.startTime,
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: '1 1 150px' }}>
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
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.endTime,
                        helperText: errors.endTime,
                      },
                    }}
                  />
                </Box>
              </Box>

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
                rows={4}
                error={!!errors.description}
                helperText={errors.description}
              />

              <TextField
                fullWidth
                label={t.events.registrationUrl}
                value={registrationUrl}
                onChange={(e) => {
                  setRegistrationUrl(e.target.value);
                  if (errors.registrationUrl) setErrors((prev) => ({ ...prev, registrationUrl: '' }));
                }}
                placeholder="https://..."
                error={!!errors.registrationUrl}
                helperText={errors.registrationUrl || t.events.registrationUrlHint}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>{t.common.cancel}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!isFormComplete}
              sx={{ backgroundColor: '#C99700', '&:hover': { backgroundColor: '#B8860B' } }}
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
