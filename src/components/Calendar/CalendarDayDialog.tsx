import React, { useState } from 'react';
import { Drawer, IconButton, Link, Alert } from '@mui/material';
import { Edit, Delete, Close } from '@mui/icons-material';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Appointment, ChurchEvent } from '../../types';
import { t } from '../../utils/translations';
import {
  formatCalendarDate,
  formatTime,
  isDateTodayOrFuture,
  getRoomColorStyles,
  sortAppointmentsByTime,
} from './calendarUtils';
import {
  sortEventsByTime,
  getEventDisplayStyles,
  formatEventDateRange,
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
}: {
  accent: string;
  label: string;
  sub: string;
  actions?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg bg-slate-50"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>
        </div>
        {actions}
      </div>
      {extra ? <div className="border-t border-slate-100 px-3 pb-2.5 pt-2">{extra}</div> : null}
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

  React.useEffect(() => {
    if (deleteLoading) return;
    setLocalAppointments(appointments);
    setLocalEvents(events);
  }, [appointments, events, deleteLoading]);

  const sortedAppointments = sortAppointmentsByTime(localAppointments);
  const sortedEvents = sortEventsByTime(localEvents);
  const eventStyles = getEventDisplayStyles();
  const isEmpty = sortedAppointments.length === 0 && sortedEvents.length === 0;
  const showCreateActions = Boolean(selectedDate && isDateTodayOrFuture(selectedDate));

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || deleteLoading) return;
    const target = deleteTarget;
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
              const timeLabel = `${formatTime(appointment.startTime)} ${title}`;
              const subParts = [
                appointment.room || null,
                canViewCaseDetails(appointment) ? appointment.counselorName : null,
              ].filter(Boolean);
              const showActions = canEdit(appointment) || canDelete(appointment);
              const showDescription =
                canViewCaseDetails(appointment) && Boolean(appointment.description);

              return (
                <SoftBar
                  key={`appt-${appointment.id}`}
                  accent={roomColors.accent}
                  label={timeLabel}
                  sub={
                    subParts.length > 0
                      ? subParts.join(' · ')
                      : `${formatTime(appointment.startTime)} – ${formatTime(appointment.endTime)}`
                  }
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
                    showDescription ? (
                      <p className="text-xs text-slate-500">{appointment.description}</p>
                    ) : undefined
                  }
                />
              );
            })}

            {sortedEvents.map((event) => {
              const hasDetails = Boolean(event.description || event.registrationUrl);

              return (
                <SoftBar
                  key={`event-${event.id}`}
                  accent={eventStyles.accent}
                  label={`${event.startTime} ${event.name}`}
                  sub={`Eveniment · ${formatEventDateRange(event)}`}
                  actions={
                    canManageEvents ? (
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
                          <p className="text-xs text-slate-500">{event.description}</p>
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
