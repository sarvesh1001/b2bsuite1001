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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listUserPayslips } from '@b2b/api-client';
import { Payslip } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'UserPayslipList'>;

export default function UserPayslipList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId, user } = useUserAuthStore();
  // Get userId from user object - try different properties
  const userId = (user as any)?.id || (user as any)?.userId || '';

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const fetchPayslips = async () => {
    if (!accessToken || !companyId || !deviceId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: any = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await listUserPayslips(companyId, userId, deviceId, accessToken, params);
      setPayslips(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch payslips');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPayslips();
    }, [fromDate, toDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayslips();
    setRefreshing(false);
  };

  const getMonthYear = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    return { month, year };
  };

  const renderItem = ({ item }: { item: Payslip }) => {
    const { month, year } = getMonthYear(item.generated_at);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('PayslipDownload', {
            runId: item.payroll_run_id,
            userId: item.user_id,
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.monthYear}>
            {month} {year}
          </Text>
          <Text style={styles.netPay}>₹{item.net_pay?.toLocaleString() || '0'}</Text>
        </View>
        <Text style={styles.grossPay}>Gross: ₹{item.gross_pay?.toLocaleString() || '0'}</Text>
        <Text style={styles.date}>
          Generated: {new Date(item.generated_at).toLocaleDateString()}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate('PayslipDownload', {
                runId: item.payroll_run_id,
                userId: item.user_id,
              })
            }
          >
            <Icon name="eye" size={18} color={PRIMARY_COLOR} />
            <Text style={styles.actionText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate('SendPayslipEmail', {
                runId: item.payroll_run_id,
                userId: item.user_id,
              })
            }
          >
            <Icon name="email" size={18} color={PRIMARY_COLOR} />
            <Text style={styles.actionText}>Email</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Payslips</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="From (YYYY-MM-DD)"
          value={fromDate}
          onChangeText={setFromDate}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="To (YYYY-MM-DD)"
          value={toDate}
          onChangeText={setToDate}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={payslips}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No payslips found</Text>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 13,
    backgroundColor: '#fff',
    marginRight: 8,
  },
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
  },
  monthYear: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  netPay: { fontSize: 16, fontWeight: '700', color: PRIMARY_COLOR },
  grossPay: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  date: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: { fontSize: 13, color: PRIMARY_COLOR, marginLeft: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});