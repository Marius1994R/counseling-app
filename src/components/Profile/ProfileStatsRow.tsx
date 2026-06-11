import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import KpiCard from '../Dashboard/KpiCard';
import { t } from '../../utils/translations';
import { CaseStats } from './profileUtils';

interface ProfileStatsRowProps {
  stats: CaseStats;
  loading?: boolean;
}

const ProfileStatsRow: React.FC<ProfileStatsRowProps> = ({ stats, loading }) => {
  const navigate = useNavigate();

  return (
    <section className="mb-6">
      <h2 className="mb-4 text-base font-semibold text-slate-900">{t.profile.caseSummary}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t.dashboard.activeCases}
          value={stats.active}
          icon={<FolderIcon className="h-5 w-5" />}
          variant="primary"
          trendText="Cazuri în desfășurare"
          onClick={() => navigate('/cases?status=active')}
          loading={loading}
        />
        <KpiCard
          label={t.dashboard.completedCases}
          value={stats.finished}
          icon={<CheckCircleIcon className="h-5 w-5" />}
          variant="success"
          trendText={stats.finished === 0 ? 'Nicio finalizare' : 'Finalizate cu succes'}
          onClick={() => navigate('/cases?status=finished')}
          loading={loading}
        />
        <KpiCard
          label={t.cases.filters.unfinished}
          value={stats.unfinished}
          icon={<ExclamationCircleIcon className="h-5 w-5" />}
          variant="info"
          trendText="Necesită atenție"
          onClick={() => navigate('/cases?status=unfinished')}
          loading={loading}
        />
        <KpiCard
          label={t.dashboard.pendingCases}
          value={stats.waiting}
          icon={<ClockIcon className="h-5 w-5" />}
          variant="warning"
          trendText={stats.waiting === 0 ? 'Nicio așteptare' : 'În așteptare'}
          badgeCount={stats.waiting}
          onClick={() => navigate('/cases?status=waiting')}
          loading={loading}
        />
      </div>
    </section>
  );
};

export default ProfileStatsRow;
