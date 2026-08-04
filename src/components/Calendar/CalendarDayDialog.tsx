import React, { useState } from 'react';
import { Drawer, IconButton, Link, Alert } from '@mui/material';
import { Edit, Delete, Close } from '@mui/icons-material';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Appointment, ChurchEvent } from '../../types';
import { t } from '../../utils/translations';
import {
  formatCalendarDate,
  formatTimeRange,
  isDateTodayOrFuture,
  getRoomColorStyles,
  sortAppointmentsByTime,
} from './calendarUtils';
import {
  sortEventsByTime,
  getEventDisplayStyles,
  formatEventDateRange,
  formatEventTimeRange,
  isPastEvent,
} from './eventUtils';
import ConfirmDialog from '../common/ConfirmDialog';

interface CalendarDayDialogProps {
  selectedDate: Date | null;
  appointments: Appointment[];
  events: ChurchEvent[];
  /** Desktop: embedded panel. Mobile: slide-over drawer. */
  variant?: 'panel' | 'drawer';
  /** Drawer only: whether open */
  open?: boolean;
  onClose?: () => void;
  onEditAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (appointmentId: string) => void | Promise<void>;
  onScheduleAppointment: (date: Date) => void;
  onEditEvent: (event: ChurchEvent) => void;
  onDeleteEvent: (eventId: string) => void | Promise<void>;
  onAddEvent: (date: Date) => void;
  canEdit: (appointment: Appointment) => boolean;
  canDelete: (appointment: Appointment) => boolean;
  canManageEvents: boolean;
  canViewCaseDetails?: (appointment: Appointment) => boolean;
}

type DeleteTarget =
  | { kind: 'appointment'; item: Appointment }
  | { kind: 'event'; item: ChurchEvent };

function daySummaryLabel(appointmentCount: number, eventCount: number): string {
  if (appointmentCount === 0 && eventCount === 0) {
    return t.appointments.noAppointmentsDay;
  }
  const parts: string[] = [];
  if (appointmentCount > 0) {
    parts.push(
      `${appointmentCount} ${appointmentCount === 1 ? 'ședință' : 'ședințe'}`
    );
  }
  if (eventCount > 0) {
    parts.push(
      `${eventCount} ${eventCount === 1 ? 'eveniment' : 'evenimente'}`
    );
  }
  return parts.join(' · ');
}

