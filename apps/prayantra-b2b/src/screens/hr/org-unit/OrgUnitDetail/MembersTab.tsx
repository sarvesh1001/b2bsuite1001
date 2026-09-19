// apps/prayantra-b2b/src/screens/hr/org-unit/OrgUnitDetail/MembersTab.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listOrgUnitMembers, removeOrgUnitMember, addOrgUnitMember } from '@b2b/api-client';
import { OrgUnitMember } from '@b2b/shared-types';
import { PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, CARD_BACKGROUND, BORDER_COLOR } from '../../../../constants/colors';

interface Props {
  orgUnitId: string;
}

export default function MembersTab({ orgUnitId }: Props) {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [members, setMembers] = useState<OrgUnitMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await listOrgUnitMembers(companyId, orgUnitId, deviceId, accessToken, true);
      setMembers(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, orgUnitId]);

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [fetchMembers])
  );

  const handleRemove = (userId: string, userName?: string) => {
    Alert.alert(
      'Remove Member',
      `Remove ${userName || userId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) return;
            setRemovingId(userId);
            try {
              await removeOrgUnitMember(companyId, orgUnitId, userId, deviceId, accessToken);
              setMembers((prev) => prev.filter((m) => m.user_id !== userId));
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Remove failed');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: OrgUnitMember }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.user_email?.charAt(0).toUpperCase() || '?'}</Text>
        </View>
        <View>
          <Text style={styles.memberName}>{item.user_email || item.user_id}</Text>
          <Text style={styles.memberDate}>From: {item.effective_from?.split('T')[0]}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemove(item.user_id, item.user_email)}
        disabled={removingId === item.user_id}
      >
        {removingId === item.user_id ? (
          <ActivityIndicator size="small" color="#ef4444" />
        ) : (
          <Icon name="close" size={20} color="#ef4444" />
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => Alert.alert('Add Member', 'Implement user picker modal')}
      >
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.addText}>Add Member</Text>
      </TouchableOpacity>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No members</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  addText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  memberCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  memberInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY_COLOR + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: PRIMARY_COLOR },
  memberName: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  memberDate: { fontSize: 12, color: TEXT_SECONDARY },
  removeButton: { padding: 6 },
  emptyContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, color: TEXT_SECONDARY },
});