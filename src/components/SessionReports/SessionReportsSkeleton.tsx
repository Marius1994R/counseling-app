import React from 'react';

const SessionReportsSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-28 rounded-xl bg-slate-100" />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="h-96 rounded-xl bg-slate-100" />
      <div className="h-96 rounded-xl bg-slate-100" />
    </div>
  </div>
);

export default SessionReportsSkeleton;
