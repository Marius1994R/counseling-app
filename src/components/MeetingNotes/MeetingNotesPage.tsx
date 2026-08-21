import React, { useCallback, useState } from 'react';
import { Alert, useMediaQuery, useTheme } from '@mui/material';
import { deleteDoc, doc } from 'firebase/firestore';
import { useMeetingNotesData } from '../../hooks/useMeetingNotesData';
import { db } from '../../firebase';
import { MeetingNote } from '../../types';
import ConfirmDialog from '../common/ConfirmDialog';
import MeetingNotesToolbar from './MeetingNotesToolbar';
import MeetingNotesCaseList from './MeetingNotesCaseList';
import MeetingNotesSessionRail from './MeetingNotesSessionRail';
import MeetingNoteFormDialog from './MeetingNoteFormDialog';
import { t } from '../../utils/translations';

const MeetingNotesSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
    <div className="h-[28rem] animate-pulse rounded-xl bg-slate-100" />
    <div className="h-[28rem] animate-pulse rounded-xl bg-slate-100" />
  </div>
);

const MeetingNotesPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('lg'), { noSsr: true });
  const data = useMeetingNotesData();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MeetingNote | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openAdd = useCallback(() => {
    if (!data.selectedSummary) return;
    setEditingNote(null);
    setFormOpen(true);
  }, [data.selectedSummary]);

  const openEdit = useCallback((note: MeetingNote) => {
    setEditingNote(note);
    setFormOpen(true);
  }, []);

  const handleSelectCase = useCallback(
    (caseId: string) => {
      data.selectCase(caseId);
      setMobileOpen(true);
    },
    [data]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      await deleteDoc(doc(db, 'meetingNotes', deleteTarget.id));
      setDeleteTarget(null);
      await data.refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (data.loading) {
    return (
      <div>
        <MeetingNotesSkeleton />
      </div>
    );
  }

  const railProps = {
    summary: data.selectedSummary,
    sessionFilters: data.sessionRailFilters,
    selectedFilter: data.selectedSessionFilter,
    onSelectFilter: data.setSelectedSessionFilter,
    onAddNote: data.selectedSummary ? openAdd : undefined,
    onEditNote: openEdit,
    onDeleteNote: (note: MeetingNote) => setDeleteTarget(note),
  };

  return (
    <div>
      {data.error && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {data.error}
        </Alert>
      )}

      <MeetingNotesToolbar
        searchTerm={data.searchTerm}
        onSearchChange={data.setSearchTerm}
        statusFilter={data.statusFilter}
        onStatusFilterChange={data.setStatusFilter}
        filteredCount={data.filteredSummaries.length}
      />

      <div
        className={
          isMobile
            ? ''
            : 'grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr] lg:items-start'
        }
      >
        <MeetingNotesCaseList
          summaries={data.filteredSummaries}
          selectedCaseId={data.selectedCaseId}
          onSelectCase={handleSelectCase}
        />
        {!isMobile && <MeetingNotesSessionRail variant="panel" {...railProps} />}
      </div>

      {isMobile && (
        <MeetingNotesSessionRail
          variant="drawer"
          open={mobileOpen && Boolean(data.selectedSummary)}
          onClose={() => setMobileOpen(false)}
          {...railProps}
        />
      )}

      <MeetingNoteFormDialog
        open={formOpen}
        caseItem={data.selectedSummary?.case ?? null}
        reportCount={data.reportCountForSelected}
        editingNote={editingNote}
        onClose={() => {
          setFormOpen(false);
          setEditingNote(null);
        }}
        onSaved={() => {
          void data.refetch();
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t.meetingNotes.deleteNote}
        message={t.meetingNotes.deleteNoteConfirm}
        variant="danger"
        loading={deleteLoading}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default MeetingNotesPage;
