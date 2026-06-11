import React from 'react';
import { Alert } from '@mui/material';
import { useActivityData } from '../../hooks/useActivityData';
import ActivityPageHeader from './ActivityPageHeader';
import ActivityToolbar from './ActivityToolbar';
import ActivityList from './ActivityList';
import ActivitySkeleton from './ActivitySkeleton';

const ActivityTimeline: React.FC = () => {
  const data = useActivityData();
  const isLeader = data.currentUser?.role === 'leader';
  const showCounselorTypeFilter =
    data.currentUser?.role !== 'counselor' && data.currentUser?.role !== 'admin';

  if (data.loading) {
    return (
      <div>
        <ActivityPageHeader />
        <ActivitySkeleton />
      </div>
    );
  }

  return (
    <div>
      <ActivityPageHeader />

      {data.error && (
        <Alert severity="error" sx={{ mb: 3 }} className="rounded-xl">
          {data.error}
        </Alert>
      )}

      <ActivityToolbar
        searchTerm={data.searchTerm}
        onSearchChange={data.setSearchTerm}
        typeFilter={data.typeFilter}
        onTypeFilterChange={data.setTypeFilter}
        counselorFilter={data.counselorFilter}
        onCounselorFilterChange={data.setCounselorFilter}
        timeRangeFilter={data.timeRangeFilter}
        onTimeRangeFilterChange={data.setTimeRangeFilter}
        counselors={data.counselors}
        filteredCount={data.filteredActivities.length}
        showCounselorFilter={isLeader}
        showCounselorTypeFilter={showCounselorTypeFilter}
      />

      <ActivityList activities={data.filteredActivities} />
    </div>
  );
};

export default ActivityTimeline;
