import React from 'react';

const ProfileSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-6">
    <div className="h-10 w-48 rounded-lg bg-slate-100" />
    <div className="h-48 rounded-xl bg-slate-100" />
    <div className="h-32 rounded-xl bg-slate-100" />
  </div>
);

export default ProfileSkeleton;
