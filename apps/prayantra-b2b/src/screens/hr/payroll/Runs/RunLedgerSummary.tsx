import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getRunLedgerSummary } from '@b2b/api-client';
import { RootStackParamList } from '../../../../navigation';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

type RunLedgerSummaryRouteProp = RouteProp<
  RootStackParamList,
  'RunLedgerSummary'
>;

export default function RunLedgerSummary() {
  const route = useRoute<RunLedgerSummaryRouteProp>();
  const { runId } = route.params;

  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLedger = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getRunLedgerSummary(companyId, runId, deviceId, accessToken);
      setLedger(res.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch ledger summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [runId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLedger();
    setRefreshing(false);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />;
  }

  if (!ledger) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No ledger data available</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.code}>{item.component_code}</Text>
      <Text style={styles.amount}>Total: {item.total || 0}</Text>
      <Text style={styles.amount}>Earnings: {item.earnings || 0}</Text>
      <Text style={styles.amount}>Deductions: {item.deductions || 0}</Text>
    </View>
  );

  return (
    <FlatList
      data={ledger.components || []}
      keyExtractor={(item, index) => item.component_code || index.toString()}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Ledger Summary</Text>
          <Text>Total Gross: {ledger.total_gross || 0}</Text>
          <Text>Total Deductions: {ledger.total_deductions || 0}</Text>
          <Text>Total Net: {ledger.total_net || 0}</Text>
        </View>
      }
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  list: { paddingBottom: 20 },
  headerCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 4 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  code: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  amount: { fontSize: 13, color: TEXT_SECONDARY },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});