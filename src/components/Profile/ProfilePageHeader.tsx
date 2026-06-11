import React from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

const ProfilePageHeader: React.FC = () => (
  <div className="mb-6">
    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:text-3xl">
      <UserCircleIcon className="h-7 w-7 text-brand-gold sm:h-8 sm:w-8" />
      {t.profile.title}
    </h1>
    <p className="mt-1 text-sm text-slate-500">{t.profile.subtitle}</p>
  </div>
);

export default ProfilePageHeader;
