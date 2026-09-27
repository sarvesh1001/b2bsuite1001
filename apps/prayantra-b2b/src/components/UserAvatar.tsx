// packages/.../src/components/UserAvatar.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ImageStyle, ActivityIndicator } from 'react-native';
import { useAvatar } from '../hooks/useAvatar';

const TAG = '[UserAvatar]';

interface UserAvatarProps {
  userId?: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string | null;
  size?: number;
  style?: StyleProp<ImageStyle>;
  loading?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  userId,
  username,
  fullName,
  avatarUrl: propAvatarUrl,
  size = 40,
  style,
  loading: propLoading = false,
}) => {
  const { avatarUrl: fetchedUrl, isLoading, error } = useAvatar(userId || '');

  const finalAvatarUrl = propAvatarUrl !== undefined ? propAvatarUrl : fetchedUrl;
  const isLoadingFinal = propLoading || isLoading;

  const initial = (fullName || username || '?').charAt(0).toUpperCase();

  console.log(TAG, 'render branch decision', {
    userId,
    propAvatarUrl,
    fetchedUrl,
    finalAvatarUrl,
    isLoadingFinal,
    error: error ? String(error) : null,
    branch: isLoadingFinal
      ? 'LOADING'
      : finalAvatarUrl
      ? 'IMAGE'
      : 'INITIALS',
  });

  if (isLoadingFinal) {
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 2 },
          style,
        ]}
      >
        <ActivityIndicator size="small" color="#fff" />
      </View>
    );
  }

  if (finalAvatarUrl) {
    return (
      <Image
        source={{ uri: finalAvatarUrl }}
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
        onLoad={() => console.log(TAG, '✅ IMAGE LOADED', { userId, finalAvatarUrl })}
        onError={(e) =>
          console.warn(TAG, '❌ IMAGE ERROR', {
            userId,
            finalAvatarUrl,
            nativeEvent: e.nativeEvent,
          })
        }
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.5 }]}>
        {initial}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: '#6c7a89',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { color: '#fff', fontWeight: 'bold' },
});