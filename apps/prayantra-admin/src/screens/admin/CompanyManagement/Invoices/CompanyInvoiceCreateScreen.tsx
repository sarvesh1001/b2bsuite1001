import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, Alert, TouchableOpacity,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, ActivityIndicator, Button, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';

import { createCompanyInvoice, InvoiceItem } from '../../../../services/admin';

type LocalItem = InvoiceItem & { _key: string };

const emptyItem = (): LocalItem => ({
  _key: Math.random().toString(36).slice(2),
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: 0,
  tax_amount: 0,
});

export default function CompanyInvoiceCreateScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { companyId } = route.params as { companyId: string };

  const today = new Date().toISOString().slice(0, 10);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    invoice_date: today,
    currency: 'USD',
    discount_total: '0',
    status: 'issued',
    notes: '',
  });
  const [items, setItems] = useState<LocalItem[]>([emptyItem()]);

  const updateItem = (key: string, patch: Partial<LocalItem>) => {
    setItems((prev) => prev.map((it) => (it._key === key ? { ...it, ...patch } : it)));
  };

  const removeItem = (key: string) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((i) => i._key !== key)));
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  // Derived totals
  const subtotal = items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0),
    0
  );
  const taxTotal = items.reduce((s, it) => {
    const base = (Number(it.quantity) || 0) * (Number(it.unit_price) || 0);
    const rate = Number(it.tax_rate) || 0;
    return s + (base * rate) / 100;
  }, 0);
  const discount = parseFloat(form.discount_total) || 0;
  const grandTotal = subtotal + taxTotal - discount;

  const handleSubmit = async () => {
    const invalid = items.some(
      (it) => !it.description.trim() || (Number(it.quantity) || 0) <= 0
    );
    if (invalid) {
      Alert.alert('Error', 'Each item must have a description and quantity > 0');
      return;
    }
    if (grandTotal <= 0) {
      Alert.alert('Error', 'Grand total must be greater than 0');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        invoice_date: new Date(form.invoice_date).toISOString(),
        // Backend may still require due_date — default it to invoice date
        due_date: new Date(form.invoice_date).toISOString(),
        currency: form.currency,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax_total: parseFloat(taxTotal.toFixed(2)),
        discount_total: discount,
        grand_total: parseFloat(grandTotal.toFixed(2)),
        status: form.status,
        notes: form.notes || undefined,
        items: items.map(({ _key, ...rest }) => ({
          description: rest.description,
          quantity: Number(rest.quantity),
          unit_price: Number(rest.unit_price),
          tax_rate: Number(rest.tax_rate) || 0,
          tax_amount: parseFloat(
            (
              ((Number(rest.quantity) || 0) * (Number(rest.unit_price) || 0) *
                (Number(rest.tax_rate) || 0)) /
              100
            ).toFixed(2)
          ),
        })),
      };
      await createCompanyInvoice(companyId, payload);
      Alert.alert('Success', 'Invoice created', [
        { text: 'OK', onPress: () => (navigation as any).goBack() },
      ]);
    } catch (e: any) {
      Alert.alert(
        'Error',
        e.response?.data?.message || e.message || 'Failed to create invoice'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text variant="headlineMedium" style={styles.title}>Create Invoice</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>Company: {companyId}</Text>

          <TextInput
            mode="outlined"
            label="Invoice Date (YYYY-MM-DD)"
            value={form.invoice_date}
            onChangeText={(t) => setForm({ ...form, invoice_date: t })}
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <TextInput
                mode="outlined"
                label="Currency"
                value={form.currency}
                onChangeText={(t) => setForm({ ...form, currency: t })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
            </View>
            <View style={styles.half}>
              <TextInput
                mode="outlined"
                label="Status"
                value={form.status}
                onChangeText={(t) => setForm({ ...form, status: t })}
                style={styles.input}
                placeholder="draft | issued | paid"
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Discount Total"
            value={String(form.discount_total)}
            onChangeText={(t) => setForm({ ...form, discount_total: t })}
            keyboardType="decimal-pad"
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          <Text variant="titleSmall" style={styles.sectionTitle}>Line Items</Text>

          {items.map((it, idx) => (
            <View key={it._key} style={styles.itemBox}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemIndex}>Item {idx + 1}</Text>
                <TouchableOpacity onPress={() => removeItem(it._key)} disabled={items.length === 1}>
                  <Icon name="close" size={20} color={items.length === 1 ? '#ccc' : '#FF6B6B'} />
                </TouchableOpacity>
              </View>

              <TextInput
                mode="outlined"
                label="Description"
                value={it.description}
                onChangeText={(t) => updateItem(it._key, { description: t })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />

              <View style={styles.row}>
                <View style={styles.third}>
                  <TextInput
                    mode="outlined"
                    label="Qty"
                    value={String(it.quantity)}
                    onChangeText={(t) => updateItem(it._key, { quantity: parseInt(t) || 0 })}
                    keyboardType="number-pad"
                    style={styles.input}
                    theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                  />
                </View>
                <View style={styles.third}>
                  <TextInput
                    mode="outlined"
                    label="Unit Price"
                    value={String(it.unit_price)}
                    onChangeText={(t) => updateItem(it._key, { unit_price: parseFloat(t) || 0 })}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                  />
                </View>
                <View style={styles.third}>
                  <TextInput
                    mode="outlined"
                    label="Tax %"
                    value={String(it.tax_rate)}
                    onChangeText={(t) => updateItem(it._key, { tax_rate: parseFloat(t) || 0 })}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                  />
                </View>
              </View>
            </View>
          ))}

          <Button
            mode="outlined"
            onPress={addItem}
            icon="plus"
            style={styles.addItemBtn}
            labelStyle={{ color: '#7B2FBE' }}
          >
            Add Item
          </Button>

          <Divider style={{ marginVertical: 16 }} />

          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{form.currency} {subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{form.currency} {taxTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text style={styles.totalsValue}>- {form.currency} {discount.toFixed(2)}</Text>
            </View>
            <Divider style={{ marginVertical: 6 }} />
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsLabel, { fontWeight: '700', color: '#1A1A1A' }]}>
                Grand Total
              </Text>
              <Text style={[styles.totalsValue, { fontWeight: '700', color: '#7B2FBE', fontSize: 16 }]}>
                {form.currency} {grandTotal.toFixed(2)}
              </Text>
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Notes"
            value={form.notes}
            onChangeText={(t) => setForm({ ...form, notes: t })}
            multiline
            numberOfLines={3}
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.8}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              style={[styles.buttonGradient, saving && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Invoice</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 26 },
  subtitle: { color: '#666', marginTop: 4, marginBottom: 16, fontSize: 12 },
  sectionTitle: { fontWeight: '600', color: '#1A1A1A', marginTop: 12, marginBottom: 8 },
  input: { marginBottom: 10, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { flex: 0.48 },
  third: { flex: 0.32 },
  itemBox: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemIndex: { fontWeight: '600', color: '#7B2FBE', fontSize: 13 },
  addItemBtn: { borderColor: '#7B2FBE', borderWidth: 1, borderRadius: 12 },
  totalsBox: { marginBottom: 16 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalsLabel: { color: '#666', fontSize: 14 },
  totalsValue: { color: '#1A1A1A', fontSize: 14, fontWeight: '500' },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', minHeight: 54, justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});