function SoftBar({
  accent,
  label,
  sub,
  actions,
  extra,
  labelExpanded,
  onToggleLabel,
}: {
  accent: string;
  label: string;
  sub?: string;
  actions?: React.ReactNode;
  extra?: React.ReactNode;
  labelExpanded?: boolean;
  onToggleLabel?: () => void;
}) {
  const labelNeedsExpand = label.length > 72;

  return (
    <div
      className="rounded-lg bg-slate-50"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p
            className={`break-words text-sm font-semibold text-slate-900 ${
              labelNeedsExpand && !labelExpanded ? 'line-clamp-2' : ''
            }`}
          >
            {label}
          </p>
          {labelNeedsExpand && onToggleLabel ? (
            <button
              type="button"
              onClick={onToggleLabel}
              className="mt-0.5 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
            >
              {labelExpanded ? t.common.showLess : t.common.showMore}
            </button>
          ) : null}
          {sub ? (
            <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {extra ? <div className="border-t border-slate-100 px-3 pb-2.5 pt-2">{extra}</div> : null}
    </div>
  );
}

function ExpandableBody({
  text,
  expanded,
  onToggle,
  threshold = 160,
}: {
  text: string;
  expanded: boolean;
  onToggle: () => void;
  threshold?: number;
}) {
  const needsExpand = text.length > threshold;
  return (
    <div>
      <p
        className={`whitespace-pre-wrap break-words text-xs text-slate-500 ${
          needsExpand && !expanded ? 'line-clamp-3' : ''
        }`}
      >
        {text}
      </p>
      {needsExpand ? (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 text-xs font-semibold text-brand-600 transition hover:text-brand-700"
        >
          {expanded ? t.common.showLess : t.common.showMore}
        </button>
      ) : null}
    </div>
  );
}

const CalendarDayDialog: React.FC<CalendarDayDialogProps> = ({
  selectedDate,
  appointments,
  events,
  variant = 'panel',
  open = false,
  onClose,
  onEditAppointment,
  onDeleteAppointment,
  onScheduleAppointment,
  onEditEvent,
  onDeleteEvent,
  onAddEvent,
  canEdit,
  canDelete,
  canManageEvents,
  canViewCaseDetails = () => false,
}) => {
  const isDrawer = variant === 'drawer';
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [localAppointments, setLocalAppointments] = useState(appointments);
  const [localEvents, setLocalEvents] = useState(events);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  React.useEffect(() => {
    if (deleteLoading) return;
    setLocalAppointments(appointments);
    setLocalEvents(events);
  }, [appointments, events, deleteLoading]);

  React.useEffect(() => {
    setExpandedKeys(new Set());
  }, [selectedDate]);

  const toggleExpanded = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sortedAppointments = sortAppointmentsByTime(localAppointments);
  const sortedEvents = sortEventsByTime(localEvents);
  const eventStyles = getEventDisplayStyles();
  const isEmpty = sortedAppointments.length === 0 && sortedEvents.length === 0;
  const showCreateActions = Boolean(selectedDate && isDateTodayOrFuture(selectedDate));

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteLoading) return;
    const target = deleteTarget;
    if (target.kind === 'appointment' && !canEdit(target.item) && !canDelete(target.item)) {
      return;
    }
    if (target.kind === 'event' && isPastEvent(target.item)) {
      return;
    }
    try {
      setDeleteLoading(true);
      if (target.kind === 'appointment') {
        await onDeleteAppointment(target.item.id);
        setLocalAppointments((prev) => prev.filter((a) => a.id !== target.item.id));
      } else {
        await onDeleteEvent(target.item.id);
        setLocalEvents((prev) => prev.filter((e) => e.id !== target.item.id));
      }
      setDeleteTarget(null);
    } catch {
      // Parent shows snackbar; keep confirm open so the user can retry or cancel
    } finally {
      setDeleteLoading(false);
    }
  };

  const dayContent = (
    <>
      <div className="shrink-0 border-b border-slate-200 px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">
              {selectedDate ? formatCalendarDate(selectedDate) : '—'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {daySummaryLabel(sortedAppointments.length, sortedEvents.length)}
            </p>
          </div>
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

        {showCreateActions && selectedDate && (
          <div className="mt-4 flex flex-col gap-2">
            {canManageEvents && (
              <button
                type="button"
                onClick={() => onAddEvent(selectedDate)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-700 transition hover:bg-brand-50 active:scale-[0.98]"
              >
                <PlusIcon className="h-4 w-4" />
                {t.events.addEvent}
              </button>
            )}
            <button
              type="button"
              onClick={() => onScheduleAppointment(selectedDate)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]"
            >
              <PlusIcon className="h-4 w-4" />
              {t.appointments.scheduleAppointment}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-auto px-4 py-4">
        {isEmpty ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t.appointments.noAppointmentsDay}
          </p>
        ) : (
          <>
            {sortedAppointments.map((appointment) => {
              const roomColors = getRoomColorStyles(appointment.room);
              const title = canViewCaseDetails(appointment)
                ? appointment.caseTitle || appointment.title
                : appointment.counselorName || appointment.title;
              const timeLabel = `${title} · ${formatTimeRange(appointment.startTime, appointment.endTime)}`;
              const subParts = [
                appointment.room || null,
                canViewCaseDetails(appointment) ? appointment.counselorName : null,
              ].filter(Boolean);
              const showActions = canEdit(appointment) || canDelete(appointment);
              const showDescription =
                canViewCaseDetails(appointment) && Boolean(appointment.description);
              const titleKey = `appt-title-${appointment.id}`;
              const descKey = `appt-desc-${appointment.id}`;

              return (
                <SoftBar
                  key={`appt-${appointment.id}`}
                  accent={roomColors.accent}
                  label={timeLabel}
                  sub={subParts.length > 0 ? subParts.join(' · ') : undefined}
                  labelExpanded={expandedKeys.has(titleKey)}
                  onToggleLabel={() => toggleExpanded(titleKey)}
                  actions={
                    showActions ? (
                      <div className="flex shrink-0 gap-0.5">
                        {canEdit(appointment) && (
                          <IconButton
                            size="small"
                            onClick={() => onEditAppointment(appointment)}
                            aria-label="edit appointment"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        )}
                        {canDelete(appointment) && (
                          <IconButton
                            size="small"
                            onClick={() =>
                              setDeleteTarget({ kind: 'appointment', item: appointment })
                            }
                            aria-label="delete appointment"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </div>
                    ) : undefined
                  }
                  extra={
                    showDescription && appointment.description ? (
                      <ExpandableBody
                        text={appointment.description}
                        expanded={expandedKeys.has(descKey)}
                        onToggle={() => toggleExpanded(descKey)}
                      />
                    ) : undefined
                  }
                />
              );
            })}

            {sortedEvents.map((event) => {
              const hasDetails = Boolean(event.description || event.registrationUrl);
              const canModifyEvent = canManageEvents && !isPastEvent(event);
              const titleKey = `event-title-${event.id}`;
              const descKey = `event-desc-${event.id}`;
              const eventLabel = `${event.name} · ${formatEventTimeRange(event)}`;

              return (
                <SoftBar
                  key={`event-${event.id}`}
                  accent={eventStyles.accent}
                  label={eventLabel}
                  sub={`Eveniment · ${formatEventDateRange(event)}`}
                  labelExpanded={expandedKeys.has(titleKey)}
                  onToggleLabel={() => toggleExpanded(titleKey)}
                  actions={
                    canModifyEvent ? (
                      <div className="flex shrink-0 gap-0.5">
                        <IconButton
                          size="small"
                          onClick={() => onEditEvent(event)}
                          aria-label="edit event"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteTarget({ kind: 'event', item: event })}
                          aria-label="delete event"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </div>
                    ) : undefined
                  }
                  extra={
                    hasDetails ? (
                      <div className="space-y-2">
                        {event.description ? (
                          <ExpandableBody
                            text={event.description}
                            expanded={expandedKeys.has(descKey)}
                            onToggle={() => toggleExpanded(descKey)}
                          />
                        ) : null}
                        {event.registrationUrl ? (
                          <>
                            <Alert severity="warning" className="rounded-lg" sx={{ py: 0.5 }}>
                              {t.events.registrationMandatory}
                            </Alert>
                            <Link
                              href={event.registrationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              variant="body2"
                              className="text-sm"
                            >
                              {t.events.registrationLink}
                            </Link>
                          </>
                        ) : null}
                      </div>
                    ) : undefined
                  }
                />
              );
            })}
          </>
        )}
      </div>
    </>
  );

  const confirmDialog = (
    <ConfirmDialog
      open={deleteTarget !== null}
      title={
        deleteTarget?.kind === 'event'
          ? t.events.deleteEvent
          : t.appointments.deleteAppointment
      }
      message={
        deleteTarget?.kind === 'event'
          ? t.events.deleteConfirm.replace('{name}', deleteTarget.item.name)
          : t.deleteWarnings.deleteAppointmentConfirm.replace(
              '{title}',
              deleteTarget?.kind === 'appointment' ? deleteTarget.item.title : ''
            )
      }
      variant="danger"
      loading={deleteLoading}
      onClose={() => {
        if (!deleteLoading) setDeleteTarget(null);
      }}
      onConfirm={handleDeleteConfirm}
    />
  );

  if (isDrawer) {
    return (
      <>
        <Drawer
          anchor="right"
          open={open}
          onClose={onClose}
          PaperProps={{
            sx: {
              width: '100%',
              maxWidth: 420,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: '#fff',
            },
          }}
        >
          {dayContent}
        </Drawer>
        {confirmDialog}
      </>
    );
  }

  return (
    <>
      <aside className="flex h-full min-h-[28rem] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {dayContent}
      </aside>
      {confirmDialog}
    </>
  );
};

export default CalendarDayDialog;
