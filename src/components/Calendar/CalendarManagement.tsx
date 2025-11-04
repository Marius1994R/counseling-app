import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem as MenuItemComponent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add,
  Search,
  CalendarToday,
  Schedule,
  Person,
  Assignment,
  MoreVert,
  Edit,
  Delete,
  FilterList,
  Room
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import CalendarView from './CalendarView';
import AppointmentForm from './AppointmentForm'; 
import { Appointment, Case, Counselor } from '../../types';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { logAppointmentCreated } from '../../utils/activityLogger';
import { t } from '../../utils/translations';

interface CalendarManagementProps {
  isAdminView?: boolean; // If true, shows all appointments; if false, shows only counselor's appointments
}

const CalendarManagement: React.FC<CalendarManagementProps> = ({ isAdminView = true }) => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [counselorFilter, setCounselorFilter] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [preSelectedDate, setPreSelectedDate] = useState<Date | null>(null);

  // Handle new appointment query parameter
  useEffect(() => {
    const newParam = searchParams.get('new');
    if (newParam === 'true') {
      setFormOpen(true);
      // Remove the query parameter from URL after opening the form
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Load real data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load counselors from Firebase
        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, orderBy('fullName', 'asc'));
        const counselorsSnapshot = await getDocs(counselorsQuery);
        
        const counselorsData: Counselor[] = [];
        counselorsSnapshot.forEach((doc) => {
          const data = doc.data();
          counselorsData.push({
            id: doc.id,
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber || '',
            specialties: data.specialties || [],
            activeCases: data.activeCases || 0,
            workloadLevel: data.workloadLevel || 'low',
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
          });
        });

        // Load cases from Firebase
        const casesRef = collection(db, 'cases');
        const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
        const casesSnapshot = await getDocs(casesQuery);
        
        const casesData: Case[] = [];
        casesSnapshot.forEach((doc) => {
          const data = doc.data();
          casesData.push({
            id: doc.id,
            title: data.title,
            counseledName: data.counseledName,
            age: data.age,
            civilStatus: data.civilStatus,
            issueTypes: data.issueTypes,
            phoneNumber: data.phoneNumber,
            description: data.description || '',
            status: data.status,
            assignedCounselorId: data.assignedCounselorId,
            assignedCounselorName: data.assignedCounselorName,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            createdBy: data.createdBy
          });
        });

        // Load appointments from Firebase
        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(appointmentsRef, orderBy('date', 'asc'));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        
        const appointmentsData: Appointment[] = [];
        appointmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          const appointment = {
            id: doc.id,
            title: data.title,
            description: data.description,
            date: data.date.toDate(),
            startTime: data.startTime,
            endTime: data.endTime,
            counselorId: data.counselorId,
            counselorName: data.counselorName,
            caseId: data.caseId,
            caseTitle: data.caseTitle,
            room: data.room,
            createdBy: data.createdBy,
            createdAt: data.createdAt.toDate()
          };
          
          // Always show all appointments - permissions are handled in the UI
          appointmentsData.push(appointment);
        });
        
        setCounselors(counselorsData);
        setCases(casesData);
        setAppointments(appointmentsData);
        setFilteredAppointments(appointmentsData);
      } catch (err) {
        setError('Failed to load calendar data');
        console.error('Calendar loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter appointments based on search and filters
  useEffect(() => {
    let filtered = appointments;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(appointment =>
        appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appointment.counselorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (appointment.caseTitle && appointment.caseTitle.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Counselor filter
    if (counselorFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.counselorId === counselorFilter);
    }

    setFilteredAppointments(filtered);
  }, [appointments, searchTerm, counselorFilter]);

  const handleAddAppointment = () => {
    setEditingAppointment(null);
    setFormOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    // Check permissions - allow editing own appointments or if user is leader/admin
    const isOwnAppointment = appointment.createdBy === currentUser?.id || 
      (appointment.createdBy === 'current-user' && currentUser?.role === 'counselor');
    
    if (currentUser && !isOwnAppointment && 
        currentUser.role !== 'leader' && currentUser.role !== 'admin') {
      setError('You can only edit appointments created by you');
      return;
    }
    setEditingAppointment(appointment);
    setFormOpen(true);
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    // Check permissions - allow deleting own appointments or if user is leader/admin
    const appointment = appointments.find(a => a.id === appointmentId);
    const isOwnAppointment = appointment && (
      appointment.createdBy === currentUser?.id || 
      (appointment.createdBy === 'current-user' && currentUser?.role === 'counselor')
    );
    
    if (currentUser && appointment && !isOwnAppointment && 
        currentUser.role !== 'leader' && currentUser.role !== 'admin') {
      setError('You can only delete appointments created by you');
      return;
    }
    
    try {
      // Delete from Firebase
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await deleteDoc(appointmentRef);
      
      // Update local state
      setAppointments(prev => prev.filter(appointment => appointment.id !== appointmentId));
      setFilteredAppointments(prev => prev.filter(appointment => appointment.id !== appointmentId));
      setDeleteDialogOpen(false);
      setSelectedAppointment(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete appointment');
    }
  };

  const handleFormSubmit = async (appointmentData: Omit<Appointment, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      if (editingAppointment) {
        // Update existing appointment in Firebase
        const appointmentRef = doc(db, 'appointments', editingAppointment.id);
        await updateDoc(appointmentRef, {
          ...appointmentData,
          updatedAt: new Date()
        });
        
        // Update local state
        const updatedAppointment: Appointment = {
          ...editingAppointment,
          ...appointmentData
        };
        setAppointments(prev => prev.map(appointment => 
          appointment.id === editingAppointment.id ? updatedAppointment : appointment
        ));
        setFilteredAppointments(prev => prev.map(appointment => 
          appointment.id === editingAppointment.id ? updatedAppointment : appointment
        ));
      } else {
        // Create new appointment in Firebase
        const appointmentsRef = collection(db, 'appointments');
        const docRef = await addDoc(appointmentsRef, {
          ...appointmentData,
          createdAt: new Date(),
          createdBy: currentUser?.id || 'unknown'
        });
        
        // Log appointment creation activity
        if (currentUser && appointmentData.caseId && appointmentData.caseTitle) {
          await logAppointmentCreated(
            docRef.id,
            appointmentData.title,
            appointmentData.caseId,
            appointmentData.caseTitle,
            currentUser.id,
            currentUser.fullName || currentUser.email || 'Unknown User'
          );
        }
        
        // Update local state
        const newAppointment: Appointment = {
          ...appointmentData,
          id: docRef.id,
          createdAt: new Date(),
          createdBy: currentUser?.id || 'unknown'
        };
        setAppointments(prev => [newAppointment, ...prev]);
        setFilteredAppointments(prev => [newAppointment, ...prev]);
      }
      setFormOpen(false);
      setEditingAppointment(null);
    } catch (err) {
      console.error('Form submit error:', err);
      setError('Failed to save appointment');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, appointment: Appointment) => {
    setAnchorEl(event.currentTarget);
    setSelectedAppointment(appointment);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAppointment(null);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (selectedAppointment) {
      handleDeleteAppointment(selectedAppointment.id);
      setDeleteDialogOpen(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };


  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 }, px: { xs: 1, sm: 3 } }}>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <TextField
              fullWidth
              label={t.appointments.searchPlaceholder || "Căutați programări"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Box>
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <FormControl fullWidth>
              <InputLabel>{t.appointments.counselor || "Consilier"}</InputLabel>
              <Select
                value={counselorFilter}
                onChange={(e) => setCounselorFilter(e.target.value)}
                label={t.appointments.counselor || "Consilier"}
              >
                <MenuItem value="all">{t.appointments.filters.allCounselors || "Toți Consilierii"}</MenuItem>
                {counselors.map((counselor) => (
                  <MenuItem key={counselor.id} value={counselor.id}>
                    {counselor.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ 
            flex: "1 1 300px", 
            minWidth: "250px",
            display: 'flex',
            justifyContent: 'flex-start'
          }}>
            <Chip
              label={`${filteredAppointments.length} ${t.appointments.filters.all || 'programări'}`}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>
      </Paper>

      {/* Schedule Appointment Button */}
      <Box 
        display="flex" 
        justifyContent="flex-end" 
        alignItems="center" 
        mb={3}
      >
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAddAppointment}
          sx={{ 
            px: 3,
            width: { xs: '100%', sm: 'auto' }
          }}
        >
          {t.dashboard.scheduleAppointment}
        </Button>
      </Box>

      {/* Calendar */}
      <CalendarView
        appointments={filteredAppointments}
        cases={cases}
        onEditAppointment={handleEditAppointment}
        onDeleteAppointment={handleDeleteAppointment}
        onScheduleAppointment={(date) => {
          // Set the selected date in the appointment form and open it
          setEditingAppointment(null);
          setPreSelectedDate(date);
          setFormOpen(true);
        }}
        canEdit={(appointment) => {
          // Handle legacy "current-user" value for existing appointments
          const isOwnAppointment = appointment.createdBy === currentUser?.id || 
            (appointment.createdBy === 'current-user' && currentUser?.role === 'counselor');
          return isOwnAppointment || 
            currentUser?.role === 'leader' || 
            currentUser?.role === 'admin';
        }}
        canDelete={(appointment) => {
          // Handle legacy "current-user" value for existing appointments
          const isOwnAppointment = appointment.createdBy === currentUser?.id || 
            (appointment.createdBy === 'current-user' && currentUser?.role === 'counselor');
          return isOwnAppointment || 
            currentUser?.role === 'leader' || 
            currentUser?.role === 'admin';
        }}
      />

      {/* Appointment Form Dialog */}
      <AppointmentForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingAppointment(null);
          setPreSelectedDate(null);
        }}
        onSubmit={handleFormSubmit}
        appointmentData={editingAppointment}
        counselors={counselors}
        cases={cases}
        existingAppointments={appointments}
        currentUser={currentUser}
        preSelectedDate={preSelectedDate}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {(selectedAppointment?.createdBy === currentUser?.id || 
          currentUser?.role === 'leader' || 
          currentUser?.role === 'admin') && (
          <MenuItemComponent onClick={() => {
            if (selectedAppointment) {
              handleEditAppointment(selectedAppointment);
            }
            handleMenuClose();
          }}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItemComponent>
        )}
        {(selectedAppointment?.createdBy === currentUser?.id || 
          currentUser?.role === 'leader' || 
          currentUser?.role === 'admin') && (
          <MenuItemComponent onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} />
            {t.common.delete}
          </MenuItemComponent>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t.deleteWarnings.deleteAppointment}</DialogTitle>
        <DialogContent>
          <Typography>
            {t.deleteWarnings.deleteAppointmentConfirm.replace('{title}', selectedAppointment?.title || '')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t.common.cancel}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t.common.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CalendarManagement;
