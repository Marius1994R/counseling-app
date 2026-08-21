import React, { useState } from 'react';
import { Drawer } from '@mui/material';
import { Close } from '@mui/icons-material';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { MeetingNote } from '../../types';
import {
  CaseNoteSummary,
  SESSION_FILTER_UNASSIGNED,
  SessionRailFilter,
  filterNotesBySessionRail,
  formatNoteDateTime,
  sessionLabel,
} from './meetingNotesUtils';
import { t } from '../../utils/translations';

interface MeetingNotesSessionRailProps {
  summary: CaseNoteSummary | null;
  sessionFilters: SessionRailFilter[];
  selectedFilter: SessionRailFilter | null;
  onSelectFilter: (filter: SessionRailFilter) => void;
  onAddNote?: () => void;
  onEditNote?: (note: MeetingNote) => void;
  onDeleteNote?: (note: MeetingNote) => void;
  variant?: 'panel' | 'drawer';
  open?: boolean;
  onClose?: () => void;
}

const MeetingNotesSessionRail: React.FC<MeetingNotesSessionRailProps> = ({
  summary,
  sessionFilters,
  selectedFilter,
  onSelectFilter,
  onAddNote,
  onEditNote,
  onDeleteNote,
  variant = 'panel',
  open = false,
  onClose,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isDrawer = variant === 'drawer';
  const notes = summary
    ? filterNotesBySessionRail(summary.notes, selectedFilter)
    : [];

  const content = !summary ? (
    <div className="flex flex-1 items-center justify-center p-8 text-center">
      <p className="text-sm text-slate-500">{t.meetingNotes.selectCase}</p>
    </div>
  ) : (
    <>
      <div className="shrink-0 border-b border-slate-200 px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              {summary.case.counseledName}
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{summary.case.title}</p>
            <p className="mt-1 text-xs text-slate-500">
              {summary.noteCount}{' '}
              {summary.noteCount === 1
                ? t.meetingNotes.noteSingular
                : t.meetingNotes.notePlural}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onAddNote && (
              <button
                type="button"
                onClick={onAddNote}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
              >
                <PlusIcon className="h-4 w-4" />
                {t.meetingNotes.addNote}
              </button>
            )}
            {isDrawer && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={t.common.close}
              >
                <Close fontSize="small" />
              </button>
            )}
          </div>
        </div>

        {sessionFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {sessionFilters.map((filter) => {
              const active = selectedFilter === filter;
              const label =
                filter === SESSION_FILTER_UNASSIGNED
                  ? t.meetingNotes.noSession
                  : `S${filter}`;
              return (
                <button
                  key={String(filter)}
                  type="button"
                  onClick={() => onSelectFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-[0.98] ${
                    active
                      ? 'bg-brand-600 text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-4 py-4">
        {summary.notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <p className="text-sm text-slate-500">{t.meetingNotes.noNotesMessage}</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center">
            <p className="text-sm text-slate-500">{t.meetingNotes.noNotesForSession}</p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {selectedFilter === SESSION_FILTER_UNASSIGNED
                ? t.meetingNotes.noSession
                : sessionLabel(
                    typeof selectedFilter === 'number' ? selectedFilter : null
                  )}
              {' · '}
              {notes.length}{' '}
              {notes.length === 1
                ? t.meetingNotes.noteSingular
                : t.meetingNotes.notePlural}
            </p>
            {notes.map((note) => {
              const expanded = expandedId === note.id;
              const long = note.content.length > 220;
              const body =
                long && !expanded
                  ? `${note.content.slice(0, 220)}…`
                  : note.content;
              return (
                <article
                  key={note.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {note.createdByName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatNoteDateTime(note.createdAt)}
                      </p>
                    </div>
                    {(onEditNote || onDeleteNote) && (
                      <div className="flex shrink-0 gap-0.5">
                        {onEditNote && (
                          <button
                            type="button"
                            title={t.common.edit}
                            onClick={() => onEditNote(note)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                        )}
                        {onDeleteNote && (
                          <button
                            type="button"
                            title={t.common.delete}
                            onClick={() => onDeleteNote(note)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                    {body}
                  </p>
                  {long && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expanded ? null : note.id)
                      }
                      className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700"
                    >
                      {expanded ? t.meetingNotes.showLess : t.meetingNotes.showMore}
                    </button>
                  )}
                </article>
              );
            })}
          </>
        )}
      </div>
    </>
  );

  if (isDrawer) {
    return (
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          className: 'flex w-full max-w-md flex-col sm:max-w-lg',
        }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <div className="flex min-h-[28rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {content}
    </div>
  );
};

export default MeetingNotesSessionRail;
