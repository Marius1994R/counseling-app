import React from 'react';

const CounselorsSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="flex justify-between">
      <div className="h-10 w-48 rounded-lg bg-slate-100" />
      <div className="h-10 w-36 rounded-lg bg-slate-100" />
    </div>
    <div className="h-28 rounded-xl bg-slate-100" />
    <div className="flex gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-9 w-24 rounded-full bg-slate-100" />
      ))}
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-72 rounded-xl bg-slate-100" />
      ))}
    </div>
  </div>
);

export default CounselorsSkeleton;
