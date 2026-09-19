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
import { listEmployeesInRun } from '@b2b/api-client';
import { RootStackParamList } from '../../../../navigation';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

type RunEmployeesListRouteProp = RouteProp<
  RootStackParamList,
  'RunEmployeesList'
>;

export default function RunEmployeesList() {
  const route = useRoute<RunEmployeesListRouteProp>();
  const { runId } = route.params;

  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmployees = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await listEmployeesInRun(companyId, runId, deviceId, accessToken);
      setEmployees(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch employees in run');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [runId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />;
  }

  return (
    <FlatList
      data={employees}
      keyExtractor={(item, index) => item.id || index.toString()}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.name}>{item.name || item.user_id}</Text>
          <Text style={styles.detail}>Gross: {item.gross_salary || 'N/A'}</Text>
          <Text style={styles.detail}>Net: {item.net_salary || 'N/A'}</Text>
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No employees in this run</Text>
        </View>
      }
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  list: { paddingBottom: 20 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  name: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  detail: { fontSize: 13, color: TEXT_SECONDARY },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});