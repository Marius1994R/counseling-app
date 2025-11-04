import React, { useState, useEffect } from 'react';
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
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Paper
} from '@mui/material';
import {
  Search,
  FilterList,
  Edit,
  Assignment,
  Person,
  CalendarToday,
  TrendingUp,
  TrendingDown,
  Remove,
  CheckCircle,
  Note,
  Block,
  Schedule
} from '@mui/icons-material';
import { collection, getDocs, query, where, orderBy, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { Case, CaseStatus, IssueType } from '../../types';
import MeetingNotes from './MeetingNotes';
import SessionReport from './SessionReport';
import { logCaseStatusChange, logCaseCreated } from '../../utils/activityLogger';
import { t } from '../../utils/translations';

const Cases: React.FC = () => {
  const { currentUser } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [issueTypeFilter, setIssueTypeFilter] = useState<IssueType | 'all'>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [editData, setEditData] = useState({
    issueTypes: [] as IssueType[],
    status: 'active' as CaseStatus,
    description: ''
  });
  const [meetingNotesOpen, setMeetingNotesOpen] = useState(false);
  const [sessionReportOpen, setSessionReportOpen] = useState(false);
  const [selectedCaseForNotes, setSelectedCaseForNotes] = useState<Case | null>(null);
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({}); // caseId -> latest note content
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [descriptionModalOpen, setDescriptionModalOpen] = useState(false);
  const [selectedCaseForDescription, setSelectedCaseForDescription] = useState<Case | null>(null);

  const commonIssueTypes: IssueType[] = [
    'spiritual',
    'relational',
    'personal'
  ];

  // Load cases assigned to current user
  useEffect(() => {
    const loadCases = async () => {
      if (!currentUser?.id) return;
      
      try {
        setLoading(true);
        
        // First, find the counselor ID for the current user
        let counselorId: string | null = null;
        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, where('linkedUserId', '==', currentUser.id));
        const counselorsSnapshot = await getDocs(counselorsQuery);
        
        if (!counselorsSnapshot.empty) {
          counselorId = counselorsSnapshot.docs[0].id;
        }
        
        // Load all cases and filter on client side
        const casesRef = collection(db, 'cases');
        const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
        const casesSnapshot = await getDocs(casesQuery);
        
        const casesData: Case[] = [];
        
        casesSnapshot.forEach((doc) => {
          const data = doc.data();
          const caseItem = {
            id: doc.id,
            title: data.title,
            counseledName: data.counseledName,
            age: data.age,
            civilStatus: data.civilStatus,
            issueTypes: data.issueTypes || [],
            phoneNumber: data.phoneNumber || '',
            description: data.description,
            status: data.status,
            assignedCounselorId: data.assignedCounselorId,
            assignedCounselorName: data.assignedCounselorName,
            meetingFeedback: data.meetingFeedback || '',
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            createdBy: data.createdBy || ''
          };
          
          // Filter cases based on user role - only show assigned cases
          const shouldInclude = counselorId 
            ? caseItem.assignedCounselorId === counselorId
            : caseItem.assignedCounselorId === currentUser.id;
          
          if (shouldInclude) {
            casesData.push(caseItem);
          }
        });
        
        setCases(casesData);
        setFilteredCases(casesData);
        
        // Load latest notes for all cases
        await loadLatestNotes(casesData);
      } catch (error) {
        console.error('Error loading cases:', error);
        setError('Error loading cases');
      } finally {
        setLoading(false);
      }
    };
    
    loadCases();
  }, [currentUser?.id]); // Only depend on user ID, not entire user object

  // Filter cases based on search and filters
  useEffect(() => {
    let filtered = cases;

    if (searchTerm) {
      filtered = filtered.filter(caseItem =>
        caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.counseledName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(caseItem => caseItem.status === statusFilter);
    }

    setFilteredCases(filtered);
  }, [cases, searchTerm, statusFilter]);

  const handleEditCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setEditData({
      issueTypes: [...caseItem.issueTypes], // Create a copy to avoid mutations
      status: caseItem.status,
      description: caseItem.description
    });
    setEditDialogOpen(true);
  };

  const handleSaveCase = async () => {
    if (!selectedCase) return;

    try {
      const oldStatus = selectedCase.status;
      const newStatus = editData.status;
      
      const caseRef = doc(db, 'cases', selectedCase.id);
      await updateDoc(caseRef, {
        issueTypes: editData.issueTypes,
        status: editData.status,
        description: editData.description,
        updatedAt: new Date()
      });

      // Log status change activity if status actually changed
      if (oldStatus !== newStatus && currentUser) {
        await logCaseStatusChange(
          selectedCase.id,
          selectedCase.title,
          oldStatus,
          newStatus,
          currentUser.id,
          currentUser.fullName || currentUser.email || 'Unknown User'
        );
      }

      // Update local state
      setCases(prevCases =>
        prevCases.map(caseItem =>
          caseItem.id === selectedCase.id
            ? { ...caseItem, ...editData, updatedAt: new Date() }
            : caseItem
        )
      );

      setEditDialogOpen(false);
      setSnackbar({ open: true, message: t.cases.updateSuccess || 'Caz actualizat cu succes', severity: 'success' });
    } catch (error) {
      console.error('Error updating case:', error);
      setSnackbar({ open: true, message: t.cases.updateError || 'Eroare la actualizarea cazului', severity: 'error' });
    }
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedCase(null);
    setEditData({
      issueTypes: [],
      status: 'active',
      description: ''
    });
  };

  const handleOpenMeetingNotes = (caseItem: Case) => {
    setSelectedCaseForNotes(caseItem);
    setMeetingNotesOpen(true);
  };

  const handleOpenSessionReport = (caseItem: Case) => {
    setSelectedCaseForNotes(caseItem);
    setSessionReportOpen(true);
  };

  const handleNoteAdded = async () => {
    // Reload latest notes when a new note is added
    if (cases.length > 0) {
      await loadLatestNotes(cases);
    }
  };

  const handleCloseMeetingNotes = () => {
    setMeetingNotesOpen(false);
    setSelectedCaseForNotes(null);
  };

  const handleCloseSessionReport = () => {
    setSessionReportOpen(false);
    setSelectedCaseForNotes(null);
  };

  // Load latest meeting note for each case
  const loadLatestNotes = async (cases: Case[]) => {
    try {
      const notesPromises = cases.map(async (caseItem) => {
        const notesRef = collection(db, 'meetingNotes');
        const notesQuery = query(notesRef, where('caseId', '==', caseItem.id));
        const notesSnapshot = await getDocs(notesQuery);
        
        if (!notesSnapshot.empty) {
          // Sort by creation date on client side (newest first)
          const notesData = notesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              content: data.content,
              createdAt: data.createdAt.toDate()
            };
          });
          
          notesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          const latestNote = notesData[0];
          
          return { caseId: caseItem.id, content: latestNote.content };
        }
        return { caseId: caseItem.id, content: '' };
      });

      const notesResults = await Promise.all(notesPromises);
      const notesMap: Record<string, string> = {};
      notesResults.forEach(({ caseId, content }) => {
        notesMap[caseId] = content;
      });
      
      setCaseNotes(notesMap);
    } catch (error) {
      console.error('Error loading latest notes:', error);
    }
  };

  const handleIssueTypeToggle = (issueType: IssueType) => {
    setEditData(prev => {
      const isSelected = prev.issueTypes.includes(issueType);
      return {
        ...prev,
        issueTypes: isSelected
          ? prev.issueTypes.filter(type => type !== issueType)
          : [...prev.issueTypes, issueType]
      };
    });
  };

  const getStatusColor = (status: CaseStatus) => {
    switch (status) {
      case 'waiting': return 'default';
      case 'active': return 'success';
      case 'unfinished': return 'error';
      case 'finished': return 'info';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: CaseStatus) => {
    switch (status) {
      case 'waiting': return <Schedule />;
      case 'active': return <TrendingUp />;
      case 'unfinished': return <TrendingDown />;
      case 'finished': return <CheckCircle />;
      case 'cancelled': return <Remove />;
      default: return <Remove />;
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

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Search and Filter Controls */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <TextField
              fullWidth
              label={t.cases.filters.searchPlaceholder || "Căutați cazuri"}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Box>
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CaseStatus | 'all')}
                label="Status"
              >
                <MenuItem value="all">{t.status.all}</MenuItem>
                <MenuItem value="waiting">{t.status.waiting}</MenuItem>
                <MenuItem value="active">{t.status.active}</MenuItem>
                <MenuItem value="unfinished">{t.status.unfinished}</MenuItem>
                <MenuItem value="finished">{t.status.completed}</MenuItem>
                <MenuItem value="cancelled">{t.status.cancelled}</MenuItem>
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
              label={`${filteredCases.length} ${t.cases.filters.all.toLowerCase()}`}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Cases Grid */}
      {filteredCases.length === 0 ? (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: 300,
          textAlign: 'center',
          p: 4
        }}>
          <Assignment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" color="text.secondary" gutterBottom>
            {t.cases.noCases}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {searchTerm || statusFilter !== 'all' 
              ? t.cases.noCasesMessage
              : t.cases.noCasesMessage
            }
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            sm: 'repeat(auto-fill, minmax(350px, 1fr))' 
          }, 
          gap: 2 
        }}>
          {filteredCases.map((caseItem) => (
          <Card key={caseItem.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header Section */}
            <Box sx={{ 
              backgroundColor: '#f8f9fa', 
              p: 2, 
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              <Typography 
                variant="h6" 
                component="h2" 
                sx={{ 
                  fontWeight: 'bold', 
                  color: '#333',
                  fontSize: { xs: '1.1rem', sm: '1.25rem' }
                }}
              >
                {caseItem.title}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                gap: 1,
                width: '100%',
                justifyContent: { xs: 'center', sm: 'flex-start' },
                flexWrap: 'wrap'
              }}>
                <Button
                  size="small"
                  startIcon={<Note />}
                  onClick={() => handleOpenMeetingNotes(caseItem)}
                  sx={{ 
                    color: '#ffc700',
                    borderColor: '#ffc700',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 199, 0, 0.1)',
                      borderColor: '#e6b300'
                    },
                    flex: { xs: 1, sm: 'none' }
                  }}
                  variant="outlined"
                >
                  {t.meetingNotes.addNote}
                </Button>
                {caseItem.status === 'active' && (
                  <Button
                    size="small"
                    startIcon={<CalendarToday />}
                    onClick={() => handleOpenSessionReport(caseItem)}
                    sx={{ 
                      color: '#ffc700',
                      borderColor: '#ffc700',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 199, 0, 0.1)',
                        borderColor: '#e6b300'
                      },
                      flex: { xs: 1, sm: 'none' },
                      whiteSpace: 'normal',
                      lineHeight: 1.2,
                      textAlign: 'center',
                      minWidth: { sm: 'auto' },
                      maxWidth: { sm: '110px' },
                      height: { sm: 'auto' },
                      py: { sm: 1 }
                    }}
                    variant="outlined"
                  >
                    <Box component="span" sx={{ display: 'block', fontSize: { sm: '0.7rem' } }}>
                      Gestionează<br />Rapoartele
                    </Box>
                  </Button>
                )}
                <Button
                  size="small"
                  startIcon={<Edit />}
                  onClick={() => handleEditCase(caseItem)}
                  sx={{ 
                    color: '#ffc700',
                    flex: { xs: 1, sm: 'none' },
                    minWidth: { sm: 'auto' },
                    px: { sm: 1 },
                    '& .MuiButton-startIcon': {
                      marginRight: { xs: 1, sm: 0 }
                    }
                  }}
                  title={t.common.edit}
                >
                  <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                    {t.common.edit}
                  </Box>
                </Button>
              </Box>
            </Box>

            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* Client Information Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#555' }}>
                  {t.cases.caseDetails}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {caseItem.counseledName} ({caseItem.age} years)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Assignment fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {caseItem.civilStatus}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CalendarToday fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    Creat: {caseItem.createdAt.toLocaleDateString('ro-RO')}
                  </Typography>
                </Box>
              </Box>

              {/* Case Details Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, color: '#555' }}>
                  {t.cases.caseDetails}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t.cases.status}
                  </Typography>
                  <Chip
                    label={caseItem.status.charAt(0).toUpperCase() + caseItem.status.slice(1)}
                    color={getStatusColor(caseItem.status)}
                    size="small"
                    icon={getStatusIcon(caseItem.status)}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {t.cases.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    backgroundColor: '#f8f9fa',
                    padding: 1.5,
                    borderRadius: 1,
                    border: '1px solid #e0e0e0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {caseItem.description.length > 150 
                      ? `${caseItem.description.substring(0, 150)}...` 
                      : caseItem.description}
                  </Typography>
                  {caseItem.description.length > 150 && (
                    <Button
                      size="small"
                      onClick={() => {
                        setSelectedCaseForDescription(caseItem);
                        setDescriptionModalOpen(true);
                      }}
                      sx={{ 
                        mt: 1,
                        color: '#ffc700',
                        textTransform: 'none'
                      }}
                    >
                      {t.cases.viewFullDescription}
                    </Button>
                  )}
                </Box>
              </Box>

              {/* Meeting Notes Preview Section */}
              <Box sx={{ 
                backgroundColor: 'rgba(255, 199, 0, 0.05)',
                border: '1px solid rgba(255, 200, 0, 0)',
                borderRadius: 1,
                p: 2,
                mb: 2
              }}>
                <Typography variant="subtitle2" gutterBottom sx={{ 
                  fontWeight: 'bold',
                  color: '#ffc700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  <Note fontSize="small" />
                  {t.meetingNotes.latestNote || "Ultima Notă de Ședință"}
                </Typography>
                
                {caseNotes[caseItem.id] ? (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      fontStyle: 'italic',
                      maxHeight: '60px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      mb: 1
                    }}>
                      {caseNotes[caseItem.id]}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleOpenMeetingNotes(caseItem)}
                      sx={{ 
                        color: '#ffc700',
                        textTransform: 'none'
                      }}
                    >
                      {t.cases.viewAllNotes || "Vezi Toate Notele"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      fontStyle: 'italic',
                      mb: 1
                    }}>
                      {t.meetingNotes.noNotesMessage || "Nu există note de ședință încă."}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => handleOpenMeetingNotes(caseItem)}
                      sx={{ 
                        color: '#ffc700',
                        textTransform: 'none'
                      }}
                    >
                      {t.meetingNotes.addNote}
                    </Button>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
          ))}
        </Box>
      )}

      {/* Edit Case Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
        <DialogTitle>{t.cases.editCase}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>{t.cases.status} *</InputLabel>
              <Select
                value={editData.status}
                onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value as CaseStatus }))}
                label={`${t.cases.status} *`}
              >
                <MenuItem value="waiting">{t.status.waiting}</MenuItem>
                <MenuItem value="active">{t.status.active}</MenuItem>
                <MenuItem value="unfinished">{t.status.unfinished}</MenuItem>
                <MenuItem value="finished">{t.status.completed}</MenuItem>
                <MenuItem value="cancelled">{t.status.cancelled}</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography variant="subtitle2" gutterBottom>
                {t.cases.issueTypes} *
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {commonIssueTypes.map((issueType) => (
                  <Chip
                    key={issueType}
                    label={issueType}
                    clickable
                    color={editData.issueTypes.includes(issueType) ? 'primary' : 'default'}
                    onClick={() => handleIssueTypeToggle(issueType)}
                    sx={{ mb: 1 }}
                  />
                ))}
              </Box>
            </Box>

            <TextField
              label={t.cases.description}
              multiline
              rows={4}
              value={editData.description}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
            />

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>{t.common.cancel}</Button>
          <Button
            onClick={handleSaveCase}
            variant="contained"
            disabled={editData.issueTypes.length === 0}
            sx={{ backgroundColor: '#ffc700', '&:hover': { backgroundColor: '#e6b300' } }}
          >
            {t.common.save}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Meeting Notes Dialog */}
      <MeetingNotes
        open={meetingNotesOpen}
        onClose={handleCloseMeetingNotes}
        caseId={selectedCaseForNotes?.id || ''}
        caseTitle={selectedCaseForNotes?.title || ''}
        onNoteAdded={handleNoteAdded}
      />

      {/* Session Report Dialog */}
      <SessionReport
        open={sessionReportOpen}
        onClose={handleCloseSessionReport}
        caseId={selectedCaseForNotes?.id || ''}
        caseTitle={selectedCaseForNotes?.title || ''}
        onReportAdded={handleNoteAdded}
      />

      {/* Full Description Modal */}
      <Dialog 
        open={descriptionModalOpen} 
        onClose={() => setDescriptionModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {t.cases.description} - {selectedCaseForDescription?.counseledName}
        </DialogTitle>
        <DialogContent>
          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ 
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              py: 2
            }}
          >
            {selectedCaseForDescription?.description}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionModalOpen(false)}>
            {t.common.close}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Cases;
