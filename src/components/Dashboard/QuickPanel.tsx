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
      onUpdateProfile={props.onUpdateProfile}
    />
    <AlertsPanel cases={props.cases} sessionReportCounts={props.sessionReportCounts} />
  </div>
);

export default QuickPanel;
