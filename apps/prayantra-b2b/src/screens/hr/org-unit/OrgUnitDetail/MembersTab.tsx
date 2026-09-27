// packages/.../src/screens/.../MembersTab.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listOrgUnitMembers, removeOrgUnitMember } from '@b2b/api-client';
import { OrgUnitMember } from '@b2b/shared-types';
import {
  PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, CARD_BACKGROUND, BORDER_COLOR,
} from '../../../../constants/colors';
import { formatDate } from '../../../../constants/orgUnit';
import type { LocationOption } from '../../../../constants/orgUnit';
import { useLocations } from '../../../../hooks/useLocations';
import { UserAvatar } from '../../../../components/UserAvatar';
import { useUserDisplayName } from '../../../../hooks/useUserDisplayName';
import AddMemberModal from './AddMemberModal';

interface Props { orgUnitId: string; }

const TAG = '[OrgUnitMembersTab]';

const MemberRow = ({
  item,
  isRemoving,
  onRemove,
  findLocation,
}: {
  item: OrgUnitMember;
  isRemoving: boolean;
  onRemove: (userId: string) => void;
  findLocation: (id?: string | null) => LocationOption | null;
}) => {
  const { data: display, isLoading: isNameLoading } = useUserDisplayName(item.user_id);
  const loc = findLocation(item.location_id);

  if (__DEV__) {
    console.log(TAG, 'row', {
      userId: item.user_id,
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

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemove(item.user_id)}
        disabled={isRemoving}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {isRemoving ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <Icon name="close" size={16} color="#ef4444" />
        )}
      </TouchableOpacity>

      <View style={styles.cardHeader}>
        <UserAvatar
          userId={item.user_id}
          username={username}
          fullName={fullName}
          size={44}
          style={styles.avatar}
        />

        <View style={styles.cardInfo}>
          {/* Name — reserves space for the floating ✕ */}
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

          {/* Location — full card width, no ✕-reserve needed down here */}
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
export default function MembersTab({ orgUnitId }: Props) {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const { findLocation } = useLocations();
  const [members, setMembers] = useState<OrgUnitMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await listOrgUnitMembers(companyId, orgUnitId, deviceId, accessToken, true);
      if (__DEV__) console.log(TAG, 'fetchMembers →', res?.data?.length ?? 0, 'rows');
      setMembers(res.data ?? []);
    } catch (e) {
      console.warn(TAG, 'fetchMembers failed', e);
      Alert.alert('Error', 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, orgUnitId]);

  useFocusEffect(useCallback(() => { fetchMembers(); }, [fetchMembers]));

  const handleRemove = (userId: string) => {
    Alert.alert('Remove Member', 'Remove this member from the org unit?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          if (!accessToken || !companyId || !deviceId) return;
          setRemovingId(userId);
          try {
            await removeOrgUnitMember(companyId, orgUnitId, userId, deviceId, accessToken);
            setMembers((prev) => prev.filter((m) => m.user_id !== userId));
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
        <Text style={styles.addText}>Add Member</Text>
      </TouchableOpacity>

      <FlatList
        data={members}
        keyExtractor={(i) => `${i.org_unit_id}:${i.user_id}:${i.effective_from}`}
        renderItem={({ item }) => (
          <MemberRow
            item={item}
            isRemoving={removingId === item.user_id}
            onRemove={handleRemove}
            findLocation={findLocation}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-off-outline" size={48} color={TEXT_SECONDARY} />
            <Text style={styles.emptyText}>No members yet</Text>
          </View>
        }
      />

      <AddMemberModal
        visible={modalVisible}
        orgUnitId={orgUnitId}
        onClose={() => setModalVisible(false)}
        onSuccess={() => { setModalVisible(false); fetchMembers(); }}
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
    marginHorizontal: 16, marginBottom: 12, marginTop: 12,
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

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    // NO paddingRight here — the ✕-reserve is applied per-text below
  },
  avatar: { marginRight: 12 },

  cardInfo: { flex: 1, minWidth: 0 },

  // Name reserves space for the floating ✕ (only the name row sits at its Y-range)
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    paddingRight: 30,
  },

  // Handle sits just below the ✕ — half-reserve is enough
  handle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
    paddingRight: 12,
  },

  // ----- Location row — the row that was truncating -----
  // flex:1 + minWidth:0 lets it fill cardInfo AND shrink below intrinsic width.
  // The text itself needs flex:1 too, so it takes the space after the icon.
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