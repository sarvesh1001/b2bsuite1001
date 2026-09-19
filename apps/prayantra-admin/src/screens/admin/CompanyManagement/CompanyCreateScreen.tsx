// apps/mobile/src/screens/admin/CompanyManagement/CompanyCreateScreen.tsx
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
import {
  Text,
  TextInput,
  ActivityIndicator,
  Chip,
  Button,
  Switch,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  createCompany,
  getSystemDepartments,
  listSubscriptionPlans,
  SystemDepartment,
  SubscriptionPlan,
} from '../../../services/admin';

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

// ---- Owner HR profile enums (must match backend validation) ----
const GENDERS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const MARITAL_STATUSES = [
  { label: 'Single', value: 'single' },
  { label: 'Married', value: 'married' },
  { label: 'Divorced', value: 'divorced' },
  { label: 'Widowed', value: 'widowed' },
  { label: 'Separated', value: 'separated' },
];

const EMPLOYMENT_TYPES = [
  { label: 'Full time', value: 'full_time' },
  { label: 'Part time', value: 'part_time' },
  { label: 'Contract', value: 'contract' },
  { label: 'Intern', value: 'intern' },
  { label: 'Consultant', value: 'consultant' },
  { label: 'Temporary', value: 'temporary' },
];

const EMPLOYMENT_STATUSES = [
  { label: 'Active', value: 'active' },
  { label: 'Probation', value: 'probation' },
  { label: 'On leave', value: 'on_leave' },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Terminated', value: 'terminated' },
  { label: 'Resigned', value: 'resigned' },
];

// Departments that must never be assigned during company creation
const EXCLUDED_DEPARTMENTS = ['Administration', 'Super Admin Management'];

// Convert YYYY-MM-DD → RFC3339 UTC, or return null if unparseable/empty.
const toRFC3339 = (value: string): string | null => {
  const v = value.trim();
  if (!v) return null;
  // Accept both YYYY-MM-DD and full RFC3339.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T00:00:00Z` : v;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
};

