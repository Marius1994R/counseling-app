import React from 'react';
import { CameraIcon, TrashIcon } from '@heroicons/react/24/outline';
import { t } from '../../utils/translations';
import UserAvatar from './UserAvatar';

interface AvatarEditorProps {
  name: string;
  avatarUrl?: string;
  size?: 'lg' | 'xl';
  uploading?: boolean;
  onSelectFile: () => void;
  onRemove: () => void;
  hint?: string;
}

const AvatarEditor: React.FC<AvatarEditorProps> = ({
  name,
  avatarUrl,
  size = 'lg',
  uploading = false,
  onSelectFile,
  onRemove,
  hint = t.profile.avatarHint,
}) => (
  <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-start">
    <div className="relative shrink-0">
      <UserAvatar
        name={name}
        avatarUrl={avatarUrl}
        size={size}
        className={uploading ? 'opacity-60' : ''}
      />
      <button
        type="button"
        onClick={onSelectFile}
        disabled={uploading}
        title={t.profile.changeAvatar}
        className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <CameraIcon className="h-3.5 w-3.5" />
      </button>
      {avatarUrl && (
        <button
          type="button"
          onClick={onRemove}
          disabled={uploading}
          title={t.profile.removeAvatar}
          className="absolute -left-1 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
    {hint && <p className="text-center text-xs text-slate-500 sm:pt-3 sm:text-left">{hint}</p>}
  </div>
);

export default AvatarEditor;
