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
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getPendingEMIsForPayrollRun } from '@b2b/api-client';
import { EMI } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'PendingEMIsForRun'>;
type RouteProps = RouteProp<RootStackParamList, 'PendingEMIsForRun'>;

export default function PendingEMIsForRun() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { runId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [emis, setEmis] = useState<EMI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEMIs = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getPendingEMIsForPayrollRun(companyId, runId, deviceId, accessToken);
      setEmis(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch pending EMIs');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEMIs();
    }, [runId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEMIs();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: EMI }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.loanId}>Loan: {item.loan_id}</Text>
        <Text style={styles.emiNumber}>EMI #{item.emi_number}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Due:</Text>
        <Text style={styles.value}>{new Date(item.due_date).toLocaleDateString()}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Amount:</Text>
        <Text style={styles.value}>₹{item.amount.toLocaleString()}</Text>
      </View>
      <TouchableOpacity
        style={styles.markPaidButton}
        onPress={() => navigation.navigate('MarkEMIAsPaid', { emiId: item.id, runId })}
      >
        <Text style={styles.markPaidText}>Mark as Paid</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending EMIs for Run</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={emis}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No pending EMIs for this run</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  loader: { marginTop: 40 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  loanId: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  emiNumber: { fontSize: 13, color: TEXT_SECONDARY },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  label: { fontSize: 13, color: TEXT_SECONDARY },
  value: { fontSize: 13, fontWeight: '500', color: TEXT_PRIMARY },
  markPaidButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  markPaidText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});