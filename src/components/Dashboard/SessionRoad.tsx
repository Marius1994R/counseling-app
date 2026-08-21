import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '@mui/material';
import { Appointment } from '../../types';
import {
  buildSessionRoad,
  formatNextAppointmentChipLabel,
  SessionRoadNode,
  SESSION_ROAD_EXPANDED_NODES,
} from './dashboardUtils';
import { t } from '../../utils/translations';

interface SessionRoadProps {
  reportCount: number;
  nextAppointment?: Appointment;
  /** Upcoming appointments for this case, keyed by road session number. */
  appointmentBySession?: Record<number, Appointment>;
  /** Opens the report of a finished session, by road session number. */
  onOpenReport?: (session: number) => void;
  onAddReport?: () => void;
  onSchedule?: (session: number) => void;
}

type BubbleAction = {
  key: string;
  label: string;
  variant: 'primary' | 'secondary' | 'ghost';
  onClick: () => void;
};

type BubbleContent = {
  title: string;
  meta?: string;
  /** Info-only bubble: muted copy, no emphasis on the title. */
  quiet?: boolean;
  actions: BubbleAction[];
};

const nodeStateClass: Record<SessionRoadNode['state'], string> = {
  done: 'bg-brand-600 text-white ring-brand-200',
  next: 'border-[1.5px] border-brand-600 bg-brand-50 text-brand-700 ring-brand-200',
  open: 'border-[1.5px] border-slate-200 bg-white text-slate-400 ring-slate-200',
};

const nodeStateLabel: Record<SessionRoadNode['state'], string> = {
  done: t.dashboard.sessionRoadNodeDone,
  next: t.dashboard.sessionRoadNodeNext,
  open: t.dashboard.sessionRoadNodeOpen,
};

const actionClass: Record<BubbleAction['variant'], string> = {
  primary:
    'rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-brand-700 active:scale-[0.98]',
  secondary:
    'rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]',
  ghost:
    'rounded-lg px-1 py-1 text-xs font-medium text-brand-600 transition hover:underline',
};

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 100;

