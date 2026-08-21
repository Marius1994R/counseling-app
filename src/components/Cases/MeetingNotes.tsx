import React, { useState, useEffect, useCallback } from 'react';
import { Snackbar, Alert, CircularProgress } from '@mui/material';
import {
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Link as RouterLink } from 'react-router-dom';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { MeetingNote } from '../../types';
import { logMeetingNotesAdded } from '../../utils/activityLogger';
import { t } from '../../utils/translations';
import ConfirmDialog from '../common/ConfirmDialog';
import {
  MEETING_NOTES_DIALOG_LIMIT,
  buildSessionSelectOptions,
  defaultSessionForNewNote,
  formatNoteDateTime,
  parseMeetingNoteDoc,
  sessionSelectLabel,
  takeLatestNotes,
} from '../MeetingNotes/meetingNotesUtils';

interface MeetingNotesProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  caseTitle: string;
  /** Road session count for this case (0-based options 0..count-1). */
  reportCount?: number;
  onNoteAdded?: () => void;
}

const MeetingNotes: React.FC<MeetingNotesProps> = ({
  open,
  onClose,
  caseId,
  caseTitle,
  reportCount = 0,
  onNoteAdded,
}) => {
  const { currentUser } = useAuth();
  const [allNotes, setAllNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [sessionNumber, setSessionNumber] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const sessionOptions = buildSessionSelectOptions(reportCount, allNotes);
  const visibleNotes = takeLatestNotes(allNotes, MEETING_NOTES_DIALOG_LIMIT);
  const hasMoreNotes = allNotes.length > MEETING_NOTES_DIALOG_LIMIT;
  const isEditing = editingNote != null;

  const resetComposer = useCallback(
    (notes: MeetingNote[] = allNotes) => {
      setEditingNote(null);
      setNoteContent('');
      setSessionNumber(
        defaultSessionForNewNote(buildSessionSelectOptions(reportCount, notes))
      );
    },
    [allNotes, reportCount]
  );

  const loadMeetingNotes = useCallback(async () => {
    try {
      setLoading(true);
      const notesQuery = query(
        collection(db, 'meetingNotes'),
        where('caseId', '==', caseId)
      );
      const notesSnapshot = await getDocs(notesQuery);
      const notesData: MeetingNote[] = [];
      notesSnapshot.forEach((docSnap) => {
        notesData.push(parseMeetingNoteDoc(docSnap.id, docSnap.data()));
      });
      notesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setAllNotes(notesData);
      return notesData;
    } catch (error) {
      console.error('Error loading meeting notes:', error);
      setSnackbar({ open: true, message: t.common.error, severity: 'error' });
      return [] as MeetingNote[];
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    if (!open || !caseId) return;
    setExpandedNotes(new Set());
    void loadMeetingNotes().then((notes) => {
      setEditingNote(null);
      setNoteContent('');
      setSessionNumber(
        defaultSessionForNewNote(buildSessionSelectOptions(reportCount, notes))
      );
    });
  }, [open, caseId, loadMeetingNotes, reportCount]);

  const handleEditNote = (note: MeetingNote) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setSessionNumber(
      note.sessionNumber ?? defaultSessionForNewNote(sessionOptions)
    );
  };

  const handleDiscardEdit = () => {
    if (saveLoading) return;
    resetComposer();
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim() || saveLoading) return;

    try {
      setSaveLoading(true);
      if (editingNote) {
        await updateDoc(doc(db, 'meetingNotes', editingNote.id), {
          content: noteContent.trim(),
          sessionNumber,
          updatedAt: new Date(),
        });
        setSnackbar({
          open: true,
          message: t.meetingNotes.updateSuccess,
          severity: 'success',
        });
      } else {
        await addDoc(collection(db, 'meetingNotes'), {
          caseId,
          content: noteContent.trim(),
          sessionNumber,
          createdBy: currentUser?.id || '',
          createdByName: currentUser?.fullName || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        if (currentUser) {
          await logMeetingNotesAdded(
            caseId,
            caseTitle,
            currentUser.id,
            currentUser.fullName || currentUser.email || 'Unknown User'
          );
        }

        setSnackbar({
          open: true,
          message: t.meetingNotes.addNoteSuccess,
          severity: 'success',
        });
        onNoteAdded?.();
      }

      const notes = await loadMeetingNotes();
      setEditingNote(null);
      setNoteContent('');
      setSessionNumber(
        defaultSessionForNewNote(buildSessionSelectOptions(reportCount, notes))
      );
    } catch (error) {
      console.error('Error saving meeting note:', error);
      setSnackbar({
        open: true,
        message: t.meetingNotes.addNoteError,
        severity: 'error',
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteNoteConfirm = async () => {
    if (!deleteTargetId) return;
    try {
      setDeleteLoading(true);
      await deleteDoc(doc(db, 'meetingNotes', deleteTargetId));
      if (editingNote?.id === deleteTargetId) {
        resetComposer();
      }
      setSnackbar({
        open: true,
        message: t.meetingNotes.deleteNoteSuccess,
        severity: 'success',
      });
      setDeleteTargetId(null);
      const notes = await loadMeetingNotes();
      if (!editingNote || editingNote.id === deleteTargetId) {
        setSessionNumber(
          defaultSessionForNewNote(buildSessionSelectOptions(reportCount, notes))
        );
      }
    } catch (error) {
      console.error('Error deleting meeting note:', error);
      setSnackbar({
        open: true,
        message: t.meetingNotes.deleteNoteError,
        severity: 'error',
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleClose = () => {
    if (saveLoading) return;
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[1400] flex items-end justify-center p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-notes-dialog-title"
      >
        <div
          className="absolute inset-0 bg-slate-900/40"
          aria-hidden="true"
          onClick={saveLoading ? undefined : handleClose}
        />
        <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-lg sm:max-h-[85vh] sm:rounded-xl">
          {/* Header */}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h2
                id="meeting-notes-dialog-title"
                className="text-base font-semibold text-slate-900"
              >
                {t.meetingNotes.title}
              </h2>
              <p className="mt-0.5 truncate text-sm text-slate-500">{caseTitle}</p>
              {!loading && allNotes.length > 0 && (
                <p className="mt-1 text-xs text-slate-400">
                  {visibleNotes.length}
                  {hasMoreNotes ? ` / ${allNotes.length}` : ''}{' '}
                  {allNotes.length !== 1
                    ? t.meetingNotes.notePlural
                    : t.meetingNotes.noteSingular}
                  {hasMoreNotes
                    ? ` · ${t.meetingNotes.showingLatest.replace(
                        '{n}',
                        String(MEETING_NOTES_DIALOG_LIMIT)
                      )}`
                    : ''}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={saveLoading}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
              aria-label={t.common.close}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable notes */}
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 sm:px-5">
            {loading ? (
              <div className="flex justify-center py-10">
                <CircularProgress size={28} sx={{ color: '#C99700' }} />
              </div>
            ) : allNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
                <p className="text-sm text-slate-500">{t.meetingNotes.noNotesMessage}</p>
              </div>
            ) : (
              <>
                {visibleNotes.map((note) => {
                  const expanded = expandedNotes.has(note.id);
                  const long = note.content.length > 160;
                  const body =
                    long && !expanded
                      ? `${note.content.slice(0, 160)}…`
                      : note.content;
                  const isActiveEdit = editingNote?.id === note.id;

                  return (
                    <article
                      key={note.id}
                      className={`rounded-xl border px-3 py-2.5 transition ${
                        isActiveEdit
                          ? 'border-brand-200 bg-brand-50/60'
                          : 'border-slate-100 bg-slate-50/80'
                      }`}
                    >
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            {note.sessionNumber != null
                              ? `S${note.sessionNumber}`
                              : t.meetingNotes.noSession}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatNoteDateTime(note.createdAt)}
                          </span>
                        </div>
                        <div className="flex shrink-0 gap-0.5">
                          <button
                            type="button"
                            title={t.common.edit}
                            onClick={() => handleEditNote(note)}
                            disabled={saveLoading}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 disabled:opacity-50"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            title={t.common.delete}
                            onClick={() => setDeleteTargetId(note.id)}
                            disabled={saveLoading}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                        {body}
                      </p>
                      {long && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = new Set(expandedNotes);
                            if (next.has(note.id)) next.delete(note.id);
                            else next.add(note.id);
                            setExpandedNotes(next);
                          }}
                          className="mt-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          {expanded
                            ? t.meetingNotes.showLess
                            : t.meetingNotes.showMore}
                        </button>
                      )}
                    </article>
                  );
                })}
                {hasMoreNotes && (
                  <RouterLink
                    to={`/meeting-notes?caseId=${caseId}`}
                    onClick={handleClose}
                    className="inline-block pt-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    {t.meetingNotes.viewAllOnPage} →
                  </RouterLink>
                )}
              </>
            )}
          </div>

          {/* Inline composer */}
          <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
            <p className="text-sm font-semibold text-slate-900">
              {isEditing ? t.meetingNotes.editNote : t.meetingNotes.addNote}
            </p>
            <label className="mt-2 block text-xs font-medium text-slate-600">
              {t.meetingNotes.sessionField}
              <select
                value={sessionNumber}
                onChange={(e) => setSessionNumber(Number(e.target.value))}
                disabled={saveLoading}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
              >
                {sessionOptions.map((n) => (
                  <option key={n} value={n}>
                    {sessionSelectLabel(n, reportCount)}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              disabled={saveLoading}
              rows={3}
              placeholder={t.meetingNotes.contentPlaceholder}
              className="mt-2 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
            />
            <div className="mt-2.5 flex items-center justify-end gap-2">
              {isEditing && (
                <button
                  type="button"
                  onClick={handleDiscardEdit}
                  disabled={saveLoading}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {t.common.cancel}
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleSaveNote()}
                disabled={saveLoading || !noteContent.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {saveLoading && <CircularProgress size={14} color="inherit" />}
                {isEditing ? t.common.save : t.meetingNotes.addNote}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteTargetId !== null}
        title={t.meetingNotes.deleteNote}
        message={t.meetingNotes.deleteNoteConfirm}
        variant="danger"
        loading={deleteLoading}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteNoteConfirm}
      />

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
