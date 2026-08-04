import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, BellIcon } from '@heroicons/react/24/outline';
import { useEvents } from '../../contexts/EventsContext';
import { AttentionNotification } from '../../hooks/useAttentionNotifications';
import { ActivityRecord } from '../Dashboard/dashboardUtils';
import { t } from '../../utils/translations';
import {
  formatEventDateRange,
  formatEventTimeRange,
  getEventDisplayStyles,
} from '../Calendar/eventUtils';

const ANIMATION_MS = 180;

interface NotificationsPanelProps {
  open: boolean;
  onClose: () => void;
  items: AttentionNotification[];
  onDismiss: (id: string) => Promise<void>;
  onOpenAssignment: (activity: ActivityRecord) => void;
  onDismissAssignment: (activityId: string) => Promise<void>;
}

const accentForType = (
  type: AttentionNotification['type'],
  eventAccent: string
): string => {
  switch (type) {
    case 'event':
      return eventAccent;
    case 'assignment':
      return '#C99700';
    case 'assignment_outcome':
      return '#059669';
    case 'appointment':
      return '#2563EB';
    case 'stale_report':
      return '#D97706';
    case 'monthly_report':
      return '#7C3AED';
    default:
      return '#94A3B8';
  }
};

const typeLabel = (type: AttentionNotification['type']): string => {
  switch (type) {
    case 'event':
      return t.notifications.typeEvent;
    case 'assignment':
      return t.notifications.typeAssignment;
    case 'assignment_outcome':
      return t.notifications.typeProposalOutcome;
    case 'appointment':
      return t.notifications.typeAppointment;
    case 'stale_report':
      return t.notifications.typeStaleReport;
    case 'monthly_report':
      return t.notifications.typeMonthlyReport;
    default:
      return '';
  }
};

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  open,
  onClose,
  items,
  onDismiss,
  onOpenAssignment,
  onDismissAssignment,
}) => {
  const { markEventsAsRead } = useEvents();
  const navigate = useNavigate();
  const eventStyles = getEventDisplayStyles();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(id);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), ANIMATION_MS);
    return () => window.clearTimeout(timeout);
  }, [open]);

  const markEventRead = async (eventId: string) => {
    await markEventsAsRead([eventId]);
  };

  const handleRegistrationClick = async (
    e: React.MouseEvent,
    item: AttentionNotification
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const event = item.payload.event;
    if (!event?.registrationUrl) return;
    await markEventRead(event.id);
    window.open(event.registrationUrl, '_blank', 'noopener,noreferrer');
  };

  const handleItemClick = async (item: AttentionNotification) => {
    if (item.type === 'event' && item.payload.event) {
      const event = item.payload.event;
      onClose();
      const d = event.startDate;
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      navigate(`/calendar?date=${y}-${m}-${day}`);
      void markEventRead(event.id);
      return;
    }

    if (item.type === 'assignment' && item.payload.activity) {
      const activity = item.payload.activity;
      onClose();

      // Proposals: open Accept/Refuse dialog; do not dismiss until action.
      if (activity.type === 'case_proposed') {
        onOpenAssignment(activity);
        return;
      }

      // Force-assign: go to the case, then clear the bell item.
      const caseId = activity.metadata?.caseId
        ? String(activity.metadata.caseId)
        : '';
      if (caseId) {
        navigate(`/cases?caseId=${caseId}`);
      }
      void onDismissAssignment(activity.id);
      return;
    }

    if (item.type === 'assignment_outcome' && item.payload.activity) {
      const activity = item.payload.activity;
      onClose();
      navigate('/admin?tab=2');
      void onDismissAssignment(activity.id);
      return;
    }

    if (item.type === 'appointment' && item.payload.appointment) {
      const apt = item.payload.appointment;
      onClose();
      const d = new Date(apt.date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      navigate(`/calendar?date=${y}-${m}-${day}`);
      void onDismiss(item.id);
      return;
    }

    if (item.type === 'stale_report' && item.payload.caseItem) {
      const caseId = item.payload.caseItem.id;
      onClose();
      navigate(`/cases?caseId=${caseId}`);
      void onDismiss(item.id);
      return;
    }

    if (item.type === 'monthly_report') {
      onClose();
      navigate('/monthly-report');
      void onDismiss(item.id);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={[
        'absolute right-0 top-full z-50 mt-1.5 flex w-[min(20rem,calc(100vw-1rem))] origin-top-right flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-[opacity,transform] ease-out sm:w-[22rem]',
        visible
          ? 'translate-y-0 scale-100 opacity-100'
          : 'pointer-events-none -translate-y-1 scale-95 opacity-0',
      ].join(' ')}
      style={{ transitionDuration: `${ANIMATION_MS}ms` }}
      role="dialog"
      aria-modal="false"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BellIcon className="h-5 w-5 shrink-0 text-brand-600" />
            <h2 className="text-sm font-semibold text-slate-900">{t.notifications.title}</h2>
          </div>
          {items.length > 0 && (
            <p className="mt-0.5 pl-7 text-xs text-slate-500">{t.notifications.subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label={t.common.close}
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain sm:max-h-[min(28rem,70vh)]">
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">{t.notifications.empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full flex-col items-start px-4 py-3 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
                  style={{
                    borderLeft: `3px solid ${accentForType(item.type, eventStyles.accent)}`,
                  }}
                  onClick={() => {
                    void handleItemClick(item);
                  }}
                >
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                    {typeLabel(item.type)}
                  </span>
                  <span className="mt-1.5 text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-0.5 text-xs leading-relaxed text-slate-500">{item.detail}</span>

                  {item.type === 'event' && item.payload.event && (
                    <div className="mt-2 w-full space-y-1.5">
                      <p className="text-xs text-slate-500">
                        {formatEventDateRange(item.payload.event)} ·{' '}
                        {formatEventTimeRange(item.payload.event)}
                      </p>
                      {item.payload.event.description && (
                        <p className="line-clamp-2 text-xs text-slate-500">
                          {item.payload.event.description}
                        </p>
                      )}
                      {item.payload.event.registrationUrl && (
                        <>
                          <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                            {t.events.registrationMandatory}
                          </p>
                          <a
                            href={item.payload.event.registrationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-xs font-medium text-brand-700 hover:underline"
                            onClick={(e) => {
                              void handleRegistrationClick(e, item);
                            }}
                          >
                            {t.events.registrationLink}
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPanel;
