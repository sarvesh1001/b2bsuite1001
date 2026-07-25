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
import { Text, TextInput, ActivityIndicator, Chip, Button, Switch } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { createCompany, getSystemDepartments, SystemDepartment } from '../../../services/admin';

const TIERS = [
  { label: 'Basic', value: 'basic' },
  { label: 'Premium', value: 'premium' },
  { label: 'Enterprise', value: 'enterprise' },
];

const REGIONS = [
  { label: 'US East (N. Virginia)', value: 'us-east-1' },
  { label: 'EU West (Ireland)', value: 'eu-west-1' },
  { label: 'Asia Pacific (Mumbai)', value: 'ap-south-1' },
];

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Dubai',
];

export default function CompanyCreateScreen() {
  const navigation = useNavigation();

  const [form, setForm] = useState({
    company_name: '',
    owner_phone: '',
    owner_username: '',
    owner_full_name: '',
    owner_position_title: 'CEO',
    subscription_tier: 'premium',
    max_employees: 100,
    max_departments: 20,
    data_region: 'us-east-1',
    subscription_months: 12,
    subscription_days: 0,
    financial_year_start_month: 4,
    work_center_code: 'MAIN-HQ',
    work_center_name: 'Main Headquarters',
    work_center_description: 'Primary work location',
    work_center_timezone: 'Asia/Kolkata',
    work_center_is_active: true,
  });

  const [allDepartments, setAllDepartments] = useState<SystemDepartment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  const [tierModalVisible, setTierModalVisible] = useState(false);
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [timezoneModalVisible, setTimezoneModalVisible] = useState(false);

  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await getSystemDepartments();
        setAllDepartments(data);
      } catch (error) {
        Alert.alert('Error', 'Failed to load departments');
      } finally {
        setLoadingDepts(false);
      }
    };
    fetchDepts();
  }, []);

  const toggleDepartment = (deptName: string) => {
    setSelectedDepts((prev) =>
      prev.includes(deptName)
        ? prev.filter((d) => d !== deptName)
        : [...prev, deptName]
    );
  };

  const handleCreate = async () => {
    if (!form.company_name.trim()) {
      Alert.alert('Error', 'Company name is required');
      return;
    }
    if (!form.owner_phone.trim() || form.owner_phone.length < 10) {
      Alert.alert('Error', 'Valid owner phone is required');
      return;
    }
    if (!form.owner_username.trim() || form.owner_username.length < 3) {
      Alert.alert('Error', 'Owner username must be at least 3 characters');
      return;
    }
    if (!form.owner_full_name.trim()) {
      Alert.alert('Error', 'Owner full name is required');
      return;
    }
    if (!form.owner_position_title.trim()) {
      Alert.alert('Error', 'Owner position title is required');
      return;
    }
    if (!form.data_region.trim()) {
      Alert.alert('Error', 'Data region is required');
      return;
    }
    if (form.subscription_months < 1 || form.subscription_months > 36) {
      Alert.alert('Error', 'Subscription months must be between 1 and 36');
      return;
    }
    if (selectedDepts.length === 0) {
      Alert.alert('Error', 'Select at least one department');
      return;
    }
    if (selectedDepts.length + 1 > form.max_departments) {
      Alert.alert(
        'Error',
        `You selected ${selectedDepts.length + 1} departments (including default), exceeding max ${form.max_departments}`
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        departments: selectedDepts,
      };
      const result = await createCompany(payload);
      Alert.alert(
        'Success',
        `Company "${result.company_name}" created with ID: ${result.company_id}`,
        [
          {
            text: 'View Company',
            onPress: () => {
              (navigation as any).replace('CompanyDetail', { companyId: result.company_id });
            },
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Failed to create company';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const renderPickerModal = (
    visible: boolean,
    setVisible: (v: boolean) => void,
    options: { label: string; value: string }[],
    selectedValue: string,
    onSelect: (value: string) => void,
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
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  item.value === selectedValue && styles.modalItemSelected,
                ]}
                onPress={() => {
                  onSelect(item.value);
                  setVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    item.value === selectedValue && styles.modalItemTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
          <Button onPress={() => setVisible(false)} style={styles.modalCancel}>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );

  const renderTimezonePicker = () => (
    <Modal
      transparent
      animationType="slide"
      visible={timezoneModalVisible}
      onRequestClose={() => setTimezoneModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Timezone</Text>
          <FlatList
            data={TIMEZONES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  item === form.work_center_timezone && styles.modalItemSelected,
                ]}
                onPress={() => {
                  setForm({ ...form, work_center_timezone: item });
                  setTimezoneModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    item === form.work_center_timezone && styles.modalItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
          <Button onPress={() => setTimezoneModalVisible(false)} style={styles.modalCancel}>
            Cancel
          </Button>
        </View>
      </View>
    </Modal>
  );

  const renderDepartmentChip = (dept: SystemDepartment) => {
    const selected = selectedDepts.includes(dept.name);
    return (
      <Chip
        key={dept.system_department_id}
        selected={selected}
        onPress={() => toggleDepartment(dept.name)}
        style={[styles.deptChip, selected && styles.deptChipSelected]}
        textStyle={selected ? styles.deptChipTextSelected : {}}
      >
        {dept.name}
      </Chip>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>Create Company</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>Fill in the details below</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              mode="outlined"
              label="Company Name *"
              value={form.company_name}
              onChangeText={(text) => setForm({ ...form, company_name: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Owner Phone *"
              value={form.owner_phone}
              onChangeText={(text) => setForm({ ...form, owner_phone: text })}
              keyboardType="phone-pad"
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Owner Username *"
              value={form.owner_username}
              onChangeText={(text) => setForm({ ...form, owner_username: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Owner Full Name *"
              value={form.owner_full_name}
              onChangeText={(text) => setForm({ ...form, owner_full_name: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Position Title *"
              value={form.owner_position_title}
              onChangeText={(text) => setForm({ ...form, owner_position_title: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Max Employees"
                  value={String(form.max_employees)}
                  onChangeText={(text) => setForm({ ...form, max_employees: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Max Departments"
                  value={String(form.max_departments)}
                  onChangeText={(text) => setForm({ ...form, max_departments: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setTierModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Subscription Tier *</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>
                  {TIERS.find(t => t.value === form.subscription_tier)?.label || form.subscription_tier}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setRegionModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Data Region *</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>
                  {REGIONS.find(r => r.value === form.data_region)?.label || form.data_region}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Subscription Months"
                  value={String(form.subscription_months)}
                  onChangeText={(text) => setForm({ ...form, subscription_months: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Subscription Days"
                  value={String(form.subscription_days)}
                  onChangeText={(text) => setForm({ ...form, subscription_days: parseInt(text) || 0 })}
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Financial Year Start Month (1-12)"
              value={String(form.financial_year_start_month)}
              onChangeText={(text) => setForm({ ...form, financial_year_start_month: parseInt(text) || 1 })}
              keyboardType="number-pad"
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <Text variant="titleSmall" style={styles.sectionTitle}>Work Center</Text>

            <TextInput
              mode="outlined"
              label="Work Center Code"
              value={form.work_center_code}
              onChangeText={(text) => setForm({ ...form, work_center_code: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Work Center Name"
              value={form.work_center_name}
              onChangeText={(text) => setForm({ ...form, work_center_name: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Work Center Description"
              value={form.work_center_description}
              onChangeText={(text) => setForm({ ...form, work_center_description: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setTimezoneModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Timezone</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>{form.work_center_timezone}</Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={form.work_center_is_active}
                onValueChange={(value) => setForm({ ...form, work_center_is_active: value })}
                color="#7B2FBE"
              />
            </View>

            <Text variant="titleSmall" style={styles.sectionTitle}>Departments *</Text>
            {loadingDepts ? (
              <ActivityIndicator size="small" color="#7B2FBE" style={{ marginVertical: 8 }} />
            ) : (
              <View style={styles.deptContainer}>
                {allDepartments.map(renderDepartmentChip)}
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.8}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.buttonGradient, loading && styles.buttonDisabled]}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Create Company</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderPickerModal(tierModalVisible, setTierModalVisible, TIERS, form.subscription_tier, (val) => setForm({ ...form, subscription_tier: val }), 'Select Tier')}
      {renderPickerModal(regionModalVisible, setRegionModalVisible, REGIONS, form.data_region, (val) => setForm({ ...form, data_region: val }), 'Select Region')}
      {renderTimezonePicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { marginVertical: 16 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  form: { width: '100%' },
  input: { marginBottom: 12, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 0.48 },
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
  dropdownValueContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownValue: { fontSize: 16, color: '#1A1A1A' },
  sectionTitle: { fontWeight: '600', color: '#1A1A1A', marginTop: 12, marginBottom: 4 },
  deptContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  deptChip: { margin: 4, backgroundColor: '#f0f0f0' },
  deptChipSelected: { backgroundColor: '#00B4DB' },
  deptChipTextSelected: { color: 'white' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  switchLabel: { fontSize: 16, color: '#1A1A1A' },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  buttonGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 16, width: '80%', maxHeight: '60%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', color: '#1A1A1A' },
  modalItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  modalItemSelected: { backgroundColor: '#E8E0F0' },
  modalItemText: { fontSize: 16, color: '#1A1A1A' },
  modalItemTextSelected: { color: '#7B2FBE', fontWeight: '600' },
  modalCancel: { marginTop: 8 },
});