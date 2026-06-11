import React from 'react';

const ProfileSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-10 w-48 rounded-lg bg-slate-100" />
    <div className="h-48 rounded-xl bg-slate-100" />
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-36 rounded-xl bg-slate-100" />
      ))}
    </div>
    <div className="h-32 rounded-xl bg-slate-100" />
  </div>
);

export default ProfileSkeleton;
