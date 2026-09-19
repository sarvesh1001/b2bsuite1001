import React, { useState, useEffect } from 'react';
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
import { Text, TextInput, ActivityIndicator, Switch, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  updateCompanyDetails,
  getCompanyById,
  listSubscriptionPlans,
  Company,
  SubscriptionPlan,
} from '../../../../services/admin';

const SUBSCRIPTION_STATUSES = [
  { label: 'Active', value: 'active' },
  { label: 'Trial', value: 'trial' },
  { label: 'Grace Period', value: 'grace_period' },
  { label: 'Expired', value: 'expired' },
  { label: 'Cancelled', value: 'cancelled' },
];

const REGIONS = [
  { label: 'US East (N. Virginia)', value: 'us-east-1' },
  { label: 'EU West (Ireland)', value: 'eu-west-1' },
  { label: 'Asia Pacific (Mumbai)', value: 'ap-south-1' },
];

export default function CompanyUpdateDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { companyId } = route.params as { companyId: string };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [regionModalVisible, setRegionModalVisible] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    data_region: 'us-east-1',
    financial_year_start_month: 4,
    max_employees: 100,
    max_locations: 20,
    is_active: true,
    subscription_plan_code: '',
    subscription_status: 'active',
    grace_period_days: 14,
    extend_by_months: 0,
    extend_by_days: 0,
    subscription_start_date: '',
    subscription_end_date: '',
    trial_start_date: '',
    trial_end_date: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const [company, plansRes] = await Promise.all([
          getCompanyById(companyId),
          listSubscriptionPlans(1, 100, true).catch(() => ({ plans: [] })),
        ]);
        setPlans(plansRes.plans || []);
        setForm({
          company_name: company.company_name || '',
          data_region: company.data_region || 'us-east-1',
          financial_year_start_month:
            company.financial_year_start_month ||
            company.FinancialYearStartMonth ||
            4,
          max_employees: company.max_employees || 0,
          max_locations: company.max_locations || 0,
          is_active: company.is_active ?? true,
          subscription_plan_code: company.subscription_plan_code || '',
          subscription_status: company.subscription_status || 'active',
          grace_period_days: company.grace_period_days ?? 14,
          extend_by_months: 0,
          extend_by_days: 0,
          subscription_start_date: company.subscription_start_date || '',
          subscription_end_date: company.subscription_end_date || '',
          trial_start_date: company.trial_start_date || '',
          trial_end_date: company.trial_end_date || '',
        });
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Failed to load company');
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId]);

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: any = { ...form };
      // strip empty dates so backend doesn't reject
      ['subscription_start_date', 'subscription_end_date', 'trial_start_date', 'trial_end_date']
        .forEach((k) => { if (!payload[k]) delete payload[k]; });
      await updateCompanyDetails(companyId, payload);
      Alert.alert('Success', 'Company details updated', [
        { text: 'OK', onPress: () => (navigation as any).goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const renderPicker = (
    visible: boolean,
    setVisible: (v: boolean) => void,
    options: { label: string; value: string }[],
    selected: string,
    onSelect: (v: string) => void,
    title: string
  ) => (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={() => setVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(i) => i.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalItem, item.value === selected && styles.modalItemSelected]}
                onPress={() => { onSelect(item.value); setVisible(false); }}
              >
                <Text style={[styles.modalItemText, item.value === selected && styles.modalItemTextSelected]}>
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}><ActivityIndicator size="large" color="#7B2FBE" /></View>
      </SafeAreaView>
    );
  }

  const planOptions = plans.map((p) => ({ label: `${p.plan_name} (${p.plan_code})`, value: p.plan_code }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text variant="headlineMedium" style={styles.title}>Update Company</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>{companyId}</Text>

          <Text variant="titleSmall" style={styles.sectionTitle}>Company</Text>
          <TextInput mode="outlined" label="Company Name" value={form.company_name}
            onChangeText={(t) => setForm({ ...form, company_name: t })} style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />

          <TouchableOpacity style={styles.dropdown} onPress={() => setRegionModalVisible(true)}>
            <Text style={styles.dropdownLabel}>Data Region</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={styles.dropdownValue}>
                {REGIONS.find((r) => r.value === form.data_region)?.label || form.data_region}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.half}>
              <TextInput mode="outlined" label="Max Employees" value={String(form.max_employees)}
                onChangeText={(t) => setForm({ ...form, max_employees: parseInt(t) || 0 })}
                keyboardType="number-pad" style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />
            </View>
            <View style={styles.half}>
              <TextInput mode="outlined" label="Max Locations" value={String(form.max_locations)}
                onChangeText={(t) => setForm({ ...form, max_locations: parseInt(t) || 0 })}
                keyboardType="number-pad" style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />
            </View>
          </View>

          <TextInput mode="outlined" label="Financial Year Start Month (1-12)"
            value={String(form.financial_year_start_month)}
            onChangeText={(t) => setForm({ ...form, financial_year_start_month: parseInt(t) || 1 })}
            keyboardType="number-pad" style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch value={form.is_active} onValueChange={(v) => setForm({ ...form, is_active: v })} color="#7B2FBE" />
          </View>

          <Text variant="titleSmall" style={styles.sectionTitle}>Subscription</Text>

          <TouchableOpacity style={styles.dropdown} onPress={() => setPlanModalVisible(true)}>
            <Text style={styles.dropdownLabel}>Plan</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={styles.dropdownValue}>
                {plans.find((p) => p.plan_code === form.subscription_plan_code)?.plan_name || form.subscription_plan_code || 'Select plan'}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dropdown} onPress={() => setStatusModalVisible(true)}>
            <Text style={styles.dropdownLabel}>Status</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={styles.dropdownValue}>
                {SUBSCRIPTION_STATUSES.find((s) => s.value === form.subscription_status)?.label || form.subscription_status}
              </Text>
              <Icon name="chevron-down" size={20} color="#666" />
            </View>
          </TouchableOpacity>

          <TextInput mode="outlined" label="Grace Period (days)"
            value={String(form.grace_period_days)}
            onChangeText={(t) => setForm({ ...form, grace_period_days: parseInt(t) || 0 })}
            keyboardType="number-pad" style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />

          <View style={styles.row}>
            <View style={styles.half}>
              <TextInput mode="outlined" label="Extend by Months" value={String(form.extend_by_months)}
                onChangeText={(t) => setForm({ ...form, extend_by_months: parseInt(t) || 0 })}
                keyboardType="number-pad" style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />
            </View>
            <View style={styles.half}>
              <TextInput mode="outlined" label="Extend by Days" value={String(form.extend_by_days)}
                onChangeText={(t) => setForm({ ...form, extend_by_days: parseInt(t) || 0 })}
                keyboardType="number-pad" style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />
            </View>
          </View>

          <TextInput mode="outlined" label="Subscription Start (ISO)"
            value={form.subscription_start_date}
            onChangeText={(t) => setForm({ ...form, subscription_start_date: t })}
            style={styles.input} placeholder="2026-09-11T00:00:00Z"
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />

          <TextInput mode="outlined" label="Subscription End (ISO)"
            value={form.subscription_end_date}
            onChangeText={(t) => setForm({ ...form, subscription_end_date: t })}
            style={styles.input} placeholder="2027-09-11T00:00:00Z"
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />

          <Text variant="titleSmall" style={styles.sectionTitle}>Trial</Text>
          <TextInput mode="outlined" label="Trial Start (ISO)"
            value={form.trial_start_date}
            onChangeText={(t) => setForm({ ...form, trial_start_date: t })}
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />
          <TextInput mode="outlined" label="Trial End (ISO)"
            value={form.trial_end_date}
            onChangeText={(t) => setForm({ ...form, trial_end_date: t })}
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }} />

          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.buttonWrapper} activeOpacity={0.8}>
            <LinearGradient colors={['#00B4DB', '#7B2FBE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.buttonGradient, saving && { opacity: 0.6 }]}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save Changes</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderPicker(regionModalVisible, setRegionModalVisible, REGIONS, form.data_region,
        (v) => setForm({ ...form, data_region: v }), 'Select Region')}
      {renderPicker(statusModalVisible, setStatusModalVisible, SUBSCRIPTION_STATUSES, form.subscription_status,
        (v) => setForm({ ...form, subscription_status: v }), 'Select Status')}
      {renderPicker(planModalVisible, setPlanModalVisible, planOptions, form.subscription_plan_code,
        (v) => setForm({ ...form, subscription_plan_code: v }), 'Select Plan')}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 26 },
  subtitle: { color: '#666', marginTop: 4, marginBottom: 12, fontSize: 12 },
  sectionTitle: { fontWeight: '600', color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { flex: 0.48 },
  dropdown: {
    marginBottom: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: 'white',
  },
  dropdownLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  dropdownValueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownValue: { fontSize: 16, color: '#1A1A1A', flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  switchLabel: { fontSize: 16, color: '#1A1A1A' },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 20 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 16, width: '80%', maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#1A1A1A' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemSelected: { backgroundColor: '#E8E0F0' },
  modalItemText: { fontSize: 16, color: '#1A1A1A' },
  modalItemTextSelected: { color: '#7B2FBE', fontWeight: '600' },
});