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
  Tabs,
  Tab,
  Paper
} from '@mui/material';
import {
  Add,
  Search,
  Person
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import CounselorForm from './CounselorForm';
import CounselorCard from './CounselorCard';
import { Counselor, Case } from '../../types';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';

const CounselorsManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCounselors, setFilteredCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState<Counselor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState<'all' | 'low' | 'moderate' | 'high'>('all');
  const [tabValue, setTabValue] = useState(0);

  // Load counselors and cases from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load counselors from Firebase
        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, orderBy('fullName', 'asc'));
        const counselorsSnapshot = await getDocs(counselorsQuery);
        
        // Load cases from Firebase first
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
        });
        
        // Load counselors and calculate active cases based on real case data
        const counselorsData: Counselor[] = [];
        counselorsSnapshot.forEach((doc) => {
          const data = doc.data();
          const counselorId = doc.id;
          
          // Calculate active cases for this counselor
          const assignedCases = casesData.filter(caseItem => caseItem.assignedCounselorId === counselorId);
          const activeCases = assignedCases.filter(caseItem => caseItem.status === 'active').length;
          const workloadLevel = activeCases >= 3 ? 'high' : activeCases >= 2 ? 'moderate' : 'low';
          
          counselorsData.push({
            id: counselorId,
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber || '',
            specialties: data.specialties || [],
            activeCases: activeCases,
            workloadLevel: workloadLevel,
            linkedUserId: data.linkedUserId || undefined,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate()
          });
        });
        
        setCounselors(counselorsData);
        setCases(casesData);
        setFilteredCounselors(counselorsData);
      } catch (err) {
        setError('Failed to load counselors data');
        console.error('Counselors loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Recalculate counselor workload when cases change
  useEffect(() => {
    if (counselors.length > 0 && cases.length >= 0) {
      setCounselors(prevCounselors => 
        prevCounselors.map(counselor => {
          const { activeCases, workloadLevel } = recalculateCounselorWorkload(counselor.id);
          return {
            ...counselor,
            activeCases,
            workloadLevel
          };
        })
      );
    }
  }, [cases]);

  // Filter counselors based on search and filters
  useEffect(() => {
    let filtered = counselors;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(counselor =>
        counselor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        counselor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        counselor.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        counselor.specialties.some(specialty => 
          specialty.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Workload filter
    if (workloadFilter !== 'all') {
      filtered = filtered.filter(counselor => counselor.workloadLevel === workloadFilter);
    }

    setFilteredCounselors(filtered);
  }, [counselors, searchTerm, workloadFilter]);

  // Tab filtering
  useEffect(() => {
    if (tabValue === 0) {
      setFilteredCounselors(counselors);
    } else {
      const workloadMap = ['all', 'low', 'moderate', 'high'] as const;
      const selectedWorkload = workloadMap[tabValue];
      if (selectedWorkload === 'all') {
        setFilteredCounselors(counselors);
      } else {
        setFilteredCounselors(counselors.filter(counselor => counselor.workloadLevel === selectedWorkload));
      }
    }
  }, [tabValue, counselors]);

  const handleAddCounselor = () => {
    setEditingCounselor(null);
    setFormOpen(true);
  };

  const handleEditCounselor = (counselor: Counselor) => {
    setEditingCounselor(counselor);
    setFormOpen(true);
  };

  const handleDeleteCounselor = async (counselorId: string) => {
    try {
      // Delete from Firebase
      const counselorRef = doc(db, 'counselors', counselorId);
      await deleteDoc(counselorRef);
      
      // Update local state
      setCounselors(prev => prev.filter(counselor => counselor.id !== counselorId));
      setFilteredCounselors(prev => prev.filter(counselor => counselor.id !== counselorId));
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete counselor');
    }
  };

  const handleFormSubmit = async (counselorData: Omit<Counselor, 'id' | 'createdAt' | 'updatedAt' | 'activeCases' | 'workloadLevel'>) => {
    try {
      if (editingCounselor) {
        // Recalculate workload based on current cases
        const { activeCases, workloadLevel } = recalculateCounselorWorkload(editingCounselor.id);

        // Update existing counselor in Firebase
        const counselorRef = doc(db, 'counselors', editingCounselor.id);
        await updateDoc(counselorRef, {
          ...counselorData,
          activeCases,
          workloadLevel,
          updatedAt: new Date()
        });

        // Update local state
        const updatedCounselor: Counselor = {
          ...editingCounselor,
          ...counselorData,
          activeCases,
          workloadLevel,
          updatedAt: new Date()
        };
        setCounselors(prev => prev.map(counselor => 
          counselor.id === editingCounselor.id ? updatedCounselor : counselor
        ));
      } else {
        // Create new counselor in Firebase
        const counselorsRef = collection(db, 'counselors');
        const docRef = await addDoc(counselorsRef, {
          ...counselorData,
          activeCases: 0,
          workloadLevel: 'low',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Update local state
        const newCounselor: Counselor = {
          ...counselorData,
          id: docRef.id,
          activeCases: 0,
          workloadLevel: 'low',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        setCounselors(prev => [newCounselor, ...prev]);
      }
      setFormOpen(false);
      setEditingCounselor(null);
    } catch (err) {
      console.error('Form submit error:', err);
      setError('Failed to save counselor');
    }
  };

  const getTabCount = (workload: 'low' | 'moderate' | 'high') => {
    return counselors.filter(counselor => counselor.workloadLevel === workload).length;
  };

  // Function to recalculate counselor workload based on current cases
  const recalculateCounselorWorkload = (counselorId: string): { activeCases: number; workloadLevel: 'low' | 'moderate' | 'high' } => {
    const assignedCases = cases.filter(caseItem => caseItem.assignedCounselorId === counselorId);
    const activeCases = assignedCases.filter(caseItem => caseItem.status === 'active').length;
    const workloadLevel: 'low' | 'moderate' | 'high' = activeCases >= 3 ? 'high' : activeCases >= 2 ? 'moderate' : 'low';
    
    return { activeCases, workloadLevel };
  };

  const getCounselorCases = (counselorId: string) => {
    return cases.filter(caseItem => caseItem.assignedCounselorId === counselorId);
  };

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'leader';
  const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'leader';

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
      <Box 
        display="flex" 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={3}
        gap={2}
        flexDirection={{ xs: 'column', sm: 'row' }}
      >
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 'bold', 
            color: '#ffc700',
            fontSize: { xs: '1.5rem', sm: '2rem' }
          }}
        >
          Counselors Management
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddCounselor}
            sx={{ 
              px: 3,
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Add New Counselor
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <TextField
              fullWidth
              label="Search counselors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Box>
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <FormControl fullWidth>
              <InputLabel>Workload Level</InputLabel>
              <Select
                value={workloadFilter}
                onChange={(e) => setWorkloadFilter(e.target.value as 'all' | 'low' | 'moderate' | 'high')}
                label="Workload Level"
              >
                <MenuItem value="all">All Levels</MenuItem>
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="moderate">Moderate</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <Box display="flex" gap={1}>
              <Chip
                label={`${filteredCounselors.length} counselors`}
                color="primary"
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              minWidth: { xs: 'auto', sm: '120px' },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 }
            }
          }}
        >
          <Tab label={`All (${counselors.length})`} />
          <Tab label={`Low (${getTabCount('low')})`} />
          <Tab label={`Moderate (${getTabCount('moderate')})`} />
          <Tab label={`High (${getTabCount('high')})`} />
        </Tabs>
      </Box>

      {/* Counselors List */}
      {filteredCounselors.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Person sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No counselors found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm || workloadFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first counselor'
            }
          </Typography>
        </Box>
      ) : (
                <Box sx={{ 
                  display: "grid", 
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, 
                  gap: { xs: 2, sm: 4 },
                  justifyContent: "center",
                  maxWidth: "1200px",
                  mx: "auto"
                }}>
          {filteredCounselors.map((counselor) => (
            <Box key={counselor.id}>
              <CounselorCard
                counselor={counselor}
                assignedCases={getCounselorCases(counselor.id)}
                onEdit={handleEditCounselor}
                onDelete={handleDeleteCounselor}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* Counselor Form Dialog */}
      <CounselorForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCounselor(null);
        }}
        onSubmit={handleFormSubmit}
        counselorData={editingCounselor}
      />
    </Container>
  );
};

export default CounselorsManagement;
