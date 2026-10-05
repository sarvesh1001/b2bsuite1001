// apps/prayantra-b2b/src/screens/hr/leave/user/LeaveRequestForm.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  createLeaveRequest,
  listLeaveTypes,
  getMyLeaveBalance,
} from '@b2b/api-client';
import { LeaveType, LeaveBalance } from '@b2b/shared-types';
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

const toDateOnly = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// Inclusive day count between two dates (YYYY-MM-DD semantics).
const diffDaysInclusive = (start: Date, end: Date): number => {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const ms = e.getTime() - s.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
};

const fmtDays = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
};

export default function LeaveRequestForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId, user } = useUserAuthStore();

  // ⚠️ Self-service: default the user_id to the logged-in user.
  //    The auth store exposes the id as `user.user_id` (see MyProfileScreen).
  const currentUserId =
    user && typeof user === 'object' && 'user_id' in user
      ? String((user as any).user_id)
      : '';

  const [loading, setLoading] = useState(false);

  // Leave types
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Balances keyed by leave_type_id
  const [balances, setBalances] = useState<Record<string, LeaveBalance>>({});
  const [loadingBalances, setLoadingBalances] = useState(true);

  // Form fields
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

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

  // ---- Load balances -----------------------------------------------------
  useEffect(() => {
    const fetchBalances = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      setLoadingBalances(true);
      try {
        const data = await getMyLeaveBalance(companyId, deviceId, accessToken);
        const map: Record<string, LeaveBalance> = {};
        for (const b of data.balances) {
          map[b.leave_type_id] = b;
        }
        setBalances(map);
      } catch {
        setBalances({});
      } finally {
        setLoadingBalances(false);
      }
    };
    fetchBalances();
  }, [accessToken, companyId, deviceId]);

  const selectedType = useMemo(
    () => leaveTypes.find((t) => t.leave_type_id === leaveTypeId),
    [leaveTypes, leaveTypeId],
  );

  const selectedBalance = useMemo(
    () => (leaveTypeId ? balances[leaveTypeId] : undefined),
    [balances, leaveTypeId],
  );

  // ---- Derived: total_days is ALWAYS the inclusive calendar span --------
  //
  // ⚠️ FIX: total_days is no longer user-editable. It's derived from the
  // date range. This eliminates the bug where a user could submit
  // start=2026-10-11, end=2026-10-16, total_days=1.
  //
  // If you later need half-day or working-day-only semantics, do it on the
  // server (using the company's holiday calendar) and return the computed
  // value after submit — don't let the client decide.
  const totalDays = useMemo(() => {
    if (endDate < startDate) return 0;
    return diffDaysInclusive(startDate, endDate);
  }, [startDate, endDate]);

  // ---- Derived: does requested exceed available? -------------------------
  const availableDays = selectedBalance ? selectedBalance.balance : null;

  const exceedsBalance = useMemo(() => {
    if (availableDays === null) return false; // no data → let server decide
    if (totalDays <= 0) return false;
    return totalDays > availableDays;
  }, [availableDays, totalDays]);

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
    if (totalDays <= 0) {
      Alert.alert('Error', 'Total days must be a positive number');
      return;
    }
    if (exceedsBalance && availableDays !== null) {
      Alert.alert(
        'Insufficient balance',
        `You have ${fmtDays(availableDays)} day(s) of ${
          selectedType?.name ?? 'this leave type'
        } left, but you're requesting ${totalDays}.`,
      );
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      const created = await createLeaveRequest(companyId, deviceId, accessToken, {
        user_id: currentUserId,
        leave_type_id: leaveTypeId,
        start_date: toDateOnly(startDate),
        end_date: toDateOnly(endDate),
        total_days: totalDays, // derived, never user-typed
      });

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

  const submitDisabled = loading || exceedsBalance || totalDays <= 0;

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
                leaveTypes.map((type) => {
                  const bal = balances[type.leave_type_id];
                  return (
                    <TouchableOpacity
                      key={type.leave_type_id}
                      style={styles.optionItem}
                      onPress={() => {
                        setLeaveTypeId(type.leave_type_id);
                        setShowTypePicker(false);
                      }}
                    >
                      <View style={styles.optionRow}>
                        <Text style={styles.optionText}>
                          {type.name} ({type.code})
                        </Text>
                        {bal ? (
                          <Text
                            style={[
                              styles.optionBalance,
                              {
                                color:
                                  bal.balance > 0 ? '#10b981' : '#ef4444',
                              },
                            ]}
                          >
                            {fmtDays(bal.balance)} left
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : null}

          {/* Selected type — approval hint */}
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
            </View>
          ) : null}

          {/* Available balance card */}
          {selectedType ? (
            <View
              style={[
                styles.balanceBox,
                exceedsBalance && styles.balanceBoxError,
              ]}
            >
              {loadingBalances ? (
                <View style={styles.balanceRow}>
                  <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                  <Text style={styles.balanceLoadingText}>
                    Loading balance…
                  </Text>
                </View>
              ) : selectedBalance ? (
                <>
                  <View style={styles.balanceRow}>
                    <Text style={styles.balanceLabel}>Available Balance</Text>
                    <Text
                      style={[
                        styles.balanceValue,
                        {
                          color:
                            selectedBalance.balance > 0
                              ? '#10b981'
                              : '#ef4444',
                        },
                      ]}
                    >
                      {fmtDays(selectedBalance.balance)} day(s)
                    </Text>
                  </View>
                  <View style={styles.balanceSubRow}>
                    <Text style={styles.balanceSubLabel}>Entitled</Text>
                    <Text style={styles.balanceSubValue}>
                      {fmtDays(selectedBalance.total_entitled)}
                    </Text>
                    <Text style={styles.balanceSubLabel}>Accrued</Text>
                    <Text style={styles.balanceSubValue}>
                      {fmtDays(selectedBalance.accrued)}
                    </Text>
                    <Text style={styles.balanceSubLabel}>Used</Text>
                    <Text style={styles.balanceSubValue}>
                      {fmtDays(selectedBalance.consumed)}
                    </Text>
                  </View>
                  {exceedsBalance ? (
                    <Text style={styles.balanceErrorText}>
                      You're requesting {totalDays} day(s) but only{' '}
                      {fmtDays(selectedBalance.balance)} available.
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.balanceEmptyText}>
                  No balance on file for this leave type. Submission will be
                  validated by the server.
                </Text>
              )}
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

          {/* Total Days — READ-ONLY, derived from date range */}
          <Text style={styles.label}>Total Days</Text>
          <View
            style={[
              styles.readonlyDaysRow,
              exceedsBalance && styles.readonlyDaysRowError,
            ]}
          >
            <Icon
              name="calendar-range"
              size={16}
              color={exceedsBalance ? '#ef4444' : PRIMARY_COLOR}
            />
            <Text
              style={[
                styles.readonlyDaysText,
                exceedsBalance && { color: '#ef4444' },
              ]}
            >
              {totalDays > 0 ? `${totalDays} day(s)` : '—'}
            </Text>
            <Text style={styles.readonlyDaysHint}>auto-calculated</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitDisabled && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitDisabled}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {exceedsBalance ? 'Insufficient Balance' : 'Submit Request'}
            </Text>
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

  // Read-only Total Days row (replaces the old TextInput)
  readonlyDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${PRIMARY_COLOR}0D`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}33`,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  readonlyDaysRowError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  readonlyDaysText: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    flex: 1,
  },
  readonlyDaysHint: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
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
  selectText: { fontSize: 14, color: TEXT_PRIMARY },
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
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: { fontSize: 14, color: TEXT_PRIMARY },
  optionBalance: { fontSize: 12, fontWeight: '600' },
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

  // Balance card
  balanceBox: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  balanceBoxError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_SECONDARY,
    letterSpacing: 0.3,
  },
  balanceValue: { fontSize: 15, fontWeight: '700' },
  balanceLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: TEXT_SECONDARY,
  },
  balanceSubRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
    gap: 10,
  },
  balanceSubLabel: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    marginRight: 2,
  },
  balanceSubValue: {
    fontSize: 10,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginRight: 6,
  },
  balanceErrorText: {
    marginTop: 8,
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '600',
  },
  balanceEmptyText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
  },

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