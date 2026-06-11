import React from 'react';

const CalendarSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-10 w-48 rounded-lg bg-slate-100" />
    <div className="h-28 rounded-xl bg-slate-100" />
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="min-h-[5rem] rounded-lg bg-slate-100 sm:min-h-[6.25rem]" />
      ))}
    </div>
  </div>
);

export default CalendarSkeleton;
