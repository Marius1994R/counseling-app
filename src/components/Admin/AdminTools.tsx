import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  AdminPanelSettings,
  PersonAdd,
  Security,
  Block,
  CheckCircle,
  ContentCopy,
  People,
  Person,
  Search,
  Assignment,
  CalendarToday
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { User, UserRole, Counselor, Case, Appointment } from '../../types';
import CounselorForm from '../Counselors/CounselorForm';
import CounselorCard from '../Counselors/CounselorCard';
import CaseCard from '../Cases/CaseCard';
import CaseForm from '../Cases/CaseForm';
import SessionReport from '../Cases/SessionReport';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { logCaseAssigned } from '../../utils/activityLogger';
import { t } from '../../utils/translations';

interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

const AdminTools: React.FC = () => {
  const { currentUser, createUser, updateUserRole, deleteUser, deactivateUser, reactivateUser, getAllUsers } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [createUserData, setCreateUserData] = useState<CreateUserData>({
    email: '',
    password: '',
    fullName: '',
    role: 'counselor'
  });

  // Function to generate password from full name
  const generatePassword = (fullName: string): string => {
    if (!fullName.trim()) return '';
    
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length < 2) return '';
    
    const firstName = nameParts[0].toLowerCase();
    const lastName = nameParts[nameParts.length - 1].toLowerCase();
    
    // Generate random 4-digit number
    const randomNumbers = Math.floor(1000 + Math.random() * 9000);
    
    // Format: firstLetter.lastName@BLT{randomNumbers}
    return `${firstName.charAt(0)}.${lastName}@BLT${randomNumbers}`;
  };

  const [editUserData, setEditUserData] = useState<Partial<CreateUserData>>({
    fullName: '',
    role: 'counselor'
  });

  // Counselors Management State
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCounselors, setFilteredCounselors] = useState<Counselor[]>([]);
  const [counselorsLoading, setCounselorsLoading] = useState(true);
  const [counselorsError, setCounselorsError] = useState('');
  const [counselorFormOpen, setCounselorFormOpen] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState<Counselor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState<'all' | 'low' | 'moderate' | 'high'>('all');
  const [activeTab, setActiveTab] = useState(0);
  const [newlyCreatedUserId, setNewlyCreatedUserId] = useState<string | null>(null);
  const [showNextStepDialog, setShowNextStepDialog] = useState(false);

  // Cases Management State
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState('');
  const [caseSearchTerm, setCaseSearchTerm] = useState('');
  const [caseStatusFilter, setCaseStatusFilter] = useState<'all' | 'waiting' | 'active' | 'unfinished' | 'finished' | 'cancelled'>('all');
  const [caseCounselorFilter, setCaseCounselorFilter] = useState<string>('all');
  const [caseFormOpen, setCaseFormOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [caseNotes, setCaseNotes] = useState<Record<string, string>>({}); // caseId -> latest note content
  const [sessionReportOpen, setSessionReportOpen] = useState(false);
  const [selectedCaseForSessionReport, setSelectedCaseForSessionReport] = useState<Case | null>(null);

  // Read tab from URL on component mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === '1') {
      setActiveTab(1);
    } else if (tabParam === '2') {
      setActiveTab(2);
    } else {
      setActiveTab(0);
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentUser) {
      loadUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 1) {
      loadCounselors();
    } else if (activeTab === 2) {
      // Load both cases and counselors for the cases management tab
      // since CaseForm needs counselors data for the dropdown
      loadCases();
      loadCounselors();
    }
  }, [activeTab]);

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const usersList = await getAllUsers();
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      showSnackbar('Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  }, [getAllUsers, showSnackbar]);

  // Counselors Management Functions
  const loadCounselors = async () => {
    try {
      setCounselorsLoading(true);
      
      // Load counselors
      const counselorsQuery = query(collection(db, 'counselors'), orderBy('createdAt', 'desc'));
      const counselorsSnapshot = await getDocs(counselorsQuery);
      
      // Load cases
      const casesQuery = query(collection(db, 'cases'), orderBy('createdAt', 'desc'));
      const casesSnapshot = await getDocs(casesQuery);
      
      const counselorsData: Counselor[] = [];
      counselorsSnapshot.forEach((doc) => {
        const data = doc.data();
        counselorsData.push({
          id: doc.id,
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber || '',
          specialties: data.specialties || [],
          activeCases: 0, // Will be calculated below
          workloadLevel: 'low' as const, // Will be calculated below
          linkedUserId: data.linkedUserId || undefined,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate()
        });
      });
      
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
      
      setCases(casesData);
      
      // Calculate active cases and workload for each counselor
      counselorsData.forEach(counselor => {
        const activeCases = casesData.filter(caseItem => 
          caseItem.assignedCounselorId === counselor.id && caseItem.status === 'active'
        ).length;
        
        counselor.activeCases = activeCases;
        counselor.workloadLevel = activeCases >= 3 ? 'high' : activeCases >= 2 ? 'moderate' : 'low';
      });
      
      setCounselors(counselorsData);
      setFilteredCounselors(counselorsData);
    } catch (error) {
      console.error('Error loading counselors:', error);
      setCounselorsError('Error loading counselors');
    } finally {
      setCounselorsLoading(false);
    }
  };

  const handleCounselorSubmit = async (counselorData: Omit<Counselor, 'id' | 'createdAt' | 'updatedAt' | 'activeCases' | 'workloadLevel'>) => {
    try {
      if (editingCounselor) {
        // Update existing counselor
        const counselorRef = doc(db, 'counselors', editingCounselor.id);
        await updateDoc(counselorRef, {
          ...counselorData,
          updatedAt: new Date()
        });
        showSnackbar('Counselor updated successfully', 'success');
      } else {
        // Create new counselor
        await addDoc(collection(db, 'counselors'), {
          ...counselorData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        showSnackbar('Counselor created successfully', 'success');
      }
      
      setCounselorFormOpen(false);
      setEditingCounselor(null);
      // Clear preselected user after successful submission
      setNewlyCreatedUserId(null);
      loadCounselors();
    } catch (error) {
      console.error('Error saving counselor:', error);
      showSnackbar('Error saving counselor', 'error');
    }
  };

  const handleDeleteCounselor = async (counselorId: string) => {
    try {
      await deleteDoc(doc(db, 'counselors', counselorId));
      showSnackbar('Counselor deleted successfully', 'success');
      loadCounselors();
    } catch (error) {
      console.error('Error deleting counselor:', error);
      showSnackbar('Error deleting counselor', 'error');
    }
  };

  const handleEditCounselor = (counselor: Counselor) => {
    setEditingCounselor(counselor);
    setCounselorFormOpen(true);
  };

  const handleCloseCounselorForm = () => {
    setCounselorFormOpen(false);
    setEditingCounselor(null);
    // Clear preselected user when closing the form
    setNewlyCreatedUserId(null);
  };

  // Load all cases for admin view
  const loadCases = useCallback(async () => {
    try {
      setCasesLoading(true);
      
      const casesQuery = query(collection(db, 'cases'), orderBy('createdAt', 'desc'));
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
      
      setAllCases(casesData);
      setFilteredCases(casesData);
      
      // Load latest notes for all cases
      await loadLatestNotes(casesData);
    } catch (error) {
      console.error('Error loading cases:', error);
      setCasesError('Error loading cases');
    } finally {
      setCasesLoading(false);
    }
  }, []);

  // Load latest notes for cases
  const loadLatestNotes = async (cases: Case[]) => {
    try {
      const notesPromises = cases.map(async (caseItem) => {
        const notesRef = collection(db, 'meetingNotes');
        const notesQuery = query(notesRef, where('caseId', '==', caseItem.id));
        const notesSnapshot = await getDocs(notesQuery);
        
        if (!notesSnapshot.empty) {
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

  // Filter counselors based on search and workload
  useEffect(() => {
    let filtered = counselors;

    if (searchTerm) {
      filtered = filtered.filter(counselor =>
        counselor.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        counselor.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (workloadFilter !== 'all') {
      filtered = filtered.filter(counselor => counselor.workloadLevel === workloadFilter);
    }

    setFilteredCounselors(filtered);
  }, [counselors, searchTerm, workloadFilter]);

  // Filter cases based on search and status
  useEffect(() => {
    let filtered = allCases;

    if (caseSearchTerm) {
      filtered = filtered.filter(caseItem =>
        caseItem.title.toLowerCase().includes(caseSearchTerm.toLowerCase()) ||
        caseItem.counseledName.toLowerCase().includes(caseSearchTerm.toLowerCase()) ||
        caseItem.description.toLowerCase().includes(caseSearchTerm.toLowerCase())
      );
    }

    if (caseStatusFilter !== 'all') {
      filtered = filtered.filter(caseItem => caseItem.status === caseStatusFilter);
    }

    if (caseCounselorFilter !== 'all') {
      filtered = filtered.filter(caseItem => caseItem.assignedCounselorId === caseCounselorFilter);
    }

    setFilteredCases(filtered);
  }, [allCases, caseSearchTerm, caseStatusFilter, caseCounselorFilter]);

  const copyUserCredentials = () => {
    const credentials = `Email: ${createUserData.email}
Password: ${createUserData.password}
Link app: http://localhost:3000`;
    
    navigator.clipboard.writeText(credentials).then(() => {
      showSnackbar('User credentials copied to clipboard!', 'success');
    }).catch(() => {
      showSnackbar('Failed to copy credentials', 'error');
    });
  };

  // Case management functions
  const handleCaseSubmit = async (caseData: Omit<Case, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
    try {
      if (editingCase) {
        // Check if counselor assignment changed
        const counselorChanged = editingCase.assignedCounselorId !== caseData.assignedCounselorId && caseData.assignedCounselorId;
        
        // Update existing case
        const caseRef = doc(db, 'cases', editingCase.id);
        await updateDoc(caseRef, {
          ...caseData,
          updatedAt: new Date()
        });
        
        // Log case assignment if counselor was changed/assigned
        if (counselorChanged && caseData.assignedCounselorId && currentUser) {
          const assignedCounselor = counselors.find(c => c.id === caseData.assignedCounselorId);
          const assignedToUserId = assignedCounselor?.linkedUserId || caseData.assignedCounselorId;
          
          await logCaseAssigned(
            editingCase.id,
            editingCase.title,
            assignedToUserId,
            assignedCounselor?.fullName || 'Unknown Counselor',
            currentUser.id,
            currentUser.fullName || currentUser.email || 'Unknown User'
          );
        }
        
        showSnackbar('Case updated successfully', 'success');
      } else {
        // Create new case
        const docRef = await addDoc(collection(db, 'cases'), {
          ...caseData,
          createdBy: currentUser?.id || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Log case assignment if a counselor was assigned
        if (caseData.assignedCounselorId && currentUser) {
          const assignedCounselor = counselors.find(c => c.id === caseData.assignedCounselorId);
          const assignedToUserId = assignedCounselor?.linkedUserId || caseData.assignedCounselorId;
          
          await logCaseAssigned(
            docRef.id,
            caseData.title,
            assignedToUserId,
            assignedCounselor?.fullName || 'Unknown Counselor',
            currentUser.id,
            currentUser.fullName || currentUser.email || 'Unknown User'
          );
        }
        
        showSnackbar('Case created successfully', 'success');
      }
      
      setCaseFormOpen(false);
      setEditingCase(null);
      loadCases(); // Reload cases
    } catch (error) {
      console.error('Error saving case:', error);
      showSnackbar('Error saving case', 'error');
    }
  };

  const handleEditCase = (caseItem: Case) => {
    setEditingCase(caseItem);
    setCaseFormOpen(true);
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      await deleteDoc(doc(db, 'cases', caseId));
      showSnackbar('Case deleted successfully', 'success');
      loadCases(); // Reload cases
    } catch (error) {
      console.error('Error deleting case:', error);
      showSnackbar('Error deleting case', 'error');
    }
  };

  const handleCloseCaseForm = () => {
    setCaseFormOpen(false);
    setEditingCase(null);
  };

  const handleOpenSessionReport = (caseItem: Case) => {
    setSelectedCaseForSessionReport(caseItem);
    setSessionReportOpen(true);
  };

  const handleCloseSessionReport = () => {
    setSessionReportOpen(false);
    setSelectedCaseForSessionReport(null);
  };

  const handleCreateUser = async () => {
    try {
      const newUserId = await createUser(createUserData.email, createUserData.password, createUserData.fullName, createUserData.role);
      showSnackbar(`User created successfully! Password: ${createUserData.password}. You remain logged in as admin.`, 'success');
      setCreateDialogOpen(false);
      
      // Store the newly created user ID and show next step dialog
      setNewlyCreatedUserId(newUserId);
      setShowNextStepDialog(true);
      
      setCreateUserData({ email: '', password: '', fullName: '', role: 'counselor' });
      loadUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/email-already-in-use') {
        showSnackbar('This email is already registered in Firebase Authentication. Please use a different email or contact an administrator to resolve this issue.', 'error');
      } else if (error.code === 'auth/weak-password') {
        showSnackbar('Password is too weak. Please try again.', 'error');
      } else if (error.code === 'auth/invalid-email') {
        showSnackbar('Invalid email address. Please check the email format.', 'error');
      } else {
        showSnackbar(`Error creating user: ${error.message}`, 'error');
      }
    }
  };

  const handleNextStepToCounselor = () => {
    setShowNextStepDialog(false);
    // Switch to counselors tab
    setActiveTab(1);
    setSearchParams({ tab: '1' });
    // Open counselor form with preselected user
    setEditingCounselor(null);
    setCounselorFormOpen(true);
  };

  const handleSkipCounselorLink = () => {
    setShowNextStepDialog(false);
    setNewlyCreatedUserId(null);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    
    try {
      await updateUserRole(selectedUser.id, editUserData.role as UserRole);
      showSnackbar('User updated successfully', 'success');
      setEditDialogOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      showSnackbar('Error updating user', 'error');
    }
  };


  const handleDeleteUser = async (userId: string) => {
    const isDeletingSelf = userId === currentUser?.id;
    const confirmMessage = isDeletingSelf 
      ? t.admin.users.deleteUserSelfConfirm
      : t.admin.users.deleteUserConfirm;
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteUser(userId);
        showSnackbar(t.admin.users.deleteUserSuccess, 'success');
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        showSnackbar(t.admin.users.deleteUserError, 'error');
      }
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (window.confirm(t.admin.users.deactivateUserConfirm)) {
      try {
        await deactivateUser(userId);
        showSnackbar(t.admin.users.deactivateUserSuccess, 'success');
        loadUsers();
      } catch (error) {
        console.error('Error deactivating user:', error);
        showSnackbar(t.admin.users.deactivateUserError, 'error');
      }
    }
  };

  const handleReactivateUser = async (userId: string) => {
    try {
      await reactivateUser(userId);
      showSnackbar(t.admin.users.reactivateUserSuccess, 'success');
      loadUsers();
    } catch (error) {
      console.error('Error reactivating user:', error);
      showSnackbar(t.admin.users.reactivateUserError, 'error');
    }
  };


  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditUserData({
      fullName: user.fullName,
      role: user.role
    });
    setEditDialogOpen(true);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'leader':
        return 'error';
      case 'admin':
        return 'warning';
      case 'counselor':
        return 'primary';
      default:
        return 'default';
    }
  };

  const canManageUsers = currentUser?.role === 'leader' || currentUser?.role === 'admin';
  const canCreateUsers = currentUser?.role === 'leader';
  const isSupremeLeader = currentUser?.email === 'marius.rasbici@biserica-lumina.ro';

  if (!canManageUsers) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to access admin tools.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <AdminPanelSettings sx={{ fontSize: 32, color: '#ffc700' }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            {t.admin.title}
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary">
          {t.admin.subtitle}
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, newValue) => {
            setActiveTab(newValue);
            // Update URL with tab parameter
            if (newValue === 1) {
              setSearchParams({ tab: '1' });
            } else if (newValue === 2) {
              setSearchParams({ tab: '2' });
            } else {
              setSearchParams({});
            }
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-scrollButtons': {
              display: { xs: 'flex', sm: 'none' }
            }
          }}
        >
          <Tab 
            icon={<Person />} 
            label={t.admin.tabs.userManagement}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 'medium' }}
          />
          <Tab 
            icon={<People />} 
            label={t.admin.tabs.counselorsManagement}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 'medium' }}
          />
          <Tab 
            icon={<Assignment />} 
            label={t.admin.tabs.allCases}
            iconPosition="start"
            sx={{ textTransform: 'none', fontWeight: 'medium' }}
          />
        </Tabs>
      </Box>

      {/* Tab Panel Content */}
      {activeTab === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" component="h2">
                    {t.adminTools.userManagement}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    {canCreateUsers && (
                      <Button
                        variant="contained"
                        startIcon={<PersonAdd />}
                        onClick={() => setCreateDialogOpen(true)}
                        sx={{ 
                          backgroundColor: '#ffc700',
                          color: '#000',
                          fontWeight: 'bold',
                          '&:hover': { backgroundColor: '#e6b300' }
                        }}
                      >
                        {t.admin.users.createUser}
                      </Button>
                    )}
                  </Box>
                </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>{t.admin.users.name}</TableCell>
                        <TableCell>{t.admin.users.email}</TableCell>
                        <TableCell>{t.admin.users.role}</TableCell>
                        <TableCell>{t.admin.users.status}</TableCell>
                        <TableCell>{t.admin.users.created}</TableCell>
                        <TableCell>{t.admin.users.actions}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {user.fullName}
                            </Typography>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Chip
                              label={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                              color={getRoleColor(user.role)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.isActive ? 'Active' : 'Inactive'}
                              color={user.isActive ? 'success' : 'error'}
                              size="small"
                              icon={user.isActive ? <CheckCircle /> : <Block />}
                            />
                          </TableCell>
                          <TableCell>
                            {user.createdAt.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  openEditDialog(user);
                                }}
                                disabled={
                                  (user.id === currentUser?.id && !isSupremeLeader) || 
                                  (currentUser?.role === 'admin' && user.role === 'leader')
                                }
                                title={
                                  user.id === currentUser?.id && !isSupremeLeader 
                                    ? 'Cannot edit yourself' 
                                    : currentUser?.role === 'admin' && user.role === 'leader'
                                    ? 'Admins cannot edit leader accounts'
                                    : 'Edit user'
                                }
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              {user.isActive ? (
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    handleDeactivateUser(user.id);
                                  }}
                                  disabled={
                                    (user.id === currentUser?.id && !isSupremeLeader) || 
                                    (currentUser?.role === 'admin' && user.role === 'leader')
                                  }
                                  color="warning"
                                  title={
                                    user.id === currentUser?.id && !isSupremeLeader 
                                      ? t.admin.users.cannotDeactivateSelf 
                                      : currentUser?.role === 'admin' && user.role === 'leader'
                                      ? t.admin.users.adminsCannotDeactivateLeaders
                                      : t.admin.users.deactivateUser
                                  }
                                >
                                  <Block fontSize="small" />
                                </IconButton>
                              ) : (
                                <IconButton
                                  size="small"
                                  onClick={() => handleReactivateUser(user.id)}
                                  disabled={
                                    (user.id === currentUser?.id && !isSupremeLeader) || 
                                    (currentUser?.role === 'admin' && user.role === 'leader')
                                  }
                                  color="success"
                                  title={
                                    user.id === currentUser?.id && !isSupremeLeader 
                                      ? 'Cannot reactivate yourself' 
                                      : currentUser?.role === 'admin' && user.role === 'leader'
                                      ? 'Admins cannot reactivate leaders'
                                      : 'Reactivate user'
                                  }
                                >
                                  <CheckCircle fontSize="small" />
                                </IconButton>
                              )}
                              {canCreateUsers && (user.id !== currentUser?.id || isSupremeLeader) && (
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteUser(user.id)}
                                  color="error"
                                  title={user.id === currentUser?.id ? "Permanently delete yourself (Supreme Leader)" : "Permanently delete user"}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Card sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Security sx={{ color: 'error.main' }} />
                  <Typography variant="h6" component="h2">
                    Leader
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  • {t.roles.leaderDescription.createUsers}<br/>
                  • {t.roles.leaderDescription.editManageUsers}<br/>
                  • {t.roles.leaderDescription.deactivateReactivateUsers}<br/>
                  • {t.roles.leaderDescription.deleteUsers}<br/>
                  • {t.roles.leaderDescription.manageCounselorsCases}<br/>
                  • {t.roles.leaderDescription.fullSystemAccess}<br/>
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Security sx={{ color: 'warning.main' }} />
                  <Typography variant="h6" component="h2">
                    Admin
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  • {t.roles.adminDescription.viewAllUsers}<br/>
                  • {t.roles.adminDescription.editUsersExceptLeaders}<br/>
                  • {t.roles.adminDescription.deactivateReactivateExceptLeaders}<br/>
                  • {t.roles.adminDescription.manageCasesCounselors}<br/>
                  • {t.roles.adminDescription.accessAdminTools}<br/>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    ⚠️ {t.roles.adminDescription.limitedCannotCreateUsers}
                  </Typography>
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ flex: '1 1 300px', minWidth: '300px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Security sx={{ color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    Counselor
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  • {t.roles.counselorDescription.viewOwnCasesOnly}<br/>
                  • {t.roles.counselorDescription.addMeetingNotes}<br/>
                  • {t.roles.counselorDescription.manageOwnAppointments}<br/>
                  • {t.roles.counselorDescription.updateOwnProfile}<br/>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    ⚠️ {t.roles.counselorDescription.limitedCannotCreateCases}
                  </Typography>
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 2, sm: 0 },
                mb: 2 
              }}>
                <Typography variant="h6" component="h2">
                  {t.adminTools.counselorsManagement}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCounselorFormOpen(true)}
                  sx={{ 
                    backgroundColor: '#ffc700',
                    color: '#000',
                    fontWeight: 'bold',
                    '&:hover': { backgroundColor: '#e6b300' },
                    width: { xs: '100%', sm: 'auto' }
                  }}
                >
                  {t.adminTools.addCounselor}
                </Button>
              </Box>

              {/* Search and Filter Controls */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                  placeholder={t.adminTools.searchCounselors}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  sx={{ minWidth: 200 }}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>{t.adminTools.workload}</InputLabel>
                  <Select
                    value={workloadFilter}
                    onChange={(e) => setWorkloadFilter(e.target.value as any)}
                    label={t.adminTools.workload}
                  >
                    <MenuItem value="all">{t.adminTools.allStatuses}</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="moderate">Moderate</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {counselorsError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {counselorsError}
                </Alert>
              )}

              {counselorsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
                  {filteredCounselors.map((counselor) => {
                    const assignedCases = cases.filter(caseItem => caseItem.assignedCounselorId === counselor.id);
                    return (
                      <CounselorCard
                        key={counselor.id}
                        counselor={counselor}
                        assignedCases={assignedCases}
                        onEdit={handleEditCounselor}
                        onDelete={handleDeleteCounselor}
                        canEdit={true}
                        canDelete={true}
                      />
                    );
                  })}
                </Box>
              )}

              {!counselorsLoading && filteredCounselors.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm || workloadFilter !== 'all' 
                      ? t.adminTools.noMatchFound 
                      : t.adminTools.noCounselorsFound
                    }
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Card>
            <CardContent>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', sm: 'center' },
                gap: { xs: 2, sm: 0 },
                mb: 2 
              }}>
                <Typography variant="h6" component="h2">
                  {t.adminTools.allCasesManagement}
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setCaseFormOpen(true)}
                  sx={{ 
                    backgroundColor: '#ffc700',
                    color: '#000',
                    fontWeight: 'bold',
                    '&:hover': { backgroundColor: '#e6b300' },
                    width: { xs: '100%', sm: 'auto' }
                  }}
                >
                  {t.adminTools.addCase}
                </Button>
              </Box>

              {/* Search and Filter Controls */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                  placeholder={t.adminTools.searchCases}
                  value={caseSearchTerm}
                  onChange={(e) => setCaseSearchTerm(e.target.value)}
                  size="small"
                  sx={{ minWidth: 200 }}
                  InputProps={{
                    startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>{t.cases.status}</InputLabel>
                  <Select
                    value={caseStatusFilter}
                    onChange={(e) => setCaseStatusFilter(e.target.value as any)}
                    label={t.cases.status}
                  >
                    <MenuItem value="all">{t.adminTools.allStatuses}</MenuItem>
                    <MenuItem value="waiting">{t.status.waiting}</MenuItem>
                    <MenuItem value="active">{t.status.active}</MenuItem>
                    <MenuItem value="unfinished">{t.status.unfinished}</MenuItem>
                    <MenuItem value="finished">{t.status.completed}</MenuItem>
                    <MenuItem value="cancelled">{t.status.cancelled}</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Consilier</InputLabel>
                  <Select
                    value={caseCounselorFilter}
                    onChange={(e) => setCaseCounselorFilter(e.target.value)}
                    label="Consilier"
                  >
                    <MenuItem value="all">{t.adminTools.allCounselors}</MenuItem>
                    {counselors.map((counselor) => (
                      <MenuItem key={counselor.id} value={counselor.id}>
                        {counselor.fullName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {casesError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {casesError}
                </Alert>
              )}

              {casesLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 2 }}>
                  {filteredCases.map((caseItem) => (
                    <CaseCard
                      key={caseItem.id}
                      caseData={caseItem}
                      onEdit={handleEditCase}
                      onDelete={handleDeleteCase}
                      canEdit={true}
                      canDelete={true}
                      latestNote={currentUser?.role === 'leader' ? caseNotes[caseItem.id] : undefined}
                      showViewAllNotes={currentUser?.role === 'leader'}
                      showLatestNote={currentUser?.role === 'leader'}
                      showSessionReports={currentUser?.role === 'leader'}
                      onSessionReportClick={() => handleOpenSessionReport(caseItem)}
                    />
                  ))}
                </Box>
              )}

              {!casesLoading && filteredCases.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {caseSearchTerm || caseStatusFilter !== 'all' || caseCounselorFilter !== 'all'
                      ? t.adminTools.noMatchFound 
                      : t.adminTools.noCasesFound
                    }
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}


      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onClose={() => {
        setCreateDialogOpen(false);
        setCreateUserData({ email: '', password: '', fullName: '', role: 'counselor' });
      }} maxWidth="sm" fullWidth>
        <DialogTitle>{t.admin.users.createNewUser}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label={t.admin.users.fullName}
              value={createUserData.fullName}
              onChange={(e) => {
                const fullName = e.target.value;
                const generatedPassword = generatePassword(fullName);
                setCreateUserData({ 
                  ...createUserData, 
                  fullName: fullName,
                  password: generatedPassword
                });
              }}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label={t.admin.users.email}
              type="email"
              value={createUserData.email}
              onChange={(e) => setCreateUserData({ ...createUserData, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label={t.admin.users.generatedPassword}
              type="text"
              value={createUserData.password}
              margin="normal"
              InputProps={{
                readOnly: true,
              }}
              helperText={t.admin.users.passwordHelperText}
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>{t.admin.users.role}</InputLabel>
              <Select
                value={createUserData.role}
                onChange={(e) => setCreateUserData({ ...createUserData, role: e.target.value as UserRole })}
                label={t.admin.users.role}
              >
                <MenuItem value="counselor">{t.roles.counselor}</MenuItem>
                <MenuItem value="admin">{t.roles.admin}</MenuItem>
                <MenuItem value="leader">{t.roles.leader}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setCreateUserData({ email: '', password: '', fullName: '', role: 'counselor' });
          }}>{t.common.cancel}</Button>
          <Button
            onClick={copyUserCredentials}
            variant="outlined"
            startIcon={<ContentCopy />}
            disabled={!createUserData.email || !createUserData.password}
            sx={{ mr: 1 }}
          >
            {t.admin.users.copyCredentials}
          </Button>
          <Button
            onClick={handleCreateUser}
            variant="contained"
            disabled={!createUserData.email || !createUserData.fullName || !createUserData.password}
            sx={{ 
              backgroundColor: '#ffc700',
              color: '#000',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#e6b300' }
            }}
          >
            {t.admin.users.createUser}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t.admin.users.editUser}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label={t.admin.users.fullName}
              value={editUserData.fullName}
              onChange={(e) => setEditUserData({ ...editUserData, fullName: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>{t.admin.users.role}</InputLabel>
              <Select
                value={editUserData.role}
                onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value as UserRole })}
                label={t.admin.users.role}
                disabled={currentUser?.role === 'admin' && selectedUser?.role === 'leader'}
              >
                <MenuItem value="counselor">{t.roles.counselor}</MenuItem>
                <MenuItem value="admin">{t.roles.admin}</MenuItem>
                {currentUser?.role === 'leader' && (
                  <MenuItem value="leader">{t.roles.leader}</MenuItem>
                )}
              </Select>
            </FormControl>
            {currentUser?.role === 'admin' && selectedUser?.role === 'leader' && (
              <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                {t.admin.users.adminsCannotModifyLeaders}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleEditUser}
            variant="contained"
            disabled={!editUserData.fullName || !editUserData.role}
            sx={{ 
              backgroundColor: '#ffc700',
              color: '#000',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#e6b300' }
            }}
          >
            {t.admin.users.updateUser}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Counselor Form Dialog */}
      <CounselorForm
        open={counselorFormOpen}
        onClose={handleCloseCounselorForm}
        onSubmit={handleCounselorSubmit}
        counselorData={editingCounselor}
        preselectedUserId={editingCounselor ? undefined : (newlyCreatedUserId || undefined)}
      />

      {/* Next Step Dialog - After User Creation */}
      <Dialog 
        open={showNextStepDialog} 
        onClose={handleSkipCounselorLink}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Utilizator creat cu succes!
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Utilizatorul a fost creat cu succes. Dorești să îl leagă la un cont de consilier?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Poți lega utilizatorul la un cont de consilier acum sau poți face acest lucru mai târziu din secțiunea de gestionare a consilierilor.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSkipCounselorLink}>
            Anulează
          </Button>
          <Button
            onClick={handleNextStepToCounselor}
            variant="contained"
            sx={{ 
              backgroundColor: '#ffc700',
              color: '#000',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#e6b300' }
            }}
          >
            Creează Profil Consilier
          </Button>
        </DialogActions>
      </Dialog>

      {/* Case Form Dialog */}
      <CaseForm
        open={caseFormOpen}
        onClose={handleCloseCaseForm}
        onSubmit={handleCaseSubmit}
        caseData={editingCase}
        counselors={counselors.map(c => ({ id: c.id, fullName: c.fullName }))}
      />

      {/* Session Report Dialog */}
      <SessionReport
        open={sessionReportOpen}
        onClose={handleCloseSessionReport}
        caseId={selectedCaseForSessionReport?.id || ''}
        caseTitle={selectedCaseForSessionReport?.title || ''}
        onReportAdded={() => {
          // Optionally reload cases or refresh data if needed
        }}
        hideAddButton={true}
        caseStatus={selectedCaseForSessionReport?.status}
      />

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
    </Box>
  );
};

export default AdminTools;
