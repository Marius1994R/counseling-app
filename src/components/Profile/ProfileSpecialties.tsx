import React from 'react';
import { AcademicCapIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';

interface ProfileSpecialtiesProps {
  specialties: string[];
  onEdit: () => void;
}

const ProfileSpecialties: React.FC<ProfileSpecialtiesProps> = ({ specialties, onEdit }) => (
  <section className="mb-6">
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <AcademicCapIcon className="h-5 w-5 text-brand-600" />
        {t.profile.specialties}
      </h2>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
      >
        <PencilSquareIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{t.profile.editSpecialties}</span>
      </button>
    </div>
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
        <p className="text-center text-sm italic text-slate-500 sm:text-left">
          {t.profile.noSpecialties}
        </p>
      )}
    </div>
  </section>
);

export default ProfileSpecialties;
