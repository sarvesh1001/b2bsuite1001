// apps/prayantra-b2b/src/screens/hr/leave/admin/EntitlementList.tsx
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listEntitlements, recalculateEntitlement } from '@b2b/api-client';
import { Entitlement } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EntitlementList'>;

export default function EntitlementList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState('');
  const [recalcId, setRecalcId] = useState<string | null>(null);

  const fetchEntitlements = useCallback(async (showRefresh = false) => {
    if (!accessToken || !companyId || !deviceId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params: any = { page: 1, page_size: 50 };
      if (userIdFilter.trim()) params.user_id = userIdFilter.trim();
      const res = await listEntitlements(companyId, deviceId, accessToken, params);
      setEntitlements(res.data?.entitlements || []);
      setTotal(res.data?.total || 0);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load entitlements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId, userIdFilter]);

  useFocusEffect(useCallback(() => { fetchEntitlements(); }, [fetchEntitlements]));

  const handleRecalculate = (id: string) => {
    Alert.alert(
      'Recalculate',
      'This will recalculate the entitlement based on current policies. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Recalculate',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) return;
            setRecalcId(id);
            try {
              await recalculateEntitlement(companyId, id, deviceId, accessToken);
              Alert.alert('Success', 'Entitlement recalculated');
              fetchEntitlements();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Recalculation failed');
            } finally { setRecalcId(null); }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Entitlement }) => (
    <View style={styles.card}>
      <Text style={styles.userId}>User: {item.user_id}</Text>
      <Text style={styles.detail}>Leave Type: {item.leave_type_id}</Text>
      <Text style={styles.detail}>Total Days: {item.total_days}</Text>
      <Text style={styles.detail}>Effective: {new Date(item.effective_from).toLocaleDateString()} – {item.effective_to ? new Date(item.effective_to).toLocaleDateString() : 'No end'}</Text>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.recalcButton} onPress={() => handleRecalculate(item.id)} disabled={recalcId === item.id}>
          {recalcId === item.id ? <ActivityIndicator size="small" color={PRIMARY_COLOR} /> : <Text style={styles.recalcText}>Recalculate</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return (
    <SafeAreaView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      <Text style={styles.loadingText}>Loading entitlements...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Entitlements</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            // ✅ Use object form to satisfy TypeScript
            navigation.navigate({
              name: 'CreateEntitlement',
              params: {}, // No params needed
            })
          }
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <Icon name="account" size={20} color={TEXT_SECONDARY} style={styles.filterIcon} />
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by User ID"
          value={userIdFilter}
          onChangeText={setUserIdFilter}
          onSubmitEditing={() => fetchEntitlements()}
        />
        <TouchableOpacity onPress={() => { setUserIdFilter(''); fetchEntitlements(); }} style={styles.clearButton}>
          <Icon name="close" size={18} color={TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={entitlements}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchEntitlements(true)} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="alert-circle-outline" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>No Entitlements Found</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD_BACKGROUND, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  addButton: { backgroundColor: PRIMARY_COLOR, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  filterContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD_BACKGROUND, marginHorizontal: 16, marginVertical: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: BORDER_COLOR, height: 44 },
  filterIcon: { marginRight: 8 },
  filterInput: { flex: 1, height: '100%', fontSize: 14, color: TEXT_PRIMARY },
  clearButton: { padding: 4 },
  listContent: { padding: 16 },
  card: { backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER_COLOR },
  userId: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  detail: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: 10 },
  recalcButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: PRIMARY_COLOR + '20', borderRadius: 6 },
  recalcText: { color: PRIMARY_COLOR, fontWeight: '600', fontSize: 12 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
});