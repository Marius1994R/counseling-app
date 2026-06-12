import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Counselor, Case } from '../types';
import { t } from '../utils/translations';
import { COMMON_SPECIALTIES, normalizeSpecialties } from '../components/Profile/profileUtils';
import { getEarliestDate, pickNewestCounselorDoc } from '../components/Counselors/counselorsUtils';
import { fileToAvatarDataUrl, validateAvatarFile } from '../utils/avatarUtils';

export function useProfileData() {
  const { currentUser, updateUserAvatar } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [removeAvatarConfirmOpen, setRemoveAvatarConfirmOpen] = useState(false);
  const [isLinkedCounselor, setIsLinkedCounselor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const linkedQuery = query(counselorsRef, where('linkedUserId', '==', currentUser.id));
        const linkedSnapshot = await getDocs(linkedQuery);

        const matchingDocs = [...linkedSnapshot.docs];
        if (matchingDocs.length === 0) {
          const emailQuery = query(counselorsRef, where('email', '==', currentUser.email));
          const emailSnapshot = await getDocs(emailQuery);
          matchingDocs.push(...emailSnapshot.docs);
        }

        const counselorDoc = pickNewestCounselorDoc(matchingDocs);

        if (counselorDoc) {
          const counselorData = counselorDoc.data();
          const createdAt = getEarliestDate(
            matchingDocs.map((docSnap) => docSnap.data().createdAt?.toDate?.() ?? new Date())
          );
          setIsLinkedCounselor(true);

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
            specialties: normalizeSpecialties(counselorData.specialties || []),
            activeCases,
            workloadLevel,
            linkedUserId: counselorData.linkedUserId,
            avatarUrl: currentUser.avatarUrl || counselorData.avatarUrl || undefined,
            createdAt,
            updatedAt: counselorData.updatedAt.toDate(),
          });

          setCases(casesData);
        } else {
          setIsLinkedCounselor(false);
          setCounselor({
            id: currentUser.id,
            fullName: currentUser.fullName || '',
            email: currentUser.email || '',
            phoneNumber: '',
            specialties: [],
            activeCases: 0,
            workloadLevel: 'low',
            linkedUserId: undefined,
            avatarUrl: currentUser.avatarUrl,
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
    if (!counselor || !isLinkedCounselor) return;

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
        createdAt: counselor.createdAt,
        updatedAt: new Date(),
      });

      setEditDialogOpen(false);
      showSnackbar(t.profile.updateSuccess || 'Profil actualizat cu succes!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar(t.profile.updateError || 'Eroare la actualizarea profilului', 'error');
    }
  }, [counselor, editData, isLinkedCounselor, showSnackbar]);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !currentUser || !counselor) return;

      const validationError = validateAvatarFile(file);
      if (validationError === 'invalidType') {
        showSnackbar(t.profile.avatarInvalidType, 'error');
        return;
      }
      if (validationError === 'tooLarge') {
        showSnackbar(t.profile.avatarTooLarge, 'error');
        return;
      }

      try {
        setAvatarUploading(true);

        const avatarUrl = await fileToAvatarDataUrl(file);

        await updateUserAvatar(avatarUrl);

        if (isLinkedCounselor) {
          await updateDoc(doc(db, 'counselors', counselor.id), {
            avatarUrl,
            updatedAt: new Date(),
          });
        }

        setCounselor({
          ...counselor,
          avatarUrl,
          createdAt: counselor.createdAt,
          updatedAt: new Date(),
        });
        showSnackbar(t.profile.avatarUpdateSuccess, 'success');
      } catch (error) {
        console.error('Error uploading avatar:', error);
        showSnackbar(t.profile.avatarUpdateError, 'error');
      } finally {
        setAvatarUploading(false);
      }
    },
    [currentUser, counselor, isLinkedCounselor, updateUserAvatar, showSnackbar]
  );

  const handleRequestRemoveAvatar = useCallback(() => {
    setRemoveAvatarConfirmOpen(true);
  }, []);

  const handleCancelRemoveAvatar = useCallback(() => {
    setRemoveAvatarConfirmOpen(false);
  }, []);

  const handleConfirmRemoveAvatar = useCallback(async () => {
    if (!currentUser || !counselor) return;

    try {
      setAvatarUploading(true);

      await updateUserAvatar(null);

      if (isLinkedCounselor) {
        await updateDoc(doc(db, 'counselors', counselor.id), {
          avatarUrl: null,
          updatedAt: new Date(),
        });
      }

      setCounselor({
        ...counselor,
        avatarUrl: undefined,
        createdAt: counselor.createdAt,
        updatedAt: new Date(),
      });
      setRemoveAvatarConfirmOpen(false);
      showSnackbar(t.profile.avatarRemoveSuccess, 'success');
    } catch (error) {
      console.error('Error removing avatar:', error);
      showSnackbar(t.profile.avatarUpdateError, 'error');
    } finally {
      setAvatarUploading(false);
    }
  }, [currentUser, counselor, isLinkedCounselor, updateUserAvatar, showSnackbar]);

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
    isLinkedCounselor,
    avatarUploading,
    fileInputRef,
    handleEditClick,
    handleSave,
    handleAvatarClick,
    handleAvatarFileChange,
    removeAvatarConfirmOpen,
    handleRequestRemoveAvatar,
    handleCancelRemoveAvatar,
    handleConfirmRemoveAvatar,
    handleAddSpecialty,
    handleRemoveSpecialty,
    handleAddCommonSpecialty,
  };
}
