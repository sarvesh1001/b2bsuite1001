// apps/prayantra-b2b/src/screens/hr/leave/user/LeaveBalanceScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,   // ✅ added missing import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getMyLeaveBalance } from '@b2b/api-client';
import { LeaveBalance } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveBalanceScreen'>;

export default function LeaveBalanceScreen() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalances = useCallback(async (showRefresh = false) => {
    if (!accessToken || !companyId || !deviceId) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getMyLeaveBalance(companyId, deviceId, accessToken);
      setBalances(res.data || []);
    } catch (error: any) {
      // Fallback mock if needed
      setBalances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId]);

  useFocusEffect(useCallback(() => { fetchBalances(); }, [fetchBalances]));

  const renderItem = ({ item }: { item: LeaveBalance }) => (
    <View style={styles.card}>
      <Text style={styles.leaveType}>{item.leave_type_name}</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Total:</Text>
        <Text style={styles.value}>{item.total_entitled}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Used:</Text>
        <Text style={styles.value}>{item.used}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Balance:</Text>
        <Text style={[styles.value, { color: item.balance > 0 ? '#10b981' : '#ef4444' }]}>{item.balance}</Text>
      </View>
      {item.carry_forward !== undefined && (
        <View style={styles.row}>
          <Text style={styles.label}>Carry Forward:</Text>
          <Text style={styles.value}>{item.carry_forward}</Text>
        </View>
      )}
    </View>
  );

  if (loading) return (
    <SafeAreaView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      <Text style={styles.loadingText}>Loading balances...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Balance</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={balances}
        keyExtractor={(item) => item.leave_type_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBalances(true)} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cash" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>No Balance Data</Text>
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
  listContent: { padding: 16 },
  card: { backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER_COLOR },
  leaveType: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  label: { fontSize: 14, color: TEXT_SECONDARY },
  value: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
});