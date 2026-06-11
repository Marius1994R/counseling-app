import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { Counselor } from '../types';
import { t } from '../utils/translations';
import {
  ActivityTimelineItem,
  TimeRangeFilter,
  getCutoffDate,
  shouldIncludeActivityForUser,
  filterActivities,
} from '../components/Activity/activityUtils';

export function useActivityData() {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<ActivityTimelineItem[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [counselorFilter, setCounselorFilter] = useState('all');
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>('3months');

  useEffect(() => {
    const loadActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        const cutoffDate = getCutoffDate(timeRangeFilter);

        const activitiesRef = collection(db, 'activities');
        const activitiesQuery = query(activitiesRef, orderBy('timestamp', 'desc'));
        const activitiesSnapshot = await getDocs(activitiesQuery);

        const allActivities: ActivityTimelineItem[] = [];
        activitiesSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const timestamp = data.timestamp.toDate();

          if (timestamp < cutoffDate) return;

          const item: ActivityTimelineItem = {
            id: docSnap.id,
            type: data.type,
            title: data.title,
            description: data.description,
            timestamp,
            userId: data.userId,
            userName: data.userName,
            relatedId: data.relatedId,
            relatedTitle: data.relatedTitle,
            status: data.status,
            counselorId: data.counselorId,
            counselorName: data.counselorName,
            metadata: data.metadata,
          };

          if (
            shouldIncludeActivityForUser(item, currentUser?.id, currentUser?.role)
          ) {
            allActivities.push(item);
          }
        });

        const counselorsRef = collection(db, 'counselors');
        const counselorsQuery = query(counselorsRef, orderBy('createdAt', 'desc'));
        const counselorsSnapshot = await getDocs(counselorsQuery);

        const counselorsData: Counselor[] = [];
        counselorsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          counselorsData.push({
            id: docSnap.id,
            fullName: data.fullName,
            email: data.email,
            phoneNumber: data.phoneNumber,
            specialties: data.specialties || [],
            activeCases: data.activeCases || 0,
            workloadLevel: data.workloadLevel || 'low',
            linkedUserId: data.linkedUserId,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          });
        });

        setActivities(allActivities);
        setCounselors(counselorsData);
      } catch (err) {
        setError(t.activity.loadError);
        console.error('Activity loading error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [timeRangeFilter, currentUser]);

  const filteredActivities = useMemo(
    () =>
      filterActivities(
        activities,
        { searchTerm, typeFilter, counselorFilter },
        counselors
      ),
    [activities, searchTerm, typeFilter, counselorFilter, counselors]
  );

  return {
    loading,
    error,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    counselorFilter,
    setCounselorFilter,
    timeRangeFilter,
    setTimeRangeFilter,
    counselors,
    filteredActivities,
    currentUser,
  };
}
