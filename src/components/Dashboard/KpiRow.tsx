import React from 'react';
import {
  FolderIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import KpiCard from './KpiCard';
import { t } from '../../utils/translations';

interface KpiRowProps {
  metrics: {
    activeCases: number;
    completedCases: number;
    pendingCases: number;
    totalCases: number;
  };
  loading?: boolean;
  onActiveClick?: () => void;
  onPendingClick?: () => void;
}

const KpiRow: React.FC<KpiRowProps> = ({ metrics, loading, onActiveClick, onPendingClick }) => (
  <div className="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
    <KpiCard
      label={t.dashboard.activeCases}
      value={metrics.activeCases}
      icon={<FolderIcon className="h-5 w-5" />}
      variant="primary"
      trendText="Cazuri în desfășurare"
      onClick={onActiveClick}
      loading={loading}
    />
    <KpiCard
      label={t.dashboard.completedCases}
      value={metrics.completedCases}
      icon={<CheckCircleIcon className="h-5 w-5" />}
      variant="success"
      trendText={metrics.completedCases === 0 ? 'Nicio finalizare' : 'Finalizate cu succes'}
      loading={loading}
    />
    <KpiCard
      label={t.dashboard.pendingCases}
      value={metrics.pendingCases}
      icon={<ClockIcon className="h-5 w-5" />}
      variant="warning"
      trendText={metrics.pendingCases === 0 ? 'Nicio așteptare' : 'În așteptare'}
      badgeCount={metrics.pendingCases}
      onClick={onPendingClick}
      loading={loading}
    />
    <KpiCard
      label={t.dashboard.totalCases}
      value={metrics.totalCases}
      icon={<DocumentTextIcon className="h-5 w-5" />}
      variant="info"
      trendText="Total general"
      loading={loading}
    />
  </div>
);

export default KpiRow;
