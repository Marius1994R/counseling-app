import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { Appointment, Case } from '../../types';
import AppointmentList from './AppointmentList';
import QuickActions from './QuickActions';
import AlertsPanel from './AlertsPanel';

interface QuickPanelProps {
  appointments: Appointment[];
  cases: Case[];
  sessionReportCounts: Record<string, number>;
  loading?: boolean;
  onViewCalendar: () => void;
  onRaportCaz: () => void;
  onSchedule: () => void;
  onAddCase?: () => void;
  onAddNote?: () => void;
  onUpdateProfile?: () => void;
}

const QuickPanel: React.FC<QuickPanelProps> = (props) => {
  const [open, setOpen] = useState(true);

  const content = (
    <div className="space-y-4">
      <AppointmentList
        appointments={props.appointments}
        loading={props.loading}
        onViewCalendar={props.onViewCalendar}
      />
      <QuickActions
        onRaportCaz={props.onRaportCaz}
        onSchedule={props.onSchedule}
        onAddCase={props.onAddCase}
        onAddNote={props.onAddNote}
        onUpdateProfile={props.onUpdateProfile}
      />
      <AlertsPanel cases={props.cases} sessionReportCounts={props.sessionReportCounts} />
    </div>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mb-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm"
        >
          Panou rapid
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        {open && content}
      </div>
      <div className="hidden space-y-4 lg:block">{content}</div>
    </>
  );
};

export default QuickPanel;
