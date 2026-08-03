import React from 'react';
import {
  PencilSquareIcon,
  PhoneIcon,
  EnvelopeIcon,
  CameraIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Counselor } from '../../types';
import { UserRole } from '../../types';
import { t } from '../../utils/translations';
import UserAvatar from '../common/UserAvatar';
import {
  getWorkloadLabel,
  getWorkloadBadgeClass,
  getRoleLabel,
} from './profileUtils';

interface ProfileHeroCardProps {
  counselor: Counselor;
  role?: UserRole;
  avatarUploading?: boolean;
  onEdit: () => void;
  onAvatarClick: () => void;
  onRemoveAvatar: () => void;
}

const ProfileHeroCard: React.FC<ProfileHeroCardProps> = ({
  counselor,
  role,
  avatarUploading = false,
  onEdit,
  onAvatarClick,
  onRemoveAvatar,
}) => {
  const displayPhone = counselor.phoneNumber || t.profile.phoneNotProvided;

  return (
    <section className="relative mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <button
        type="button"
        onClick={onEdit}
        className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50"
      >
        <PencilSquareIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{t.profile.editProfile}</span>
      </button>

      <div className="flex flex-col gap-5 md:flex-row md:items-start">
        <div className="relative mx-auto shrink-0 md:mx-0">
          <UserAvatar
            name={counselor.fullName}
            avatarUrl={counselor.avatarUrl}
            size="xl"
            className={avatarUploading ? 'opacity-60' : ''}
          />
          <button
            type="button"
            onClick={onAvatarClick}
            disabled={avatarUploading}
            title={t.profile.changeAvatar}
            className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CameraIcon className="h-4 w-4" />
          </button>
          {counselor.avatarUrl && (
            <button
              type="button"
              onClick={onRemoveAvatar}
              disabled={avatarUploading}
              title={t.profile.removeAvatar}
              className="absolute -left-1 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1 text-center md:pt-2 md:text-left">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{counselor.fullName}</h2>
          <p className="mt-1 text-sm text-slate-500">{t.profile.avatarHint}</p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {getRoleLabel(role)}
            </span>
            {counselor.sex && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {counselor.sex === 'feminin' ? t.cases.sexFeminin : t.cases.sexMasculin}
              </span>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${getWorkloadBadgeClass(counselor.workloadLevel)}`}
            >
              {getWorkloadLabel(counselor.workloadLevel)}
            </span>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:gap-8">
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <PhoneIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="text-left">
                <p className="text-xs text-slate-500">{t.profile.phoneNumber}</p>
                <p className="text-sm font-medium text-slate-900">{displayPhone}</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 md:justify-start">
              <EnvelopeIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="text-left">
                <p className="text-xs text-slate-500">{t.profile.email}</p>
                <p className="break-all text-sm font-medium text-slate-900">{counselor.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfileHeroCard;
