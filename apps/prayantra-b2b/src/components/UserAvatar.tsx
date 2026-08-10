import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ImageStyle, ActivityIndicator } from 'react-native';
import { useAvatar } from '../hooks/useAvatar'; // adjust path as needed

interface UserAvatarProps {
  userId?: string;           // used to fetch avatar if avatarUrl not provided
  username?: string;
  fullName?: string;
  avatarUrl?: string | null; // explicit URL override
  size?: number;
  style?: StyleProp<ImageStyle>;
  loading?: boolean;         // manual loading override
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
  // If avatarUrl is explicitly provided, use it; otherwise fetch via hook
  const { avatarUrl: fetchedUrl, isLoading, error } = useAvatar(userId || '');

  // Prefer prop avatarUrl, fallback to fetched, then null
  const finalAvatarUrl = propAvatarUrl !== undefined ? propAvatarUrl : fetchedUrl;
  const isLoadingFinal = propLoading || isLoading;

  const initial = (fullName || username || '?').charAt(0).toUpperCase();

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
        onError={() => console.warn(`Failed to load avatar for user ${userId}`)}
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
  initials: {
    color: '#fff',
    fontWeight: 'bold',
  },
});