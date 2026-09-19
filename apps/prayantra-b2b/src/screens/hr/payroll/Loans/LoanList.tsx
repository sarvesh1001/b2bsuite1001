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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listUserLoans } from '@b2b/api-client';
import { Loan } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'LoanList'>;
type RouteProps = RouteProp<RootStackParamList, 'LoanList'>;

export default function LoanList() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeClosed, setIncludeClosed] = useState(false);

  const fetchLoans = async () => {
    if (!accessToken || !companyId || !deviceId || !userId) return;
    setLoading(true);
    try {
      const res = await listUserLoans(companyId, userId, deviceId, accessToken, { includeClosed });
      setLoans(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLoans();
    }, [includeClosed, userId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLoans();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'closed': return '#9E9E9E';
      case 'defaulted': return '#F44336';
      default: return TEXT_SECONDARY;
    }
  };

  const renderItem = ({ item }: { item: Loan }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('LoanDetail', { loanId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.type}>{item.loan_type.toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Principal:</Text>
        <Text style={styles.value}>₹{item.principal_amount.toLocaleString()}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>EMI:</Text>
        <Text style={styles.value}>₹{item.emi_amount.toLocaleString()}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Total EMIs:</Text>
        <Text style={styles.value}>{item.total_emis}</Text>
      </View>
      <View style={styles.detailRow}>
        <Text style={styles.label}>Disbursed:</Text>
        <Text style={styles.value}>{new Date(item.disbursed_at).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.effective}>
        First EMI: {new Date(item.first_emi_date).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loans</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateLoan', { userId })}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Include closed</Text>
        <Switch
          value={includeClosed}
          onValueChange={setIncludeClosed}
          trackColor={{ false: '#767577', true: PRIMARY_COLOR }}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No loans found</Text>
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
  addButton: { padding: 4 },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  filterLabel: { fontSize: 14, color: TEXT_PRIMARY },
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
    marginBottom: 6,
  },
  type: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  label: { fontSize: 13, color: TEXT_SECONDARY },
  value: { fontSize: 13, fontWeight: '500', color: TEXT_PRIMARY },
  effective: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});