import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Counselor, Case, IssueType, Sex } from '../types';
import { t } from '../utils/translations';
import { COMMON_SPECIALTIES } from '../components/Profile/profileUtils';
import {
  getEarliestDate,
  mapFirestoreCounselor,
  pickNewestCounselorDoc,
} from '../components/Counselors/counselorsUtils';
import { fileToAvatarDataUrl, validateAvatarFile } from '../utils/avatarUtils';
import { isCommonSpecialty } from '../components/Cases/assignmentUtils';
import { mapFirestoreCase } from '../components/Cases/casesUtils';

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
    sex: '' as Sex | '',
    specialties: [] as string[],
    specialtyCategories: {} as Record<string, IssueType>,
  });

  const [newSpecialty, setNewSpecialty] = useState('');
  const [newSpecialtyCategory, setNewSpecialtyCategory] = useState<IssueType | ''>('');
  const [specialtyCategoryError, setSpecialtyCategoryError] = useState('');

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
            casesData.push(mapFirestoreCase(caseDoc.id, caseDoc.data()));
          });

          const activeCases = casesData.filter((c) => c.status === 'active').length;
          const workloadLevel = activeCases >= 3 ? 'high' : activeCases >= 2 ? 'moderate' : 'low';

          setCounselor(
            mapFirestoreCounselor(counselorDoc.id, counselorData, {
              activeCases,
              workloadLevel,
              avatarUrl: currentUser.avatarUrl || counselorData.avatarUrl || undefined,
              createdAt,
            })
          );

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
      sex: counselor.sex || '',
      specialties: [...counselor.specialties],
      specialtyCategories: { ...(counselor.specialtyCategories || {}) },
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
      sex: counselor.sex || '',
      specialties: [...counselor.specialties],
      specialtyCategories: { ...(counselor.specialtyCategories || {}) },
    });
    setNewSpecialtyCategory('');
    setSpecialtyCategoryError('');
    setEditDialogOpen(true);
  }, [counselor]);

  const handleSave = useCallback(async () => {
    if (!counselor || !isLinkedCounselor) return;
    if (!editData.sex) {
      showSnackbar('Selectează sexul', 'error');
      return;
    }

    try {
      const counselorRef = doc(db, 'counselors', counselor.id);
      const formattedPhone = `+40${editData.phoneNumber.replace(/[\s\-()]/g, '')}`;
      const specialtyCategories: Record<string, IssueType> = {};
      for (const specialty of editData.specialties) {
        if (!isCommonSpecialty(specialty) && editData.specialtyCategories[specialty]) {
          specialtyCategories[specialty] = editData.specialtyCategories[specialty];
        }
      }
      await updateDoc(counselorRef, {
        phoneNumber: formattedPhone,
        sex: editData.sex,
        specialties: editData.specialties,
        specialtyCategories:
          Object.keys(specialtyCategories).length > 0 ? specialtyCategories : null,
        updatedAt: new Date(),
      });

      setCounselor({
        ...counselor,
        phoneNumber: formattedPhone,
        sex: editData.sex,
        specialties: editData.specialties,
        specialtyCategories:
          Object.keys(specialtyCategories).length > 0 ? specialtyCategories : undefined,
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
    if (!trimmedSpecialty || editData.specialties.includes(trimmedSpecialty)) return;
    if (!newSpecialtyCategory) {
      setSpecialtyCategoryError(t.assignments.specialtyCategoryRequired);
      return;
    }
    setEditData((prev) => ({
      ...prev,
      specialties: [...prev.specialties, trimmedSpecialty],
      specialtyCategories: {
        ...prev.specialtyCategories,
        [trimmedSpecialty]: newSpecialtyCategory,
      },
    }));
    setNewSpecialty('');
    setNewSpecialtyCategory('');
    setSpecialtyCategoryError('');
  }, [newSpecialty, newSpecialtyCategory, editData.specialties]);

  const handleRemoveSpecialty = useCallback((specialty: string) => {
    setEditData((prev) => {
      const nextCategories = { ...prev.specialtyCategories };
      delete nextCategories[specialty];
      return {
        ...prev,
        specialties: prev.specialties.filter((s) => s !== specialty),
        specialtyCategories: nextCategories,
      };
    });
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
    newSpecialtyCategory,
    setNewSpecialtyCategory,
    specialtyCategoryError,
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
