import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  Radio,
  RadioGroup,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
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
  MEETING_FREQUENCY_OPTIONS,
  isMeetingFrequencyWeeks,
  meetingFrequencyLabel,
} from '../../utils/meetingFrequency';

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
  previousTaskCompleted: 'yes' | 'no' | 'partial';
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
  onReportAdded?: () => void;
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
  const [sessionNumber, setSessionNumber] = useState(1);
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

  const frequencyRequired = sessionNumber === 1 || !caseHasFrequency;

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
          sessionNumber: data.sessionNumber || 1,
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
        const maxSession = reportsData.length > 0 ? Math.max(...reportsData.map(r => r.sessionNumber), 0) : 0;
        setSessionNumber(maxSession + 1);
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
    }
  }, [caseId]);

  const resetForm = useCallback(() => {
    // Set session number to next available
    const maxSession = reports.length > 0 ? Math.max(...reports.map(r => r.sessionNumber), 0) : 0;
    setSessionNumber(maxSession + 1);
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
    if (!mainTheme.trim() || !personResponse.trim() || !progressNoted.trim()) {
      setSnackbar({ open: true, message: 'Toate câmpurile sunt obligatorii', severity: 'error' });
      return;
    }
    
    // Validate reason field when previousTaskCompleted is 'partial' or 'no'
    if ((previousTaskCompleted === 'partial' || previousTaskCompleted === 'no') && !previousTaskNotCompletedReason.trim()) {
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
        previousTaskCompleted,
        previousTaskNotCompletedReason: (previousTaskCompleted === 'partial' || previousTaskCompleted === 'no') ? previousTaskNotCompletedReason.trim() : '',
        progressNoted: progressNoted.trim(),
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
          sessionNumber,
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
        onReportAdded();
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
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Note sx={{ color: '#ffc700' }} />
            {caseTitle}
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Only show reports list and add button if add form is not open */}
          {!addReportOpen && (
            <>
              {!hideAddButton && caseStatus === 'active' && (
                <Box sx={{ mb: 3 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => {
                      // Update session number before opening form
                      const maxSession = reports.length > 0 ? Math.max(...reports.map(r => r.sessionNumber), 0) : 0;
                      setSessionNumber(maxSession + 1);
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
                            Raport Sesiune {report.sessionNumber}
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
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Închide</Button>
        </DialogActions>
      </Dialog>

      {/* Add Report Dialog */}
      <Dialog
        open={addReportOpen}
        onClose={(_, reason) => {
          if (loading) return;
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            setAddReportOpen(false);
            if (onCancelAddForm) onCancelAddForm();
            return;
          }
          setAddReportOpen(false);
          if (onCancelAddForm) onCancelAddForm();
        }}
        disableEscapeKeyDown={loading}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Raport Post-Sesiune de Consiliere</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            {/* Session Number */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                Numărul Sesiunii *
              </Typography>
              <TextField
                fullWidth
                type="number"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(parseInt(e.target.value) || 1)}
                size="small"
                inputProps={{ min: 1 }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                {t.sessionReports.meetingDate} *
              </Typography>
              <TextField
                fullWidth
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
                inputProps={{ max: todayDateInputValue() }}
                required
              />
            </Box>

            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                {t.sessionReports.meetingFrequency}
                {frequencyRequired ? ' *' : ''}
              </Typography>
              {!frequencyRequired && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {t.sessionReports.meetingFrequencyOptionalHint}
                </Typography>
              )}
              <FormControl fullWidth size="small" required={frequencyRequired}>
                <InputLabel id="meeting-frequency-label">{t.sessionReports.meetingFrequency}</InputLabel>
                <Select
                  labelId="meeting-frequency-label"
                  label={t.sessionReports.meetingFrequency}
                  value={meetingFrequencyWeeks}
                  onChange={(e) => {
                    const value = e.target.value;
                    setMeetingFrequencyWeeks(
                      value === '' ? '' : (Number(value) as MeetingFrequencyWeeks)
                    );
                  }}
                >
                  {!frequencyRequired && (
                    <MenuItem value="">
                      <em>—</em>
                    </MenuItem>
                  )}
                  {MEETING_FREQUENCY_OPTIONS.map((weeks) => (
                    <MenuItem key={weeks} value={weeks}>
                      {meetingFrequencyLabel(weeks)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Q1: Main theme */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                1. Care a fost tema principală abordată în această sesiune? *
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                ex: iertare, relații, frică, identitate, decizii practice etc.
              </Typography>
              <TextField
                fullWidth
                value={mainTheme}
                onChange={(e) => setMainTheme(e.target.value)}
                placeholder="Introdu tema principală..."
                size="small"
                inputProps={{ maxLength: 50 }}
                helperText={`${mainTheme.length}/50 caractere`}
              />
            </Box>

            {/* Q2: Person response */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                2. Cum a răspuns persoana consiliată la ceea ce s-a discutat și aplicat? *
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                ex: receptivă / rezervată / confuză / hotărâtă etc.
              </Typography>
              <TextField
                fullWidth
                value={personResponse}
                onChange={(e) => setPersonResponse(e.target.value)}
                placeholder="Descrie răspunsul persoanei..."
                size="small"
                multiline
                rows={2}
              />
            </Box>

            {/* Q3: Previous task completion */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                3. A împlinit persoana consiliată tema sau pașii practici stabiliți la sesiunea anterioară? *
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                ex: da, parțial, nu – o scurtă observație despre motiv
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  value={previousTaskCompleted}
                  onChange={(e) => setPreviousTaskCompleted(e.target.value as 'yes' | 'no' | 'partial')}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="Da" />
                  <FormControlLabel value="partial" control={<Radio />} label="Parțial" />
                  <FormControlLabel value="no" control={<Radio />} label="Nu" />
                </RadioGroup>
              </FormControl>
              {/* Show reason field when Partial or No is selected */}
              {(previousTaskCompleted === 'partial' || previousTaskCompleted === 'no') && (
                <TextField
                  fullWidth
                  required
                  value={previousTaskNotCompletedReason}
                  onChange={(e) => setPreviousTaskNotCompletedReason(e.target.value)}
                  placeholder="Te rugăm să explici motivul pentru care tema nu a fost împlinită..."
                  size="small"
                  multiline
                  rows={2}
                  sx={{ mt: 2 }}
                  error={!previousTaskNotCompletedReason.trim()}
                  helperText={!previousTaskNotCompletedReason.trim() ? 'Acest câmp este obligatoriu' : ''}
                />
              )}
            </Box>

            {/* Q4: Progress noted */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                4. Se observă progres față de sesiunea anterioară? Dacă da, în ce mod? *
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                (spiritual, emoțional, relațional, în atitudine sau în acțiune)
              </Typography>
              <TextField
                fullWidth
                value={progressNoted}
                onChange={(e) => setProgressNoted(e.target.value)}
                placeholder="Descrie progresul observat..."
                size="small"
                multiline
                rows={3}
              />
            </Box>

            {/* Q5: Next commitments */}
            <Box>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold', mb: 1 }}>
                5. Există teme, pași practici sau angajamente asumate pentru următoarea întâlnire? *
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                ex: rugăciune specifică, studiu, confruntare, decizie, acțiune concretă etc.
              </Typography>
              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <RadioGroup
                  value={nextCommitments}
                  onChange={(e) => setNextCommitments(e.target.value as 'yes' | 'no')}
                >
                  <FormControlLabel value="yes" control={<Radio />} label="Da" />
                  <FormControlLabel value="no" control={<Radio />} label="Nu" />
                </RadioGroup>
              </FormControl>
              
              {nextCommitments === 'yes' ? (
                <TextField
                  fullWidth
                  value={nextCommitmentsDetails}
                  onChange={(e) => setNextCommitmentsDetails(e.target.value)}
                  placeholder="Descrie angajamentele pentru următoarea sesiune..."
                  size="small"
                  multiline
                  rows={2}
                />
              ) : (
                <TextField
                  fullWidth
                  value={noCommitmentsReason}
                  onChange={(e) => setNoCommitmentsReason(e.target.value)}
                  placeholder="De ce nu există angajamente?"
                  size="small"
                  multiline
                  rows={2}
                  required={nextCommitments === 'no'}
                />
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (loading) return;
              setAddReportOpen(false);
              // If onCancelAddForm callback is provided, call it to show case selection
              if (onCancelAddForm) {
                onCancelAddForm();
              }
            }}
            disabled={loading}
          >
            Anulează
          </Button>
          <Button 
            onClick={handleAddReport} 
            variant="contained" 
            disabled={
              loading ||
              !mainTheme.trim() ||
              !personResponse.trim() ||
              !progressNoted.trim() ||
              ((previousTaskCompleted === 'partial' || previousTaskCompleted === 'no') && !previousTaskNotCompletedReason.trim()) ||
              (nextCommitments === 'yes' && !nextCommitmentsDetails.trim()) ||
              (nextCommitments === 'no' && !noCommitmentsReason.trim())
            }
            startIcon={
              loading ? <CircularProgress size={16} color="inherit" /> : undefined
            }
            sx={{ 
              backgroundColor: '#ffc700',
              color: '#000',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: '#e6b300' }
            }}
          >
            Salvează Raport
          </Button>
        </DialogActions>
      </Dialog>

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

