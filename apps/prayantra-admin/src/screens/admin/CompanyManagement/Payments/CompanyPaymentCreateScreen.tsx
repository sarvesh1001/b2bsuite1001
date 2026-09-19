// apps/prayantra-admin/src/screens/admin/CompanyManagement/Payments/CompanyPaymentCreateScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, ActivityIndicator, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';

import {
  createCompanyPayment,
  listSubscriptionPlans,
  getCompanyById,
  getSubscriptionPlanById,
  SubscriptionPlan,
  CompanyDetail,
} from '../../../../services/admin';

const PAYMENT_METHODS = [
  { label: 'Credit Card', value: 'credit_card' },
  { label: 'Bank Transfer', value: 'bank_transfer' },
  { label: 'Cash', value: 'cash' },
  { label: 'UPI', value: 'upi' },
  { label: 'Net Banking', value: 'net_banking' },
];

const PAYMENT_STATUSES = [
  { label: 'Success', value: 'success' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
  { label: 'Refunded', value: 'refunded' },
];

export default function CompanyPaymentCreateScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { companyId } = route.params as { companyId: string };

  // Loading = prefetching company + plan details
  const [prefetching, setPrefetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [methodModalVisible, setMethodModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const nowIso = new Date().toISOString();
  const [form, setForm] = useState({
    plan_id: '',
    amount: '',
    currency: 'USD',
    payment_date: nowIso,
    payment_method: 'credit_card',
    gateway_txn_id: '',
    status: 'success',
    notes: '',
  });

  // Track where the plan came from so we know if the amount was auto-filled
  const [autoFilledFromCompany, setAutoFilledFromCompany] = useState(false);
  const [companyPlanName, setCompanyPlanName] = useState<string>('');

  // ============================================================
  // 1) Prefetch company + its plan on mount
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Kick both requests in parallel
        const [companyRes, plansRes] = await Promise.all([
          getCompanyById(companyId).catch((e) => {
            console.warn('⚠️ Failed to fetch company:', e?.message);
            return null as CompanyDetail | null;
          }),
          listSubscriptionPlans(1, 100, true).catch(() => ({ plans: [] })),
        ]);

        if (cancelled) return;

        setPlans(plansRes.plans || []);
        setPlansLoading(false);

        // Get the plan id from the company
        const planId = companyRes?.subscription_plan_id;

        if (planId) {
          // Try to resolve plan info — prefer from the already-fetched list,
          // fallback to a dedicated fetch
          let plan: SubscriptionPlan | undefined = (plansRes.plans || []).find(
            (p) => p.plan_id === planId
          );

          if (!plan) {
            try {
              plan = await getSubscriptionPlanById(planId);
            } catch (e: any) {
              console.warn('⚠️ Failed to fetch plan:', e?.message);
            }
          }

          if (cancelled) return;

          if (plan) {
            setCompanyPlanName(plan.plan_name || plan.plan_code || '');
            setForm((f) => ({
              ...f,
              plan_id: plan!.plan_id,
              amount: String(plan!.price ?? ''),
              currency: plan!.currency || f.currency,
            }));
            setAutoFilledFromCompany(true);
          } else if (companyRes?.subscription_plan_id) {
            // We at least know the plan id — preselect it
            setForm((f) => ({
              ...f,
              plan_id: companyRes!.subscription_plan_id,
            }));
          }
        }
      } catch (e: any) {
        console.warn('⚠️ Prefetch failed:', e?.message);
      } finally {
        if (!cancelled) {
          setPrefetching(false);
          setPlansLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // ============================================================
  // Plan select
  // ============================================================
  const handleSelectPlan = (planId: string) => {
    const plan = plans.find((p) => p.plan_id === planId);
    setPlanModalVisible(false);
    if (!plan) {
      setForm((f) => ({ ...f, plan_id: '' }));
      return;
    }
    setForm((f) => ({
      ...f,
      plan_id: plan.plan_id,
      amount: String(plan.price ?? ''),
      currency: plan.currency || f.currency,
    }));
    // Once user manually changes the plan, stop treating it as auto-filled
    setAutoFilledFromCompany(false);
  };

  const selectedPlan = plans.find((p) => p.plan_id === form.plan_id);

  // ============================================================
  // Submit
  // ============================================================
  const handleSubmit = async () => {
    if (!form.plan_id) {
      Alert.alert('Error', 'Please select a plan');
      return;
    }
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Amount must be greater than 0');
      return;
    }
    if (!form.payment_date) {
      Alert.alert('Error', 'Payment date is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        plan_id: form.plan_id,
        amount,
        currency: form.currency.trim() || 'USD',
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        gateway_txn_id: form.gateway_txn_id.trim() || undefined,
        status: form.status,
        notes: form.notes.trim() || undefined,
        gateway_response: null,
      };
      console.log('📤 [createPayment] payload:', JSON.stringify(payload, null, 2));
      const result = await createCompanyPayment(companyId, payload);
      console.log('✅ [createPayment] response:', JSON.stringify(result, null, 2));
      Alert.alert('Success', 'Payment recorded', [
        { text: 'OK', onPress: () => (navigation as any).goBack() },
      ]);
    } catch (e: any) {
      console.error('❌ [createPayment]', e);
      Alert.alert(
        'Error',
        e.response?.data?.message || e.message || 'Failed to create payment'
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Picker modal helper
  // ============================================================
  const renderPicker = (
    visible: boolean,
    setVisible: (v: boolean) => void,
    options: { label: string; value: string }[],
    selected: string,
    onSelect: (v: string) => void,
    title: string
  ) => (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(i) => i.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  item.value === selected && styles.modalItemSelected,
                ]}
                onPress={() => {
                  onSelect(item.value);
                  setVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    item.value === selected && styles.modalItemTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
          <Button onPress={() => setVisible(false)}>Cancel</Button>
        </View>
      </View>
    </Modal>
  );

  // ============================================================
  // Prefetch loading screen
  // ============================================================
  if (prefetching) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
          <Text style={styles.loadingText}>Loading subscription details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="headlineMedium" style={styles.title}>
            Record Payment
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Manual payment entry (bank transfer, cash, offline)
          </Text>

          {/* Auto-fill info banner */}
          {autoFilledFromCompany && companyPlanName ? (
            <View style={styles.infoBanner}>
              <Icon name="information-outline" size={16} color="#00695C" />
              <Text style={styles.infoText}>
                Prefilled from company's subscription: {companyPlanName}
              </Text>
            </View>
          ) : null}

          {/* Plan picker */}
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setPlanModalVisible(true)}
            disabled={plansLoading}
          >
            <Text style={styles.dropdownLabel}>Plan *</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={styles.dropdownValue} numberOfLines={1}>
                {plansLoading
                  ? 'Loading plans…'
                  : selectedPlan
                  ? `${selectedPlan.plan_name} (${selectedPlan.plan_code})`
                  : 'Select a plan'}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.half}>
              <TextInput
                mode="outlined"
                label="Amount *"
                value={form.amount}
                onChangeText={(t) => {
                  setForm({ ...form, amount: t });
                  setAutoFilledFromCompany(false);
                }}
                keyboardType="decimal-pad"
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
            </View>
            <View style={styles.half}>
              <TextInput
                mode="outlined"
                label="Currency *"
                value={form.currency}
                onChangeText={(t) => setForm({ ...form, currency: t })}
                autoCapitalize="characters"
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Payment Date (ISO) *"
            value={form.payment_date}
            onChangeText={(t) => setForm({ ...form, payment_date: t })}
            style={styles.input}
            placeholder="2026-09-09T10:00:00Z"
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          {/* Payment method picker */}
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setMethodModalVisible(true)}
          >
            <Text style={styles.dropdownLabel}>Payment Method *</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={styles.dropdownValue}>
                {PAYMENT_METHODS.find((m) => m.value === form.payment_method)
                  ?.label || form.payment_method}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <TextInput
            mode="outlined"
            label="Gateway Txn ID (optional)"
            value={form.gateway_txn_id}
            onChangeText={(t) => setForm({ ...form, gateway_txn_id: t })}
            style={styles.input}
            placeholder="trial_payment_002"
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          {/* Status picker */}
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setStatusModalVisible(true)}
          >
            <Text style={styles.dropdownLabel}>Status *</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={styles.dropdownValue}>
                {PAYMENT_STATUSES.find((s) => s.value === form.status)?.label ||
                  form.status}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </View>
          </TouchableOpacity>

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
                <Text style={styles.buttonText}>Record Payment</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Plan picker modal */}
      <Modal
        transparent
        animationType="slide"
        visible={planModalVisible}
        onRequestClose={() => setPlanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Plan</Text>
            {plansLoading ? (
              <ActivityIndicator color="#7B2FBE" />
            ) : (
              <FlatList
                data={plans}
                keyExtractor={(p) => p.plan_id}
                renderItem={({ item }) => {
                  const isCurrent =
                    companyPlanName && item.plan_name === companyPlanName;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.modalItem,
                        item.plan_id === form.plan_id && styles.modalItemSelected,
                      ]}
                      onPress={() => handleSelectPlan(item.plan_id)}
                    >
                      <View style={styles.modalItemRow}>
                        <Text
                          style={[
                            styles.modalItemText,
                            item.plan_id === form.plan_id &&
                              styles.modalItemTextSelected,
                          ]}
                        >
                          {item.plan_name} ({item.plan_code})
                        </Text>
                        {isCurrent ? (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>CURRENT</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.modalItemSub}>
                        {item.currency} {item.price} / {item.duration_days} days
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <Text style={styles.modalEmpty}>No plans available</Text>
                }
              />
            )}
            <Button onPress={() => setPlanModalVisible(false)}>Cancel</Button>
          </View>
        </View>
      </Modal>

      {renderPicker(
        methodModalVisible,
        setMethodModalVisible,
        PAYMENT_METHODS,
        form.payment_method,
        (v) => setForm({ ...form, payment_method: v }),
        'Select Payment Method'
      )}
      {renderPicker(
        statusModalVisible,
        setStatusModalVisible,
        PAYMENT_STATUSES,
        form.status,
        (v) => setForm({ ...form, status: v }),
        'Select Status'
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#666', marginTop: 12, fontSize: 14 },
  scroll: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 26 },
  subtitle: { color: '#666', marginTop: 4, marginBottom: 16 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoText: {
    color: '#00695C',
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  input: { marginBottom: 12, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { flex: 0.48 },
  dropdown: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  dropdownLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  dropdownValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: { fontSize: 16, color: '#1A1A1A', flex: 1 },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#1A1A1A',
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemSelected: { backgroundColor: '#E8E0F0' },
  modalItemText: { fontSize: 16, color: '#1A1A1A', flex: 1 },
  modalItemTextSelected: { color: '#7B2FBE', fontWeight: '600' },
  modalItemSub: { fontSize: 12, color: '#888', marginTop: 2 },
  modalEmpty: { textAlign: 'center', color: '#999', paddingVertical: 12 },
  currentBadge: {
    backgroundColor: '#E0F7FA',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  currentBadgeText: {
    color: '#00695C',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});