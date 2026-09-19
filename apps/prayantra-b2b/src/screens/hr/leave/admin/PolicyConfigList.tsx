// apps/prayantra-b2b/src/screens/hr/leave/admin/PolicyConfigList.tsx
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
import { listPolicyConfigs, deletePolicyConfig } from '@b2b/api-client';
import { LeavePolicyConfig } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'PolicyConfigList'>;

export default function PolicyConfigList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [policies, setPolicies] = useState<LeavePolicyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPolicies = useCallback(async (showRefresh = false) => {
    if (!accessToken || !companyId || !deviceId) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await listPolicyConfigs(companyId, deviceId, accessToken);
      setPolicies(res.data || []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load policies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId]);

  useFocusEffect(
    useCallback(() => {
      fetchPolicies();
    }, [fetchPolicies])
  );

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      'Delete Policy',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) return;
            setDeletingId(id);
            try {
              await deletePolicyConfig(companyId, id, deviceId, accessToken);
              setPolicies((prev) => prev.filter((p) => p.id !== id));
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

  const renderItem = ({ item }: { item: LeavePolicyConfig }) => {
    const isDeleting = deletingId === item.id;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate({ name: 'PolicyConfigForm', params: { policyId: item.id } })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.policyName}>{item.policy_name}</Text>
          <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
        <Text style={styles.priority}>Priority: {item.priority}</Text>
        <Text style={styles.appliesTo}>Applies to: {item.applies_to_type}</Text>
        <Text style={styles.dateRange}>
          {new Date(item.effective_from).toLocaleDateString()} – {item.effective_to ? new Date(item.effective_to).toLocaleDateString() : 'No end date'}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate({ name: 'PolicyConfigForm', params: { policyId: item.id } })}
          >
            <Icon name="pencil" size={18} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id, item.policy_name)}
            disabled={isDeleting}
          >
            {isDeleting ? <ActivityIndicator size="small" color="#ef4444" /> : <Icon name="delete" size={18} color="#ef4444" />}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading policies...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Policies</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate({ name: 'PolicyConfigForm', params: {} })}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={policies}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchPolicies(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-document-outline" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>No Policies</Text>
            <Text style={styles.emptySubtitle}>Create a leave policy to get started</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BACKGROUND_COLOR },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { padding: 16, paddingBottom: 20 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  policyName: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#d1fae5' },
  inactiveBadge: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 11, fontWeight: '600' },
  priority: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 },
  appliesTo: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  dateRange: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: 10 },
  editButton: { padding: 6, marginRight: 10 },
  deleteButton: { padding: 6 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4 },
});