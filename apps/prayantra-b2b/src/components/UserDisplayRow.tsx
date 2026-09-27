// packages/.../src/components/UserDisplayRow.tsx
import React from 'react';
import {
  View, Text, StyleSheet, StyleProp, ViewStyle, ActivityIndicator,
} from 'react-native';
import { UserAvatar } from './UserAvatar';
import { useUserDisplayName } from '../hooks/useUserDisplayName';
import { TEXT_PRIMARY, TEXT_SECONDARY } from '../constants/colors';

interface Props {
  userId: string;
  username?: string;
  fullName?: string;
  size?: number;
  /** Show the @handle on the second line. Default true. */
  showHandle?: boolean;
  /** Right-aligned trailing slot. */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const UserDisplayRow: React.FC<Props> = ({
  userId,
  username,
  fullName,
  size = 40,
  showHandle = true,
  trailing,
  style,
}) => {
  const { data, isLoading } = useUserDisplayName(userId, {
    seed: { username, full_name: fullName },
  });

  const uname = (username || data?.username || '').trim();
  const fname = (fullName || data?.full_name || '').trim();

  // Primary: prefer full name, then @username, then UUID as last resort.
  const primary = fname || (uname ? `@${uname}` : userId);

  // Secondary: only show @handle if we're also showing a full name.
  // If full_name is empty, the handle is already on the primary line.
  const secondary = fname && uname ? `@${uname}` : null;

  return (
    <View style={[styles.row, style]}>
      <UserAvatar
        userId={userId}
        username={uname}
        fullName={fname}
        size={size}
        style={{ marginRight: 10 }}
      />

      {/* minWidth:0 lets flex:1 actually shrink inside a parent row. */}
      <View style={styles.textCol}>
        <Text
          style={styles.name}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {primary}
        </Text>

        {showHandle && secondary ? (
          <Text
            style={styles.handle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {secondary}
          </Text>
        ) : null}
      </View>

      {/* Inline spinner only when we're actively fetching and have nothing yet. */}
      {isLoading && !fname && !uname && (
        <ActivityIndicator size="small" color={TEXT_SECONDARY} />
      )}

      {trailing}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,          // critical when this component is nested in another flex row
  },
  textCol: {
    flex: 1,
    minWidth: 0,          // critical on Android; without it, text overflows
    flexShrink: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  handle: {
    fontSize: 11,
    color: TEXT_SECONDARY,
    marginTop: 1,
  },
});