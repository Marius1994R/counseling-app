import React, { useEffect, useMemo, useState } from 'react';
import { CircularProgress } from '@mui/material';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { Case, MeetingNote } from '../../types';
import { logMeetingNotesAdded } from '../../utils/activityLogger';
import { t } from '../../utils/translations';
import {
  buildSessionSelectOptions,
  defaultSessionForNewNote,
  parseMeetingNoteDoc,
  sessionSelectLabel,
} from './meetingNotesUtils';

interface MeetingNoteFormDialogProps {
  open: boolean;
  caseItem: Case | null;
  reportCount?: number;
  /** When set, dialog opens in edit mode. */
  editingNote?: MeetingNote | null;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Simple add/edit note dialog (session dropdown + content) —
 * same UX as Note de ședință page composer.
 */
const MeetingNoteFormDialog: React.FC<MeetingNoteFormDialogProps> = ({
  open,
  caseItem,
  reportCount = 0,
  editingNote = null,
  onClose,
  onSaved,
}) => {
  const { currentUser } = useAuth();
  const [noteContent, setNoteContent] = useState('');
  const [sessionNumber, setSessionNumber] = useState(0);
  const [existingNotes, setExistingNotes] = useState<MeetingNote[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionOptions = useMemo(
    () => buildSessionSelectOptions(reportCount, existingNotes),
    [reportCount, existingNotes]
  );

  useEffect(() => {
    if (!open || !caseItem) return;

    let cancelled = false;
    const load = async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'meetingNotes'), where('caseId', '==', caseItem.id))
        );
        if (cancelled) return;
        const notes = snap.docs.map((d) => parseMeetingNoteDoc(d.id, d.data()));
        setExistingNotes(notes);
        if (editingNote) {
          setNoteContent(editingNote.content);
          setSessionNumber(
            editingNote.sessionNumber ??
              defaultSessionForNewNote(buildSessionSelectOptions(reportCount, notes))
          );
        } else {
          setNoteContent('');
          setSessionNumber(
            defaultSessionForNewNote(buildSessionSelectOptions(reportCount, notes))
          );
        }
        setError(null);
      } catch (err) {
        console.error('Error loading notes for form:', err);
        if (!cancelled) {
          setExistingNotes([]);
          setNoteContent(editingNote?.content ?? '');
          setSessionNumber(
            editingNote?.sessionNumber ?? defaultSessionForNewNote([0])
          );
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, caseItem, editingNote, reportCount]);

  if (!open || !caseItem) return null;

  const handleClose = () => {
    if (saveLoading) return;
    onClose();
  };

  const handleSave = async () => {
    if (!noteContent.trim() || saveLoading) return;
    try {
      setSaveLoading(true);
      setError(null);
      if (editingNote) {
        await updateDoc(doc(db, 'meetingNotes', editingNote.id), {
          content: noteContent.trim(),
          sessionNumber,
          updatedAt: new Date(),
        });
      } else {
        await addDoc(collection(db, 'meetingNotes'), {
          caseId: caseItem.id,
          content: noteContent.trim(),
          sessionNumber,
          createdBy: currentUser?.id || '',
          createdByName: currentUser?.fullName || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        if (currentUser) {
          await logMeetingNotesAdded(
            caseItem.id,
            caseItem.title,
            currentUser.id,
            currentUser.fullName || currentUser.email || 'Unknown User'
          );
        }
      }
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving meeting note:', err);
      setError(t.meetingNotes.addNoteError);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-note-form-title"
    >
      <div
        className="absolute inset-0 bg-slate-900/40"
        aria-hidden="true"
        onClick={saveLoading ? undefined : handleClose}
      />
      <div className="relative flex max-h-[min(85vh,100%)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="shrink-0 px-4 pt-4 sm:px-5 sm:pt-5">
          <h2
            id="meeting-note-form-title"
            className="text-base font-semibold text-slate-900"
          >
            {editingNote ? t.meetingNotes.editNote : t.meetingNotes.addNote}
          </h2>
          <p className="mt-1 truncate text-sm text-slate-500">
            {caseItem.counseledName} · {caseItem.title}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          <label className="block text-sm font-medium text-slate-800">
            {t.meetingNotes.sessionField}
            <select
              value={sessionNumber}
              onChange={(e) => setSessionNumber(Number(e.target.value))}
              disabled={saveLoading}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-base text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50 sm:text-sm"
            >
              {sessionOptions.map((n) => (
                <option key={n} value={n}>
                  {sessionSelectLabel(n, reportCount)}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block text-sm font-medium text-slate-800">
            {t.meetingNotes.content}
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              disabled={saveLoading}
              rows={4}
              placeholder={t.meetingNotes.contentPlaceholder}
              className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50 sm:text-sm"
            />
          </label>

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
          <button
            type="button"
            onClick={handleClose}
            disabled={saveLoading}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveLoading || !noteContent.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saveLoading && <CircularProgress size={14} color="inherit" />}
            {editingNote ? t.common.save : t.meetingNotes.addNote}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MeetingNoteFormDialog;
