// apps/prayantra-b2b/src/screens/hr/leave/admin/AddPolicyRuleScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { addPolicyRule, listLeaveTypes } from '@b2b/api-client';
import {
  AccrualMethod,
  CreatePolicyRulePayload,
  LeaveType,
} from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type RouteProps = RouteProp<RootStackParamList, 'AddPolicyRule'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'AddPolicyRule'>;

// Valid backend enum values.
const ACCRUAL_OPTIONS: { value: AccrualMethod; label: string; hint: string }[] = [
  { value: 'none', label: 'NONE', hint: 'No automatic accrual' },
  { value: 'monthly', label: 'MONTHLY', hint: 'Total ÷ 12 per month' },
  { value: 'quarterly', label: 'QUARTERLY', hint: 'Total ÷ 4 per quarter' },
  { value: 'yearly', label: 'YEARLY', hint: 'Total once a year' },
];

export default function AddPolicyRuleScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { policyId } = route.params;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(true);

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [accrualMethod, setAccrualMethod] = useState<AccrualMethod>('monthly');
  const [totalDays, setTotalDays] = useState('');
  const [carryForwardLimit, setCarryForwardLimit] = useState('');

  const [showTypePicker, setShowTypePicker] = useState(false);

  // Load leave types
  useEffect(() => {
    const fetchTypes = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      setLoadingTypes(true);
      try {
        const data = await listLeaveTypes(companyId, deviceId, accessToken);
        setLeaveTypes(data.leave_types);
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to load leave types');
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchTypes();
  }, [accessToken, companyId, deviceId]);

  const selectedType = useMemo(
    () => leaveTypes.find((t) => t.leave_type_id === leaveTypeId),
    [leaveTypes, leaveTypeId],
  );

  const handleSubmit = async () => {
    if (!leaveTypeId) {
      Alert.alert('Error', 'Please select a leave type');
      return;
    }
    const days = parseInt(totalDays, 10);
    if (isNaN(days) || days <= 0) {
      Alert.alert('Error', 'Total days must be a positive number');
      return;
    }
    let carryValue: number | null = null;
    if (carryForwardLimit.trim() !== '') {
      carryValue = parseInt(carryForwardLimit, 10);
      if (isNaN(carryValue) || carryValue < 0) {
        Alert.alert('Error', 'Carry forward limit must be 0 or greater');
        return;
      }
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      const payload: CreatePolicyRulePayload = {
        leave_type_id: leaveTypeId,
        total_days: days,
        accrual_method: accrualMethod,
        carry_forward_limit: carryValue,
      };
      await addPolicyRule(companyId, policyId, deviceId, accessToken, payload);
      Alert.alert('Success', 'Rule added', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to add rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Policy Rule</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          {/* Leave Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Leave Type *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowTypePicker((s) => !s)}
              disabled={loadingTypes}
            >
              <Text style={styles.selectText} numberOfLines={1}>
                {loadingTypes
                  ? 'Loading...'
                  : selectedType
                    ? `${selectedType.name} (${selectedType.code})`
                    : 'Select leave type'}
              </Text>
              <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
            </TouchableOpacity>
            {showTypePicker ? (
              <View style={styles.optionsContainer}>
                {leaveTypes.length === 0 ? (
                  <Text style={styles.optionEmpty}>No leave types available</Text>
                ) : (
                  leaveTypes.map((t) => (
                    <TouchableOpacity
                      key={t.leave_type_id}
                      style={styles.optionItem}
                      onPress={() => {
                        setLeaveTypeId(t.leave_type_id);
                        setShowTypePicker(false);
                      }}
                    >
                      <Text style={styles.optionText}>
                        {t.name} ({t.code})
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}
          </View>

          {/* Total Days */}
          <View style={styles.field}>
            <Text style={styles.label}>Total Days *</Text>
            <TextInput
              style={styles.input}
              value={totalDays}
              onChangeText={setTotalDays}
              keyboardType="numeric"
              placeholder="e.g. 20"
            />
            <Text style={styles.helperText}>
              Annual entitlement for this leave type under this policy.
            </Text>
          </View>

          {/* Accrual Method */}
          <View style={styles.field}>
            <Text style={styles.label}>Accrual Method *</Text>
            <View style={styles.pickerRow}>
              {ACCRUAL_OPTIONS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.option, accrualMethod === value && styles.optionActive]}
                  onPress={() => setAccrualMethod(value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      accrualMethod === value && styles.optionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.helperText}>
              {ACCRUAL_OPTIONS.find((o) => o.value === accrualMethod)?.hint}
            </Text>
          </View>

          {/* Carry Forward Limit */}
          <View style={styles.field}>
            <Text style={styles.label}>Carry Forward Limit</Text>
            <TextInput
              style={styles.input}
              value={carryForwardLimit}
              onChangeText={setCarryForwardLimit}
              keyboardType="numeric"
              placeholder="e.g. 10 (leave empty for unlimited)"
            />
            <Text style={styles.helperText}>
              Max days that roll over to next period. Leave empty for no limit.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Add Rule</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  formContainer: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 6,
  },
  helperText: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: '#fff',
  },
  selectButton: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  selectText: { fontSize: 14, color: TEXT_PRIMARY, flex: 1, marginRight: 8 },
  optionsContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 220,
  },
  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  optionText: { fontSize: 14, color: TEXT_PRIMARY },
  optionEmpty: { fontSize: 13, color: TEXT_SECONDARY, padding: 12 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap' },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  optionActive: {
    backgroundColor: PRIMARY_COLOR + '20',
    borderColor: PRIMARY_COLOR,
  },
  optionTextActive: { color: PRIMARY_COLOR, fontWeight: '600' },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});