export default function CompanyCreateScreen() {
  const navigation = useNavigation();

  const [form, setForm] = useState({
    // Company + owner
    company_name: '',
    owner_phone: '',
    owner_username: '',
    owner_full_name: '',
    owner_position_title: 'CEO',

    // ---- Owner HR profile (all optional) ----
    owner_email: '',
    owner_date_of_birth: '',          // YYYY-MM-DD
    owner_gender: '',
    owner_marital_status: '',
    owner_nationality: '',
    owner_employment_type: '',
    owner_employment_status: 'active',
    owner_probation_end_date: '',     // YYYY-MM-DD
    owner_confirmation_date: '',      // YYYY-MM-DD
    owner_grade: '',
    owner_tax_id: '',
    owner_social_security_id: '',
    owner_cost_center: '',            // nullable text
    owner_cost_center_id: '',         // nullable UUID (text)

    // Subscription — defaults are 0 = "no subscription yet".
    subscription_tier: '',
    subscription_plan_code: '',
    max_employees: 100,
    max_locations: 20,
    trial_days: 0,
    data_region: 'us-east-1',
    subscription_months: 0,
    subscription_days: 0,
    financial_year_start_month: 4,

    // Work center
    work_center_code: 'MAIN-HQ',
    work_center_name: 'Main Headquarters',
    work_center_description: 'Primary work location',
    work_center_timezone: 'Asia/Kolkata',
    work_center_is_active: true,

    // Location
    location_code: '',
    location_name: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
  });

  const [allDepartments, setAllDepartments] = useState<SystemDepartment[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const [loading, setLoading] = useState(false);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);

  const [tierModalVisible, setTierModalVisible] = useState(false);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [timezoneModalVisible, setTimezoneModalVisible] = useState(false);

  // Owner profile enum pickers
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [maritalModalVisible, setMaritalModalVisible] = useState(false);
  const [employmentTypeModalVisible, setEmploymentTypeModalVisible] = useState(false);
  const [employmentStatusModalVisible, setEmploymentStatusModalVisible] = useState(false);

  // ---------------------------------------------------------
  // Load system departments + active subscription plans
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const data = await getSystemDepartments();
        const filtered = data.filter(
          (d) => !EXCLUDED_DEPARTMENTS.includes(d.name)
        );
        setAllDepartments(filtered);
      } catch (e) {
        Alert.alert('Error', 'Failed to load departments');
      } finally {
        setLoadingDepts(false);
      }
    };

    const fetchPlans = async () => {
      try {
        const res = await listSubscriptionPlans(1, 50, false);
        setPlans(res.plans || []);
      } catch (e) {
        console.warn('Failed to load subscription plans', e);
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchDepts();
    fetchPlans();
  }, []);

  const toggleDepartment = (deptName: string) => {
    if (EXCLUDED_DEPARTMENTS.includes(deptName)) return;
    setSelectedDepts((prev) =>
      prev.includes(deptName)
        ? prev.filter((d) => d !== deptName)
        : [...prev, deptName]
    );
  };

  // ---------------------------------------------------------
  // Validation + submit
  // ---------------------------------------------------------
  const handleCreate = async () => {
    // Required fields only — subscription fields are optional.
    if (!form.company_name.trim())
      return Alert.alert('Error', 'Company name is required');
    if (!form.owner_phone.trim() || form.owner_phone.length < 10)
      return Alert.alert('Error', 'Valid owner phone is required');
    if (!form.owner_username.trim() || form.owner_username.length < 3)
      return Alert.alert('Error', 'Owner username must be at least 3 characters');
    if (!form.owner_full_name.trim())
      return Alert.alert('Error', 'Owner full name is required');
    if (!form.owner_position_title.trim())
      return Alert.alert('Error', 'Owner position title is required');
    if (!form.data_region.trim())
      return Alert.alert('Error', 'Data region is required');
    if (selectedDepts.length === 0)
      return Alert.alert('Error', 'Select at least one department');
    if (!form.location_code.trim() || !form.location_name.trim())
      return Alert.alert('Error', 'Location code and name are required');
    if (!form.city.trim() || !form.country.trim())
      return Alert.alert('Error', 'City and country are required');

    // ⚠️ 0 is allowed and meaningful — it means "do not open a subscription".
    if (form.subscription_months < 0 || form.subscription_months > 36)
      return Alert.alert('Error', 'Subscription months must be between 0 and 36');
    if (form.subscription_days < 0 || form.subscription_days > 30)
      return Alert.alert('Error', 'Subscription days must be between 0 and 30');
    if (form.trial_days < 0)
      return Alert.alert('Error', 'Trial days cannot be negative');

    // ---- Owner profile soft validation ----
    if (form.owner_email.trim() && !/^\S+@\S+\.\S+$/.test(form.owner_email.trim()))
      return Alert.alert('Error', 'Owner email looks invalid');
    if (form.owner_date_of_birth.trim() && !toRFC3339(form.owner_date_of_birth))
      return Alert.alert('Error', 'Owner date of birth must be YYYY-MM-DD');
    if (form.owner_probation_end_date.trim() && !toRFC3339(form.owner_probation_end_date))
      return Alert.alert('Error', 'Probation end date must be YYYY-MM-DD');
    if (form.owner_confirmation_date.trim() && !toRFC3339(form.owner_confirmation_date))
      return Alert.alert('Error', 'Confirmation date must be YYYY-MM-DD');

    setLoading(true);
    try {
      // Build payload without empty optional strings — backend treats them
      // as "not supplied".
      const payload: any = {
        ...form,
        departments: selectedDepts.filter(
          (d) => !EXCLUDED_DEPARTMENTS.includes(d)
        ),
      };

      // Optional subscription fields — omit when blank.
      if (!form.subscription_plan_code) delete payload.subscription_plan_code;
      if (!form.subscription_tier) delete payload.subscription_tier;

      // Optional location / work-center strings.
      [
        'address_line1',
        'address_line2',
        'state',
        'pincode',
        'work_center_description',
      ].forEach((k) => {
        if (!payload[k]) delete payload[k];
      });

      // ---- Owner HR profile: convert dates, drop blanks, keep cost_center nullable.
      const dob = toRFC3339(form.owner_date_of_birth);
      const probationEnd = toRFC3339(form.owner_probation_end_date);
      const confirmation = toRFC3339(form.owner_confirmation_date);

      // Remove the raw text versions — the API expects the *owner_* names below.
      delete payload.owner_date_of_birth;
      delete payload.owner_probation_end_date;
      delete payload.owner_confirmation_date;

      const ownerProfile: Record<string, any> = {
        owner_date_of_birth: dob,
        owner_probation_end_date: probationEnd,
        owner_confirmation_date: confirmation,
        owner_gender: form.owner_gender.trim() || null,
        owner_marital_status: form.owner_marital_status.trim() || null,
        owner_nationality: form.owner_nationality.trim() || null,
        owner_employment_type: form.owner_employment_type.trim() || null,
        owner_employment_status: form.owner_employment_status.trim() || null,
        owner_grade: form.owner_grade.trim() || null,
        owner_tax_id: form.owner_tax_id.trim() || null,
        owner_social_security_id: form.owner_social_security_id.trim() || null,
        owner_email: form.owner_email.trim() || null,
        // Cost center is intentionally nullable — send null when blank.
        owner_cost_center: form.owner_cost_center.trim() || null,
        owner_cost_center_id: form.owner_cost_center_id.trim() || null,
      };

      // Strip the raw owner_* text fields from the spread; we set them explicitly.
      Object.keys(ownerProfile).forEach((k) => {
        delete payload[k];
      });

      // Merge the cleaned owner profile back in.
      Object.assign(payload, ownerProfile);

      const result = await createCompany(payload);

      // Reflect the real subscription outcome in the success alert.
      const status: string = result?.subscription_status ?? 'pending';
      let message: string;
      switch (status) {
        case 'active':
          message = `Company "${result.company_name}" created with an active subscription.`;
          break;
        case 'trial':
          message = `Company "${result.company_name}" created with a trial subscription.`;
          break;
        default:
          message = `Company "${result.company_name}" created. The owner must extend the subscription to activate it.`;
      }

      Alert.alert('Success', message, [
        {
          text: 'View Company',
          onPress: () => {
            (navigation as any).replace('CompanyDetail', {
              companyId: result.company_id,
            });
          },
        },
        { text: 'OK', style: 'cancel' },
      ]);
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to create company';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------------------------------------
  // Generic modal picker
  // ---------------------------------------------------------
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
            keyExtractor={(item) => item.value || '__none__'}
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
                    item === form.work_center_timezone &&
                      styles.modalItemTextSelected,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
          <Button
            onPress={() => setTimezoneModalVisible(false)}
            style={styles.modalCancel}
          >
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

  // Build plan dropdown options with an explicit "None" entry.
  const planOptions = [
    { label: 'None (extend later)', value: '' },
    ...plans.map((p) => ({
      label: `${p.plan_name} (${p.plan_code}) — ${p.currency} ${p.price} / ${p.duration_days}d`,
      value: p.plan_code,
    })),
  ];

  // Tier options include a "None" entry too.
  const tierOptions = [{ label: 'None (default)', value: '' }, ...TIERS];

  // Owner profile enum dropdown options (all with an explicit "Not set" entry).
  const genderOptions = [{ label: 'Not set', value: '' }, ...GENDERS];
  const maritalOptions = [{ label: 'Not set', value: '' }, ...MARITAL_STATUSES];
  const employmentTypeOptions = [
    { label: 'Not set', value: '' },
    ...EMPLOYMENT_TYPES,
  ];
  const employmentStatusOptions = [
    { label: 'Not set', value: '' },
    ...EMPLOYMENT_STATUSES,
  ];

  const selectedPlanLabel =
    form.subscription_plan_code === ''
      ? 'None (extend later)'
      : plans.find((p) => p.plan_code === form.subscription_plan_code)
          ?.plan_name || form.subscription_plan_code;

  const selectedTierLabel =
    form.subscription_tier === ''
      ? 'None (default)'
      : TIERS.find((t) => t.value === form.subscription_tier)?.label ||
        form.subscription_tier;

  const selectedGenderLabel =
    GENDERS.find((g) => g.value === form.owner_gender)?.label || 'Not set';
  const selectedMaritalLabel =
    MARITAL_STATUSES.find((m) => m.value === form.owner_marital_status)?.label ||
    'Not set';
  const selectedEmploymentTypeLabel =
    EMPLOYMENT_TYPES.find((t) => t.value === form.owner_employment_type)?.label ||
    'Not set';
  const selectedEmploymentStatusLabel =
    EMPLOYMENT_STATUSES.find((s) => s.value === form.owner_employment_status)
      ?.label || 'Not set';

  // Helper text describing the "0/0/0 = no subscription" rule.
  const subscriptionMode: 'pending' | 'trial' | 'active' =
    form.trial_days > 0
      ? 'trial'
      : form.subscription_months > 0 || form.subscription_days > 0
      ? 'active'
      : 'pending';

  const subscriptionHint =
    subscriptionMode === 'trial'
      ? `Trial of ${form.trial_days} day(s) will be applied. Paid subscription stays pending.`
      : subscriptionMode === 'active'
      ? `Subscription window: +${form.subscription_months} month(s) +${form.subscription_days} day(s).`
      : 'No subscription will be created. The owner can extend it later after payment.';

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
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
            <Text variant="headlineMedium" style={styles.title}>
              Create Company
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Fill in the details below
            </Text>
          </View>

          <View style={styles.form}>
            {/* ---------- COMPANY + OWNER ---------- */}
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Company & Owner
            </Text>

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
              onChangeText={(text) =>
                setForm({ ...form, owner_position_title: text })
              }
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            {/* ---------- OWNER HR PROFILE (OPTIONAL) ---------- */}
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Owner Profile (optional)
            </Text>
            <Text style={styles.hint}>
              PII is encrypted at rest. Leave blank to skip — HR can fill it
              later from the employee profile screen. Dates use YYYY-MM-DD.
            </Text>

            <TextInput
              mode="outlined"
              label="Owner Email"
              value={form.owner_email}
              onChangeText={(text) => setForm({ ...form, owner_email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Date of Birth (YYYY-MM-DD)"
              value={form.owner_date_of_birth}
              onChangeText={(text) =>
                setForm({ ...form, owner_date_of_birth: text })
              }
              placeholder="1988-04-12"
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setGenderModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Gender</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>{selectedGenderLabel}</Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setMaritalModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Marital Status</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>{selectedMaritalLabel}</Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <TextInput
              mode="outlined"
              label="Nationality"
              value={form.owner_nationality}
              onChangeText={(text) =>
                setForm({ ...form, owner_nationality: text })
              }
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setEmploymentTypeModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Employment Type</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>
                  {selectedEmploymentTypeLabel}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setEmploymentStatusModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Employment Status</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>
                  {selectedEmploymentStatusLabel}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Probation End (YYYY-MM-DD)"
                  value={form.owner_probation_end_date}
                  onChangeText={(text) =>
                    setForm({ ...form, owner_probation_end_date: text })
                  }
                  placeholder="2025-01-01"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Confirmation (YYYY-MM-DD)"
                  value={form.owner_confirmation_date}
                  onChangeText={(text) =>
                    setForm({ ...form, owner_confirmation_date: text })
                  }
                  placeholder="2025-04-01"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Grade"
              value={form.owner_grade}
              onChangeText={(text) => setForm({ ...form, owner_grade: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Tax ID"
              value={form.owner_tax_id}
              onChangeText={(text) => setForm({ ...form, owner_tax_id: text })}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TextInput
              mode="outlined"
              label="Social Security ID"
              value={form.owner_social_security_id}
              onChangeText={(text) =>
                setForm({ ...form, owner_social_security_id: text })
              }
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            {/* Cost center is intentionally nullable — leaving it blank sends null. */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Cost Center (text)"
                  value={form.owner_cost_center}
                  onChangeText={(text) =>
                    setForm({ ...form, owner_cost_center: text })
                  }
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Cost Center ID (UUID)"
                  value={form.owner_cost_center_id}
                  onChangeText={(text) =>
                    setForm({ ...form, owner_cost_center_id: text })
                  }
                  autoCapitalize="none"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            {/* ---------- SUBSCRIPTION ---------- */}
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Subscription (optional)
            </Text>
            <Text style={styles.hint}>
              Leave everything as 0 to create the company without a
              subscription. The owner extends it later after payment.
            </Text>

            {/* Plan dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setPlanModalVisible(true)}
              activeOpacity={0.7}
              disabled={loadingPlans}
            >
              <Text style={styles.dropdownLabel}>Subscription Plan</Text>
              <View style={styles.dropdownValueContainer}>
                {loadingPlans ? (
                  <ActivityIndicator size="small" color="#7B2FBE" />
                ) : (
                  <>
                    <Text style={styles.dropdownValue} numberOfLines={1}>
                      {selectedPlanLabel}
                    </Text>
                    <Icon name="chevron-down" size={20} color="#666" />
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Tier dropdown */}
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setTierModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Subscription Tier</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>{selectedTierLabel}</Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Max Employees"
                  value={String(form.max_employees)}
                  onChangeText={(text) =>
                    setForm({ ...form, max_employees: parseInt(text) || 0 })
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Max Locations"
                  value={String(form.max_locations)}
                  onChangeText={(text) =>
                    setForm({ ...form, max_locations: parseInt(text) || 0 })
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Trial Days (0 = no trial)"
              value={String(form.trial_days)}
              onChangeText={(text) =>
                setForm({ ...form, trial_days: parseInt(text) || 0 })
              }
              keyboardType="number-pad"
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setRegionModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownLabel}>Data Region *</Text>
              <View style={styles.dropdownValueContainer}>
                <Text style={styles.dropdownValue}>
                  {REGIONS.find((r) => r.value === form.data_region)?.label ||
                    form.data_region}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Subscription Months (0-36)"
                  value={String(form.subscription_months)}
                  onChangeText={(text) =>
                    setForm({
                      ...form,
                      subscription_months: parseInt(text) || 0,
                    })
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Subscription Days (0-30)"
                  value={String(form.subscription_days)}
                  onChangeText={(text) =>
                    setForm({
                      ...form,
                      subscription_days: parseInt(text) || 0,
                    })
                  }
                  keyboardType="number-pad"
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            {/* Live hint about what will happen */}
            <View
              style={[
                styles.hintBox,
                subscriptionMode === 'pending'
                  ? styles.hintBoxPending
                  : subscriptionMode === 'trial'
                  ? styles.hintBoxTrial
                  : styles.hintBoxActive,
              ]}
            >
              <Icon
                name={
                  subscriptionMode === 'pending'
                    ? 'information-outline'
                    : subscriptionMode === 'trial'
                    ? 'timer-sand'
                    : 'check-circle-outline'
                }
                size={16}
                color="#1A1A1A"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.hintBoxText}>{subscriptionHint}</Text>
            </View>

            <TextInput
              mode="outlined"
              label="Financial Year Start Month (1-12)"
              value={String(form.financial_year_start_month)}
              onChangeText={(text) =>
                setForm({
                  ...form,
                  financial_year_start_month: parseInt(text) || 1,
                })
              }
              keyboardType="number-pad"
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            {/* ---------- WORK CENTER ---------- */}
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Work Center
            </Text>

            <TextInput
              mode="outlined"
              label="Work Center Code"
              value={form.work_center_code}
              onChangeText={(text) =>
                setForm({ ...form, work_center_code: text })
              }
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TextInput
              mode="outlined"
              label="Work Center Name"
              value={form.work_center_name}
              onChangeText={(text) =>
                setForm({ ...form, work_center_name: text })
              }
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TextInput
              mode="outlined"
              label="Work Center Description"
              value={form.work_center_description}
              onChangeText={(text) =>
                setForm({ ...form, work_center_description: text })
              }
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
                <Text style={styles.dropdownValue}>
                  {form.work_center_timezone}
                </Text>
                <Icon name="chevron-down" size={20} color="#666" />
              </View>
            </TouchableOpacity>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Work Center Active</Text>
              <Switch
                value={form.work_center_is_active}
                onValueChange={(value) =>
                  setForm({ ...form, work_center_is_active: value })
                }
                color="#7B2FBE"
              />
            </View>

            {/* ---------- LOCATION ---------- */}
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Location
            </Text>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Location Code *"
                  value={form.location_code}
                  onChangeText={(text) =>
                    setForm({ ...form, location_code: text })
                  }
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Location Name *"
                  value={form.location_name}
                  onChangeText={(text) =>
                    setForm({ ...form, location_name: text })
                  }
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            <TextInput
              mode="outlined"
              label="Address Line 1"
              value={form.address_line1}
              onChangeText={(text) =>
                setForm({ ...form, address_line1: text })
              }
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TextInput
              mode="outlined"
              label="Address Line 2"
              value={form.address_line2}
              onChangeText={(text) =>
                setForm({ ...form, address_line2: text })
              }
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="City *"
                  value={form.city}
                  onChangeText={(text) => setForm({ ...form, city: text })}
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="State"
                  value={form.state}
                  onChangeText={(text) => setForm({ ...form, state: text })}
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Country *"
                  value={form.country}
                  onChangeText={(text) => setForm({ ...form, country: text })}
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  mode="outlined"
                  label="Pincode"
                  value={form.pincode}
                  onChangeText={(text) => setForm({ ...form, pincode: text })}
                  style={styles.input}
                  theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                />
              </View>
            </View>

            {/* ---------- DEPARTMENTS ---------- */}
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Departments *
            </Text>
            {loadingDepts ? (
              <ActivityIndicator
                size="small"
                color="#7B2FBE"
                style={{ marginVertical: 8 }}
              />
            ) : (
              <View style={styles.deptContainer}>
                {allDepartments.map(renderDepartmentChip)}
              </View>
            )}

            {/* ---------- SUBMIT ---------- */}
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

      {renderPickerModal(
        tierModalVisible,
        setTierModalVisible,
        tierOptions,
        form.subscription_tier,
        (val) => setForm({ ...form, subscription_tier: val }),
        'Select Tier'
      )}
      {renderPickerModal(
        planModalVisible,
        setPlanModalVisible,
        planOptions,
        form.subscription_plan_code,
        (val) => setForm({ ...form, subscription_plan_code: val }),
        'Select Subscription Plan'
      )}
      {renderPickerModal(
        regionModalVisible,
        setRegionModalVisible,
        REGIONS,
        form.data_region,
        (val) => setForm({ ...form, data_region: val }),
        'Select Region'
      )}
      {renderPickerModal(
        genderModalVisible,
        setGenderModalVisible,
        genderOptions,
        form.owner_gender,
        (val) => setForm({ ...form, owner_gender: val }),
        'Select Gender'
      )}
      {renderPickerModal(
        maritalModalVisible,
        setMaritalModalVisible,
        maritalOptions,
        form.owner_marital_status,
        (val) => setForm({ ...form, owner_marital_status: val }),
        'Select Marital Status'
      )}
      {renderPickerModal(
        employmentTypeModalVisible,
        setEmploymentTypeModalVisible,
        employmentTypeOptions,
        form.owner_employment_type,
        (val) => setForm({ ...form, owner_employment_type: val }),
        'Select Employment Type'
      )}
      {renderPickerModal(
        employmentStatusModalVisible,
        setEmploymentStatusModalVisible,
        employmentStatusOptions,
        form.owner_employment_status,
        (val) => setForm({ ...form, owner_employment_status: val }),
        'Select Employment Status'
      )}
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
  dropdownValueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownValue: { fontSize: 16, color: '#1A1A1A', flex: 1, marginRight: 8 },
  sectionTitle: {
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  hint: { fontSize: 12, color: '#666', marginBottom: 8, lineHeight: 16 },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  hintBoxPending: { backgroundColor: '#FFF8E1', borderColor: '#FFE082' },
  hintBoxTrial: { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' },
  hintBoxActive: { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  hintBoxText: { fontSize: 12, color: '#1A1A1A', flex: 1 },
  deptContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  deptChip: { margin: 4, backgroundColor: '#f0f0f0' },
  deptChipSelected: { backgroundColor: '#00B4DB' },
  deptChipTextSelected: { color: 'white' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: { fontSize: 16, color: '#1A1A1A' },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
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
    width: '80%',
    maxHeight: '60%',
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
  modalItemSelected: { backgroundColor: '#E8E0F0' },
  modalItemText: { fontSize: 16, color: '#1A1A1A' },
  modalItemTextSelected: { color: '#7B2FBE', fontWeight: '600' },
  modalCancel: { marginTop: 8 },
});