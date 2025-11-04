import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import {
  Assignment,
  Schedule,
  TrendingUp,
  ArrowForward,
  Add,
  Update,
  Note,
  Description
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { Case, Appointment, CaseStatus } from '../../types';
import { collection, getDocs, query, orderBy, where, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import { t } from '../../utils/translations';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counselorRecordId, setCounselorRecordId] = useState<string | null>(null);
  const [newAssignmentModal, setNewAssignmentModal] = useState<any | null>(null);
  const [dismissedAssignments, setDismissedAssignments] = useState<Set<string>>(() => {
    // Load dismissed assignments from localStorage
    const stored = localStorage.getItem('dismissedAssignments');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Function to ensure current user has a counselor record
  const ensureCounselorRecord = async (user: any) => {
    if (!user || (user.role !== 'leader' && user.role !== 'admin' && user.role !== 'counselor')) {
      return null;
    }

    try {
      // Check if counselor record exists
      const counselorsRef = collection(db, 'counselors');
      const q = query(counselorsRef, where('linkedUserId', '==', user.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return doc.id;
      }

      // If no counselor record exists, create one for leaders/admins
      if (user.role === 'leader' || user.role === 'admin') {
        const counselorData = {
          fullName: user.fullName || user.email,
          email: user.email,
          phoneNumber: '', // Will be filled in profile
          specialties: user.role === 'leader' ? ['Leadership', 'Administration'] : ['Administration'],
          activeCases: 0,
          workloadLevel: 'low',
          linkedUserId: user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const counselorRef = collection(db, 'counselors');
        const docRef = await addDoc(counselorRef, counselorData);
        return docRef.id;
      }
    } catch (error) {
      console.error('Error ensuring counselor record:', error);
    }
    return null;
  };

  // Load real data from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Ensure counselor record exists for leaders/admins
        let counselorId: string | null = null;
        if (currentUser) {
          counselorId = await ensureCounselorRecord(currentUser);
          setCounselorRecordId(counselorId);
        }
        
        // Load cases from Firebase
        const casesRef = collection(db, 'cases');
        const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
        const casesSnapshot = await getDocs(casesQuery);
        
        const casesData: Case[] = [];
        let totalCases = 0;
        let filteredCases = 0;
        
        casesSnapshot.forEach((doc) => {
          const data = doc.data();
          totalCases++;
          
          // Filter cases: only show cases assigned to the current user's counselor record
          // Leaders/admins create cases but they should only see cases assigned to them
          let isUserCase = false;
          
          if (counselorId) {
            // If user has a counselor record, only show cases assigned to that counselor record ID
            isUserCase = data.assignedCounselorId === counselorId;
          } else {
            // Fallback: if no counselor record, check by user ID (for counselors without linked records)
            isUserCase = data.assignedCounselorId === currentUser?.id;
          }
          
          if (isUserCase) {
            filteredCases++;
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
          }
        });


        // Load user-specific appointments from Firebase
        const appointmentsRef = collection(db, 'appointments');
        const appointmentsQuery = query(appointmentsRef, orderBy('date', 'asc'));
        const appointmentsSnapshot = await getDocs(appointmentsQuery);
        
        const appointmentsData: Appointment[] = [];
        appointmentsSnapshot.forEach((doc) => {
          const data = doc.data();
          // Filter appointments: only show appointments assigned to the current user's counselor record
          let isUserAppointment = false;
          
          if (counselorId) {
            // If user has a counselor record, check if appointment is assigned to that counselor ID
            isUserAppointment = data.counselorId === counselorId || data.counselorId === currentUser?.id;
          } else {
            // Fallback: if no counselor record, check by user ID
            isUserAppointment = data.counselorId === currentUser?.id || data.clientId === currentUser?.id;
          }
          
          if (isUserAppointment) {
            appointmentsData.push({
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
              createdBy: data.createdBy,
              createdAt: data.createdAt.toDate()
            });
          }
        });

        // Load activities from persistent storage
        const activitiesRef = collection(db, 'activities');
        const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
        const activitiesSnapshot = await getDocs(activitiesQuery);
        
        const activitiesData: any[] = [];
        activitiesSnapshot.forEach((doc) => {
          const data = doc.data();
          activitiesData.push({
            id: doc.id,
            type: data.type,
            title: data.title,
            description: data.description,
            timestamp: data.timestamp.toDate(),
            userId: data.userId,
            userName: data.userName,
            metadata: data.metadata
          });
        });

        // Filter activities based on user role - user-specific for counselors and admins
        let userActivities = activitiesData;
        
        if (currentUser?.role === 'counselor' || currentUser?.role === 'admin') {
          // Show activities created by this user OR where this user was assigned to a case
          userActivities = activitiesData.filter(activity => {
            const isUserCreated = activity.userId === currentUser.id;
            const isCaseAssignedToUser = activity.type === 'case_assigned' && 
              activity.metadata?.assignedToUserId === currentUser.id;
            
            
            return isUserCreated || isCaseAssignedToUser;
          });
        }
        // For leaders: show all activities (no filtering by user)
        
        // Take the 4 most recent activities
        const sortedActivities = userActivities
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 2);

        setCases(casesData);
        setAppointments(appointmentsData);
        setRecentActivities(sortedActivities);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Detect new case assignments and show modal
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'counselor' && currentUser.role !== 'admin')) {
      return;
    }

    // Find the most recent case_assigned activity that hasn't been dismissed
    const caseAssignedActivities = recentActivities.filter(
      activity => 
        activity.type === 'case_assigned' &&
        activity.metadata?.assignedToUserId === currentUser.id &&
        !dismissedAssignments.has(activity.id)
    );

    if (caseAssignedActivities.length > 0) {
      const mostRecentAssignment = caseAssignedActivities[0];
      setNewAssignmentModal(mostRecentAssignment);
    }
  }, [recentActivities, currentUser, dismissedAssignments]);

  const handleSeeCase = () => {
    if (newAssignmentModal?.metadata?.caseId) {
      // Mark this assignment as dismissed
      const newDismissed = new Set(Array.from(dismissedAssignments).concat(newAssignmentModal.id));
      setDismissedAssignments(newDismissed);
      
      // Persist to localStorage
      localStorage.setItem('dismissedAssignments', JSON.stringify(Array.from(newDismissed)));
      
      // Close modal and navigate to case
      setNewAssignmentModal(null);
      navigate(`/cases`);
      
      // Scroll to the specific case if needed
      setTimeout(() => {
        const caseElement = document.getElementById(`case-${newAssignmentModal.metadata.caseId}`);
        if (caseElement) {
          caseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case 'active': return 'info';
      case 'waiting': return 'warning';
      case 'unfinished': return 'error';
      case 'finished': return 'success';
      default: return 'default';
    }
  };

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'high': return 'error';
      case 'moderate': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const activityDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
    
    if (activityDate.getTime() === today.getTime()) {
      return t.dashboard.today;
    } else if (activityDate.getTime() === yesterday.getTime()) {
      return t.dashboard.yesterday;
    } else {
      return timestamp.toLocaleDateString('ro-RO', {
        month: 'short',
        day: 'numeric',
        year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'case_created':
        return <Add sx={{ fontSize: 16, color: '#4caf50' }} />;
      case 'case_status_changed':
        return <Update sx={{ fontSize: 16, color: '#ff9800' }} />;
      case 'case_assigned':
        return <Assignment sx={{ fontSize: 16, color: '#9c27b0' }} />;
      case 'meeting_notes_added':
        return <Note sx={{ fontSize: 16, color: '#2196f3' }} />;
      case 'session_report_added':
        return <Description sx={{ fontSize: 16, color: '#ffc700' }} />;
      case 'appointment_created':
        return <Schedule sx={{ fontSize: 16, color: '#ff5722' }} />;
      default:
        return <TrendingUp sx={{ fontSize: 16, color: '#666' }} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'case_created':
        return '#4caf50';
      case 'case_status_changed':
        return '#ff9800';
      case 'case_assigned':
        return '#9c27b0';
      case 'meeting_notes_added':
        return '#2196f3';
      case 'session_report_added':
        return '#ffc700';
      case 'appointment_created':
        return '#ff5722';
      default:
        return '#666';
    }
  };

  const translateActivityTitle = (title: string) => {
    const titleMap: Record<string, string> = {
      'Case Assigned': 'Caz Alocat',
      'Meeting Notes Added': 'Note de Ședință Adăugate',
      'Session Report Added': 'Raport Post-Sesiune Adăugat',
      'Case Status Changed': 'Status Caz Schimbat',
      'Appointment Scheduled': 'Programare Creată',
      'New Case Created': 'Caz Nou Creat',
      'Case Created': 'Caz Creat',
      'Case Updated': 'Caz Actualizat',
      'Appointment Updated': 'Programare Actualizată',
      'Appointment Deleted': 'Programare Ștearsă'
    };
    return titleMap[title] || title;
  };

  const translateActivityDescription = (description: string) => {
    const translationMap: Record<string, string> = {
      'assigned to': 'alocat către',
      'Notes added for case': 'Note adăugate pentru cazul',
      'Raport post-sesiune': 'Raport post-sesiune',
      'adăugat pentru cazul': 'adăugat pentru cazul',
      'status changed from': 'status schimbat de la',
      'scheduled for case': 'creată pentru cazul',
      'Case ': 'Caz "',
      'case ': 'caz ',
      'Appointment ': 'Programare "',
      'appointment ': 'programare '
    };
    
    let translated = description;
    Object.entries(translationMap).forEach(([en, ro]) => {
      const regex = new RegExp(en, 'gi');
      translated = translated.replace(regex, ro);
    });
    
    return translated;
  };

  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'waiting': 'așteptare',
      'active': 'activ',
      'finished': 'terminat',
      'unfinished': 'neterminat'
    };
    return statusMap[status.toLowerCase()] || status;
  };

  // Calculate metrics
  // Cases are already filtered in loadData to be user-specific
  const userCases = cases;

  const metrics = {
    totalCases: userCases.length,
    activeCases: userCases.filter(c => c.status === 'active').length,
    completedCases: userCases.filter(c => c.status === 'finished').length,
    pendingCases: userCases.filter(c => c.status === 'waiting').length,
    totalAppointments: appointments.length,
    casesByStatus: userCases.reduce((acc, caseItem) => {
      acc[caseItem.status] = (acc[caseItem.status] || 0) + 1;
      return acc;
    }, {} as Record<CaseStatus, number>)
  };


  const upcomingAppointments = appointments
    .filter(apt => {
      // Get the full date and time for the appointment
      const appointmentDateTime = new Date(apt.date);
      // If there's a specific time, combine date and time
      if (apt.startTime) {
        const [hours, minutes] = apt.startTime.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
      }
      
      const now = new Date();
      // Only show appointments that are in the future (including 5 minutes from now)
      return appointmentDateTime > now;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 'bold', 
            color: '#ffc700',
            fontSize: { xs: '1.75rem', sm: '2.25rem' },
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <TrendingUp sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' } }} />
          {t.dashboard.title || 'Dashboard'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          Prezentare generală a performanței tale
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Top Row */}
        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
          {/* User Performance Overview */}
          <Box sx={{ flex: '1 1 400px', minWidth: { xs: '100%', sm: '400px' }, width: { xs: '100%', sm: 'auto' } }}>
            <Paper sx={{ 
              p: { xs: 2, sm: 3, md: 4 }, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              background: 'linear-gradient(135deg, rgba(255, 199, 0, 0.1) 0%, rgba(255, 199, 0, 0.05) 100%)',
              border: '1px solid rgba(255, 199, 0, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Background decoration */}
              <Box sx={{
                position: 'absolute',
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                backgroundColor: 'rgba(255, 199, 0, 0.1)',
                borderRadius: '50%',
                zIndex: 0
              }} />
              
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                  <Box display="flex" alignItems="center">
                    <Box sx={{ 
                      p: 1.5, 
                      backgroundColor: '#ffc700', 
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2
                    }}>
                      <TrendingUp sx={{ color: 'white', fontSize: '1.5rem' }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: '#333' }}>
                        {t.dashboard.yourPerformance}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date().toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Main metric */}
                <Box sx={{ mb: { xs: 2, sm: 3 }, textAlign: 'center' }}>
                  <Typography variant="h2" component="div" sx={{ 
                    fontWeight: 'bold', 
                    color: '#ffc700',
                    fontSize: { xs: '2.5rem', sm: '3rem' },
                    lineHeight: 1,
                    mb: 1
                  }}>
                    {metrics.activeCases}
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                    {t.dashboard.activeCases}
                  </Typography>
                </Box>
                
                {/* Performance metrics grid */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: 2,
                  mb: 3
                }}>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: 2,
                    border: '1px solid rgba(76, 175, 80, 0.2)',
                    textAlign: 'center'
                  }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4caf50', mb: 0.5 }}>
                      {metrics.completedCases}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {t.dashboard.completedCases}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 152, 0, 0.2)',
                    textAlign: 'center'
                  }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ff9800', mb: 0.5 }}>
                      {metrics.pendingCases}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {t.dashboard.pendingCases}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Additional metrics - Compact design */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  gap: 2,
                  mb: 2
                }}>
                  {/* Upcoming Appointments */}
                  <Box sx={{ 
                    flex: 1,
                    p: 1.5,
                    background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(33, 150, 243, 0.05) 100%)',
                    borderRadius: 2,
                    border: '1px solid rgba(33, 150, 243, 0.2)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Decorative element */}
                    <Box sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 30,
                      height: 30,
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      borderRadius: '50%',
                      zIndex: 0
                    }} />
                    
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      <Typography variant="h5" sx={{ 
                        fontWeight: 'bold', 
                        color: '#2196f3',
                        mb: 0.5,
                        lineHeight: 1
                      }}>
                        {upcomingAppointments.length}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#1976d2',
                        fontSize: '0.75rem',
                        fontWeight: 'medium',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {t.dashboard.upcoming}
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Total Cases */}
                  <Box sx={{ 
                    flex: 1,
                    p: 1.5,
                    background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.1) 0%, rgba(156, 39, 176, 0.05) 100%)',
                    borderRadius: 2,
                    border: '1px solid rgba(156, 39, 176, 0.2)',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Decorative element */}
                    <Box sx={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      width: 30,
                      height: 30,
                      backgroundColor: 'rgba(156, 39, 176, 0.1)',
                      borderRadius: '50%',
                      zIndex: 0
                    }} />
                    
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      <Typography variant="h5" sx={{ 
                        fontWeight: 'bold', 
                        color: '#9c27b0',
                        mb: 0.5,
                        lineHeight: 1
                      }}>
                        {metrics.totalCases}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#7b1fa2',
                        fontSize: '0.75rem',
                        fontWeight: 'medium',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {t.dashboard.totalCases}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Compact CTA Button */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/profile?edit=true')}
                  sx={{ 
                    backgroundColor: '#ffc700',
                    color: '#000',
                      fontWeight: 'bold',
                      py: 1,
                      px: 3,
                      fontSize: '0.875rem',
                      minWidth: 'auto',
                      '&:hover': { 
                        backgroundColor: '#e6b300',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 4px 12px rgba(255, 199, 0, 0.3)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {t.dashboard.viewFullProfile}
                  </Button>
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>

        {/* Bottom Row */}
        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
          {/* Quick Actions */}
          <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' }, width: { xs: '100%', sm: 'auto' } }}>
            <Paper 
              elevation={2}
              sx={{ 
                p: { xs: 2, sm: 3 }, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <Assignment sx={{ mr: 1, color: '#ffc700' }} />
                <Typography variant="h6" component="h2">
                  {t.dashboard.quickActions}
                </Typography>
              </Box>
              <Box flex={1} display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/cases')}
                  sx={{ 
                    backgroundColor: '#ffc700',
                    color: '#000',
                    fontWeight: 'bold',
                    '&:hover': { backgroundColor: '#e6b300' },
                    py: 1.5
                  }}
                  >
                  {t.dashboard.viewAllCases}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/calendar?new=true')}
                  sx={{ py: 1.5 }}
                  >
                  {t.dashboard.scheduleAppointment}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/profile?edit=true')}
                  sx={{ py: 1.5 }}
                  >
                  {t.dashboard.updateProfile}
                </Button>
                {(currentUser?.role === 'leader' || currentUser?.role === 'admin') && (
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate('/admin')}
                    sx={{ py: 1.5 }}
                    >
                    {t.navigation.adminTools}
                  </Button>
                )}
              </Box>
            </Paper>
          </Box>

          {/* Upcoming Appointments */}
          <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' }, width: { xs: '100%', sm: 'auto' } }}>
            <Paper 
              elevation={2}
              sx={{ 
                p: { xs: 2, sm: 3 }, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <Schedule sx={{ mr: 1, color: '#ffc700' }} />
                <Typography variant="h6" component="h2">
                  {t.dashboard.upcomingAppointments}
                </Typography>
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress sx={{ color: '#ffc700' }} />
                </Box>
              ) : upcomingAppointments.length > 0 ? (
                <Box flex={1}>
                  <List>
                    {upcomingAppointments.slice(0, 4).map((appointment) => (
                      <ListItem key={appointment.id} sx={{ px: 0 }}>
                        <ListItemText
                          primary={appointment.title}
                          secondary={`${appointment.counselorName} - ${new Date(appointment.date).toLocaleDateString()}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box flex={1} display="flex" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {t.dashboard.noAppointments}
                  </Typography>
                </Box>
              )}
              
              <Button
                variant="outlined"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/calendar')}
                sx={{ mt: 2, alignSelf: 'flex-start' }}
              >
                {t.dashboard.goToCalendar}
              </Button>
            </Paper>
          </Box>

          {/* Recent Activity */}
          <Box sx={{ flex: '1 1 300px', minWidth: { xs: '100%', sm: '300px' }, width: { xs: '100%', sm: 'auto' } }}>
            <Paper 
              elevation={2}
              sx={{ 
                p: { xs: 2, sm: 3 }, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUp sx={{ mr: 1, color: '#ffc700' }} />
                <Typography variant="h6" component="h2">
                  {t.dashboard.recentActivity}
                </Typography>
              </Box>
              {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                  <CircularProgress sx={{ color: '#ffc700' }} />
                </Box>
              ) : recentActivities.length > 0 ? (
                <Box flex={1}>
                  <List>
                    {recentActivities.map((activity) => (
                      <ListItem key={activity.id} sx={{ px: 0, py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                          <Box sx={{ mr: 2, mt: 0.5 }}>
                            {getActivityIcon(activity.type)}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'medium',
                                color: getActivityColor(activity.type),
                                mb: 0.5
                              }}
                            >
                              {translateActivityTitle(activity.title)}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              color="text.secondary"
                              sx={{ fontSize: '0.875rem', mb: 0.5 }}
                            >
                              {translateActivityDescription(activity.description)}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ fontSize: '0.75rem' }}
                            >
                              {formatTimeAgo(activity.timestamp)}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Box flex={1} display="flex" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    {t.dashboard.noActivities}
                  </Typography>
                </Box>
              )}
              
              <Button
                variant="outlined"
                endIcon={<ArrowForward />}
                onClick={() => navigate('/activity')}
                sx={{ mt: 2, alignSelf: 'flex-start' }}
              >
                {t.dashboard.viewActivityTimeline}
              </Button>
            </Paper>
          </Box>
        </Box>
      </Box>

      {/* New Case Assignment Modal */}
      <Dialog 
        open={!!newAssignmentModal} 
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', pb: 2 }}>
          <Assignment sx={{ mr: 1, color: 'primary.main' }} />
          {t.dashboard.newCaseAssigned}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {t.dashboard.newCaseAssignedMessage}
          </Typography>
          {newAssignmentModal?.metadata?.caseTitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
              {t.cases.caseTitle}: {newAssignmentModal.metadata.caseTitle}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button 
              variant="contained" 
              onClick={handleSeeCase}
              startIcon={<Assignment />}
              sx={{ 
                minWidth: 150,
                backgroundColor: '#ffc700',
                color: '#000',
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: '#ffb700'
                }
              }}
            >
              {t.dashboard.seeCase}
            </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;