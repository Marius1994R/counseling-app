import React from 'react';
import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

interface ProfileSpecialtiesProps {
  specialties: string[];
}

const ProfileSpecialties: React.FC<ProfileSpecialtiesProps> = ({ specialties }) => (
  <section className="mb-6">
    <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
      <AcademicCapIcon className="h-5 w-5 text-brand-600" />
      {t.profile.specialties}
    </h2>
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {specialties.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {specialties.map((specialty) => (
            <span
              key={specialty}
              className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700"
            >
              {specialty}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm italic text-slate-500 sm:text-left">{t.profile.noSpecialties}</p>
      )}
    </div>
  </section>
);

export default ProfileSpecialties;
