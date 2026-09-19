// apps/prayantra-b2b/src/screens/hr/org-unit/OrgUnitDetail/RolesTab.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listOrgUnitRoles, removeOrgUnitRole } from '@b2b/api-client';
import { OrgUnitRole } from '@b2b/shared-types';
import { PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, CARD_BACKGROUND, BORDER_COLOR } from '../../../../constants/colors';

interface Props {
  orgUnitId: string;
}

export default function RolesTab({ orgUnitId }: Props) {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [roles, setRoles] = useState<OrgUnitRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await listOrgUnitRoles(companyId, orgUnitId, deviceId, accessToken, true);
      setRoles(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, orgUnitId]);

  useFocusEffect(
    useCallback(() => {
      fetchRoles();
    }, [fetchRoles])
  );

  const handleRemove = (userId: string, role: string, userName?: string) => {
    Alert.alert(
      'Remove Role',
      `Remove "${role}" from ${userName || userId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) return;
            setRemovingId(`${userId}-${role}`);
            try {
              await removeOrgUnitRole(companyId, orgUnitId, userId, role, deviceId, accessToken);
              setRoles((prev) => prev.filter((r) => r.user_id !== userId || r.role !== role));
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

  const renderItem = ({ item }: { item: OrgUnitRole }) => (
    <View style={styles.roleCard}>
      <View style={styles.roleInfo}>
        <Icon name="account-key" size={20} color={PRIMARY_COLOR} style={{ marginRight: 10 }} />
        <View>
          <Text style={styles.roleName}>{item.role}</Text>
          <Text style={styles.roleUser}>{item.user_id}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemove(item.user_id, item.role)}
        disabled={removingId === `${item.user_id}-${item.role}`}
      >
        {removingId === `${item.user_id}-${item.role}` ? (
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
        onPress={() => Alert.alert('Assign Role', 'Implement role assignment modal')}
      >
        <Icon name="plus" size={20} color="#fff" />
        <Text style={styles.addText}>Assign Role</Text>
      </TouchableOpacity>
      <FlatList
        data={roles}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No roles assigned</Text>
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
  roleCard: {
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
  roleInfo: { flexDirection: 'row', alignItems: 'center' },
  roleName: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  roleUser: { fontSize: 12, color: TEXT_SECONDARY },
  removeButton: { padding: 6 },
  emptyContainer: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 14, color: TEXT_SECONDARY },
});