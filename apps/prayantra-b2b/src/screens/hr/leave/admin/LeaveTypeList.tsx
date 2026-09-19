// apps/prayantra-b2b/src/screens/hr/leave/admin/LeaveTypeList.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listLeaveTypes, deleteLeaveType } from '@b2b/api-client';
import { LeaveType } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveTypeList'>;

export default function LeaveTypeList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTypes = useCallback(async (showRefresh = false) => {
    if (!accessToken || !companyId || !deviceId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await listLeaveTypes(companyId, deviceId, accessToken);
      setTypes(res.data || []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load leave types');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId]);

  useFocusEffect(useCallback(() => { fetchTypes(); }, [fetchTypes]));

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Leave Type',
      `Delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) return;
            setDeletingId(id);
            try {
              await deleteLeaveType(companyId, id, deviceId, accessToken);
              setTypes((prev) => prev.filter((t) => t.id !== id));
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Delete failed');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: LeaveType }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('LeaveTypeForm', { leaveTypeId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={[styles.badge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.badgeText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <Text style={styles.detail}>Code: {item.code}</Text>
      <Text style={styles.detail}>Paid: {item.is_paid ? 'Yes' : 'No'}</Text>
      <Text style={styles.detail}>Requires Approval: {item.requires_approval ? 'Yes' : 'No'}</Text>
      <Text style={styles.detail}>Accrual: {item.accrual_method}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('LeaveTypeForm', { leaveTypeId: item.id })}
        >
          <Icon name="pencil" size={18} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id, item.name)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Icon name="delete" size={18} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading leave types...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Types</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('LeaveTypeForm', {})} // ✅ Fixed: pass empty object
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={types}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchTypes(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="format-list-bulleted" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>No Leave Types</Text>
            <Text style={styles.emptySubtitle}>Create a leave type to get started</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#d1fae5',
  },
  inactiveBadge: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detail: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  editButton: {
    padding: 6,
    marginRight: 10,
  },
  deleteButton: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    marginTop: 4,
  },
});