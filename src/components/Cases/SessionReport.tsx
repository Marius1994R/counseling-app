import React, { useState, useEffect } from 'react';
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
  FormLabel,
  Chip,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add,
  Note,
  CalendarToday
} from '@mui/icons-material';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { logSessionReportAdded } from '../../utils/activityLogger';

interface SessionReport {
  id: string;
  caseId: string;
  sessionNumber: number;
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
  onCancelAddForm
}) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [addReportOpen, setAddReportOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Form state
  const [sessionNumber, setSessionNumber] = useState(1);
  const [mainTheme, setMainTheme] = useState('');
  const [personResponse, setPersonResponse] = useState('');
  const [previousTaskCompleted, setPreviousTaskCompleted] = useState<'yes' | 'no' | 'partial'>('yes');
  const [previousTaskNotCompletedReason, setPreviousTaskNotCompletedReason] = useState('');
  const [progressNoted, setProgressNoted] = useState('');
  const [nextCommitments, setNextCommitments] = useState<'yes' | 'no'>('yes');
  const [nextCommitmentsDetails, setNextCommitmentsDetails] = useState('');
  const [noCommitmentsReason, setNoCommitmentsReason] = useState('');

  useEffect(() => {
    if (open && caseId) {
      setHasAutoOpened(false); // Reset flag when dialog opens or case changes
      resetForm();
      
      // If autoOpenAddForm is true, immediately open the form to avoid showing reports list
      if (autoOpenAddForm && caseStatus === 'active') {
        setAddReportOpen(true);
        setHasAutoOpened(true);
      }
      
      loadReports(true); // Pass true to indicate initial load
    } else if (!open) {
      // Reset flag when dialog closes
      setHasAutoOpened(false);
      setAddReportOpen(false);
      setExpandedReportId(null); // Collapse all expanded reports
    }
  }, [open, caseId, autoOpenAddForm, caseStatus]);

  const loadReports = async (isInitialLoad: boolean = false) => {
    try {
      const reportsRef = collection(db, 'sessionReports');
      const reportsQuery = query(reportsRef, where('caseId', '==', caseId));
      const reportsSnapshot = await getDocs(reportsQuery);
      
      const reportsData: SessionReport[] = [];
      reportsSnapshot.forEach((doc) => {
        const data = doc.data();
        reportsData.push({
          id: doc.id,
          caseId: data.caseId,
          sessionNumber: data.sessionNumber || 1,
          mainTheme: data.mainTheme,
          personResponse: data.personResponse,
          previousTaskCompleted: data.previousTaskCompleted,
          previousTaskNotCompletedReason: data.previousTaskNotCompletedReason || '',
          progressNoted: data.progressNoted,
          nextCommitments: data.nextCommitments,
          nextCommitmentsDetails: data.nextCommitmentsDetails,
          noCommitmentsReason: data.noCommitmentsReason,
          createdAt: data.createdAt.toDate(),
          createdBy: data.createdBy,
          createdByName: data.createdByName
        });
      });
      
      // Sort by session number on client side to avoid index requirement
      reportsData.sort((a, b) => a.sessionNumber - b.sessionNumber);
      
      setReports(reportsData);
      
      // Update session number once reports are loaded (for both autoOpenAddForm and manual opens)
      if (isInitialLoad) {
        const maxSession = reportsData.length > 0 ? Math.max(...reportsData.map(r => r.sessionNumber), 0) : 0;
        setSessionNumber(maxSession + 1);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const resetForm = () => {
    // Set session number to next available
    const maxSession = reports.length > 0 ? Math.max(...reports.map(r => r.sessionNumber), 0) : 0;
    setSessionNumber(maxSession + 1);
    setMainTheme('');
    setPersonResponse('');
    setPreviousTaskCompleted('yes');
    setPreviousTaskNotCompletedReason('');
    setProgressNoted('');
    setNextCommitments('yes');
    setNextCommitmentsDetails('');
    setNoCommitmentsReason('');
  };

  const handleAddReport = async () => {
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
      
      const reportData = {
        caseId,
        sessionNumber,
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

      await addDoc(collection(db, 'sessionReports'), reportData);
      
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
    setHasAutoOpened(false); // Reset flag when dialog closes
    setExpandedReportId(null); // Collapse all expanded reports
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

              {/* Display existing reports */}
              {reports.length > 0 && (
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
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 2 }
                    }}
                    onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Raport Sesiune {report.sessionNumber}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {report.createdAt.toLocaleDateString('ro-RO')} - {report.createdByName}
                          </Typography>
                          {!expandedReportId && (
                            <Typography variant="body2" sx={{ mt: 1, fontWeight: 'medium' }}>
                              Tema: {report.mainTheme}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {expandedReportId === report.id && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                            Detalii Raport
                          </Typography>
                          
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
          )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Închide</Button>
        </DialogActions>
      </Dialog>

      {/* Add Report Dialog */}
      <Dialog open={addReportOpen} onClose={() => {
        setAddReportOpen(false);
        setHasAutoOpened(false); // Reset flag when closing add form
        // If onCancelAddForm callback is provided, call it to show case selection
        if (onCancelAddForm) {
          onCancelAddForm();
        }
      }} maxWidth="md" fullWidth>
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
          <Button onClick={() => {
            setAddReportOpen(false);
            setHasAutoOpened(false); // Reset flag when canceling add form
            // If onCancelAddForm callback is provided, call it to show case selection
            if (onCancelAddForm) {
              onCancelAddForm();
            }
          }}>Anulează</Button>
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

