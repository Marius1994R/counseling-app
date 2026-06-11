import React, { useMemo } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Case } from '../../types';

interface AlertsPanelProps {
  cases: Case[];
  sessionReportCounts: Record<string, number>;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ cases, sessionReportCounts }) => {
  const alerts = useMemo(() => {
    const items: string[] = [];
    const now = Date.now();
    const threeDays = 3 * 24 * 60 * 60 * 1000;
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    cases
      .filter((c) => c.status === 'waiting')
      .forEach((c) => {
        if (now - c.createdAt.getTime() > threeDays) {
          items.push(`Cazul „${c.counseledName}” așteaptă de peste 3 zile`);
        }
      });

    cases
      .filter((c) => c.status === 'active')
      .forEach((c) => {
        const reportCount = sessionReportCounts[c.id] ?? 0;
        if (reportCount === 0 && now - c.updatedAt.getTime() > fourteenDays) {
          items.push(`Lipsește raportul pentru „${c.counseledName}”`);
        }
      });

    return items.slice(0, 3);
  }, [cases, sessionReportCounts]);

  if (alerts.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ExclamationTriangleIcon className="h-4 w-4 text-amber-600" />
        <h3 className="text-sm font-semibold text-amber-900">Atenție</h3>
      </div>
      <ul className="space-y-1.5">
        {alerts.map((alert) => (
          <li key={alert} className="text-xs text-amber-800">
            {alert}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default AlertsPanel;
