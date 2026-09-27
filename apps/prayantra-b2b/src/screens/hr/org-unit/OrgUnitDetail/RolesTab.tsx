// packages/.../src/screens/.../RolesTab.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listOrgUnitRoles, removeOrgUnitRole } from '@b2b/api-client';
import { OrgUnitRole } from '@b2b/shared-types';
import {
  PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, CARD_BACKGROUND, BORDER_COLOR,
} from '../../../../constants/colors';
import {
  formatDate, getOrgUnitRoleLabel, getOrgUnitRoleIcon,
} from '../../../../constants/orgUnit';
import type { LocationOption } from '../../../../constants/orgUnit';
import { useLocations } from '../../../../hooks/useLocations';
import { UserAvatar } from '../../../../components/UserAvatar';
import { useUserDisplayName } from '../../../../hooks/useUserDisplayName';
import AssignRoleModal from './AssignRoleModal';

interface Props { orgUnitId: string; }

const TAG = '[OrgUnitRolesTab]';

// ============================================================
// Row — card anatomy:
//   ┌───────────────────────────────────────────┐
//   │ ┃ [role icon] Teacher        [★Primary] [✕]│
//   │ ┃ ────────────────────────────────────────│
//   │ ┃ [avatar]  Yamuna Nagar                  │
//   │ ┃           @yamuna                       │
//   │ ┃           📍 Lambukuma                  │
//   │ ┃ ────────────────────────────────────────│
//   │ ┃ [📅 2025-01-01 → present]                │
//   └───────────────────────────────────────────┘
// ============================================================
const RoleRow = ({
  item,
  isRemoving,
  onRemove,
  findLocation,
}: {
  item: OrgUnitRole;
  isRemoving: boolean;
  onRemove: (userId: string, role: string) => void;
  findLocation: (id?: string | null) => LocationOption | null;
}) => {
  const { data: display, isLoading: isNameLoading } = useUserDisplayName(item.user_id);
  const loc = findLocation(item.location_id);

  if (__DEV__) {
    console.log(TAG, 'row', {
      userId: item.user_id,
      role: item.role,
      locationId: item.location_id,
      locationResolved: loc?.location_name ?? null,
      hasDisplay: !!display,
    });
  }

  const username = (display?.username ?? '').trim();
  const fullName = (display?.full_name ?? '').trim();

  const primary = fullName || (username ? `@${username}` : item.user_id);
  const secondaryHandle = fullName && username ? `@${username}` : null;

  return (
    <View style={styles.card}>
      <View style={styles.cardAccent} />

      {/* Floating remove button — zero horizontal cost */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(item.user_id, item.role)}
        disabled={isRemoving}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isRemoving ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <Icon name="close" size={16} color="#ef4444" />
        )}
      </TouchableOpacity>

      {/* Row 1: role identity */}
      <View style={styles.roleHeader}>
        <View style={styles.roleIconWrap}>
          <Icon
            name={getOrgUnitRoleIcon(item.role)}
            size={16}
            color={PRIMARY_COLOR}
          />
        </View>

        <Text
          style={styles.roleName}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {getOrgUnitRoleLabel(item.role)}
        </Text>

        {item.is_primary && (
          <View style={styles.primaryBadge}>
            <Icon name="star" size={9} color="#f59e0b" />
            <Text style={styles.primaryBadgeText}>Primary</Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Row 2: user — avatar + name + handle + location */}
      <View style={styles.userHeader}>
        <UserAvatar
          userId={item.user_id}
          username={username}
          fullName={fullName}
          size={44}
          style={styles.avatar}
        />

        <View style={styles.cardInfo}>
          <Text
            style={styles.name}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {primary}
          </Text>

          {secondaryHandle && (
            <Text
              style={styles.handle}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {secondaryHandle}
            </Text>
          )}

          {isNameLoading && !fullName && !username && (
            <ActivityIndicator
              size="small"
              color={TEXT_SECONDARY}
              style={styles.inlineSpinner}
            />
          )}

          {loc && (
            <View style={styles.locationRow}>
              <Icon name="map-marker-outline" size={11} color={TEXT_SECONDARY} />
              <Text
                style={styles.locationText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {loc.location_name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Row 3: dates */}
      <View style={styles.cardFooter}>
        <View style={styles.footerChip}>
          <Icon name="calendar-range" size={12} color={TEXT_SECONDARY} />
          <Text style={styles.footerChipText} numberOfLines={1}>
            {formatDate(item.effective_from)}
            {item.effective_to ? ` → ${formatDate(item.effective_to)}` : ' → present'}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================
// Screen
// ============================================================
export default function RolesTab({ orgUnitId }: Props) {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const { findLocation } = useLocations();
  const [roles, setRoles] = useState<OrgUnitRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await listOrgUnitRoles(companyId, orgUnitId, deviceId, accessToken, true);
      if (__DEV__) console.log(TAG, 'fetchRoles →', res?.data?.length ?? 0, 'rows');
      setRoles(res.data ?? []);
    } catch {
      Alert.alert('Error', 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, orgUnitId]);

  useFocusEffect(useCallback(() => { fetchRoles(); }, [fetchRoles]));

  const handleRemove = (userId: string, role: string) => {
    const key = `${userId}-${role}`;
    Alert.alert('Remove Role', `Remove "${getOrgUnitRoleLabel(role)}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          if (!accessToken || !companyId || !deviceId) return;
          setRemovingId(key);
          try {
            await removeOrgUnitRole(companyId, orgUnitId, userId, role, deviceId, accessToken);
            setRoles((prev) =>
              prev.filter((r) => !(r.user_id === userId && r.role === role)),
            );
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Remove failed');
          } finally {
            setRemovingId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.addText}>Assign Role</Text>
      </TouchableOpacity>

      <FlatList
        data={roles}
        keyExtractor={(i) => `${i.user_id}:${i.role}:${i.effective_from}`}
        renderItem={({ item }) => (
          <RoleRow
            item={item}
            isRemoving={removingId === `${item.user_id}-${item.role}`}
            onRemove={handleRemove}
            findLocation={findLocation}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-multiple-outline" size={48} color={TEXT_SECONDARY} />
            <Text style={styles.emptyText}>No roles assigned</Text>
          </View>
        }
      />

      <AssignRoleModal
        visible={modalVisible}
        orgUnitId={orgUnitId}
        onClose={() => setModalVisible(false)}
        onSuccess={() => { setModalVisible(false); fetchRoles(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addButton: {
    backgroundColor: PRIMARY_COLOR, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 12,
  },
  addText: { color: '#fff', fontWeight: '600', marginLeft: 8 },

  listContent: { paddingHorizontal: 16, paddingBottom: 24, flexGrow: 1 },

  // ----- Card -----
  card: {
    position: 'relative',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    paddingVertical: 14,
    paddingLeft: 17,
    paddingRight: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: PRIMARY_COLOR,
  },

  // Floating remove button — absolutely positioned, no horizontal cost
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    zIndex: 2,
  },

  // ----- Row 1: role header -----
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 36,        // keep role name + badge clear of the ✕
  },
  roleIconWrap: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}15`,
    marginRight: 8,
  },
  roleName: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flexShrink: 1,
  },
  primaryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
    backgroundColor: '#f59e0b20',
    marginLeft: 6,
  },
  primaryBadgeText: { fontSize: 9, fontWeight: '700', color: '#f59e0b' },

  divider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginTop: 10,
    marginBottom: 10,
  },

  // ----- Row 2: user -----
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: { marginRight: 12 },

  // The magic combo — fills remaining width AND truncates cleanly
  cardInfo: { flex: 1, minWidth: 0 },

  name: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  handle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },

  // Location — same flex treatment as MembersTab
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flex: 1,
    minWidth: 0,
  },
  locationText: {
    marginLeft: 3,
    fontSize: 11,
    color: TEXT_SECONDARY,
    flex: 1,
    minWidth: 0,
  },

  inlineSpinner: { alignSelf: 'flex-start', marginTop: 6 },

  // ----- Row 3: dates -----
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: '100%',
  },
  footerChipText: {
    marginLeft: 4,
    fontSize: 10,
    color: TEXT_SECONDARY,
    flexShrink: 1,
  },

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 10 },
});