import React from 'react';

const SessionReportsSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-16 rounded-xl bg-slate-100" />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-slate-100" />
      ))}
    </div>
    <div className="h-32 rounded-xl bg-slate-100" />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
      <div className="h-96 rounded-xl bg-slate-100" />
      <div className="h-96 rounded-xl bg-slate-100" />
    </div>
  </div>
);

export default SessionReportsSkeleton;
