import React, { useState, useCallback } from 'react';
import {
  View, StyleSheet, FlatList, Alert, RefreshControl, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, FAB } from 'react-native-paper';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';

import { listCompanyInvoices, Invoice, InvoiceStatus } from '../../../../services/admin';

const statusColor = (s: InvoiceStatus) => {
  switch (s) {
    case 'paid': return { bg: '#E8F5E9', fg: '#2E7D32' };
    case 'issued': return { bg: '#E3F2FD', fg: '#1565C0' };
    case 'draft': return { bg: '#EEEEEE', fg: '#555' };
    case 'overdue': return { bg: '#FFEBEE', fg: '#C62828' };
    case 'cancelled': return { bg: '#F3E5F5', fg: '#6A1B9A' };
    default: return { bg: '#EEE', fg: '#555' };
  }
};

export default function CompanyInvoicesScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { companyId } = route.params as { companyId: string };

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    try {
      const res = await listCompanyInvoices(companyId, 1, 50);
      setInvoices(res.invoices || []);
      // Resolve total from any of the common shapes
      setTotal((res as any).total ?? res.meta?.total ?? res.invoices?.length ?? 0);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, [companyId]));

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const renderItem = ({ item }: { item: Invoice }) => {
    const c = statusColor(item.status);
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => (navigation as any).navigate('CompanyInvoiceDetail', {
          companyId, invoiceId: item.invoice_id,
        })}
      >
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Text variant="titleMedium" style={styles.invoiceNumber}>
                {item.invoice_number}
              </Text>
              <Chip style={{ backgroundColor: c.bg }} textStyle={{ color: c.fg, fontSize: 12 }}>
                {item.status.toUpperCase()}
              </Chip>
            </View>
            <Text variant="bodySmall" style={styles.amount}>
              {item.currency} {Number(item.grand_total || 0).toFixed(2)}
            </Text>
            <Text variant="bodySmall" style={styles.meta}>
              Issued: {new Date(item.invoice_date).toLocaleDateString()}
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}><ActivityIndicator size="large" color="#7B2FBE" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Invoices</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>{total} total</Text>
      </View>

      <FlatList
        data={invoices}
        renderItem={renderItem}
        keyExtractor={(i) => i.invoice_id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>No invoices yet</Text></View>
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        color="white"
        onPress={() => (navigation as any).navigate('CompanyInvoiceCreate', { companyId })}
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
  card: { marginBottom: 12, borderRadius: 12, elevation: 2, backgroundColor: '#FFFFFF' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  invoiceNumber: { fontWeight: '700', color: '#1A1A1A', flex: 1, marginRight: 8 },
  amount: { color: '#1A1A1A', fontWeight: '600', fontSize: 15, marginTop: 4 },
  meta: { color: '#888', marginTop: 4, fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
  fab: { position: 'absolute', right: 24, bottom: 24, backgroundColor: '#7B2FBE' },
});


