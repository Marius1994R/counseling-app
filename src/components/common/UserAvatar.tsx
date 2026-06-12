import React from 'react';
import { getAvatarColorClass } from '../Cases/casesUtils';
import { getInitials } from '../Profile/profileUtils';

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-xs',
  lg: 'h-11 w-11 text-sm',
  xl: 'h-24 w-24 text-2xl',
} as const;

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}) => {
  const sizeClass = sizeClasses[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${sizeClass} ${getAvatarColorClass(name)} ${className}`}
      aria-hidden={!name}
    >
      {getInitials(name)}
    </div>
  );
};

export default UserAvatar;
