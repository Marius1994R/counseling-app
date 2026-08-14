import React from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

const AdminPageHeader: React.FC = () => (
  <div className="mb-6">
    <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 sm:text-3xl">
      <ShieldCheckIcon className="h-7 w-7 text-brand-gold sm:h-8 sm:w-8" />
      {t.admin.title}
    </h1>
  </div>
);

export default AdminPageHeader;
