import React from 'react';

const ActivitySkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-28 rounded-xl bg-slate-100" />
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="space-y-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded bg-slate-100" />
              <div className="h-3 w-2/3 rounded bg-slate-100" />
              <div className="h-3 w-1/4 rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default ActivitySkeleton;
