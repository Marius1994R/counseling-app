import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Counselor, Case } from '../types';
import { t } from '../utils/translations';
import {
  WorkloadFilter,
  enrichCounselorWithWorkload,
  filterCounselors,
  getCounselorCases,
  countByWorkload,
  computeWorkload,
  dedupeCounselors,
} from '../components/Counselors/counselorsUtils';
import { syncLinkedUserAvatar } from '../utils/avatarUtils';
import { normalizeSpecialties } from '../components/Profile/profileUtils';

export function useCounselorsData() {
  const { currentUser } = useAuth();
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingCounselor, setEditingCounselor] = useState<Counselor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadFilter>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        const casesRef = collection(db, 'cases');
        const casesQuery = query(casesRef, orderBy('createdAt', 'desc'));
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
            issueTypes: data.issueTypes,
            phoneNumber: data.phoneNumber,
            description: data.description || '',
            status: data.status,
            assignedCounselorId: data.assignedCounselorId,
            assignedCounselorName: data.assignedCounselorName,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            createdBy: data.createdBy,
          });
        });

        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, orderBy('fullName', 'asc'));
        const counselorsSnapshot = await getDocs(counselorsQuery);

        const counselorsData: Counselor[] = [];
        counselorsSnapshot.forEach((counselorDoc) => {
          const data = counselorDoc.data();
          counselorsData.push(
            enrichCounselorWithWorkload(
              {
                id: counselorDoc.id,
                fullName: data.fullName,
                email: data.email,
                phoneNumber: data.phoneNumber || '',
                specialties: normalizeSpecialties(data.specialties || []),
                linkedUserId: data.linkedUserId || undefined,
                avatarUrl: data.avatarUrl || undefined,
                createdAt: data.createdAt.toDate(),
                updatedAt: data.updatedAt.toDate(),
              },
              casesData
            )
          );
        });

        setCases(casesData);
        setCounselors(dedupeCounselors(counselorsData));
      } catch (err) {
        setError(t.counselors.loadError);
        console.error('Counselors loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    setCounselors((prev) =>
      prev.map((counselor) => enrichCounselorWithWorkload(counselor, cases))
    );
  }, [cases]);

  const filteredCounselors = useMemo(
    () => filterCounselors(counselors, searchTerm, workloadFilter),
    [counselors, searchTerm, workloadFilter]
  );

  const workloadCounts = useMemo(
    () => ({
      all: counselors.length,
      low: countByWorkload(counselors, 'low'),
      moderate: countByWorkload(counselors, 'moderate'),
      high: countByWorkload(counselors, 'high'),
    }),
    [counselors]
  );

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'leader';
  const canDelete = canEdit;

  const handleAddCounselor = useCallback(() => {
    setEditingCounselor(null);
    setFormOpen(true);
  }, []);

  const handleEditCounselor = useCallback((counselor: Counselor) => {
    setEditingCounselor(counselor);
    setFormOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setEditingCounselor(null);
  }, []);

  const handleDeleteCounselor = useCallback(async (counselorId: string) => {
    try {
      await deleteDoc(doc(db, 'counselors', counselorId));
      setCounselors((prev) => prev.filter((c) => c.id !== counselorId));
    } catch (err) {
      console.error('Delete error:', err);
      setError(t.counselors.deleteError);
    }
  }, []);

  const handleFormSubmit = useCallback(
    async (
      counselorData: Omit<Counselor, 'id' | 'createdAt' | 'updatedAt' | 'activeCases' | 'workloadLevel'>
    ) => {
      try {
        if (editingCounselor) {
          const { activeCases, workloadLevel } = computeWorkload(
            getCounselorCases(editingCounselor.id, cases).filter((c) => c.status === 'active').length
          );

          await updateDoc(doc(db, 'counselors', editingCounselor.id), {
            fullName: counselorData.fullName,
            email: counselorData.email,
            phoneNumber: counselorData.phoneNumber,
            specialties: counselorData.specialties,
            linkedUserId: counselorData.linkedUserId ?? null,
            avatarUrl: counselorData.avatarUrl ?? null,
            activeCases,
            workloadLevel,
            updatedAt: new Date(),
          });
          await syncLinkedUserAvatar(counselorData.linkedUserId, counselorData.avatarUrl);

          const updatedCounselor: Counselor = {
            ...editingCounselor,
            ...counselorData,
            createdAt: editingCounselor.createdAt,
            activeCases,
            workloadLevel,
            updatedAt: new Date(),
          };
          setCounselors((prev) =>
            prev.map((c) => (c.id === editingCounselor.id ? updatedCounselor : c))
          );
        } else {
          const docRef = await addDoc(collection(db, 'counselors'), {
            ...counselorData,
            activeCases: 0,
            workloadLevel: 'low',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await syncLinkedUserAvatar(counselorData.linkedUserId, counselorData.avatarUrl);

          const newCounselor: Counselor = {
            ...counselorData,
            id: docRef.id,
            activeCases: 0,
            workloadLevel: 'low',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          setCounselors((prev) => [...prev, newCounselor].sort((a, b) =>
            a.fullName.localeCompare(b.fullName, 'ro')
          ));
        }
        handleCloseForm();
      } catch (err) {
        console.error('Form submit error:', err);
        setError(t.counselors.saveError);
      }
    },
    [editingCounselor, cases, handleCloseForm]
  );

  const getCasesForCounselor = useCallback(
    (counselorId: string) => getCounselorCases(counselorId, cases),
    [cases]
  );

  return {
    loading,
    error,
    searchTerm,
    setSearchTerm,
    workloadFilter,
    setWorkloadFilter,
    counselors,
    filteredCounselors,
    workloadCounts,
    formOpen,
    editingCounselor,
    canEdit,
    canDelete,
    handleAddCounselor,
    handleEditCounselor,
    handleDeleteCounselor,
    handleFormSubmit,
    handleCloseForm,
    getCasesForCounselor,
  };
}
