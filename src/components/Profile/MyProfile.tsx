import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Avatar
} from '@mui/material';
import {
  Edit,
  Person,
  Phone,
  Assignment,
  TrendingUp,
  TrendingDown,
  Remove,
  CheckCircle,
  Block,
  Schedule
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { Counselor, Case } from '../../types';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { t } from '../../utils/translations';
import { useSearchParams, useNavigate } from 'react-router-dom';

const MyProfile: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [editData, setEditData] = useState({
    phoneNumber: '',
    specialties: [] as string[]
  });
  
  const [newSpecialty, setNewSpecialty] = useState('');

  const commonSpecialties = [
    'Consiliere În Căsătorie',
    'Terapie Familială',
    'Consiliere Privind Doliul',
    'Recuperare Dependențe',
    'Probleme Adolescenți',
    'Îndrumare Spirituală',
    'Anxietate & Depresie',
    'Management Furiilor',
    'Consiliere Financiară',
    'Îndrumare Carieră',
    'Probleme Relaționale',
    'Intervenție Crize'
  ];

  // Load counselor data and cases
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Load counselor data
        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, where('linkedUserId', '==', currentUser.id));
        const counselorsSnapshot = await getDocs(counselorsQuery);
        
        if (!counselorsSnapshot.empty) {
          const counselorDoc = counselorsSnapshot.docs[0];
          const counselorData = counselorDoc.data();
          
          // Load cases for this counselor (only count, not full data)
          const casesRef = collection(db, 'cases');
          const casesQuery = query(casesRef, where('assignedCounselorId', '==', counselorDoc.id));
          const casesSnapshot = await getDocs(casesQuery);
          
          // Count cases by status for workload calculation
          const casesData: Case[] = [];
          casesSnapshot.forEach((doc) => {
            const data = doc.data();
            casesData.push({
              id: doc.id,
              title: data.title,
              counseledName: data.counseledName,
              age: data.age,
              sex: data.sex,
              civilStatus: data.civilStatus,
              issueTypes: data.issueTypes || [],
              phoneNumber: data.phoneNumber || '',
              description: data.description,
              status: data.status,
              assignedCounselorId: data.assignedCounselorId,
              assignedCounselorName: data.assignedCounselorName,
              createdAt: data.createdAt.toDate(),
              updatedAt: data.updatedAt.toDate(),
              createdBy: data.createdBy || ''
            });
          });
          
          const activeCases = casesData.filter(caseItem => caseItem.status === 'active').length;
          const workloadLevel = activeCases >= 3 ? 'high' : activeCases >= 2 ? 'moderate' : 'low';
          
          setCounselor({
            id: counselorDoc.id,
            fullName: counselorData.fullName,
            email: counselorData.email,
            phoneNumber: counselorData.phoneNumber || '',
            specialties: counselorData.specialties || [],
            activeCases: activeCases,
            workloadLevel: workloadLevel,
            linkedUserId: counselorData.linkedUserId,
            createdAt: counselorData.createdAt.toDate(),
            updatedAt: counselorData.updatedAt.toDate()
          });
          
          setCases(casesData);
        } else {
          // User is not a counselor - show basic profile
          setCounselor({
            id: currentUser.id,
            fullName: currentUser.fullName || '',
            email: currentUser.email || '',
            phoneNumber: '',
            specialties: [],
            activeCases: 0,
            workloadLevel: 'low' as const,
            linkedUserId: undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          setCases([]);
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        showSnackbar(t.profile.loadError || 'Eroare la încărcarea datelor profilului', 'error');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [currentUser?.id]); // Only depend on user ID, not entire user object

  // Handle edit query parameter
  useEffect(() => {
    const editParam = searchParams.get('edit');
    if (editParam === 'true' && counselor) {
      handleEditClick();
      // Remove the query parameter from URL
      searchParams.delete('edit');
      navigate(`/profile?${searchParams.toString()}`, { replace: true });
    }
  }, [searchParams, counselor]);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleEditClick = () => {
    if (!counselor) return;
    
    setEditData({
      phoneNumber: counselor.phoneNumber.replace('+40', ''),
      specialties: [...counselor.specialties]
    });
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!counselor) return;
    
    try {
      const counselorRef = doc(db, 'counselors', counselor.id);
      await updateDoc(counselorRef, {
        phoneNumber: `+40${editData.phoneNumber.replace(/[\s\-()]/g, '')}`,
        specialties: editData.specialties,
        updatedAt: new Date()
      });
      
      // Update local state
      setCounselor({
        ...counselor,
        phoneNumber: `+40${editData.phoneNumber.replace(/[\s\-()]/g, '')}`,
        specialties: editData.specialties,
        updatedAt: new Date()
      });
      
      setEditDialogOpen(false);
      showSnackbar(t.profile.updateSuccess || 'Profil actualizat cu succes!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar(t.profile.updateError || 'Eroare la actualizarea profilului', 'error');
    }
  };

  const handleAddSpecialty = () => {
    const trimmedSpecialty = newSpecialty.trim();
    if (trimmedSpecialty && !editData.specialties.includes(trimmedSpecialty)) {
      setEditData(prev => ({
        ...prev,
        specialties: [...prev.specialties, trimmedSpecialty]
      }));
      setNewSpecialty('');
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setEditData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }));
  };

  const handleAddCommonSpecialty = (specialty: string) => {
    if (!editData.specialties.includes(specialty)) {
      setEditData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty]
      }));
    }
  };

  const getWorkloadColor = (level: string): 'error' | 'warning' | 'success' | 'default' => {
    switch (level) {
      case 'high': return 'error';
      case 'moderate': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getWorkloadIcon = (level: string) => {
    switch (level) {
      case 'high': return <TrendingUp />;
      case 'moderate': return <Remove />;
      case 'low': return <TrendingDown />;
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

  if (!counselor) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">
          {t.profile.loadError || 'Eroare la încărcarea datelor profilului. Te rugăm să reîncerci.'}
        </Alert>
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
          <Person sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' } }} />
          {t.profile.title || 'Profilul Meu'}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          {counselor ? `${counselor.fullName} - Informații despre profil` : 'Informații despre profil'}
        </Typography>
      </Box>

      {/* Profile Header with Avatar, Basic Info and Contact */}
      <Box sx={{ 
        mb: 4,
        p: { xs: 3, sm: 4 },
        backgroundColor: 'rgba(255, 199, 0, 0.05)',
        borderRadius: 2,
        border: '1px solid rgba(255, 199, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)'
        }
      }}>
        {/* Edit Profile Button - Top Right Corner */}
        <Button
          variant="outlined"
          startIcon={<Edit />}
          onClick={handleEditClick}
          sx={{ 
            position: 'absolute',
            top: 16,
            right: 16,
            borderColor: '#ffc700', 
            color: '#ffc700', 
            '&:hover': { 
              borderColor: '#e6b300', 
              backgroundColor: 'rgba(255, 199, 0, 0.1)',
              color: '#000'
            },
            px: 2,
            py: 1,
            zIndex: 2
          }}
        >
          {t.profile.editProfile}
        </Button>
        {/* Background decoration */}
        <Box sx={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 200,
          height: 200,
          backgroundColor: 'rgba(255, 199, 0, 0.1)',
          borderRadius: '50%',
          zIndex: 0
        }} />
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: 3,
          flexDirection: { xs: 'column', md: 'row' },
          textAlign: { xs: 'center', md: 'left' },
          position: 'relative',
          zIndex: 1
        }}>
          <Avatar sx={{ 
            width: 120, 
            height: 120, 
            bgcolor: '#ffc700',
            fontSize: '2.5rem',
            boxShadow: '0 4px 20px rgba(255, 199, 0, 0.3)',
            border: '4px solid white'
          }}>
            <Person sx={{ fontSize: 60 }} />
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h3" component="h2" gutterBottom sx={{ 
              fontWeight: 'bold', 
              color: '#333',
              mb: 1,
              fontSize: { xs: '1.8rem', sm: '2.2rem', md: '2.5rem' }
            }}>
              {counselor.fullName}
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 4 },
              alignItems: { xs: 'center', sm: 'flex-start' },
              mb: 3
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ 
                  p: 1, 
                  backgroundColor: '#ffc700', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Phone sx={{ color: 'white', fontSize: '1.1rem' }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', fontWeight: 'medium' }}>
                    {t.profile.phoneNumber}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'medium', color: '#333' }}>
                    {counselor.phoneNumber || 'Not provided'}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
                <Box sx={{ 
                  p: 1, 
                  backgroundColor: '#ffc700', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Person sx={{ color: 'white', fontSize: '1.1rem' }} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', fontWeight: 'medium' }}>
                    {t.profile.email}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'medium', color: '#333' }}>
                    {counselor.email}
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Chip
              icon={getWorkloadIcon(counselor.workloadLevel)}
              label={`${counselor.workloadLevel.charAt(0).toUpperCase() + counselor.workloadLevel.slice(1)} Workload`}
              color={getWorkloadColor(counselor.workloadLevel)}
              size="medium"
              sx={{ 
                fontSize: '1rem', 
                px: 3, 
                py: 1.5,
                height: 'auto',
                fontWeight: 'medium',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            />
          </Box>
        </Box>
      </Box>

      {/* Cases Summary Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ 
          fontWeight: 'bold', 
          color: '#333', 
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <TrendingUp color="primary" />
          {t.profile.caseSummary || 'Rezumat Cazuri'}
        </Typography>
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, 
          gap: 2
        }}>
          <Box sx={{ 
            p: 3,
            backgroundColor: 'rgba(25, 118, 210, 0.1)',
            borderRadius: 2,
            border: '1px solid rgba(25, 118, 210, 0.2)',
            textAlign: 'center'
          }}>
            <Assignment sx={{ fontSize: '2rem', color: '#1976d2', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2', mb: 0.5 }}>
              {counselor.activeCases}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.dashboard.activeCases}
            </Typography>
          </Box>
          
          <Box sx={{ 
            p: 3,
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            borderRadius: 2,
            border: '1px solid rgba(76, 175, 80, 0.2)',
            textAlign: 'center'
          }}>
            <CheckCircle sx={{ fontSize: '2rem', color: '#4caf50', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#4caf50', mb: 0.5 }}>
              {cases.filter(c => c.status === 'finished').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.dashboard.completedCases}
            </Typography>
          </Box>
          
          <Box sx={{ 
            p: 3,
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            borderRadius: 2,
            border: '1px solid rgba(244, 67, 54, 0.2)',
            textAlign: 'center'
          }}>
            <Block sx={{ fontSize: '2rem', color: '#f44336', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f44336', mb: 0.5 }}>
              {cases.filter(c => c.status === 'unfinished').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.cases.filters.unfinished}
            </Typography>
          </Box>
          
          <Box sx={{ 
            p: 3,
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            borderRadius: 2,
            border: '1px solid rgba(255, 152, 0, 0.2)',
            textAlign: 'center'
          }}>
            <Schedule sx={{ fontSize: '2rem', color: '#ff9800', mb: 1 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#ff9800', mb: 0.5 }}>
              {cases.filter(c => c.status === 'waiting').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t.dashboard.pendingCases}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Specialties Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ 
          fontWeight: 'bold', 
          color: '#333', 
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <Assignment color="primary" />
          {t.profile.specialties || 'Specializări'}
        </Typography>
        <Box sx={{ 
          p: 3,
          backgroundColor: '#f8f9fa',
          borderRadius: 2,
          border: '1px solid #e0e0e0',
          minHeight: '80px',
          display: 'flex',
          alignItems: counselor.specialties.length === 0 ? 'center' : 'flex-start'
        }}>
          {counselor.specialties.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
              {counselor.specialties.map((specialty) => (
                <Chip
                  key={specialty}
                  label={specialty}
                  color="primary"
                  size="medium"
                  sx={{ 
                    fontSize: '0.9rem',
                    px: 2,
                    py: 1,
                    backgroundColor: '#ffc700',
                    color: '#000',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: '#e6b300'
                    }
                  }}
                />
              ))}
            </Box>
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ 
              fontStyle: 'italic',
              textAlign: 'center',
              width: '100%'
            }}>
              {t.profile.noSpecialties || 'Nu există specializări adăugate. Click "Editează Profil" pentru a adăuga domeniile tale de expertiză.'}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t.profile.editProfile}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label={t.profile.phoneNumber}
              value={editData.phoneNumber}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                const limitedDigits = digits.slice(0, 9);
                let formatted = limitedDigits;
                if (limitedDigits.length > 6) {
                  formatted = `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3, 6)} ${limitedDigits.slice(6)}`;
                } else if (limitedDigits.length > 3) {
                  formatted = `${limitedDigits.slice(0, 3)} ${limitedDigits.slice(3)}`;
                }
                setEditData(prev => ({ ...prev, phoneNumber: formatted }));
              }}
              margin="normal"
              placeholder="123 456 789"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>+40</Typography>
              }}
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                {t.profile.specialties || 'Specializări'}
              </Typography>
              
              {/* Current specialties */}
              <Box sx={{ mb: 2 }}>
                {editData.specialties.map((specialty) => (
                  <Chip
                    key={specialty}
                    label={specialty}
                    onDelete={() => handleRemoveSpecialty(specialty)}
                    color="primary"
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
              
              {/* Add new specialty */}
              <Box display="flex" gap={1} mb={2}>
                <TextField
                  fullWidth
                  label={t.profile.addSpecialty || 'Adaugă specialitate nouă'}
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSpecialty();
                    }
                  }}
                  size="small"
                />
                <Button
                  variant="outlined"
                  onClick={handleAddSpecialty}
                  disabled={!newSpecialty.trim()}
                >
                  {t.common.add}
                </Button>
              </Box>
              
              {/* Common specialties */}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t.profile.commonSpecialties || 'Specializări comune (click pentru a adăuga)'}:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {commonSpecialties
                  .filter(specialty => !editData.specialties.includes(specialty))
                  .map((specialty) => (
                    <Chip
                      key={specialty}
                      label={specialty}
                      onClick={() => handleAddCommonSpecialty(specialty)}
                      variant="outlined"
                      size="small"
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t.common.cancel}</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{ 
              backgroundColor: '#ffc700',
              color: '#000',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#e6b300' }
            }}
          >
            {t.common.save}
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

export default MyProfile;
