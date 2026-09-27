// apps/prayantra-b2b/src/screens/hr/leave/user/LeaveRequestForm.tsx
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { createLeaveRequest, listLeaveTypes } from '@b2b/api-client';
import { LeaveType } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveRequestForm'>;

const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);

// Inclusive day count between two dates (YYYY-MM-DD semantics).
const diffDaysInclusive = (start: Date, end: Date): number => {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
};

export default function LeaveRequestForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId, user } = useUserAuthStore();

  // ⚠️ Self-service: default the user_id to the logged-in user.
  //    Admin-on-behalf would need a user picker in a future iteration.
  const currentUserId =
    user && typeof user === 'object' && 'id' in user ? String((user as any).id) : '';

  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [totalDays, setTotalDays] = useState('');
  const [totalDaysTouched, setTotalDaysTouched] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // ---- Load leave types --------------------------------------------------
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

  // ---- Auto-calc total_days from date range ------------------------------
  const computedDays = useMemo(() => {
    if (endDate < startDate) return 0;
    return diffDaysInclusive(startDate, endDate);
  }, [startDate, endDate]);

  // Keep total_days in sync unless the user has manually edited it.
  useEffect(() => {
    if (!totalDaysTouched) {
      setTotalDays(computedDays > 0 ? String(computedDays) : '');
    }
  }, [computedDays, totalDaysTouched]);

  // ---- Submit ------------------------------------------------------------
  const handleSubmit = async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be signed in to request leave');
      return;
    }
    if (!leaveTypeId) {
      Alert.alert('Error', 'Please select a leave type');
      return;
    }
    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be on or after start date');
      return;
    }
    const days = Number(totalDays);
    if (!totalDays || isNaN(days) || days <= 0) {
      Alert.alert('Error', 'Total days must be a positive number');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      // ⚠️ Backend expects DATE (YYYY-MM-DD), not RFC3339.
      // ⚠️ Returns LeaveRequest directly (no more .data).
      // ⚠️ API client throws if in All-Locations mode — see assertWritableLocation.
      const created = await createLeaveRequest(companyId, deviceId, accessToken, {
        user_id: currentUserId,
        leave_type_id: leaveTypeId,
        start_date: toDateOnly(startDate),
        end_date: toDateOnly(endDate),
        total_days: days,
      });

      // Leave types with requires_approval=false are auto-approved server-side.
      const msg =
        created.status === 'approved'
          ? 'Leave request submitted and auto-approved.'
          : 'Leave request submitted and awaiting approval.';

      Alert.alert('Success', msg, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  // ---- Render ------------------------------------------------------------
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Leave Request</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          {/* Requested For (self) */}
          <Text style={styles.label}>Requested For</Text>
          <View style={styles.readonlyRow}>
            <Icon name="account" size={16} color={TEXT_SECONDARY} />
            <Text style={styles.readonlyText} numberOfLines={1}>
              {currentUserId || 'Not signed in'}
            </Text>
          </View>

          {/* Leave Type */}
          <Text style={styles.label}>Leave Type *</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowTypePicker((s) => !s)}
            disabled={loadingTypes}
          >
            <Text style={styles.selectText}>
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
                leaveTypes.map((type) => (
                  <TouchableOpacity
                    key={type.leave_type_id}
                    style={styles.optionItem}
                    onPress={() => {
                      setLeaveTypeId(type.leave_type_id);
                      setShowTypePicker(false);
                    }}
                  >
                    <Text style={styles.optionText}>
                      {type.name} ({type.code})
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : null}

          {/* Selected type hints */}
          {selectedType ? (
            <View style={styles.hintBox}>
              {selectedType.requires_approval ? (
                <Text style={styles.hintText}>
                  <Icon name="information-outline" size={12} color={TEXT_SECONDARY} />{' '}
                  Requires approval from your manager.
                </Text>
              ) : (
                <Text style={[styles.hintText, { color: '#10b981' }]}>
                  <Icon name="check-circle-outline" size={12} color="#10b981" />{' '}
                  Auto-approved — no manager approval needed.
                </Text>
              )}
              {selectedType.carry_forward_limit !== null &&
              selectedType.carry_forward_limit !== undefined ? (
                <Text style={styles.hintText}>
                  Carry-forward limit: {selectedType.carry_forward_limit} day(s)
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Start Date */}
          <Text style={styles.label}>Start Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartPicker(true)}
          >
            <Text>{startDate.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          {/* End Date */}
          <Text style={styles.label}>End Date *</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowEndPicker(true)}
          >
            <Text>{endDate.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          {/* Total Days */}
          <Text style={styles.label}>Total Days *</Text>
          <TextInput
            style={styles.input}
            value={totalDays}
            onChangeText={(v) => {
              setTotalDaysTouched(true);
              setTotalDays(v);
            }}
            keyboardType="numeric"
            placeholder="e.g. 3"
          />
          {!totalDaysTouched && computedDays > 0 ? (
            <Text style={styles.helperText}>
              Auto-calculated from date range. Edit to override.
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        date={startDate}
        onConfirm={(date) => {
          setShowStartPicker(false);
          setStartDate(date);
          if (date > endDate) setEndDate(date);
        }}
        onCancel={() => setShowStartPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        date={endDate}
        minimumDate={startDate}
        onConfirm={(date) => {
          setShowEndPicker(false);
          setEndDate(date);
        }}
        onCancel={() => setShowEndPicker(false)}
      />
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 4,
  },
  readonlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readonlyText: { fontSize: 14, color: TEXT_SECONDARY, marginLeft: 8, flex: 1 },
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
  helperText: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },
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
  selectText: { fontSize: 14, color: TEXT_PRIMARY },
  optionsContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 180,
  },
  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  optionText: { fontSize: 14, color: TEXT_PRIMARY },
  optionEmpty: { fontSize: 13, color: TEXT_SECONDARY, padding: 12 },
  hintBox: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: PRIMARY_COLOR,
  },
  hintText: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  dateButton: {
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
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});