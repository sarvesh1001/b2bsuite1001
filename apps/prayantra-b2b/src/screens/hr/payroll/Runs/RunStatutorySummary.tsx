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
import { getRunStatutorySummary } from '@b2b/api-client';
import { RootStackParamList } from '../../../../navigation';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

type RunStatutorySummaryRouteProp = RouteProp<
  RootStackParamList,
  'RunStatutorySummary'
>;

export default function RunStatutorySummary() {
  const route = useRoute<RunStatutorySummaryRouteProp>();
  const { runId } = route.params;

  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getRunStatutorySummary(companyId, runId, deviceId, accessToken);
      setSummary(res.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch statutory summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [runId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />;
  }

  if (!summary) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No statutory data available</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.code}>{item.statutory_code}</Text>
      <Text style={styles.amount}>Employee: {item.employee_contribution || 0}</Text>
      <Text style={styles.amount}>Employer: {item.employer_contribution || 0}</Text>
      <Text style={styles.amount}>Total: {item.total || 0}</Text>
    </View>
  );

  return (
    <FlatList
      data={summary.details || []}
      keyExtractor={(item, index) => item.statutory_code || index.toString()}
      renderItem={renderItem}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Statutory Summary</Text>
          <Text>Total Employee: {summary.total_employee || 0}</Text>
          <Text>Total Employer: {summary.total_employer || 0}</Text>
          <Text>Grand Total: {summary.grand_total || 0}</Text>
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