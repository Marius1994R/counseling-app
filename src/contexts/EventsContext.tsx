import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  arrayUnion,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ChurchEvent } from '../types';
import { useAuth } from './AuthContext';
import { assertUserHasRole, getAuthenticatedUserId } from '../utils/roleAuth';

interface EventsContextType {
  events: ChurchEvent[];
  loading: boolean;
  unreadEvents: ChurchEvent[];
  unreadEventCount: number;
  canManageEvents: boolean;
  createEvent: (data: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  updateEvent: (id: string, data: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  markEventsAsRead: (eventIds: string[]) => Promise<void>;
}

const EventsContext = createContext<EventsContextType>({} as EventsContextType);

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error('useEvents must be used within an EventsProvider');
  }
  return context;
};

function firestoreToEvent(id: string, data: DocumentData): ChurchEvent {
  return {
    id,
    name: data.name,
    description: data.description,
    startDate: data.startDate.toDate(),
    endDate: data.endDate.toDate(),
    startTime: data.startTime,
    endTime: data.endTime,
    registrationUrl: data.registrationUrl || undefined,
    createdBy: data.createdBy,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
  };
}

export const EventsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [readEventIds, setReadEventIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const canManageEvents =
    currentUser?.role === 'admin' || currentUser?.role === 'leader';

  useEffect(() => {
    if (!currentUser || currentUser.id.startsWith('demo-')) {
      setEvents([]);
      setReadEventIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);

    const eventsQuery = query(collection(db, 'events'), orderBy('startDate', 'desc'));
    const unsubscribeEvents = onSnapshot(
      eventsQuery,
      (snapshot) => {
        const items: ChurchEvent[] = [];
        snapshot.forEach((docSnap) => {
          items.push(firestoreToEvent(docSnap.id, docSnap.data()));
        });
        setEvents(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading events:', error);
        setLoading(false);
      }
    );

    return unsubscribeEvents;
  }, [currentUser]);

  useEffect(() => {
    const userId = currentUser?.id;
    if (!userId || userId.startsWith('demo-')) {
      setReadEventIds(new Set());
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'eventReadState', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setReadEventIds(new Set(data.readEventIds || []));
      } else {
        setReadEventIds(new Set());
      }
    });

    return unsubscribe;
  }, [currentUser?.id]);

  const unreadEvents = useMemo(
    () => events.filter((event) => !readEventIds.has(event.id)),
    [events, readEventIds]
  );

  const markEventsAsRead = useCallback(
    async (eventIds: string[]) => {
      const userId = currentUser?.id;
      if (!userId || userId.startsWith('demo-') || eventIds.length === 0) return;

      setReadEventIds((prev) => new Set([...Array.from(prev), ...eventIds]));

      try {
        const readRef = doc(db, 'eventReadState', userId);
        const readSnap = await getDoc(readRef);

        if (readSnap.exists()) {
          await updateDoc(readRef, {
            readEventIds: arrayUnion(...eventIds),
            updatedAt: new Date(),
          });
        } else {
          await setDoc(readRef, {
            userId,
            readEventIds: eventIds,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error('Error marking events as read:', error);
      }
    },
    [currentUser?.id]
  );

  const createEvent = useCallback(
    async (data: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => {
      const userId = getAuthenticatedUserId();
      await assertUserHasRole(userId, ['admin', 'leader']);

      await addDoc(collection(db, 'events'), {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        registrationUrl: data.registrationUrl ?? null,
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
    []
  );

  const updateEvent = useCallback(
    async (
      id: string,
      data: Omit<ChurchEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>
    ) => {
      const userId = getAuthenticatedUserId();
      await assertUserHasRole(userId, ['admin', 'leader']);

      await updateDoc(doc(db, 'events', id), {
        name: data.name,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        startTime: data.startTime,
        endTime: data.endTime,
        registrationUrl: data.registrationUrl ?? null,
        updatedAt: new Date(),
      });
    },
    []
  );

  const deleteEvent = useCallback(async (id: string) => {
    const userId = getAuthenticatedUserId();
    await assertUserHasRole(userId, ['admin', 'leader']);
    await deleteDoc(doc(db, 'events', id));
  }, []);

  const value: EventsContextType = {
    events,
    loading,
    unreadEvents,
    unreadEventCount: unreadEvents.length,
    canManageEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    markEventsAsRead,
  };

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
};
