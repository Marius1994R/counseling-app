import React, { useState, useEffect } from 'react';
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
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Appointment, Counselor, Case } from '../../types';
import { t } from '../../utils/translations';

interface AppointmentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => void;
  appointmentData?: Appointment | null;
  counselors: Counselor[];
  cases: Case[];
  existingAppointments: Appointment[];
  currentUser?: { id: string; role: string; email: string } | null;
  preSelectedDate?: Date | null;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({
  open,
  onClose,
  onSubmit,
  appointmentData,
  counselors,
  cases,
  existingAppointments,
  currentUser,
  preSelectedDate
}) => {
  const [formData, setFormData] = useState({
    counselorId: '',
    caseId: '',
    date: dayjs() as Dayjs | null,
    startTime: null as Dayjs | null,
    endTime: null as Dayjs | null,
    room: '',
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [startTimePickerOpen, setStartTimePickerOpen] = useState(false);
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);

  // Function to check for room conflicts
  const checkRoomConflict = (room: string, date: Dayjs, startTime: string, endTime: string, excludeId?: string) => {
    if (!room || !date) return false;

    const appointmentDate = date.format('YYYY-MM-DD');
    const newStart = dayjs(`${appointmentDate} ${startTime}`);
    const newEnd = dayjs(`${appointmentDate} ${endTime}`);

    return existingAppointments.some(appointment => {
      // Skip the current appointment if editing
      if (excludeId && appointment.id === excludeId) return false;
      
      // Check if it's the same room and same date
      if (appointment.room !== room) return false;
      
      const existingDate = dayjs(appointment.date).format('YYYY-MM-DD');
      if (existingDate !== appointmentDate) return false;

      const existingStart = dayjs(`${appointmentDate} ${appointment.startTime}`);
      const existingEnd = dayjs(`${appointmentDate} ${appointment.endTime}`);

      // Check for overlap: new appointment overlaps if it starts before existing ends AND ends after existing starts
      return newStart.isBefore(existingEnd) && newEnd.isAfter(existingStart);
    });
  };

  useEffect(() => {
    if (appointmentData) {
      // For counselor users editing appointments, check if they have access to the case
      let caseId = appointmentData.caseId || '';
      if (currentUser?.role === 'counselor' && appointmentData.caseId) {
        const userCounselor = counselors.find(c => c.email === currentUser.email);
        if (userCounselor) {
          const caseItem = cases.find(c => c.id === appointmentData.caseId);
          // If the case is not assigned to this counselor, clear the case selection
          if (caseItem && caseItem.assignedCounselorId !== userCounselor.id) {
            caseId = '';
          }
        }
      }
      
      setFormData({
        counselorId: appointmentData.counselorId,
        caseId: caseId,
        date: dayjs(appointmentData.date),
        startTime: dayjs(appointmentData.date).hour(parseInt(appointmentData.startTime.split(':')[0])).minute(parseInt(appointmentData.startTime.split(':')[1])),
        endTime: dayjs(appointmentData.date).hour(parseInt(appointmentData.endTime.split(':')[0])).minute(parseInt(appointmentData.endTime.split(':')[1])),
        room: appointmentData.room || '',
        description: appointmentData.description || ''
      });
    } else {
      // For counselor users, auto-select themselves as the counselor
      let defaultCounselorId = '';
      if (currentUser && currentUser.role === 'counselor') {
        // Find the counselor record that matches the current user's email
        const userCounselor = counselors.find(c => c.email === currentUser.email);
        if (userCounselor) {
          defaultCounselorId = userCounselor.id;
        }
      }
      
      setFormData({
        counselorId: defaultCounselorId,
        caseId: '',
        date: preSelectedDate ? dayjs(preSelectedDate) : dayjs(),
        startTime: null,
        endTime: null,
        room: '',
        description: ''
      });
    }
    setErrors({});
    
    // Close time pickers when dialog opens/closes
    if (!open) {
      setStartTimePickerOpen(false);
      setEndTimePickerOpen(false);
    }
  }, [appointmentData, open, currentUser, counselors, cases, preSelectedDate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // For counselor users, counselorId should be auto-selected, but we still validate it exists
    if (!formData.counselorId) {
      if (currentUser?.role === 'counselor') {
        newErrors.counselorId = 'Unable to determine your counselor profile. Please contact an administrator.';
      } else {
        newErrors.counselorId = 'Counselor is required';
      }
    }
    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';

    if (formData.startTime && formData.endTime) {
      // Combine date with time for proper comparison
      const start = formData.date!.hour(formData.startTime.hour()).minute(formData.startTime.minute());
      const end = formData.date!.hour(formData.endTime.hour()).minute(formData.endTime.minute());
      
      // Check minimum duration (15 minutes)
      const duration = end.diff(start, 'minutes');
      if (duration < 15) {
        newErrors.endTime = 'Appointment must be at least 15 minutes long';
      }
    }

    // Check for room conflicts
    if (formData.room && formData.date && formData.startTime && formData.endTime) {
      const startTimeStr = formData.startTime.format('HH:mm');
      const endTimeStr = formData.endTime.format('HH:mm');
      const hasConflict = checkRoomConflict(
        formData.room, 
        formData.date, 
        startTimeStr, 
        endTimeStr,
        appointmentData?.id
      );
      
      if (hasConflict) {
        newErrors.room = 'This room is already booked during the selected time period';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const selectedCounselor = counselors.find(c => c.id === formData.counselorId);
    const selectedCase = cases.find(c => c.id === formData.caseId);
    
    const newAppointmentData = {
      title: selectedCounselor?.fullName || 'Appointment',
      counselorId: formData.counselorId,
      counselorName: selectedCounselor?.fullName || '',
      caseId: formData.caseId || undefined,
      caseTitle: selectedCase?.title || undefined,
      date: formData.date!.toDate(),
      startTime: formData.startTime!.format('HH:mm'),
      endTime: formData.endTime!.format('HH:mm'),
      room: formData.room || undefined,
      description: formData.description,
      createdBy: appointmentData?.createdBy || currentUser?.id || 'unknown'
    };

    onSubmit(newAppointmentData);
    onClose();
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };
      
      // Auto-suggest end time when start time changes
      if (field === 'startTime' && value && !prev.endTime) {
        const suggestedEndTime = value.add(30, 'minutes'); // Suggest 30 minutes later
        newFormData.endTime = suggestedEndTime;
      }
      
      // Clear end time if it becomes invalid when start time changes
      if (field === 'startTime' && value && prev.endTime) {
        // Check if current end time is valid (at least 15 minutes after new start time)
        const end = value.hour(prev.endTime.hour()).minute(prev.endTime.minute());
        if (end.isBefore(value.add(15, 'minutes'))) {
          const suggestedEndTime = value.add(30, 'minutes');
          newFormData.endTime = suggestedEndTime;
        }
      }
      
      return newFormData;
    });
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Real-time room conflict validation
    if (field === 'room' || field === 'date' || field === 'startTime' || field === 'endTime') {
      const updatedFormData = { ...formData, [field]: value };
      
      if (updatedFormData.room && updatedFormData.date && updatedFormData.startTime && updatedFormData.endTime) {
        const startTimeStr = updatedFormData.startTime.format('HH:mm');
        const endTimeStr = updatedFormData.endTime.format('HH:mm');
        const hasConflict = checkRoomConflict(
          updatedFormData.room,
          updatedFormData.date,
          startTimeStr,
          endTimeStr,
          appointmentData?.id
        );
        
        if (hasConflict) {
          setErrors(prev => ({ ...prev, room: 'This room is already booked during the selected time period' }));
        } else if (errors.room) {
          setErrors(prev => ({ ...prev, room: '' }));
        }
      }
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {appointmentData ? t.appointments.editAppointment : t.appointments.scheduleAppointment}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {/* Only show counselor dropdown for admin/leader users */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'leader') && (
                  <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                    <FormControl fullWidth required error={!!errors.counselorId}>
                      <InputLabel>{t.appointments.counselor}</InputLabel>
                      <Select
                        value={formData.counselorId}
                        onChange={(e) => handleChange('counselorId', e.target.value)}
                        label={t.appointments.counselor}
                      >
                        {counselors.map((counselor) => (
                          <MenuItem key={counselor.id} value={counselor.id}>
                            {counselor.fullName}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.counselorId && (
                        <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                          {errors.counselorId}
                        </Typography>
                      )}
                    </FormControl>
                  </Box>
                )}
                
                {/* For counselor users, show a read-only field with their name */}
                {currentUser?.role === 'counselor' && (
                  <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                    <TextField
                      fullWidth
                      label={t.appointments.counselor}
                      value={counselors.find(c => c.id === formData.counselorId)?.fullName || 'Loading...'}
                      InputProps={{
                        readOnly: true,
                      }}
                      helperText="Poți programa doar pentru tine"
                    />
                  </Box>
                )}
                
                <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                  <FormControl fullWidth>
                    <InputLabel>{(t.cases.title || "Caz")} (Opțional)</InputLabel>
                    <Select
                      value={formData.caseId}
                      onChange={(e) => handleChange('caseId', e.target.value)}
                      label={`${t.cases.title || "Caz"} (Opțional)`}
                    >
                      <MenuItem value="">
                        <em>Niciun caz selectat</em>
                      </MenuItem>
                      {/* Filter cases based on user role */}
                      {(() => {
                        let filteredCases = cases;
                        
                        // For counselor users, only show cases assigned to them
                        if (currentUser?.role === 'counselor') {
                          const userCounselor = counselors.find(c => c.email === currentUser.email);
                          if (userCounselor) {
                            filteredCases = cases.filter(caseItem => 
                              caseItem.assignedCounselorId === userCounselor.id
                            );
                          }
                        }
                        
                        return filteredCases.map((caseItem) => (
                          <MenuItem key={caseItem.id} value={caseItem.id}>
                            {caseItem.title} - {caseItem.counseledName}
                          </MenuItem>
                        ));
                      })()}
                    </Select>
                    {/* Show helper text for counselor users */}
                    {currentUser?.role === 'counselor' && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1.5 }}>
                        Sunt afișate doar cazurile tale alocate
                      </Typography>
                    )}
                  </FormControl>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                  <DatePicker
                    label={t.appointments.date}
                    value={formData.date}
                    onChange={(newValue) => handleChange('date', newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.date,
                        helperText: errors.date
                      }
                    }}
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                  <TimePicker
                    label={t.appointments.startTime}
                    value={formData.startTime}
                    onChange={(newValue) => handleChange('startTime', newValue)}
                    ampm={false}
                    open={startTimePickerOpen}
                    onOpen={() => setStartTimePickerOpen(true)}
                    onClose={() => setStartTimePickerOpen(false)}
                    views={['hours', 'minutes']}
                    format="HH:mm"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.startTime,
                        helperText: errors.startTime || 'Selectează ora start',
                        onClick: () => setStartTimePickerOpen(true)
                      },
                      layout: {
                        sx: { minWidth: 260, maxWidth: 260 }
                      }
                    }}
                  />
                </Box>
                
                <Box sx={{ flex: '1 1 150px', minWidth: '120px' }}>
                  <TimePicker
                    label={t.appointments.endTime}
                    value={formData.endTime}
                    onChange={(newValue) => handleChange('endTime', newValue)}
                    disabled={!formData.startTime}
                    ampm={false}
                    open={endTimePickerOpen}
                    onOpen={() => setEndTimePickerOpen(true)}
                    onClose={() => setEndTimePickerOpen(false)}
                    views={['hours', 'minutes']}
                    format="HH:mm"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !!errors.endTime,
                        helperText: errors.endTime || (formData.startTime ? 'Selectează ora finală (min. 15 min după start)' : 'Selectează întâi ora start'),
                        onClick: () => !formData.startTime ? null : setEndTimePickerOpen(true)
                      },
                      layout: {
                        sx: { minWidth: 260, maxWidth: 260 }
                      }
                    }}
                  />
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
                  <FormControl fullWidth error={!!errors.room}>
                    <InputLabel>{t.appointments.room} (Opțional)</InputLabel>
                    <Select
                      value={formData.room}
                      onChange={(e) => handleChange('room', e.target.value)}
                      label={`${t.appointments.room} (Opțional)`}
                    >
                      <MenuItem value="">
                        <em>Nicio sală selectată</em>
                      </MenuItem>
                      <MenuItem value="Grupa Școlarii Mari">Grupa Școlarii Mari</MenuItem>
                      <MenuItem value="Grupa Școlarii Mici">Grupa Școlarii Mici</MenuItem>
                      <MenuItem value="Consiliu">Consiliu</MenuItem>
                      <MenuItem value="Multifuncțională">Multifuncțională</MenuItem>
                    </Select>
                    {errors.room && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                        {errors.room}
                      </Typography>
                    )}
                  </FormControl>
                </Box>
              </Box>
              
              <TextField
                fullWidth
                label={`${t.appointments.description} (Opțional)`}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                multiline
                rows={3}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>{t.common.cancel}</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={
                !formData.counselorId ||
                !formData.date ||
                !formData.startTime ||
                !formData.endTime
              }
            >
              {appointmentData ? t.common.save : t.appointments.schedule}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
};

export default AppointmentForm;
