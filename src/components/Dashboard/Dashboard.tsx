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
  IconButton,
  Chip
} from '@mui/material';
import {
  Assignment,
  Schedule,
  TrendingUp,
  ArrowForward,
  Add,
  Update,
  Note,
  Description,
  CheckCircle,
  HourglassEmpty,
  PlayCircle,
  Cancel
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { Case, Appointment, CaseStatus } from '../../types';
import { collection, getDocs, query, orderBy, where, addDoc, doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
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
  const [dismissedAssignments, setDismissedAssignments] = useState<Set<string>>(new Set());

  // Load dismissed assignments from Firebase
  const loadDismissedAssignments = async (userId: string) => {
    try {
      const dismissedRef = doc(db, 'dismissedAssignments', userId);
      const dismissedSnap = await getDoc(dismissedRef);
      
      if (dismissedSnap.exists()) {
        const data = dismissedSnap.data();
        const dismissedIds = data.activityIds || [];
        setDismissedAssignments(new Set(dismissedIds));
      } else {
        setDismissedAssignments(new Set());
      }
    } catch (error) {
      console.error('Error loading dismissed assignments:', error);
      setDismissedAssignments(new Set());
    }
  };

  // Save dismissed assignment to Firebase
  const saveDismissedAssignment = async (userId: string, activityId: string) => {
    try {
      const dismissedRef = doc(db, 'dismissedAssignments', userId);
      const dismissedSnap = await getDoc(dismissedRef);
      
      if (dismissedSnap.exists()) {
        // Update existing document
        await updateDoc(dismissedRef, {
          activityIds: arrayUnion(activityId),
          updatedAt: new Date()
        });
      } else {
        // Create new document
        await setDoc(dismissedRef, {
          userId,
          activityIds: [activityId],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error saving dismissed assignment:', error);
    }
  };

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
              sex: data.sex,
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
        
        if (currentUser?.role === 'counselor' || currentUser?.role === 'admin' || currentUser?.role === 'leader') {
          // Show activities created by this user OR where this user was assigned to a case
          // Check both user ID and counselor record ID for case assignments
          userActivities = activitiesData.filter(activity => {
            const isUserCreated = activity.userId === currentUser.id;
            const isCaseAssignedToUser = activity.type === 'case_assigned' && (
              activity.metadata?.assignedToUserId === currentUser.id ||
              (counselorId && activity.metadata?.assignedToUserId === counselorId)
            );
            
            
            return isUserCreated || isCaseAssignedToUser;
          });
        }
        // For other roles: show all activities (no filtering by user)
        
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
    
    // Load dismissed assignments from Firebase
    if (currentUser?.id) {
      loadDismissedAssignments(currentUser.id);
    }
  }, [currentUser?.id]);

  // Detect new case assignments and show modal
  // Includes counselors, admins, and leaders
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'counselor' && currentUser.role !== 'admin' && currentUser.role !== 'leader')) {
      return;
    }

    // Load all case_assigned activities separately to ensure we don't miss any
    const loadCaseAssignments = async () => {
      try {
        const activitiesRef = collection(db, 'activities');
        let allCaseAssignments: any[] = [];
        
        try {
          // Try to query with where and orderBy (requires composite index)
          const activitiesQuery = query(
            activitiesRef, 
            where('type', '==', 'case_assigned'),
            orderBy('timestamp', 'desc')
          );
          const activitiesSnapshot = await getDocs(activitiesQuery);
          
          activitiesSnapshot.forEach((doc) => {
            const data = doc.data();
            allCaseAssignments.push({
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
        } catch (queryError: any) {
          // Fallback: load all activities and filter in memory if index is missing
          if (queryError.code === 'failed-precondition' || queryError.message?.includes('index')) {
            console.warn('Firestore index missing, falling back to loading all activities');
            const allActivitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
            const allActivitiesSnapshot = await getDocs(allActivitiesQuery);
            
            allActivitiesSnapshot.forEach((doc) => {
              const data = doc.data();
              if (data.type === 'case_assigned') {
                allCaseAssignments.push({
                  id: doc.id,
                  type: data.type,
                  title: data.title,
                  description: data.description,
                  timestamp: data.timestamp.toDate(),
                  userId: data.userId,
                  userName: data.userName,
                  metadata: data.metadata
                });
              }
            });
          } else {
            throw queryError;
          }
        }

        // Filter for assignments to this user (check both user ID and counselor record ID)
        const caseAssignedActivities = allCaseAssignments.filter(activity => {
          const matchesUser = activity.metadata?.assignedToUserId === currentUser.id;
          const matchesCounselor = counselorRecordId && 
            activity.metadata?.assignedToUserId === counselorRecordId;
          const notDismissed = !dismissedAssignments.has(activity.id);
          
          return (matchesUser || matchesCounselor) && notDismissed;
        });

        if (caseAssignedActivities.length > 0) {
          // Get the most recent assignment
          const mostRecentAssignment = caseAssignedActivities[0];
          setNewAssignmentModal(mostRecentAssignment);
        } else {
          // Clear modal if no assignments found
          setNewAssignmentModal(null);
        }
      } catch (err) {
        console.error('Error loading case assignments:', err);
      }
    };

    loadCaseAssignments();
  }, [currentUser, counselorRecordId, dismissedAssignments]);

  const handleSeeCase = async () => {
    if (newAssignmentModal?.metadata?.caseId && currentUser?.id) {
      const activityId = newAssignmentModal.id;
      
      // Mark this assignment as dismissed in state
      const newDismissed = new Set(Array.from(dismissedAssignments).concat(activityId));
      setDismissedAssignments(newDismissed);
      
      // Save to Firebase
      await saveDismissedAssignment(currentUser.id, activityId);
      
      // Close modal and navigate to cases page with waiting filter applied
      setNewAssignmentModal(null);
      navigate(`/cases?status=waiting`);
      
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
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Top Row */}
        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
          {/* Status Cazuri - Rebranded */}
          <Box sx={{ flex: '1 1 400px', minWidth: { xs: '100%', sm: '400px' }, width: { xs: '100%', sm: 'auto' } }}>
            <Paper sx={{ 
              p: { xs: 3, sm: 4 }, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              borderRadius: 3,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              border: '1px solid rgba(255, 199, 0, 0.15)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                transform: 'translateY(-2px)'
              }
            }}>
              {/* Decorative background elements */}
              <Box sx={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                backgroundColor: 'rgba(255, 199, 0, 0.08)',
                borderRadius: '50%',
                zIndex: 0
              }} />
              <Box sx={{
                position: 'absolute',
                bottom: -30,
                left: -30,
                width: 100,
                height: 100,
                backgroundColor: 'rgba(255, 199, 0, 0.05)',
                borderRadius: '50%',
                zIndex: 0
              }} />
              
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                {/* Header */}
                <Box sx={{ mb: 3 }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Box sx={{ 
                      p: 1.5, 
                      backgroundColor: '#ffc700', 
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mr: 2,
                      boxShadow: '0 4px 12px rgba(255, 199, 0, 0.3)'
                    }}>
                      <Assignment sx={{ color: '#000', fontSize: '1.75rem' }} />
                    </Box>
                    <Box>
                      <Typography variant="h5" component="h2" sx={{ 
                        fontWeight: 700, 
                        color: '#212529',
                        fontSize: { xs: '1.25rem', sm: '1.5rem' }
                      }}>
                        {t.dashboard.yourPerformance}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: '#6c757d',
                        fontSize: '0.875rem',
                        mt: 0.5
                      }}>
                        {new Date().toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                
                {/* Status Cards Grid */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: 2,
                  mb: 3
                }}>
                  {/* Active Cases - Featured */}
                  <Box sx={{ 
                    gridColumn: { xs: '1 / -1', sm: '1 / -1' },
                    p: 3,
                    background: 'linear-gradient(135deg, #ffc700 0%, #ffb300 100%)',
                    borderRadius: 3,
                    boxShadow: '0 4px 16px rgba(255, 199, 0, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ position: 'absolute', top: -20, right: -20, opacity: 0.2 }}>
                      <PlayCircle sx={{ fontSize: 120, color: '#000' }} />
                    </Box>
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <PlayCircle sx={{ fontSize: '2rem', color: '#000', mr: 1.5 }} />
                        <Typography variant="body2" sx={{ 
                          color: '#000',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {t.dashboard.activeCases}
                        </Typography>
                      </Box>
                      <Typography variant="h2" sx={{ 
                        fontWeight: 800, 
                        color: '#000',
                        fontSize: { xs: '3rem', sm: '4rem' },
                        lineHeight: 1,
                        mb: 1
                      }}>
                        {metrics.activeCases}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: 'rgba(0, 0, 0, 0.7)',
                        fontSize: '0.875rem'
                      }}>
                        Cazuri în desfășurare
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Completed Cases */}
                  <Box sx={{ 
                    p: 2.5,
                    background: 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(76, 175, 80, 0.05) 100%)',
                    borderRadius: 2.5,
                    border: '2px solid rgba(76, 175, 80, 0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)',
                      borderColor: 'rgba(76, 175, 80, 0.4)'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <CheckCircle sx={{ fontSize: '1.5rem', color: '#4caf50', mr: 1 }} />
                      <Typography variant="body2" sx={{ 
                        color: '#495057',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {t.dashboard.completedCases}
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700, 
                      color: '#4caf50',
                      mb: 0.5,
                      fontSize: { xs: '2rem', sm: '2.5rem' }
                    }}>
                      {metrics.completedCases}
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: '#6c757d',
                      fontSize: '0.75rem'
                    }}>
                      Finalizate cu succes
                    </Typography>
                  </Box>
                  
                  {/* Pending Cases */}
                  <Box sx={{ 
                    p: 2.5,
                    background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.1) 0%, rgba(255, 152, 0, 0.05) 100%)',
                    borderRadius: 2.5,
                    border: '2px solid rgba(255, 152, 0, 0.2)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)',
                      borderColor: 'rgba(255, 152, 0, 0.4)'
                    }
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <HourglassEmpty sx={{ fontSize: '1.5rem', color: '#ff9800', mr: 1 }} />
                      <Typography variant="body2" sx={{ 
                        color: '#495057',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {t.dashboard.pendingCases}
                      </Typography>
                    </Box>
                    <Typography variant="h3" sx={{ 
                      fontWeight: 700, 
                      color: '#ff9800',
                      mb: 0.5,
                      fontSize: { xs: '2rem', sm: '2.5rem' }
                    }}>
                      {metrics.pendingCases}
                    </Typography>
                    <Typography variant="caption" sx={{ 
                      color: '#6c757d',
                      fontSize: '0.75rem'
                    }}>
                      În așteptare
                    </Typography>
                  </Box>
                </Box>
                
                {/* Additional Quick Stats */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1.5,
                  mb: 3
                }}>
                  <Chip
                    icon={<Schedule sx={{ color: '#2196f3' }} />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#2196f3' }}>
                          {upcomingAppointments.length}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.7rem',
                          color: '#1976d2',
                          display: 'block',
                          mt: 0.25
                        }}>
                          {t.dashboard.upcoming}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      flex: 1,
                      height: 'auto',
                      py: 1.5,
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      border: '2px solid rgba(33, 150, 243, 0.2)',
                      '& .MuiChip-icon': {
                        marginLeft: 1.5
                      },
                      '& .MuiChip-label': {
                        paddingLeft: 1,
                        paddingRight: 1.5
                      }
                    }}
                  />
                  <Chip
                    icon={<Assignment sx={{ color: '#9c27b0' }} />}
                    label={
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                          {metrics.totalCases}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          fontSize: '0.7rem',
                          color: '#7b1fa2',
                          display: 'block',
                          mt: 0.25
                        }}>
                          {t.dashboard.totalCases}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      flex: 1,
                      height: 'auto',
                      py: 1.5,
                      backgroundColor: 'rgba(156, 39, 176, 0.1)',
                      border: '2px solid rgba(156, 39, 176, 0.2)',
                      '& .MuiChip-icon': {
                        marginLeft: 1.5
                      },
                      '& .MuiChip-label': {
                        paddingLeft: 1,
                        paddingRight: 1.5
                      }
                    }}
                  />
                </Box>
                
                {/* CTA Button */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/cases')}
                    startIcon={<Assignment />}
                    sx={{ 
                      backgroundColor: '#ffc700',
                      color: '#000',
                      fontWeight: 700,
                      py: 1,
                      px: 3,
                      fontSize: '0.875rem',
                      borderRadius: 2,
                      textTransform: 'none',
                      boxShadow: '0 2px 8px rgba(255, 199, 0, 0.3)',
                      minHeight: 'auto',
                      '&:hover': { 
                        backgroundColor: '#e6b300',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 12px rgba(255, 199, 0, 0.4)'
                      },
                      transition: 'all 0.2s ease-in-out'
                    }}
                  >
                    {t.dashboard.viewAllCases}
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
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 1, sm: 2 },
            maxWidth: { xs: 'calc(100% - 16px)', sm: '500px' },
            width: { xs: '100%', sm: 'auto' },
            borderRadius: { xs: 2, sm: 2 }
          }
        }}
        sx={{
          '& .MuiDialog-container': {
            alignItems: { xs: 'center', sm: 'center' }
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          pb: { xs: 1, sm: 2 },
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 3 }
        }}>
          <Assignment sx={{ mr: 1, color: 'primary.main' }} />
          {t.dashboard.newCaseAssigned}
        </DialogTitle>
        <DialogContent sx={{ 
          px: { xs: 2, sm: 3 },
          pb: { xs: 1, sm: 2 }
        }}>
          <Typography variant="body1" sx={{ fontSize: { xs: '0.9375rem', sm: '1rem' } }}>
            {t.dashboard.newCaseAssignedMessage}
          </Typography>
          {newAssignmentModal?.metadata?.caseTitle && (
            <Typography variant="body2" color="text.secondary" sx={{ 
              mt: 2, 
              fontStyle: 'italic',
              fontSize: { xs: '0.875rem', sm: '0.875rem' }
            }}>
              {t.cases.caseTitle}: {newAssignmentModal.metadata.caseTitle}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          px: { xs: 2, sm: 3 }, 
          pb: { xs: 2, sm: 3 },
          pt: { xs: 1, sm: 1 },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1, sm: 0 }
        }}>
            <Button 
              variant="contained" 
              onClick={handleSeeCase}
              startIcon={<Assignment />}
              fullWidth={false}
              sx={{ 
                minWidth: { xs: '100%', sm: 150 },
                backgroundColor: '#ffc700',
                color: '#000',
                fontWeight: 'bold',
                py: { xs: 1.5, sm: 1 },
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