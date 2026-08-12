import React from 'react';
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
  onUpdateProfile?: () => void;
}

const QuickPanel: React.FC<QuickPanelProps> = (props) => (
  <div className="flex flex-col gap-4">
    <div className="order-2 lg:order-1">
      <AppointmentList
        appointments={props.appointments}
        loading={props.loading}
        onViewCalendar={props.onViewCalendar}
      />
    </div>
    <div className="order-1 lg:order-2">
      <QuickActions
        onRaportCaz={props.onRaportCaz}
        onSchedule={props.onSchedule}
        onAddCase={props.onAddCase}
        onUpdateProfile={props.onUpdateProfile}
      />
    </div>
    <div className="order-3">
      <AlertsPanel cases={props.cases} sessionReportCounts={props.sessionReportCounts} />
    </div>
  </div>
);

export default QuickPanel;
