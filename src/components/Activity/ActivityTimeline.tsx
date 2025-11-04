import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ArrowBack,
  Search,
  FilterList,
  Assignment,
  People,
  Schedule,
  Edit,
  Add,
  Delete,
  CheckCircle,
  Warning,
  Info,
  Note,
  Update,
  Description
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Counselor } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { t } from '../../utils/translations';

interface ActivityItem {
  id: string;
  type: 'case_created' | 'case_status_changed' | 'case_assigned' | 'case_updated' | 'case_deleted' | 'counselor_created' | 'counselor_updated' | 'counselor_deleted' | 'appointment_created' | 'appointment_updated' | 'appointment_deleted' | 'meeting_notes_added' | 'session_report_added';
  title: string;
  description: string;
  timestamp: Date;
  userId: string;
  userName: string;
  relatedId: string;
  relatedTitle: string;
  status?: string;
  counselorId?: string;
  counselorName?: string;
  metadata?: {
    oldStatus?: string;
    newStatus?: string;
    caseId?: string;
    caseTitle?: string;
    assignedToUserId?: string;
    assignedToUserName?: string;
  };
}

const ActivityTimeline: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [counselorFilter, setCounselorFilter] = useState<string>('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('3months');
  const [counselors, setCounselors] = useState<Counselor[]>([]);

  // Load activities from Firebase
  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        
        // Calculate date based on time range filter
        const getDateFromTimeRange = (range: string) => {
          const now = new Date();
          switch (range) {
            case '3months':
              const threeMonthsAgo = new Date(now);
              threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
              return threeMonthsAgo;
            case '6months':
              const sixMonthsAgo = new Date(now);
              sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
              return sixMonthsAgo;
            case '9months':
              const nineMonthsAgo = new Date(now);
              nineMonthsAgo.setMonth(nineMonthsAgo.getMonth() - 9);
              return nineMonthsAgo;
            case 'alltime':
              return new Date(0); // January 1, 1970
            default:
              const defaultThreeMonths = new Date(now);
              defaultThreeMonths.setMonth(defaultThreeMonths.getMonth() - 3);
              return defaultThreeMonths;
          }
        };
        
        const cutoffDate = getDateFromTimeRange(timeRangeFilter);
        
        // Load activities from the persistent activities collection
        const activitiesRef = collection(db, 'activities');
        const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
        const activitiesSnapshot = await getDocs(activitiesQuery);
        
        const allActivities: ActivityItem[] = [];
        activitiesSnapshot.forEach((doc) => {
          const data = doc.data();
          const timestamp = data.timestamp.toDate();
          
          // Only include activities within the time range
          if (timestamp >= cutoffDate) {
            // Filter by user: show only user-specific activities for counselors and admins
            // Show all activities for leaders only
            let shouldInclude = true;
            
            if (currentUser?.role === 'counselor' || currentUser?.role === 'admin') {
              // Show activities created by this user OR where this user was assigned to a case
              shouldInclude = data.userId === currentUser.id ||
                (data.type === 'case_assigned' && data.metadata?.assignedToUserId === currentUser.id);
            }
            // For leaders: show all activities (no filtering by user)
            
            if (shouldInclude) {
              allActivities.push({
                id: doc.id,
                type: data.type,
                title: data.title,
                description: data.description,
                timestamp: timestamp,
                userId: data.userId,
                userName: data.userName,
                relatedId: data.relatedId,
                relatedTitle: data.relatedTitle,
                status: data.status,
                counselorId: data.counselorId,
                counselorName: data.counselorName,
                metadata: data.metadata
              });
            }
          }
        });

        // Load counselors for filtering
        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, orderBy('createdAt', 'desc'));
        const counselorsSnapshot = await getDocs(counselorsQuery);
        
        const counselorsData: Counselor[] = [];
        counselorsSnapshot.forEach((doc) => {
          const data = doc.data();
          counselorsData.push({
            id: doc.id,
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            specialties: data.specialties || [],
            activeCases: data.activeCases || 0,
            workloadLevel: data.workloadLevel || 'low',
            linkedUserId: data.linkedUserId,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
          });
        });

        setActivities(allActivities);
        setFilteredActivities(allActivities);
        setCounselors(counselorsData);
      } catch (err) {
        setError('Failed to load activities');
        console.error('Activity loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [timeRangeFilter, currentUser]);

  // Filter activities
  useEffect(() => {
    let filtered = activities;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.relatedTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (activity.counselorName && activity.counselorName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(activity => activity.type === typeFilter);
    }

    // Counselor filter
    if (counselorFilter !== 'all') {
      const selectedCounselor = counselors.find(c => c.id === counselorFilter);
      const counselorUserId = selectedCounselor?.linkedUserId || counselorFilter;
      filtered = filtered.filter(activity => activity.userId === counselorUserId);
    }

    setFilteredActivities(filtered);
  }, [activities, searchTerm, typeFilter, counselorFilter, counselors]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'case_created':
        return <Add sx={{ color: '#4caf50' }} />;
      case 'case_status_changed':
        return <Update sx={{ color: '#ff9800' }} />;
      case 'case_assigned':
        return <Assignment sx={{ color: '#9c27b0' }} />;
      case 'case_updated':
        return <Edit sx={{ color: '#2196f3' }} />;
      case 'case_deleted':
        return <Delete sx={{ color: '#f44336' }} />;
      case 'counselor_created':
      case 'counselor_updated':
        return <People sx={{ color: '#9c27b0' }} />;
      case 'appointment_created':
      case 'appointment_updated':
        return <Schedule sx={{ color: '#ff5722' }} />;
      case 'meeting_notes_added':
        return <Note sx={{ color: '#2196f3' }} />;
      case 'session_report_added':
        return <Description sx={{ color: '#ffc700' }} />;
      default:
        return <Info sx={{ color: '#666' }} />;
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
      case 'case_updated':
        return '#2196f3';
      case 'case_deleted':
        return '#f44336';
      case 'counselor_created':
      case 'counselor_updated':
        return '#9c27b0';
      case 'appointment_created':
      case 'appointment_updated':
        return '#ff5722';
      case 'meeting_notes_added':
        return '#2196f3';
      case 'session_report_added':
        return '#ffc700';
      default:
        return '#666';
    }
  };

  const translateActivityTitle = (title: string) => {
    const titleMap: Record<string, string> = {
      'Case Assigned': 'Caz Alocat',
      'Meeting Notes Added': 'Note de Ședință Adăugate',
      'Case Status Changed': 'Status Caz Schimbat',
      'Appointment Scheduled': 'Programare Creată',
      'New Case Created': 'Caz Nou Creat',
      'Case Created': 'Caz Creat',
      'Case Updated': 'Caz Actualizat',
      'Appointment Updated': 'Programare Actualizată',
      'Appointment Deleted': 'Programare Ștearsă',
      'Counselor Added': 'Consilier Adăugat',
      'Counselor Updated': 'Consilier Actualizat',
      'Raport Post-Sesiune Adăugat': 'Raport Post-Sesiune Adăugat'
    };
    return titleMap[title] || title;
  };

  const translateActivityDescription = (description: string) => {
    // Translate common patterns in descriptions
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

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const activityDate = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
    
    if (activityDate.getTime() === today.getTime()) {
      return 'Astăzi';
    } else if (activityDate.getTime() === yesterday.getTime()) {
      return 'Ieri';
    } else {
      return timestamp.toLocaleDateString('ro-RO', {
        month: 'short',
        day: 'numeric',
        year: timestamp.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
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

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error || 'Eroare la încărcarea activităților'}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/')}
          sx={{ mr: 2 }}
        >
          {t.common.back}
        </Button>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#ffc700' }}>
          Activitatea Mea
        </Typography>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" flexWrap="wrap" gap={2} alignItems="center">
          <TextField
            placeholder="Caută activități..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Tip</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              label="Tip"
            >
              <MenuItem value="all">Toate tipurile</MenuItem>
              <MenuItem value="case_created">Caz creat</MenuItem>
              <MenuItem value="case_status_changed">Status schimbat</MenuItem>
              <MenuItem value="case_assigned">Caz alocat</MenuItem>
              <MenuItem value="case_updated">Caz actualizat</MenuItem>
              <MenuItem value="meeting_notes_added">Note ședință</MenuItem>
              <MenuItem value="session_report_added">Raport Post-Sesiune</MenuItem>
              <MenuItem value="appointment_created">Programare creată</MenuItem>
              {currentUser?.role !== 'counselor' && currentUser?.role !== 'admin' && (
                <MenuItem value="counselor_created">Consilier adăugat</MenuItem>
              )}
            </Select>
          </FormControl>

          {currentUser?.role === 'leader' && (
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Consilier</InputLabel>
              <Select
                value={counselorFilter}
                onChange={(e) => setCounselorFilter(e.target.value)}
                label="Consilier"
              >
                <MenuItem value="all">Toți consilierii</MenuItem>
                {counselors.map((counselor) => (
                  <MenuItem key={counselor.id} value={counselor.id}>
                    {counselor.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Perioadă</InputLabel>
            <Select
              value={timeRangeFilter}
              onChange={(e) => setTimeRangeFilter(e.target.value)}
              label="Perioadă"
            >
              <MenuItem value="3months">Ultimele 3 luni</MenuItem>
              <MenuItem value="6months">Ultimele 6 luni</MenuItem>
              <MenuItem value="9months">Ultimele 9 luni</MenuItem>
              <MenuItem value="alltime">Tot timpul</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Activity List */}
      <Paper>
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            {filteredActivities.length} {filteredActivities.length === 1 ? 'Activitate găsită' : 'Activități găsite'}
          </Typography>
          
          {filteredActivities.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                Nu există activități pentru filtrele selectate.
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredActivities.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                      <Box sx={{ mr: 2, mt: 0.5 }}>
                        {getActivityIcon(activity.type)}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 'medium',
                            color: getActivityColor(activity.type),
                            mb: 1
                          }}
                        >
                          {translateActivityTitle(activity.title)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          {translateActivityDescription(activity.description)}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Typography variant="caption" color="text.secondary">
                            De {activity.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            •
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(activity.timestamp)}
                          </Typography>
                          {activity.counselorName && (
                            <>
                              <Typography variant="caption" color="text.secondary">
                                •
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {activity.counselorName}
                              </Typography>
                            </>
                          )}
                        </Box>
                        {activity.metadata?.oldStatus && activity.metadata?.newStatus && (
                          <Box mt={1}>
                            <Chip
                              label={`${translateStatus(activity.metadata.oldStatus)} → ${translateStatus(activity.metadata.newStatus)}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem' }}
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </ListItem>
                  {index < filteredActivities.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default ActivityTimeline;
