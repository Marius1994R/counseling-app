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
  FilterList
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { logCaseAssigned } from '../../utils/activityLogger';
import CaseForm from './CaseForm';
import CaseCard from './CaseCard';
import { Case, CaseStatus, IssueType } from '../../types';

const CasesManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [counselors, setCounselors] = useState<{ id: string; fullName: string; linkedUserId?: string }[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [issueTypeFilter, setIssueTypeFilter] = useState<IssueType | 'all'>('all');
  const [counselorFilter, setCounselorFilter] = useState<string>('all');
  const [tabValue, setTabValue] = useState(0);

  // Load cases and counselors from Firebase
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load cases
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
        
        // Load counselors
        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, orderBy('fullName', 'asc'));
        const counselorsSnapshot = await getDocs(counselorsQuery);
        
        const counselorsData: { id: string; fullName: string; linkedUserId?: string }[] = [];
        counselorsSnapshot.forEach((doc) => {
          const data = doc.data();
          counselorsData.push({
            id: doc.id,
            fullName: data.fullName,
            linkedUserId: data.linkedUserId
          });
        });
        
        setCases(casesData);
        setFilteredCases(casesData);
        setCounselors(counselorsData);
      } catch (err) {
        setError('Failed to load data');
        console.error('Data loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter cases based on search and filters
  useEffect(() => {
    let filtered = cases;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(caseItem =>
        caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.counseledName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        caseItem.phoneNumber.includes(searchTerm)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(caseItem => caseItem.status === statusFilter);
    }

    // Issue type filter
    if (issueTypeFilter !== 'all') {
      filtered = filtered.filter(caseItem => 
        caseItem.issueTypes.includes(issueTypeFilter)
      );
    }

    // Counselor filter
    if (counselorFilter !== 'all') {
      filtered = filtered.filter(caseItem => 
        caseItem.assignedCounselorId === counselorFilter
      );
    }

    setFilteredCases(filtered);
  }, [cases, searchTerm, statusFilter, issueTypeFilter, counselorFilter]);

  // Tab filtering
  useEffect(() => {
    if (tabValue === 0) {
      setFilteredCases(cases);
    } else {
      const statusMap = ['all', 'waiting', 'active', 'unfinished', 'finished'] as const;
      const selectedStatus = statusMap[tabValue];
      if (selectedStatus === 'all') {
        setFilteredCases(cases);
      } else {
        setFilteredCases(cases.filter(caseItem => caseItem.status === selectedStatus));
      }
    }
  }, [tabValue, cases]);

  const handleAddCase = () => {
    setEditingCase(null);
    setFormOpen(true);
  };

  const handleEditCase = (caseData: Case) => {
    setEditingCase(caseData);
    setFormOpen(true);
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      // Delete from Firebase
      const caseRef = doc(db, 'cases', caseId);
      await deleteDoc(caseRef);
      
      // Update local state
      setCases(prev => prev.filter(caseItem => caseItem.id !== caseId));
      setFilteredCases(prev => prev.filter(caseItem => caseItem.id !== caseId));
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete case');
    }
  };

  const handleFormSubmit = async (caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      // Find counselor name if counselor is assigned
      const assignedCounselor = counselors.find(c => c.id === caseData.assignedCounselorId);
      const assignedCounselorName = assignedCounselor ? assignedCounselor.fullName : undefined;

      if (editingCase) {
        // Check if counselor assignment changed
        const counselorChanged = editingCase.assignedCounselorId !== caseData.assignedCounselorId && caseData.assignedCounselorId;
        
        // Update existing case in Firebase
        const caseRef = doc(db, 'cases', editingCase.id);
        await updateDoc(caseRef, {
          ...caseData,
          assignedCounselorId: caseData.assignedCounselorId || null,
          assignedCounselorName: assignedCounselorName || null,
          updatedAt: new Date()
        });
        
        // Log case assignment if counselor was changed/assigned
        if (counselorChanged && currentUser && assignedCounselor) {
          // Get the counselor's linked user ID
          const assignedToUserId = assignedCounselor.linkedUserId || caseData.assignedCounselorId!;
          
          
          await logCaseAssigned(
            editingCase.id,
            editingCase.title,
            assignedToUserId,
            assignedCounselorName || 'Unknown Counselor',
            currentUser.id,
            currentUser.fullName || currentUser.email || 'Unknown User'
          );
        }
        
        // Update local state
        const updatedCase: Case = {
          ...editingCase,
          ...caseData,
          assignedCounselorName: assignedCounselorName,
          updatedAt: new Date()
        };
        setCases(prev => prev.map(caseItem => 
          caseItem.id === editingCase.id ? updatedCase : caseItem
        ));
      } else {
        // Create new case in Firebase
        const casesRef = collection(db, 'cases');
        const docRef = await addDoc(casesRef, {
          ...caseData,
          assignedCounselorId: caseData.assignedCounselorId || null,
          assignedCounselorName: assignedCounselorName || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: currentUser?.id || 'unknown'
        });
        
        // Log case assignment if a counselor was assigned
        if (caseData.assignedCounselorId && currentUser && assignedCounselor) {
          // Get the counselor's linked user ID
          const assignedToUserId = assignedCounselor.linkedUserId || caseData.assignedCounselorId;
          
          
          await logCaseAssigned(
            docRef.id,
            caseData.title,
            assignedToUserId,
            assignedCounselorName || 'Unknown Counselor',
            currentUser.id,
            currentUser.fullName || currentUser.email || 'Unknown User'
          );
        }
        
        // Update local state
        const newCase: Case = {
          ...caseData,
          id: docRef.id,
          assignedCounselorName: assignedCounselorName,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: currentUser?.id || 'unknown'
        };
        setCases(prev => [newCase, ...prev]);
      }
      setFormOpen(false);
      setEditingCase(null);
    } catch (err) {
      console.error('Form submit error:', err);
      setError('Failed to save case');
    }
  };

  const getTabCount = (status: CaseStatus) => {
    return cases.filter(caseItem => caseItem.status === status).length;
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
    <Container maxWidth="lg" sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 1, sm: 2 } }}>
      <Box 
        display="flex" 
        flexDirection={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        mb={3}
        gap={2}
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
          Cases Management
        </Typography>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddCase}
            sx={{ 
              px: 3,
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            Add New Case
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <TextField
              fullWidth
              label="Search cases"
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
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="waiting">Waiting</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="unfinished">Unfinished</MenuItem>
                <MenuItem value="finished">Finished</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>
            <FormControl fullWidth>
              <InputLabel>Counselor</InputLabel>
              <Select
                value={counselorFilter}
                onChange={(e) => setCounselorFilter(e.target.value)}
                label="Counselor"
              >
                <MenuItem value="all">All Counselors</MenuItem>
                {counselors.map((counselor) => (
                  <MenuItem key={counselor.id} value={counselor.id}>
                    {counselor.fullName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ flex: "1 1 100%", minWidth: { xs: "100%", sm: "200px" } }}>
            <FormControl fullWidth size="small">
              <InputLabel>Issue Type</InputLabel>
              <Select
                value={issueTypeFilter}
                onChange={(e) => setIssueTypeFilter(e.target.value as IssueType | 'all')}
                label="Issue Type"
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="spiritual">Spiritual</MenuItem>
                <MenuItem value="relational">Relational</MenuItem>
                <MenuItem value="personal">Personal</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ 
            flex: "1 1 100%", 
            minWidth: { xs: "100%", sm: "200px" },
            display: 'flex',
            justifyContent: { xs: 'center', sm: 'flex-start' }
          }}>
            <Chip
              label={`${filteredCases.length} cases`}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider', 
        mb: 3,
        overflowX: 'auto'
      }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minWidth: { xs: 'auto', sm: '120px' },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 }
            }
          }}
        >
          <Tab label={`All (${cases.length})`} />
          <Tab label={`Waiting (${getTabCount('waiting')})`} />
          <Tab label={`Active (${getTabCount('active')})`} />
          <Tab label={`Unfinished (${getTabCount('unfinished')})`} />
          <Tab label={`Finished (${getTabCount('finished')})`} />
        </Tabs>
      </Box>

      {/* Cases List */}
      {filteredCases.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Typography 
            variant="h6" 
            color="text.secondary" 
            gutterBottom
            sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
          >
            No cases found
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            {searchTerm || statusFilter !== 'all' || issueTypeFilter !== 'all' || counselorFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first case'
            }
          </Typography>
        </Box>
      ) : (
        <Box sx={{ 
          display: "flex", 
          flexDirection: "column",
          gap: { xs: 1.5, sm: 2 }
        }}>
          {filteredCases.map((caseItem) => (
            <Box key={caseItem.id}>
              <CaseCard
                caseData={caseItem}
                onEdit={handleEditCase}
                onDelete={handleDeleteCase}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            </Box>
          ))}
        </Box>
      )}

      {/* Case Form Dialog */}
      <CaseForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingCase(null);
        }}
        onSubmit={handleFormSubmit}
        caseData={editingCase}
        counselors={counselors}
      />
    </Container>
  );
};

export default CasesManagement;
