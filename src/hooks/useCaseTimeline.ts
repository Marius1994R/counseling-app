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
import {
  parseSessionNumber,
  toRoadSessionNumber,
} from '../components/SessionReports/sessionReportsUtils';

function truncate(text: string, max = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

export function useCaseTimeline() {
  const [items, setItems] = useState<CaseTimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTimeline = useCallback(
    async (caseItem: Case, options?: {
      includeMeetingNotes?: boolean;
      includeSessionReportContent?: boolean;
    }) => {
      const includeMeetingNotes = options?.includeMeetingNotes !== false;
      const includeSessionReportContent = options?.includeSessionReportContent !== false;
      try {
        setLoading(true);
        setError(null);

        const caseId = caseItem.id;
        const reportsQuery = query(collection(db, 'sessionReports'), where('caseId', '==', caseId));
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('caseId', '==', caseId)
        );
        const activitiesQuery = query(
          collection(db, 'activities'),
          where('relatedId', '==', caseId)
        );

        const notesPromise = includeMeetingNotes
          ? getDocs(query(collection(db, 'meetingNotes'), where('caseId', '==', caseId)))
          : Promise.resolve(null);

        const [notesSnap, reportsSnap, appointmentsSnap, activitiesSnap] = await Promise.all([
          notesPromise,
          getDocs(reportsQuery),
          getDocs(appointmentsQuery),
          getDocs(activitiesQuery),
        ]);

        const merged: CaseTimelineItem[] = [];

        notesSnap?.forEach((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt?.toDate?.() as Date | undefined;
          if (!createdAt) return;
          const sessionNumber =
            typeof data.sessionNumber === 'number' && Number.isFinite(data.sessionNumber)
              ? data.sessionNumber
              : null;
          const sessionSuffix =
            sessionNumber != null
              ? ` · ${t.meetingNotes.sessionLabel.replace('{n}', String(sessionNumber))}`
              : '';
          merged.push({
            id: `note-${docSnap.id}`,
            kind: 'note',
            at: createdAt,
            title: `${t.caseTimeline.noteTitle}${sessionSuffix}`,
            summary: truncate(String(data.content || '')),
            sourceId: docSnap.id,
            authorName: data.createdByName as string | undefined,
          });
        });

        const reportEntries: {
          id: string;
          createdAt: Date;
          sessionNumber: number;
          mainTheme: string;
          authorName: string | undefined;
        }[] = [];
        reportsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          const createdAt = data.createdAt?.toDate?.() as Date | undefined;
          if (!createdAt) return;
          reportEntries.push({
            id: docSnap.id,
            createdAt,
            sessionNumber: parseSessionNumber(data.sessionNumber),
            mainTheme: includeSessionReportContent ? String(data.mainTheme || '') : '',
            authorName: data.createdByName as string | undefined,
          });
        });
        const reportSessionNumbers = reportEntries.map((entry) => entry.sessionNumber);
        reportEntries.forEach((entry) => {
          merged.push({
            id: `report-${entry.id}`,
            kind: 'report',
            at: entry.createdAt,
            title: t.caseTimeline.reportTitle.replace(
              '{n}',
              String(toRoadSessionNumber(entry.sessionNumber, reportSessionNumbers))
            ),
            summary: entry.mainTheme
              ? truncate(entry.mainTheme)
              : includeSessionReportContent
                ? undefined
                : t.adminTools.sensitiveContentRestricted,
            sourceId: entry.id,
            authorName: entry.authorName,
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
    },
    []
  );

  const reset = useCallback(() => {
    setItems([]);
    setError(null);
    setLoading(false);
  }, []);

  return { items, loading, error, loadTimeline, reset };
}
