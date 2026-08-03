import { useState, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Case } from '../types';
import { t } from '../utils/translations';
import {
  CaseTimelineItem,
  combineAppointmentAt,
  isCaseLifecycleActivityType,
  sortTimelineNewestFirst,
} from '../components/Cases/caseTimelineUtils';

function truncate(text: string, max = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function useCaseTimeline() {
  const [items, setItems] = useState<CaseTimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(async (caseItem: Case) => {
    try {
      setLoading(true);
      setError(null);

      const caseId = caseItem.id;
      const notesQuery = query(collection(db, 'meetingNotes'), where('caseId', '==', caseId));
      const reportsQuery = query(collection(db, 'sessionReports'), where('caseId', '==', caseId));
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('caseId', '==', caseId)
      );
      const activitiesQuery = query(
        collection(db, 'activities'),
        where('relatedId', '==', caseId)
      );

      const [notesSnap, reportsSnap, appointmentsSnap, activitiesSnap] = await Promise.all([
        getDocs(notesQuery),
        getDocs(reportsQuery),
        getDocs(appointmentsQuery),
        getDocs(activitiesQuery),
      ]);

      const merged: CaseTimelineItem[] = [];

      notesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate?.() as Date | undefined;
        if (!createdAt) return;
        merged.push({
          id: `note-${docSnap.id}`,
          kind: 'note',
          at: createdAt,
          title: t.caseTimeline.noteTitle,
          summary: truncate(String(data.content || '')),
          sourceId: docSnap.id,
          authorName: data.createdByName as string | undefined,
        });
      });

      reportsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt?.toDate?.() as Date | undefined;
        if (!createdAt) return;
        const sessionNumber = (data.sessionNumber as number) || 1;
        const mainTheme = String(data.mainTheme || '');
        merged.push({
          id: `report-${docSnap.id}`,
          kind: 'report',
          at: createdAt,
          title: t.caseTimeline.reportTitle.replace('{n}', String(sessionNumber)),
          summary: mainTheme ? truncate(mainTheme) : undefined,
          sourceId: docSnap.id,
          authorName: data.createdByName as string | undefined,
        });
      });

      appointmentsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const date = data.date?.toDate?.() as Date | undefined;
        if (!date) return;
        const startTime = data.startTime as string | undefined;
        const at = combineAppointmentAt(date, startTime);
        const title = String(data.title || t.caseTimeline.appointmentTitle);
        const timeLabel = startTime
          ? `${date.toLocaleDateString('ro-RO')} · ${startTime}`
          : date.toLocaleDateString('ro-RO');
        merged.push({
          id: `appointment-${docSnap.id}`,
          kind: 'appointment',
          at,
          title,
          summary: [timeLabel, data.counselorName, data.room].filter(Boolean).join(' · '),
          sourceId: docSnap.id,
        });
      });

      activitiesSnap.forEach((docSnap) => {
        const data = docSnap.data();
        const type = String(data.type || '');
        if (!isCaseLifecycleActivityType(type)) return;
        const timestamp = data.timestamp?.toDate?.() as Date | undefined;
        if (!timestamp) return;

        const kind = type === 'case_status_changed' ? 'status' : 'assignment';
        merged.push({
          id: `activity-${docSnap.id}`,
          kind,
          at: timestamp,
          title: String(data.title || t.caseTimeline.statusTitle),
          summary: String(data.description || ''),
          sourceId: docSnap.id,
          authorName: data.userName as string | undefined,
        });
      });

      merged.push({
        id: `opened-${caseId}`,
        kind: 'opened',
        at: caseItem.createdAt,
        title: t.caseTimeline.openedTitle,
        summary: caseItem.title,
      });

      setItems(sortTimelineNewestFirst(merged));
    } catch (err) {
      console.error('Error loading case timeline:', err);
      setError(t.caseTimeline.loadError);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setItems([]);
    setError(null);
    setLoading(false);
  }, []);

  return { items, loading, error, loadTimeline, reset };
}
