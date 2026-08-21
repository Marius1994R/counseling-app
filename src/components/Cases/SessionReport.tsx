import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Note
} from '@mui/icons-material';
import { collection, addDoc, getDocs, getDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { logSessionReportAdded } from '../../utils/activityLogger';
import { MeetingFrequencyWeeks } from '../../types';
import { t } from '../../utils/translations';
import {
  isMeetingFrequencyWeeks,
  meetingFrequencyLabel,
} from '../../utils/meetingFrequency';
import {
  isOpeningSession,
  nextStoredSessionNumber,
  parseSessionNumber,
  toRoadSessionNumber,
} from '../SessionReports/sessionReportsUtils';
import SessionReportFormDialog from './SessionReportFormDialog';

function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateInputLocal(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date.getTime() > today.getTime();
}

interface SessionReportRecord {
  id: string;
  caseId: string;
  sessionNumber: number;
  meetingDate?: Date | null;
  meetingFrequencyWeeks?: MeetingFrequencyWeeks | null;
  mainTheme: string;
  personResponse: string;
  previousTaskCompleted: 'yes' | 'no' | 'partial' | null;
  previousTaskNotCompletedReason?: string;
  progressNoted: string;
  progressType?: string; // spiritual, emotional, relational, attitude, action
  nextCommitments: 'yes' | 'no';
  nextCommitmentsDetails?: string;
  noCommitmentsReason?: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
}

interface SessionReportProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
  onReportAdded?: (result?: {
    caseId: string;
    meetingDate: Date;
    meetingFrequencyWeeks: MeetingFrequencyWeeks | null;
    sessionNumber: number;
  }) => void;
  hideAddButton?: boolean; // Hide the "Adaugă Raport Post-Sesiune" button
  caseStatus?: string; // Case status to determine if add button should be shown
  autoOpenAddForm?: boolean; // Automatically open the add report form when dialog opens
  onCancelAddForm?: () => void; // Callback when add form is canceled
  /** Blur report bodies (admin cannot read confidential session content). */
  restrictSensitiveContent?: boolean;
}

