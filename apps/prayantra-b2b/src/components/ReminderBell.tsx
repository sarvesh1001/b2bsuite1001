// apps/prayantra-b2b/src/components/ReminderBell.tsx
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useReminderCounts } from '../hooks/useReminders';

interface Props {
  /** Icon colour. Default white — designed for gradient headers. */
  color?: string;
  /** Icon size. Default 22. */
  size?: number;
  /** Override the badge background. Default: red if critical > 0, else amber. */
  badgeColor?: string;
}

/**
 * Bell + count badge. Tapping navigates to RemindersList.
 *
 * Mount ONLY inside HR-adjacent headers — the ModuleDetailScreen HR
 * branch is the canonical place. The surrounding context (HR module
 * access) already implies the user is HR; no client-side permission
 * check is needed. If a non-HR user somehow reaches the screen, the
 * count query returns 0 (server 403 → empty data) and the badge
 * simply doesn't render.
 *
 * Location scope is handled by the axios interceptor (X-Location-ID).
 * Switching location refetches via query invalidation in useLocations.
 */
export const ReminderBell: React.FC<Props> = ({
  color = '#FFFFFF',
  size = 22,
  badgeColor,
}) => {
  const navigation = useNavigation<any>();
  const { unread, critical } = useReminderCounts();

  const bg = badgeColor ?? (critical > 0 ? '#EF4444' : '#F59E0B');

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => navigation.navigate('RemindersList')}
      style={styles.wrap}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon name="bell-outline" size={size} color={color} />

      {unread > 0 && (
        <View style={[styles.badge, { backgroundColor: bg }]}>
          <Text style={styles.badgeText}>
            {unread > 99 ? '99+' : unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: { padding: 4 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});