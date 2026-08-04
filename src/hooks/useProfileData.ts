import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Counselor, IssueType, Sex } from '../types';
import { t } from '../utils/translations';
import { COMMON_SPECIALTIES } from '../components/Profile/profileUtils';
import {
  getEarliestDate,
  mapFirestoreCounselor,
  pickNewestCounselorDoc,
} from '../components/Counselors/counselorsUtils';
import { fileToAvatarDataUrl, validateAvatarFile } from '../utils/avatarUtils';
import { isCommonSpecialty } from '../components/Cases/assignmentUtils';
import { parseDateInputValue, toDateInputValue } from '../utils/nameUtils';

export function useProfileData() {
  const { currentUser, updateUserAvatar } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [counselor, setCounselor] = useState<Counselor | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [specialtiesDialogOpen, setSpecialtiesDialogOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saving, setSaving] = useState(false);
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
    birthDate: '',
  });

  const [specialtiesData, setSpecialtiesData] = useState({
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

          let activeCases = 0;
          casesSnapshot.forEach((caseDoc) => {
            if (caseDoc.data().status === 'active') activeCases += 1;
          });
          const workloadLevel = activeCases >= 3 ? 'high' : activeCases >= 2 ? 'moderate' : 'low';

          setCounselor(
            mapFirestoreCounselor(counselorDoc.id, counselorData, {
              activeCases,
              workloadLevel,
              avatarUrl: currentUser.avatarUrl || counselorData.avatarUrl || undefined,
              createdAt,
            })
          );
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

  const openProfileEditor = useCallback((c: Counselor) => {
    setEditData({
      phoneNumber: c.phoneNumber.replace('+40', '').trim(),
      sex: c.sex || '',
      birthDate: toDateInputValue(c.birthDate),
    });
    setEditDialogOpen(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('edit') !== 'true' || !counselor) return;
    openProfileEditor(counselor);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('edit');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, counselor, setSearchParams, openProfileEditor]);

  const handleEditClick = useCallback(() => {
    if (!counselor) return;
    openProfileEditor(counselor);
  }, [counselor, openProfileEditor]);

  const handleEditSpecialtiesClick = useCallback(() => {
    if (!counselor) return;
    setSpecialtiesData({
      specialties: [...counselor.specialties],
      specialtyCategories: { ...(counselor.specialtyCategories || {}) },
    });
    setNewSpecialty('');
    setNewSpecialtyCategory('');
    setSpecialtyCategoryError('');
    setSpecialtiesDialogOpen(true);
  }, [counselor]);

  const handleSaveProfile = useCallback(async () => {
    if (!counselor || !isLinkedCounselor || saving) return;
    if (!editData.sex) {
      showSnackbar('Selectează sexul', 'error');
      return;
    }

    try {
      setSaving(true);
      const counselorRef = doc(db, 'counselors', counselor.id);
      const formattedPhone = `+40${editData.phoneNumber.replace(/[\s\-()]/g, '')}`;
      const birthDate = parseDateInputValue(editData.birthDate);
      await updateDoc(counselorRef, {
        phoneNumber: formattedPhone,
        sex: editData.sex,
        birthDate: birthDate ?? null,
        updatedAt: new Date(),
      });

      setCounselor({
        ...counselor,
        phoneNumber: formattedPhone,
        sex: editData.sex,
        birthDate,
        createdAt: counselor.createdAt,
        updatedAt: new Date(),
      });

      setEditDialogOpen(false);
      showSnackbar(t.profile.updateSuccess || 'Profil actualizat cu succes!', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      showSnackbar(t.profile.updateError || 'Eroare la actualizarea profilului', 'error');
    } finally {
      setSaving(false);
    }
  }, [counselor, editData, isLinkedCounselor, saving, showSnackbar]);

  const handleSaveSpecialties = useCallback(async () => {
    if (!counselor || !isLinkedCounselor || saving) return;

    try {
      setSaving(true);
      const counselorRef = doc(db, 'counselors', counselor.id);
      const specialtyCategories: Record<string, IssueType> = {};
      for (const specialty of specialtiesData.specialties) {
        if (!isCommonSpecialty(specialty) && specialtiesData.specialtyCategories[specialty]) {
          specialtyCategories[specialty] = specialtiesData.specialtyCategories[specialty];
        }
      }
      await updateDoc(counselorRef, {
        specialties: specialtiesData.specialties,
        specialtyCategories:
          Object.keys(specialtyCategories).length > 0 ? specialtyCategories : null,
        updatedAt: new Date(),
      });

      setCounselor({
        ...counselor,
        specialties: specialtiesData.specialties,
        specialtyCategories:
          Object.keys(specialtyCategories).length > 0 ? specialtyCategories : undefined,
        createdAt: counselor.createdAt,
        updatedAt: new Date(),
      });

      setSpecialtiesDialogOpen(false);
      showSnackbar(t.profile.updateSuccess || 'Profil actualizat cu succes!', 'success');
    } catch (error) {
      console.error('Error updating specialties:', error);
      showSnackbar(t.profile.updateError || 'Eroare la actualizarea profilului', 'error');
    } finally {
      setSaving(false);
    }
  }, [counselor, specialtiesData, isLinkedCounselor, saving, showSnackbar]);

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
    if (!trimmedSpecialty || specialtiesData.specialties.includes(trimmedSpecialty)) return;
    if (!newSpecialtyCategory) {
      setSpecialtyCategoryError(t.assignments.specialtyCategoryRequired);
      return;
    }
    setSpecialtiesData((prev) => ({
      specialties: [...prev.specialties, trimmedSpecialty],
      specialtyCategories: {
        ...prev.specialtyCategories,
        [trimmedSpecialty]: newSpecialtyCategory,
      },
    }));
    setNewSpecialty('');
    setNewSpecialtyCategory('');
    setSpecialtyCategoryError('');
  }, [newSpecialty, newSpecialtyCategory, specialtiesData.specialties]);

  const handleRemoveSpecialty = useCallback((specialty: string) => {
    setSpecialtiesData((prev) => {
      const nextCategories = { ...prev.specialtyCategories };
      delete nextCategories[specialty];
      return {
        specialties: prev.specialties.filter((s) => s !== specialty),
        specialtyCategories: nextCategories,
      };
    });
  }, []);

  const handleAddCommonSpecialty = useCallback((specialty: string) => {
    setSpecialtiesData((prev) => {
      if (prev.specialties.includes(specialty)) return prev;
      return { ...prev, specialties: [...prev.specialties, specialty] };
    });
  }, []);

  return {
    currentUser,
    counselor,
    loading,
    loadError,
    editDialogOpen,
    setEditDialogOpen,
    specialtiesDialogOpen,
    setSpecialtiesDialogOpen,
    editData,
    setEditData,
    specialtiesData,
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
    saving,
    fileInputRef,
    handleEditClick,
    handleEditSpecialtiesClick,
    handleSaveProfile,
    handleSaveSpecialties,
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
