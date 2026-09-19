import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, Button, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';

import {
  getCompanyInvoice,
  getCompanyInvoiceItems,
  updateCompanyInvoiceStatus,
  deleteCompanyInvoice,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
} from '../../../../services/admin';

const STATUSES: InvoiceStatus[] = ['draft', 'issued', 'paid', 'overdue', 'cancelled'];

export default function CompanyInvoiceDetailScreen() {
  const route = useRoute();
  const { companyId, invoiceId } = route.params as { companyId: string; invoiceId: string };

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const load = async () => {
    try {
      const [inv, its] = await Promise.all([
        getCompanyInvoice(companyId, invoiceId),
        getCompanyInvoiceItems(companyId, invoiceId).catch(() => []),
      ]);
      setInvoice(inv);
      setItems(its || inv.items || []);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId, invoiceId]);

  const handleStatusChange = async (status: InvoiceStatus) => {
    setModalVisible(false);
    setBusy(true);
    try {
      const updated = await updateCompanyInvoiceStatus(companyId, invoiceId, status);
      setInvoice(updated);
      Alert.alert('Success', `Invoice marked as ${status}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Invoice', 'Are you sure? This soft-deletes the invoice.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteCompanyInvoice(companyId, invoiceId);
            Alert.alert('Success', 'Invoice deleted');
            (route as any).params?.onDeleted?.();
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Delete failed');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (loading || !invoice) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}><ActivityIndicator size="large" color="#7B2FBE" /></View>
      </SafeAreaView>
    );
  }

  const row = (label: string, value: string) => (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.number}>{invoice.invoice_number}</Text>
          <Chip>{invoice.status.toUpperCase()}</Chip>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            {row('Company', invoice.company_id)}
            {row('Invoice Date', new Date(invoice.invoice_date).toLocaleDateString())}
            {row('Currency', invoice.currency)}
            {invoice.notes ? row('Notes', invoice.notes) : null}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Line Items</Text>
            {items.length === 0 ? (
              <Text style={styles.emptyText}>No items</Text>
            ) : (
              items.map((it, idx) => (
                <View key={it.item_id || idx} style={styles.itemRow}>
                  <Text style={styles.itemDesc}>{it.description}</Text>
                  <Text style={styles.itemMeta}>
                    {it.quantity} × {invoice.currency} {Number(it.unit_price || 0).toFixed(2)}
                    {it.tax_rate ? `  •  Tax ${it.tax_rate}%` : ''}
                  </Text>
                  <Text style={styles.itemAmount}>
                    = {invoice.currency}{' '}
                    {((Number(it.quantity) || 0) * (Number(it.unit_price) || 0) + (Number(it.tax_amount) || 0)).toFixed(2)}
                  </Text>
                  {idx < items.length - 1 && <Divider style={{ marginVertical: 8 }} />}
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            {row('Subtotal', `${invoice.currency} ${Number(invoice.subtotal || 0).toFixed(2)}`)}
            {row('Tax', `${invoice.currency} ${Number(invoice.tax_total || 0).toFixed(2)}`)}
            {row('Discount', `${invoice.currency} ${Number(invoice.discount_total || 0).toFixed(2)}`)}
            <Divider style={{ marginVertical: 6 }} />
            <View style={styles.infoRow}>
              <Text style={[styles.label, { fontWeight: '700', color: '#1A1A1A' }]}>Grand Total</Text>
              <Text style={[styles.value, { fontWeight: '700', color: '#7B2FBE' }]}>
                {invoice.currency} {Number(invoice.grand_total || 0).toFixed(2)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <TouchableOpacity onPress={() => setModalVisible(true)} disabled={busy} activeOpacity={0.8} style={styles.btnWrapper}>
          <LinearGradient colors={['#00B4DB', '#7B2FBE']} style={styles.buttonGradient}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change Status</Text>}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleDelete} disabled={busy} activeOpacity={0.8}
          style={[styles.btnWrapper, { marginTop: 10 }]}>
          <LinearGradient colors={['#FF6B6B', '#EE5A24']} style={styles.buttonGradient}>
            <Text style={styles.buttonText}>Delete Invoice</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent animationType="slide" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Status</Text>
            <FlatList
              data={STATUSES}
              keyExtractor={(s) => s}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleStatusChange(item)}>
                  <Text style={styles.modalItemText}>{item.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
            />
            <Button onPress={() => setModalVisible(false)}>Cancel</Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  number: { fontWeight: 'bold', color: '#1A1A1A', flex: 1, marginRight: 8 },
  card: { borderRadius: 12, marginBottom: 12, elevation: 2, backgroundColor: '#FFF' },
  sectionTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#666', fontSize: 13, marginRight: 8, flexShrink: 0 },
  value: { color: '#1A1A1A', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  itemRow: { paddingVertical: 4 },
  itemDesc: { color: '#1A1A1A', fontWeight: '600', fontSize: 14 },
  itemMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  itemAmount: { color: '#7B2FBE', fontSize: 13, fontWeight: '600', marginTop: 2 },
  emptyText: { color: '#999', fontStyle: 'italic' },
  btnWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  buttonGradient: { paddingVertical: 14, alignItems: 'center', minHeight: 50, justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 16, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#1A1A1A' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemText: { fontSize: 16, color: '#1A1A1A', textAlign: 'center' },
});