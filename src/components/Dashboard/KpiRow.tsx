import React from 'react';
import {
  BellAlertIcon,
  PencilSquareIcon,
  ClipboardDocumentListIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import KpiCard from './KpiCard';
import { t } from '../../utils/translations';

interface KpiRowProps {
  metrics: {
    reportsNeeded: number;
    casesWithoutConsent: number;
    frequencyOverdue: number;
    activeCases: number;
  };
  loading?: boolean;
  onReportsClick?: () => void;
  onConsentClick?: () => void;
  onFrequencyClick?: () => void;
  onActiveClick?: () => void;
}

const KpiRow: React.FC<KpiRowProps> = ({
  metrics,
  loading,
  onReportsClick,
  onConsentClick,
  onFrequencyClick,
  onActiveClick,
}) => (
  <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
    <KpiCard
      label="Rapoarte necesare"
      value={metrics.reportsNeeded}
      icon={<ClipboardDocumentListIcon className="h-4 w-4" />}
      variant="warning"
      trendText={
        metrics.reportsNeeded === 0 ? 'Totul este la zi' : 'Cazuri ce cer raport'
      }
      badgeCount={metrics.reportsNeeded}
      onClick={onReportsClick}
      loading={loading}
    />
    <KpiCard
      label="Fără consimțământ"
      value={metrics.casesWithoutConsent}
      icon={<PencilSquareIcon className="h-4 w-4" />}
      variant="danger"
      trendText={
        metrics.casesWithoutConsent === 0 ? 'Totul este încărcat' : 'Cazuri fără document'
      }
      badgeCount={metrics.casesWithoutConsent}
      onClick={onConsentClick}
      loading={loading}
    />
    <KpiCard
      label="Frecvență depășită"
      value={metrics.frequencyOverdue}
      icon={<BellAlertIcon className="h-4 w-4" />}
      variant="info"
      trendText={
        metrics.frequencyOverdue === 0 ? 'Nicio întârziere' : 'Cazuri peste ritmul setat'
      }
      badgeCount={metrics.frequencyOverdue}
      onClick={onFrequencyClick}
      loading={loading}
    />
    <KpiCard
      label={t.dashboard.activeCases}
      value={metrics.activeCases}
      icon={<FolderIcon className="h-4 w-4" />}
      variant="success"
      trendText="Cazuri în desfășurare"
      onClick={onActiveClick}
      loading={loading}
    />
  </div>
);

export default KpiRow;
