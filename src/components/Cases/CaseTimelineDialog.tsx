import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Case } from '../../types';
import { useCaseTimeline } from '../../hooks/useCaseTimeline';
import {
  CaseTimelineItem,
  formatTimelineDate,
  getTimelineDotClass,
} from './caseTimelineUtils';
import { t } from '../../utils/translations';

interface CaseTimelineDialogProps {
  open: boolean;
  onClose: () => void;
  caseItem: Case | null;
  onOpenNotes?: () => void;
}

const CaseTimelineDialog: React.FC<CaseTimelineDialogProps> = ({
  open,
  onClose,
  caseItem,
  onOpenNotes,
}) => {
  const navigate = useNavigate();
  const { items, loading, error, loadTimeline, reset } = useCaseTimeline();

  useEffect(() => {
    if (open && caseItem) {
      void loadTimeline(caseItem);
    }
    if (!open) {
      reset();
    }
  }, [open, caseItem, loadTimeline, reset]);

  const handleItemAction = (item: CaseTimelineItem) => {
    if (!caseItem) return;

    if (item.kind === 'note' && onOpenNotes) {
      onOpenNotes();
      return;
    }
    if (item.kind === 'report') {
      onClose();
      navigate(`/session-reports?caseId=${caseItem.id}`);
      return;
    }
    if (item.kind === 'appointment') {
      onClose();
      navigate('/calendar');
    }
  };

  const actionLabel = (item: CaseTimelineItem): string | null => {
    if (item.kind === 'note' && onOpenNotes) return t.caseTimeline.openNotes;
    if (item.kind === 'report') return t.caseTimeline.openReports;
    if (item.kind === 'appointment') return t.caseTimeline.openCalendar;
    return null;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t.caseTimeline.title}
        {caseItem ? (
          <span className="mt-1 block text-sm font-normal text-slate-500">
            {caseItem.counseledName} — {caseItem.title}
          </span>
        ) : null}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <div className="flex justify-center py-10">
            <CircularProgress size={32} sx={{ color: '#C99700' }} />
          </div>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{t.caseTimeline.empty}</p>
        ) : (
          <div className="relative space-y-5 py-2 pl-1">
            <div
              className="absolute bottom-2 left-[5px] top-2 w-px bg-slate-200"
              aria-hidden
            />
            {items.map((item) => {
              const label = actionLabel(item);
              const clickable = Boolean(label);

              return (
                <div key={item.id} className="relative flex gap-4">
                  <div
                    className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white ${getTimelineDotClass(item.kind)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    {item.summary ? (
                      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-500">
                        {item.summary}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                      <span>{formatTimelineDate(item.at)}</span>
                      {item.authorName ? (
                        <span>
                          {t.caseTimeline.byAuthor} {item.authorName}
                        </span>
                      ) : null}
                    </div>
                    {clickable ? (
                      <button
                        type="button"
                        onClick={() => handleItemAction(item)}
                        className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        {label}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t.common.close}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CaseTimelineDialog;