const SessionReport: React.FC<SessionReportProps> = ({
  open,
  onClose,
  caseId,
  caseTitle,
  onReportAdded,
  hideAddButton = false,
  caseStatus,
  autoOpenAddForm = false,
  onCancelAddForm,
  restrictSensitiveContent = false,
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [reports, setReports] = useState<SessionReportRecord[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  // Form state
  const [sessionNumber, setSessionNumber] = useState(0);
  const [meetingDate, setMeetingDate] = useState(todayDateInputValue);
  const [meetingFrequencyWeeks, setMeetingFrequencyWeeks] = useState<MeetingFrequencyWeeks | ''>('');
  const [caseHasFrequency, setCaseHasFrequency] = useState(false);
  const [mainTheme, setMainTheme] = useState('');
  const [personResponse, setPersonResponse] = useState('');
  const [previousTaskCompleted, setPreviousTaskCompleted] = useState<'yes' | 'no' | 'partial'>('yes');
  const [previousTaskNotCompletedReason, setPreviousTaskNotCompletedReason] = useState('');
  const [progressNoted, setProgressNoted] = useState('');
  const [nextCommitments, setNextCommitments] = useState<'yes' | 'no'>('yes');
  const [nextCommitmentsDetails, setNextCommitmentsDetails] = useState('');
  const [noCommitmentsReason, setNoCommitmentsReason] = useState('');

  const storedSessionNumbers = reports.map((r) => r.sessionNumber);
  const roadSessionNumber = toRoadSessionNumber(sessionNumber, storedSessionNumbers);
  const frequencyRequired = roadSessionNumber === 0 || !caseHasFrequency;

  const loadReports = useCallback(async (isInitialLoad: boolean = false) => {
    if (!caseId) {
      setReports([]);
      setReportsLoading(false);
      return;
    }

    const generation = ++loadGenerationRef.current;
    setReportsLoading(true);
    // Clear previous case's reports immediately so they don't flash
    setReports([]);
    setExpandedReportId(null);

    try {
      const reportsRef = collection(db, 'sessionReports');
      const reportsQuery = query(reportsRef, where('caseId', '==', caseId));
      const reportsSnapshot = await getDocs(reportsQuery);

      // Ignore stale responses if another case was opened meanwhile
      if (generation !== loadGenerationRef.current) return;
      
      const reportsData: SessionReportRecord[] = [];
      reportsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const freq = data.meetingFrequencyWeeks;
        reportsData.push({
          id: docSnap.id,
          caseId: data.caseId,
          sessionNumber: parseSessionNumber(data.sessionNumber),
          meetingDate: data.meetingDate?.toDate?.() ?? null,
          meetingFrequencyWeeks: isMeetingFrequencyWeeks(freq) ? freq : null,
          mainTheme: restrictSensitiveContent ? '' : data.mainTheme,
          personResponse: restrictSensitiveContent ? '' : data.personResponse,
          previousTaskCompleted: data.previousTaskCompleted,
          previousTaskNotCompletedReason: restrictSensitiveContent
            ? ''
            : data.previousTaskNotCompletedReason || '',
          progressNoted: restrictSensitiveContent ? '' : data.progressNoted,
          nextCommitments: data.nextCommitments,
          nextCommitmentsDetails: restrictSensitiveContent
            ? ''
            : data.nextCommitmentsDetails,
          noCommitmentsReason: restrictSensitiveContent ? '' : data.noCommitmentsReason,
          createdAt: data.createdAt.toDate(),
          createdBy: data.createdBy,
          createdByName: data.createdByName
        });
      });
      
      // Newest session first (10, 9, 8…)
      reportsData.sort((a, b) => b.sessionNumber - a.sessionNumber);
      
      setReports(reportsData);
      
      // Update session number once reports are loaded (for both autoOpenAddForm and manual opens)
      if (isInitialLoad) {
        setSessionNumber(nextStoredSessionNumber(reportsData.map((r) => r.sessionNumber)));
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      if (generation === loadGenerationRef.current) {
        setReports([]);
      }
    } finally {
      if (generation === loadGenerationRef.current) {
        setReportsLoading(false);
      }
    }
  }, [caseId, restrictSensitiveContent]);

  const loadCaseFrequency = useCallback(async () => {
    if (!caseId) {
      setCaseHasFrequency(false);
      setMeetingFrequencyWeeks('');
      return;
    }
    try {
      const caseSnap = await getDoc(doc(db, 'cases', caseId));
      const raw = caseSnap.exists() ? caseSnap.data()?.meetingFrequencyWeeks : null;
      if (isMeetingFrequencyWeeks(raw)) {
        setCaseHasFrequency(true);
        setMeetingFrequencyWeeks(raw);
      } else {
        setCaseHasFrequency(false);
        setMeetingFrequencyWeeks('');
      }
    } catch (err) {
      console.error('Error loading case meeting frequency:', err);
      setCaseHasFrequency(false);
      setMeetingFrequencyWeeks('');
    }
  }, [caseId]);

  const resetForm = useCallback(() => {
    // Set session number to next available
    setSessionNumber(nextStoredSessionNumber(reports.map((r) => r.sessionNumber)));
    setMeetingDate(todayDateInputValue());
    setMainTheme('');
    setPersonResponse('');
    setPreviousTaskCompleted('yes');
    setPreviousTaskNotCompletedReason('');
    setProgressNoted('');
    setNextCommitments('yes');
    setNextCommitmentsDetails('');
    setNoCommitmentsReason('');
    void loadCaseFrequency();
  }, [reports, loadCaseFrequency]);

  useEffect(() => {
    if (open && caseId) {
      setMeetingDate(todayDateInputValue());
      setMainTheme('');
      setPersonResponse('');
      setPreviousTaskCompleted('yes');
      setPreviousTaskNotCompletedReason('');
      setProgressNoted('');
      setNextCommitments('yes');
      setNextCommitmentsDetails('');
      setNoCommitmentsReason('');
      setExpandedReportId(null);

      if (autoOpenAddForm && caseStatus === 'active') {
        setAddReportOpen(true);
      }

      void loadReports(true);
      void loadCaseFrequency();
    } else if (!open) {
      setAddReportOpen(false);
      setExpandedReportId(null);
      setReports([]);
      setReportsLoading(false);
      setCaseHasFrequency(false);
      setMeetingFrequencyWeeks('');
    }
  }, [open, caseId, autoOpenAddForm, caseStatus, loadReports, loadCaseFrequency]);

  const handleAddReport = async () => {
    if (loading) return;

    const parsedMeetingDate = parseDateInputLocal(meetingDate);
    if (!parsedMeetingDate) {
      setSnackbar({ open: true, message: t.sessionReports.meetingDateRequired, severity: 'error' });
      return;
    }
    if (isFutureDate(parsedMeetingDate)) {
      setSnackbar({ open: true, message: t.sessionReports.meetingDateFuture, severity: 'error' });
      return;
    }

    if (frequencyRequired && !isMeetingFrequencyWeeks(meetingFrequencyWeeks)) {
      setSnackbar({ open: true, message: t.sessionReports.meetingFrequencyRequired, severity: 'error' });
      return;
    }

    // Validate required fields
    const openingSession = isOpeningSession(sessionNumber, storedSessionNumbers);
    if (
      !mainTheme.trim() ||
      !personResponse.trim() ||
      (!openingSession && !progressNoted.trim())
    ) {
      setSnackbar({ open: true, message: 'Toate câmpurile sunt obligatorii', severity: 'error' });
      return;
    }
    
    // Validate reason field when previousTaskCompleted is 'partial' or 'no'
    if (
      !openingSession &&
      (previousTaskCompleted === 'partial' || previousTaskCompleted === 'no') &&
      !previousTaskNotCompletedReason.trim()
    ) {
      setSnackbar({ open: true, message: 'Te rugăm să completezi motivul pentru care tema nu a fost împlinită', severity: 'error' });
      return;
    }

    try {
      setLoading(true);

      const frequencyToSave = isMeetingFrequencyWeeks(meetingFrequencyWeeks)
        ? meetingFrequencyWeeks
        : null;
      
      const reportData: Record<string, unknown> = {
        caseId,
        sessionNumber,
        meetingDate: parsedMeetingDate,
        mainTheme: mainTheme.trim(),
        personResponse: personResponse.trim(),
        previousTaskCompleted: openingSession ? null : previousTaskCompleted,
        previousTaskNotCompletedReason:
          !openingSession &&
          (previousTaskCompleted === 'partial' || previousTaskCompleted === 'no')
            ? previousTaskNotCompletedReason.trim()
            : '',
        progressNoted: openingSession ? '' : progressNoted.trim(),
        nextCommitments,
        nextCommitmentsDetails: nextCommitments ? nextCommitmentsDetails : '',
        noCommitmentsReason: !nextCommitments ? noCommitmentsReason : '',
        createdAt: new Date(),
        createdBy: currentUser?.id,
        createdByName: currentUser?.fullName || ''
      };

      if (frequencyToSave != null) {
        reportData.meetingFrequencyWeeks = frequencyToSave;
      }

      await addDoc(collection(db, 'sessionReports'), reportData);

      const caseUpdate: Record<string, unknown> = {
        lastMeetingDate: parsedMeetingDate,
        updatedAt: new Date(),
      };
      if (frequencyToSave != null) {
        caseUpdate.meetingFrequencyWeeks = frequencyToSave;
      }
      await updateDoc(doc(db, 'cases', caseId), caseUpdate);
      if (frequencyToSave != null) {
        setCaseHasFrequency(true);
      }
      
      // Log the activity
      if (currentUser?.id && currentUser?.fullName) {
        await logSessionReportAdded(
          caseId,
          caseTitle,
          toRoadSessionNumber(sessionNumber, storedSessionNumbers),
          currentUser.id,
          currentUser.fullName
        );
      }
      
      setSnackbar({ open: true, message: 'Raportul a fost adăugat cu succes', severity: 'success' });
      resetForm();
      setAddReportOpen(false);
      loadReports(false); // Reload reports without auto-opening form
      
      // Close the dialog and trigger callback to close all modals
      if (onReportAdded) {
        onReportAdded({
          caseId,
          meetingDate: parsedMeetingDate,
          meetingFrequencyWeeks: frequencyToSave,
          sessionNumber,
        });
      } else {
        // If no callback, just close the dialog
        onClose();
      }
    } catch (error) {
      console.error('Error adding session report:', error);
      setSnackbar({ open: true, message: 'Eroare la adăugarea raportului', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setAddReportOpen(false);
    setExpandedReportId(null);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open && !addReportOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Note sx={{ color: '#ffc700' }} />
            {caseTitle}
          </Box>
        </DialogTitle>
        <DialogContent>
              {!hideAddButton && caseStatus === 'active' && (
                <Box sx={{ mb: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      // Update session number before opening form
                      setSessionNumber(nextStoredSessionNumber(reports.map((r) => r.sessionNumber)));
                      setAddReportOpen(true);
                    }}
                    sx={{ 
                      backgroundColor: '#ffc700',
                      color: '#000',
                      fontWeight: 'bold',
                      '&:hover': { backgroundColor: '#e6b300' }
                    }}
                  >
                    Adaugă Raport Post-Sesiune
                  </Button>
                </Box>
              )}

              {/* Info message about session reports */}
              <Alert severity="info" sx={{ mb: 3 }}>
                Raportul post-sesiune este completat după fiecare întâlnire de consiliere pentru a urmări progresul 
                și pentru a menține continuitatea între sesiuni.
              </Alert>

              {reportsLoading ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1.5,
                    py: 6,
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <CircularProgress size={32} sx={{ color: '#C99700' }} />
                  <Typography variant="body2" color="text.secondary">
                    Se încarcă rapoartele…
                  </Typography>
                </Box>
              ) : reports.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                Rapoarte Post-Sesiune ({reports.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {reports.map((report) => (
                  <Card 
                    key={report.id} 
                    variant="outlined"
                    sx={{ 
                      cursor: restrictSensitiveContent ? 'default' : 'pointer',
                      '&:hover': restrictSensitiveContent ? undefined : { boxShadow: 2 },
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onClick={
                      restrictSensitiveContent
                        ? undefined
                        : () =>
                            setExpandedReportId(
                              expandedReportId === report.id ? null : report.id
                            )
                    }
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ width: '100%' }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Raport Sesiune {toRoadSessionNumber(report.sessionNumber, storedSessionNumbers)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {report.meetingDate
                              ? `${report.meetingDate.toLocaleDateString('ro-RO')} · ${report.createdByName}`
                              : `${report.createdAt.toLocaleDateString('ro-RO')} - ${report.createdByName}`}
                          </Typography>
                          {restrictSensitiveContent ? (
                            <Box sx={{ position: 'relative', mt: 1.5 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  filter: 'blur(6px)',
                                  userSelect: 'none',
                                  pointerEvents: 'none',
                                }}
                                aria-hidden
                              >
                                Conținut confidențial al raportului de sesiune. Detaliile nu sunt
                                disponibile pentru acest rol.
                              </Typography>
                              <Box
                                sx={{
                                  position: 'absolute',
                                  inset: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    bgcolor: 'background.paper',
                                    px: 1.5,
                                    py: 0.75,
                                    borderRadius: 999,
                                    fontWeight: 600,
                                    color: 'text.secondary',
                                    boxShadow: 1,
                                    textAlign: 'center',
                                  }}
                                >
                                  Conținut confidențial — vizibil doar pentru lideri.
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            !expandedReportId && (
                              <Typography variant="body2" sx={{ mt: 1, fontWeight: 'medium' }}>
                                Tema: {report.mainTheme}
                              </Typography>
                            )
                          )}
                        </Box>
                      </Box>

                      {!restrictSensitiveContent && expandedReportId === report.id && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            Detalii Raport
                          </Typography>

                          {report.meetingDate && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {t.sessionReports.meetingDate}:
                              </Typography>
                              <Typography variant="body2">
                                {report.meetingDate.toLocaleDateString('ro-RO')}
                              </Typography>
                            </Box>
                          )}

                          {report.meetingFrequencyWeeks && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                {t.sessionReports.meetingFrequency}:
                              </Typography>
                              <Typography variant="body2">
                                {meetingFrequencyLabel(report.meetingFrequencyWeeks)}
                              </Typography>
                            </Box>
                          )}
                          
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              1. Tema principală abordată:
                            </Typography>
                            <Typography variant="body2">{report.mainTheme}</Typography>
                          </Box>

                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              2. Răspuns persoana consiliată:
                            </Typography>
                            <Typography variant="body2">{report.personResponse}</Typography>
                          </Box>

                          {!isOpeningSession(report.sessionNumber, storedSessionNumbers) && (
                          <>
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              3. Tema/pașii anteriori împliniți:
                            </Typography>
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {report.previousTaskCompleted === 'yes' ? 'Da' : 
                               report.previousTaskCompleted === 'partial' ? 'Parțial' : 'Nu'}
                            </Typography>
                            {(report.previousTaskCompleted === 'partial' || report.previousTaskCompleted === 'no') && report.previousTaskNotCompletedReason && (
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic', pl: 2 }}>
                                Motiv: {report.previousTaskNotCompletedReason}
                              </Typography>
                            )}
                          </Box>

                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              4. Progres observat:
                            </Typography>
                            <Typography variant="body2">{report.progressNoted}</Typography>
                          </Box>
                          </>
                          )}

                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              5. Angajamente pentru următoarea întâlnire:
                            </Typography>
                            <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                              {report.nextCommitments === 'yes' ? 'Da' : 'Nu'}
                            </Typography>
                            {report.nextCommitments === 'yes' && report.nextCommitmentsDetails && (
                              <Typography variant="body2" sx={{ mt: 0.5, ml: 1, fontStyle: 'italic' }}>
                                {report.nextCommitmentsDetails}
                              </Typography>
                            )}
                            {report.nextCommitments === 'no' && report.noCommitmentsReason && (
                              <Typography variant="body2" sx={{ mt: 0.5, ml: 1, fontStyle: 'italic' }}>
                                Motiv: {report.noCommitmentsReason}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </Box>
              ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Închide</Button>
        </DialogActions>
      </Dialog>

      <SessionReportFormDialog
        open={addReportOpen}
        caseTitle={caseTitle}
        loading={loading}
        frequencyRequired={frequencyRequired}
        values={{
          sessionNumber,
          meetingDate,
          meetingFrequencyWeeks,
          mainTheme,
          personResponse,
          previousTaskCompleted,
          previousTaskNotCompletedReason,
          progressNoted,
          nextCommitments,
          nextCommitmentsDetails,
          noCommitmentsReason,
        }}
        onChange={(patch) => {
          if (patch.sessionNumber !== undefined) setSessionNumber(patch.sessionNumber);
          if (patch.meetingDate !== undefined) setMeetingDate(patch.meetingDate);
          if (patch.meetingFrequencyWeeks !== undefined) {
            setMeetingFrequencyWeeks(patch.meetingFrequencyWeeks);
          }
          if (patch.mainTheme !== undefined) setMainTheme(patch.mainTheme);
          if (patch.personResponse !== undefined) setPersonResponse(patch.personResponse);
          if (patch.previousTaskCompleted !== undefined) {
            setPreviousTaskCompleted(patch.previousTaskCompleted);
          }
          if (patch.previousTaskNotCompletedReason !== undefined) {
            setPreviousTaskNotCompletedReason(patch.previousTaskNotCompletedReason);
          }
          if (patch.progressNoted !== undefined) setProgressNoted(patch.progressNoted);
          if (patch.nextCommitments !== undefined) setNextCommitments(patch.nextCommitments);
          if (patch.nextCommitmentsDetails !== undefined) {
            setNextCommitmentsDetails(patch.nextCommitmentsDetails);
          }
          if (patch.noCommitmentsReason !== undefined) {
            setNoCommitmentsReason(patch.noCommitmentsReason);
          }
        }}
        onClose={() => {
          if (loading) return;
          setAddReportOpen(false);
          if (onCancelAddForm) onCancelAddForm();
        }}
        existingSessionNumbers={storedSessionNumbers}
        onSubmit={() => {
          void handleAddReport();
        }}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SessionReport;

