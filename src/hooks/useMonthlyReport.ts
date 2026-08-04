import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { MonthlyReport, MonthlyReportAnswers } from '../types';
import { t } from '../utils/translations';
import {
  getDueReportMonthKey,
  mapFirestoreMonthlyReport,
  monthlyReportDocId,
  formatMonthKeyLabel,
} from '../components/MonthlyReport/monthlyReportUtils';
import { logMonthlyReportSubmitted } from '../utils/activityLogger';

export function useMonthlyReport(leaderMonthKey?: string) {
  const { currentUser } = useAuth();
  const monthKey = getDueReportMonthKey();

  const [ownReport, setOwnReport] = useState<MonthlyReport | null>(null);
  const [ownLoading, setOwnLoading] = useState(true);
  const [ownError, setOwnError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [leaderReports, setLeaderReports] = useState<MonthlyReport[]>([]);
  const [leaderLoading, setLeaderLoading] = useState(false);
  const [leaderError, setLeaderError] = useState('');

  const isLeader = currentUser?.role === 'leader';

  const loadOwnReport = useCallback(async () => {
    if (!currentUser?.id || currentUser.id.startsWith('demo-')) {
      setOwnReport(null);
      setOwnLoading(false);
      return;
    }

    setOwnLoading(true);
    setOwnError('');
    try {
      const id = monthlyReportDocId(currentUser.id, monthKey);
      const snap = await getDoc(doc(db, 'monthlyReports', id));
      if (snap.exists()) {
        setOwnReport(mapFirestoreMonthlyReport(snap.id, snap.data()));
      } else {
        setOwnReport(null);
      }
    } catch (err) {
      console.error('Error loading monthly report:', err);
      setOwnError(t.monthlyReport.loadError);
    } finally {
      setOwnLoading(false);
    }
  }, [currentUser, monthKey]);

  useEffect(() => {
    void loadOwnReport();
  }, [loadOwnReport]);

  const loadLeaderReports = useCallback(async () => {
    if (!isLeader || !leaderMonthKey) {
      setLeaderReports([]);
      return;
    }

    setLeaderLoading(true);
    setLeaderError('');
    try {
      const q = query(
        collection(db, 'monthlyReports'),
        where('monthKey', '==', leaderMonthKey)
      );
      const snap = await getDocs(q);
      const items: MonthlyReport[] = [];
      snap.forEach((d) => {
        items.push(mapFirestoreMonthlyReport(d.id, d.data()));
      });
      items.sort((a, b) => a.userName.localeCompare(b.userName, 'ro'));
      setLeaderReports(items);
    } catch (err) {
      console.error('Error loading team monthly reports:', err);
      setLeaderError(t.monthlyReport.loadError);
    } finally {
      setLeaderLoading(false);
    }
  }, [isLeader, leaderMonthKey]);

  useEffect(() => {
    void loadLeaderReports();
  }, [loadLeaderReports]);

  const submitReport = useCallback(
    async (answers: MonthlyReportAnswers) => {
      if (!currentUser?.id) {
        throw new Error(t.auth.notAuthenticated);
      }
      if (ownReport) {
        throw new Error(t.monthlyReport.alreadySubmitted);
      }

      setSubmitting(true);
      try {
        const now = new Date();
        const id = monthlyReportDocId(currentUser.id, monthKey);
        const payload = {
          userId: currentUser.id,
          userName: currentUser.fullName || currentUser.email,
          userEmail: currentUser.email,
          monthKey,
          answers,
          submittedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(doc(db, 'monthlyReports', id), payload);
        setOwnReport(mapFirestoreMonthlyReport(id, payload));
        void logMonthlyReportSubmitted(
          monthKey,
          formatMonthKeyLabel(monthKey),
          currentUser.id,
          currentUser.fullName || currentUser.email
        );
        window.dispatchEvent(new CustomEvent('monthly-report-submitted', { detail: { monthKey } }));
        if (isLeader && leaderMonthKey === monthKey) {
          void loadLeaderReports();
        }
      } catch (err) {
        console.error('Error submitting monthly report:', err);
        throw err instanceof Error ? err : new Error(t.monthlyReport.submitError);
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser, ownReport, monthKey, isLeader, leaderMonthKey, loadLeaderReports]
  );

  return {
    currentUser,
    monthKey,
    isLeader,
    ownReport,
    ownLoading,
    ownError,
    submitting,
    submitReport,
    reloadOwn: loadOwnReport,
    leaderReports,
    leaderLoading,
    leaderError,
  };
}
