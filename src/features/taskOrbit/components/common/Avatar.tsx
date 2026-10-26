import React, { useState } from 'react';
import { User } from '../../types/task';

interface AvatarProps {
  user?: User;
  name?: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showStatus?: boolean;
  showTooltip?: boolean;
  status?: User['status'];
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  user,
  name,
  avatarUrl,
  size = 'md',
  showStatus = false,
  showTooltip = true,
  status,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  const displayName = user?.name || name || 'Collaborator';
  const url = avatarUrl || user?.avatarUrl;
  const userStatus = status || user?.status || 'offline';

  // Get initials (up to 2 letters)
  const initials = displayName
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  };

  const statusDotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  const statusColors = {
    online: 'bg-emerald-500',
    busy: 'bg-amber-500',
    idle: 'bg-slate-400',
    offline: 'bg-slate-300',
  };

  // Color generator based on name
  const bgColors = [
    'bg-indigo-600',
    'bg-sky-600',
    'bg-emerald-600',
    'bg-violet-600',
    'bg-amber-600',
    'bg-rose-600',
  ];
  const charCodeSum = displayName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const fallbackBg = bgColors[charCodeSum % bgColors.length];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`} title={showTooltip ? `${displayName}${user?.role ? ` (${user.role})` : ''}` : undefined}>
      {url && !imgError ? (
        <img
          src={url}
          alt={displayName}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white shadow-xs`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${fallbackBg} text-white font-medium rounded-full flex items-center justify-center ring-2 ring-white shadow-xs select-none`}
        >
          {initials}
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white ${statusColors[userStatus]} ${statusDotSizes[size]}`}
          title={`Status: ${userStatus}`}
        />
      )}
    </div>
  );
};
