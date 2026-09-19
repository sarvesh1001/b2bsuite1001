import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, FAB } from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

import {
  listCompanyPayments,
  Payment,
  PaymentStatus,
} from '../../../../services/admin';

const statusColor = (s: PaymentStatus) => {
  switch (s) {
    case 'success':
      return { bg: '#E8F5E9', fg: '#2E7D32' };
    case 'pending':
      return { bg: '#FFF8E1', fg: '#F57C00' };
    case 'failed':
      return { bg: '#FFEBEE', fg: '#C62828' };
    case 'refunded':
      return { bg: '#E3F2FD', fg: '#1565C0' };
    default:
      return { bg: '#EEEEEE', fg: '#555' };
  }
};

export default function CompanyPaymentsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { companyId } = route.params as { companyId: string };

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    try {
      console.log('📤 [CompanyPayments] fetching for', companyId);
      const res = await listCompanyPayments(companyId, 1, 50);
      console.log('📥 [CompanyPayments] response:', JSON.stringify(res, null, 2));
      setPayments(res.payments || []);
      setTotal(res.meta?.total || res.payments?.length || 0);
    } catch (e: any) {
      console.error('❌ [CompanyPayments]', e);
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [companyId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderItem = ({ item }: { item: Payment }) => {
    const c = statusColor(item.status);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() =>
          (navigation as any).navigate('CompanyPaymentDetail', {
            companyId,
            paymentId: item.payment_id,
          })
        }
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Text variant="titleMedium" style={styles.amount}>
                {item.currency} {Number(item.amount).toFixed(2)}
              </Text>
              <Chip
                style={{ backgroundColor: c.bg }}
                textStyle={{ color: c.fg, fontSize: 12 }}
              >
                {item.status?.toUpperCase() || 'UNKNOWN'}
              </Chip>
            </View>
            <Text variant="bodySmall" style={styles.meta}>
              Method: {item.payment_method}
            </Text>
            {item.gateway_txn_id ? (
              <Text variant="bodySmall" style={styles.meta}>
                Txn: {item.gateway_txn_id}
              </Text>
            ) : null}
            <Text variant="bodySmall" style={styles.date}>
              {item.payment_date
                ? new Date(item.payment_date).toLocaleString()
                : '—'}
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Payments
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} total
        </Text>
      </View>

      <FlatList
        data={payments}
        renderItem={renderItem}
        keyExtractor={(i) => i.payment_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7B2FBE']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No payments recorded yet</Text>
            <Text style={styles.emptyHint}>
              Tap + to record the first payment
            </Text>
          </View>
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        color="white"
        onPress={() =>
          (navigation as any).navigate('CompanyPaymentCreate', { companyId })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  amount: { fontWeight: '700', color: '#1A1A1A' },
  meta: { color: '#666', marginTop: 2 },
  date: { color: '#888', marginTop: 4, fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#999', fontSize: 15 },
  emptyHint: { color: '#bbb', fontSize: 13, marginTop: 4 },
  fab: { position: 'absolute', right: 24, bottom: 24, backgroundColor: '#7B2FBE' },
});