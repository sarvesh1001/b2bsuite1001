import React from 'react';
import { useAvatar } from '../hooks/useAvatar';

interface UserAvatarProps {
  userId?: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  loading?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  username,
  fullName,
  avatarUrl: propAvatarUrl,
  size = 40,
  className = '',
  loading: propLoading = false,
}) => {
  // Use the hook to fetch avatar if userId is provided and no explicit avatarUrl
  const { avatarUrl: fetchedUrl, isLoading, error } = useAvatar(userId || '');

  const finalAvatarUrl = propAvatarUrl !== undefined ? propAvatarUrl : fetchedUrl;
  const isLoadingFinal = propLoading || isLoading;

  // Fallback initial
  const initial = (fullName || username || '?').charAt(0).toUpperCase();

  // Loading state
  if (isLoadingFinal) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 ${className}`}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      >
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600" />
      </div>
    );
  }

  // Image if URL exists
  if (finalAvatarUrl) {
    return (
      <img
        src={finalAvatarUrl}
        alt={fullName || username || 'avatar'}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={() => console.warn(`Failed to load avatar for user ${userId}`)}
      />
    );
  }

  // Fallback initials
  return (
    <div
      className={`flex items-center justify-center bg-gray-500 text-white font-bold ${className}`}
      style={{ width: size, height: size, borderRadius: size / 2, fontSize: size * 0.5 }}
    >
      {initial}
    </div>
  );
};