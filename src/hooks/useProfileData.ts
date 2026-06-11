import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Counselor, Case } from '../types';
import { t } from '../utils/translations';
import { COMMON_SPECIALTIES } from '../components/Profile/profileUtils';

export function useProfileData() {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const [editData, setEditData] = useState({
    phoneNumber: '',
    specialties: [] as string[],
  });

  const [newSpecialty, setNewSpecialty] = useState('');

  const showSnackbar = useCallback((message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        setLoadError(false);

        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, where('linkedUserId', '==', currentUser.id));
        const counselorsSnapshot = await getDocs(counselorsQuery);

        if (!counselorsSnapshot.empty) {
          const counselorDoc = counselorsSnapshot.docs[0];
          const counselorData = counselorDoc.data();

          const casesRef = collection(db, 'cases');
          const casesQuery = query(casesRef, where('assignedCounselorId', '==', counselorDoc.id));
          const casesSnapshot = await getDocs(casesQuery);

          const casesData: Case[] = [];
          casesSnapshot.forEach((caseDoc) => {
            const data = caseDoc.data();
            casesData.push({
              id: caseDoc.id,
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
              createdBy: data.createdBy || '',
            });
          });

          const activeCases = casesData.filter((c) => c.status === 'active').length;
          const workloadLevel = activeCases >= 3 ? 'high' : activeCases >= 2 ? 'moderate' : 'low';

          setCounselor({
            id: counselorDoc.id,
            fullName: counselorData.fullName,
            email: counselorData.email,
            phoneNumber: counselorData.phoneNumber || '',
            specialties: counselorData.specialties || [],
            activeCases,
            workloadLevel,
            linkedUserId: counselorData.linkedUserId,
            createdAt: counselorData.createdAt.toDate(),
            updatedAt: counselorData.updatedAt.toDate(),
          });

          setCases(casesData);
        } else {
          setCounselor({
            id: currentUser.id,
            fullName: currentUser.fullName || '',
            email: currentUser.email || '',
            phoneNumber: '',
            specialties: [],
            activeCases: 0,
            workloadLevel: 'low',
            linkedUserId: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          setCases([]);
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
        setLoadError(true);
        showSnackbar(t.profile.loadError || 'Eroare la încărcarea datelor profilului', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, showSnackbar]);

  useEffect(() => {
    if (searchParams.get('edit') !== 'true' || !counselor) return;
    setEditData({
      phoneNumber: counselor.phoneNumber.replace('+40', '').trim(),
      specialties: [...counselor.specialties],
    });
    setEditDialogOpen(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('edit');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, counselor, setSearchParams]);

  const handleEditClick = useCallback(() => {
    if (!counselor) return;
    setEditData({
      phoneNumber: counselor.phoneNumber.replace('+40', '').trim(),
      specialties: [...counselor.specialties],
    });
    setEditDialogOpen(true);
  }, [counselor]);

  const handleSave = useCallback(async () => {
    if (!counselor) return;

    try {
      const counselorRef = doc(db, 'counselors', counselor.id);
      const formattedPhone = `+40${editData.phoneNumber.replace(/[\s\-()]/g, '')}`;
      await updateDoc(counselorRef, {
        phoneNumber: formattedPhone,
        specialties: editData.specialties,
        updatedAt: new Date(),
      });

      setCounselor({
        ...counselor,
        phoneNumber: formattedPhone,
        specialties: editData.specialties,
        updatedAt: new Date(),
      });

      setEditDialogOpen(false);
      showSnackbar(t.profile.updateSuccess || 'Profil actualizat cu succes!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar(t.profile.updateError || 'Eroare la actualizarea profilului', 'error');
    }
  }, [counselor, editData, showSnackbar]);

  const handleAddSpecialty = useCallback(() => {
    const trimmedSpecialty = newSpecialty.trim();
    if (trimmedSpecialty && !editData.specialties.includes(trimmedSpecialty)) {
      setEditData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, trimmedSpecialty],
      }));
      setNewSpecialty('');
    }
  }, [newSpecialty, editData.specialties]);

  const handleRemoveSpecialty = useCallback((specialty: string) => {
    setEditData((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((s) => s !== specialty),
    }));
  }, []);

  const handleAddCommonSpecialty = useCallback((specialty: string) => {
    setEditData((prev) => {
      if (prev.specialties.includes(specialty)) return prev;
      return { ...prev, specialties: [...prev.specialties, specialty] };
    });
  }, []);

  return {
    currentUser,
    counselor,
    cases,
    loading,
    loadError,
    editDialogOpen,
    setEditDialogOpen,
    editData,
    setEditData,
    newSpecialty,
    setNewSpecialty,
    snackbar,
    setSnackbar,
    commonSpecialties: COMMON_SPECIALTIES,
    handleEditClick,
    handleSave,
    handleAddSpecialty,
    handleRemoveSpecialty,
    handleAddCommonSpecialty,
  };
}
