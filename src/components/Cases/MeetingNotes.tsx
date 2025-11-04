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
  IconButton,
  Chip,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Note,
  CalendarToday,
  Person
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { logMeetingNotesAdded } from '../../utils/activityLogger';
import { t } from '../../utils/translations';

interface MeetingNote {
  id: string;
  caseId: string;
  content: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  updatedAt: Date;
}

interface MeetingNotesProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
  onNoteAdded?: () => void; // Callback when a new note is added
}

const MeetingNotes: React.FC<MeetingNotesProps> = ({
  open,
  onClose,
  caseId,
  caseTitle,
  onNoteAdded
}) => {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Load meeting notes for this case
  useEffect(() => {
    if (open && caseId) {
      loadMeetingNotes();
    }
  }, [open, caseId]);

  const loadMeetingNotes = async () => {
    try {
      setLoading(true);
      const notesRef = collection(db, 'meetingNotes');
      const notesQuery = query(notesRef, where('caseId', '==', caseId));
      const notesSnapshot = await getDocs(notesQuery);
      
      const notesData: MeetingNote[] = [];
      notesSnapshot.forEach((doc) => {
        const data = doc.data();
        notesData.push({
          id: doc.id,
          caseId: data.caseId,
          content: data.content,
          createdAt: data.createdAt.toDate(),
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          updatedAt: data.updatedAt.toDate()
        });
      });
      
      // Sort by creation date (newest first) on client side
      notesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      setNotes(notesData);
    } catch (error) {
      console.error('Error loading meeting notes:', error);
      setSnackbar({ open: true, message: t.common.error, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = () => {
    setEditingNote(null);
    setNoteContent('');
    setAddNoteOpen(true);
  };

  const handleEditNote = (note: MeetingNote) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setAddNoteOpen(true);
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;

    try {
      if (editingNote) {
        // Update existing note
        const noteRef = doc(db, 'meetingNotes', editingNote.id);
        await updateDoc(noteRef, {
          content: noteContent.trim(),
          updatedAt: new Date()
        });
        setSnackbar({ open: true, message: t.meetingNotes.updateSuccess || 'Notă de ședință actualizată cu succes', severity: 'success' });
      } else {
        // Create new note
        await addDoc(collection(db, 'meetingNotes'), {
          caseId,
          content: noteContent.trim(),
          createdBy: currentUser?.id || '',
          createdByName: currentUser?.fullName || '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Log meeting notes activity
        if (currentUser) {
          await logMeetingNotesAdded(
            caseId,
            caseTitle,
            currentUser.id,
            currentUser.fullName || currentUser.email || 'Unknown User'
          );
        }
        
        setSnackbar({ open: true, message: t.meetingNotes.addNoteSuccess, severity: 'success' });
        
        // Notify parent component that a new note was added
        if (onNoteAdded) {
          onNoteAdded();
        }
      }
      
      setAddNoteOpen(false);
      setNoteContent('');
      setEditingNote(null);
      loadMeetingNotes();
    } catch (error) {
      console.error('Error saving meeting note:', error);
      setSnackbar({ open: true, message: t.meetingNotes.addNoteError, severity: 'error' });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (window.confirm('Sigur doriți să ștergeți această notă de ședință?')) {
      try {
        await deleteDoc(doc(db, 'meetingNotes', noteId));
        setSnackbar({ open: true, message: t.meetingNotes.deleteNoteSuccess, severity: 'success' });
        loadMeetingNotes();
      } catch (error) {
        console.error('Error deleting meeting note:', error);
        setSnackbar({ open: true, message: t.meetingNotes.deleteNoteError, severity: 'error' });
      }
    }
  };

  const handleCloseAddNote = () => {
    setAddNoteOpen(false);
    setNoteContent('');
    setEditingNote(null);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Note sx={{ color: '#ffc700' }} />
            <Typography variant="h6">
              {t.meetingNotes.title} - {caseTitle}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" color="text.secondary">
              {notes.length} {notes.length !== 1 ? 'note' : 'notă'}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddNote}
              sx={{ backgroundColor: '#ffc700', '&:hover': { backgroundColor: '#e6b300' } }}
            >
              {t.meetingNotes.addNote}
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <Typography>{t.common.loading}</Typography>
            </Box>
          ) : notes.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Note sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                {t.meetingNotes.noNotesMessage}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {notes.map((note) => (
                <Card key={note.id} sx={{ borderLeft: '4px solid #ffc700' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2" color="text.secondary">
                          {note.createdByName}
                        </Typography>
                        <Chip
                          label={note.createdAt.toLocaleDateString()}
                          size="small"
                          icon={<CalendarToday />}
                          variant="outlined"
                        />
                      </Box>
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleEditNote(note)}
                          sx={{ color: '#ffc700' }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteNote(note.id)}
                          sx={{ color: 'error.main' }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {note.content}
                    </Typography>
                    {note.updatedAt.getTime() !== note.createdAt.getTime() && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {t.common.updated}: {note.updatedAt.toLocaleString('ro-RO')}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t.common.close}</Button>
        </DialogActions>
      </Dialog>

      {/* Add/Edit Note Dialog */}
      <Dialog open={addNoteOpen} onClose={handleCloseAddNote} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingNote ? t.meetingNotes.editNote : t.meetingNotes.addNote}
        </DialogTitle>
        <DialogContent>
          <TextField
            label={t.meetingNotes.title}
            multiline
            rows={6}
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            fullWidth
            placeholder="Descrie cum s-a desfășurat întâlnirea, ce progres a fost făcut, observații importante..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddNote}>{t.common.cancel}</Button>
          <Button
            onClick={handleSaveNote}
            variant="contained"
            disabled={!noteContent.trim()}
            sx={{ backgroundColor: '#ffc700', '&:hover': { backgroundColor: '#e6b300' } }}
          >
            {editingNote ? t.common.save : t.meetingNotes.addNote}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MeetingNotes;