const SessionRoad: React.FC<SessionRoadProps> = ({
  reportCount,
  nextAppointment,
  appointmentBySession,
  onOpenReport,
  onAddReport,
  onSchedule,
}) => {
  const { hiddenDone, nodes, nextSession, capacity } = buildSessionRoad(reportCount);
  const compressed = capacity >= SESSION_ROAD_EXPANDED_NODES;
  const nodeSize = compressed ? 'h-[18px] w-[18px] text-[9px]' : 'h-[22px] w-[22px] text-[10px]';
  // Pointer capability, not viewport width: touch laptops and tablets with a
  // keyboard would otherwise be stuck with hover-only content.
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)', { noSsr: true });
  const [openSession, setOpenSession] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);

  const cancelOpen = useCallback(() => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      cancelOpen();
      cancelClose();
    },
    [cancelOpen, cancelClose]
  );

  useEffect(() => {
    setOpenSession(null);
  }, [canHover, reportCount]);

  // Tap outside closes the bubble, which also keeps a single bubble open across
  // the dashboard: tapping a node in another card dismisses this one.
  useEffect(() => {
    if (canHover || openSession === null) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpenSession(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [canHover, openSession]);

  const reportsLabel =
    reportCount === 1 ? t.sessionReports.reportSingular : t.sessionReports.reportPlural;
  const caption = t.dashboard.sessionRoadCaption
    .replace('{count}', String(reportCount))
    .replace('{reports}', reportsLabel)
    .replace('{next}', String(nextSession));

  /** The meeting booked for this exact node, if any. */
  const bookedAppointmentFor = (node: SessionRoadNode): Appointment | undefined => {
    const labelled = appointmentBySession?.[node.session];
    if (labelled) return labelled;
    // Appointments saved before sessions were labelled carry no number: treat the
    // earliest upcoming one as the next session's meeting.
    if (
      node.session === nextSession &&
      nextAppointment &&
      typeof nextAppointment.sessionNumber !== 'number'
    ) {
      return nextAppointment;
    }
    return undefined;
  };

  const buildBubble = (node: SessionRoadNode): BubbleContent => {
    const booked = node.state === 'done' ? undefined : bookedAppointmentFor(node);
    const scheduledLabel = booked
      ? t.dashboard.sessionRoadScheduledFor.replace(
          '{when}',
          formatNextAppointmentChipLabel(booked)
        )
      : undefined;
    const actions: BubbleAction[] = [];

    if (node.state === 'next' && onAddReport) {
      actions.push({
        key: 'report',
        label: t.sessionReports.addReport,
        variant: 'primary',
        onClick: onAddReport,
      });
    }
    // This session already has its own meeting booked: don't invite a second one.
    if (node.state !== 'done' && !booked && onSchedule) {
      actions.push({
        key: 'schedule',
        label: t.dashboard.sessionRoadScheduleCta,
        variant: actions.length > 0 ? 'secondary' : 'primary',
        onClick: () => onSchedule(node.session),
      });
    }
    // On touch the tap opens the bubble, so the report needs its own row.
    if (!canHover && node.state === 'done' && onOpenReport) {
      actions.push({
        key: 'report-link',
        label: t.dashboard.sessionRoadOpenReport,
        variant: 'ghost',
        onClick: () => onOpenReport(node.session),
      });
    }

    if (node.state === 'done') {
      return { title: t.dashboard.sessionRoadDoneTooltip, quiet: true, actions };
    }
    if (node.state === 'next') {
      return {
        title: t.dashboard.sessionRoadNextTitle.replace('{n}', String(node.session)),
        meta: scheduledLabel ?? t.dashboard.sessionRoadNoAppointment,
        actions,
      };
    }
    // Only a meeting booked for this very session shows a date here.
    return {
      title: t.dashboard.sessionRoadFutureTitle.replace('{n}', String(node.session)),
      meta: scheduledLabel ?? t.dashboard.sessionRoadUnscheduled,
      actions,
    };
  };

  const renderBubble = (node: SessionRoadNode, index: number) => {
    const bubble = buildBubble(node);
    const anchored = canHover;
    const caretClass =
      index <= 1 ? 'left-2' : index >= nodes.length - 2 ? 'right-2' : 'left-1/2 -ml-1';

    return (
      <div
        className="relative w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-lg"
        onMouseEnter={anchored ? cancelClose : undefined}
      >
        {anchored && (
          <span
            aria-hidden
            className={`absolute -top-1 h-2 w-2 rotate-45 border-l border-t border-slate-200 bg-white ${caretClass}`}
          />
        )}
        <p
          className={`text-xs ${
            bubble.quiet ? 'text-slate-600' : 'font-semibold text-slate-900'
          }`}
        >
          {bubble.title}
        </p>
        {bubble.meta && <p className="mt-1 text-xs text-slate-400">{bubble.meta}</p>}
        {bubble.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {bubble.actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => {
                  setOpenSession(null);
                  action.onClick();
                }}
                className={actionClass[action.variant]}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderNode = (node: SessionRoadNode, index: number) => {
    const label = `${t.sessionReports.sessionNumber} ${node.session} · ${nodeStateLabel[node.state]}`;
    const isOpen = openSession === node.session;
    const alignClass =
      index <= 1 ? 'left-0' : index >= nodes.length - 2 ? 'right-0' : 'left-1/2 -translate-x-1/2';
    // Touch: keep the dot at its size but push the hit area to the midpoint
    // between neighbours, without shifting the row.
    const hitAreaClass = canHover
      ? ''
      : `before:absolute before:-inset-y-2 before:content-[''] ${
          compressed ? 'before:-inset-x-px' : 'before:-inset-x-[2px]'
        }`;

    return (
      <span
        className={`relative flex shrink-0 ${isOpen && canHover ? 'z-20' : 'z-0'}`}
        onMouseEnter={
          canHover
            ? () => {
                cancelClose();
                cancelOpen();
                openTimer.current = window.setTimeout(
                  () => setOpenSession(node.session),
                  OPEN_DELAY_MS
                );
              }
            : undefined
        }
        onMouseLeave={
          canHover
            ? () => {
                cancelOpen();
                cancelClose();
                closeTimer.current = window.setTimeout(() => setOpenSession(null), CLOSE_DELAY_MS);
              }
            : undefined
        }
        onFocus={canHover ? () => setOpenSession(node.session) : undefined}
        onBlur={
          canHover
            ? (event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setOpenSession(null);
                }
              }
            : undefined
        }
      >
        <button
          type="button"
          onClick={() => {
            if (!canHover) {
              setOpenSession((current) => (current === node.session ? null : node.session));
              return;
            }
            // Only a finished session leads somewhere: its own report.
            if (node.state === 'done') onOpenReport?.(node.session);
          }}
          aria-label={label}
          aria-expanded={canHover ? undefined : isOpen}
          className={`relative flex shrink-0 items-center justify-center rounded-full font-semibold transition duration-150 ease-out focus-visible:outline-none ${nodeSize} ${
            nodeStateClass[node.state]
          } ${hitAreaClass} ${isOpen ? 'scale-[1.35] ring-2' : ''} ${
            canHover
              ? `hover:scale-[1.35] hover:ring-2 ${
                  node.state === 'done' && onOpenReport ? 'cursor-pointer' : 'cursor-default'
                }`
              : ''
          } focus-visible:scale-[1.35] focus-visible:ring-2`}
        >
          {node.session}
        </button>
        {canHover && isOpen && (
          <span className={`absolute top-full ${alignClass} block w-max max-w-[15rem] pt-2`}>
            {renderBubble(node, index)}
          </span>
        )}
      </span>
    );
  };

  const openNode = openSession === null ? null : nodes.find((n) => n.session === openSession);
  const openNodeIndex = openNode ? nodes.indexOf(openNode) : -1;

  return (
    <div
      ref={containerRef}
      role="group"
      aria-label={caption}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && openSession !== null) {
          event.stopPropagation();
          setOpenSession(null);
        }
      }}
    >
      <div className={`flex min-w-0 items-center ${compressed ? 'gap-0.5' : 'gap-1'}`}>
        {hiddenDone > 0 && (
          <span
            className="shrink-0 pr-0.5 text-[10px] font-semibold text-slate-400"
            title={t.dashboard.sessionRoadHiddenDone.replace('{n}', String(hiddenDone))}
          >
            +{hiddenDone}
          </span>
        )}
        {nodes.map((node, index) => (
          <React.Fragment key={`${node.state}-${node.session}`}>
            {renderNode(node, index)}
            {index < nodes.length - 1 && (
              <span
                className={`h-0.5 min-w-[6px] flex-1 rounded-full ${
                  node.state === 'done' && nodes[index + 1].state === 'done'
                    ? 'bg-brand-600'
                    : node.state === 'done'
                      ? 'bg-brand-200'
                      : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
        <span
          aria-hidden
          className="mx-1 h-0.5 min-w-[16px] flex-1 rounded-full bg-gradient-to-r from-slate-200 to-transparent"
        />
        <span aria-hidden className="flex shrink-0 items-center gap-[3px] pr-0.5">
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className="h-[3px] w-[3px] rounded-full bg-slate-200" />
          <span className="h-[2px] w-[2px] rounded-full bg-slate-200" />
        </span>
      </div>
      {!canHover && openNode && (
        <div className="absolute inset-x-0 top-full z-20 pt-2">
          {renderBubble(openNode, openNodeIndex)}
        </div>
      )}
    </div>
  );
};

export default SessionRoad;
