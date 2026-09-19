import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';

import {
  getCompanyPayment,
  updateCompanyPaymentStatus,
  Payment,
  PaymentStatus,
} from '../../../../services/admin';

const STATUSES: PaymentStatus[] = ['pending', 'success', 'failed', 'refunded'];

export default function CompanyPaymentDetailScreen() {
  const route = useRoute();
  const { companyId, paymentId } = route.params as { companyId: string; paymentId: string };

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const load = async () => {
    try {
      const data = await getCompanyPayment(companyId, paymentId);
      setPayment(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load payment');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId, paymentId]);

  const handleStatusChange = async (status: PaymentStatus) => {
    setModalVisible(false);
    setUpdating(true);
    try {
      const updated = await updateCompanyPaymentStatus(companyId, paymentId, status);
      setPayment(updated);
      Alert.alert('Success', `Payment marked as ${status}`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !payment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}><ActivityIndicator size="large" color="#7B2FBE" /></View>
      </SafeAreaView>
    );
  }

  const row = (label: string, value: string) => (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.amount}>
            {payment.currency} {payment.amount.toFixed(2)}
          </Text>
          <Chip>{payment.status.toUpperCase()}</Chip>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            {row('Payment ID', payment.payment_id)}
            {payment.plan_id ? row('Plan ID', payment.plan_id) : null}
            {row('Method', payment.payment_method)}
            {payment.gateway_txn_id ? row('Gateway Txn', payment.gateway_txn_id) : null}
            {row('Date', new Date(payment.payment_date).toLocaleString())}
            {payment.notes ? row('Notes', payment.notes) : null}
            {row('Created', new Date(payment.created_at).toLocaleString())}
            {row('Updated', new Date(payment.updated_at).toLocaleString())}
          </Card.Content>
        </Card>

        <TouchableOpacity onPress={() => setModalVisible(true)} disabled={updating} activeOpacity={0.8}>
          <LinearGradient colors={['#00B4DB', '#7B2FBE']} style={styles.buttonGradient}>
            {updating ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Change Status</Text>}
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
  amount: { fontWeight: 'bold', color: '#1A1A1A' },
  card: { borderRadius: 12, marginBottom: 16, elevation: 2, backgroundColor: '#FFF' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#666', fontSize: 13, marginRight: 8, flexShrink: 0 },
  value: { color: '#1A1A1A', fontSize: 13, fontWeight: '500', flex: 1, textAlign: 'right' },
  buttonGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 12 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 16, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#1A1A1A' },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemText: { fontSize: 16, color: '#1A1A1A', textAlign: 'center' },
});