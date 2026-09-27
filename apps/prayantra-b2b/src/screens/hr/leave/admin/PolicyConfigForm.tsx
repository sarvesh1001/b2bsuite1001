// apps/prayantra-b2b/src/screens/hr/leave/admin/PolicyConfigForm.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import {
  useRoute,
  useNavigation,
  useFocusEffect,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  createPolicyConfig,
  updatePolicyConfig,
  getPolicyConfig,
  listPositions,
  getPolicyRules,
  deletePolicyRule,
  listLeaveTypes,
} from '@b2b/api-client';
import { axiosInstance } from '@b2b/api-client';
import {
  AppliesToType,
  CreatePolicyConfigPayload,
  UpdatePolicyConfigPayload,
  PolicyRule,
  Position,
  LeaveType,
} from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type RouteProps = RouteProp<RootStackParamList, 'PolicyConfigForm'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'PolicyConfigForm'>;

const APPLIES_TO_OPTIONS: { value: AppliesToType; label: string }[] = [
  { value: 'company', label: 'Company' },
  { value: 'position', label: 'Position' },
  { value: 'work_center', label: 'Work Center' },
];

const ALL_LOCATIONS_SENTINEL = 'ALL';

type WorkCenter = {
  work_center_code: string;
  name: string;
  description?: string;
  is_active: boolean;
  location_id?: string;
  location_code?: string;
  location_name?: string;
  city?: string;
};

const extractWorkCenters = (body: any): WorkCenter[] => {
  const candidate = body?.data ?? body;
  if (Array.isArray(candidate)) return candidate;
  const fallback =
    body?.work_centers ??
    body?.items ??
    body?.results ??
    body?.data?.work_centers ??
    body?.data?.items ??
    body?.data?.results;
  if (Array.isArray(fallback)) return fallback;
  return [];
};

// Position no longer carries a plain `title`. Its display name is:
//   effective_title  ← backend-computed COALESCE(title_override, job_title)
//   job_title        ← fallback if effective_title is missing
//   title_override   ← fallback if job_title is missing
//   'Untitled'       ← last resort
const positionDisplayTitle = (p: Position): string =>
  (p as any).effective_title ??
  (p as any).job_title ??
  (p as any).title_override ??
  'Untitled';

const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);
const toDate = (v: string | null | undefined): Date =>
  v ? new Date(v) : new Date();

export default function PolicyConfigForm() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { policyId } = route.params || {};
  const { accessToken, deviceId, companyId, locationId } = useUserAuthStore();

  const allLocationsMode = locationId === ALL_LOCATIONS_SENTINEL;

  // ---- Form state ------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!policyId);
  const [policyName, setPolicyName] = useState('');
  const [appliesToType, setAppliesToType] = useState<AppliesToType>('company');
  const [appliesToPositionId, setAppliesToPositionId] = useState('');
  const [appliesToWorkCenterCode, setAppliesToWorkCenterCode] = useState('');
  const [priority, setPriority] = useState('100');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [effectiveTo, setEffectiveTo] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);

  // ---- Picker state ----------------------------------------------
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [showWorkCenterPicker, setShowWorkCenterPicker] = useState(false);

  // ---- Options state ---------------------------------------------
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loadingWorkCenters, setLoadingWorkCenters] = useState(false);

  // ---- Rules state -----------------------------------------------
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);
  const [deletingRuleId, setDeletingRuleId] = useState<string | null>(null);

  // ---- Load policy (edit mode) -----------------------------------
  useEffect(() => {
    if (!policyId) {
      setFetching(false);
      return;
    }
    const fetchPolicy = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const data = await getPolicyConfig(companyId, policyId, deviceId, accessToken);
        setPolicyName(data.policy_name);
        setAppliesToType(data.applies_to_type);
        setAppliesToPositionId(data.applies_to_position_id ?? '');
        setAppliesToWorkCenterCode(data.applies_to_work_center_code ?? '');
        setPriority(String(data.priority));
        setEffectiveFrom(toDate(data.effective_from));
        if (data.effective_to) setEffectiveTo(toDate(data.effective_to));
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to load policy');
        navigation.goBack();
      } finally {
        setFetching(false);
      }
    };
    fetchPolicy();
  }, [policyId, accessToken, companyId, deviceId, navigation]);

  // ---- Load leave types (for rule labels) ------------------------
  useEffect(() => {
    if (!policyId) return;
    if (leaveTypes.length > 0) return;
    if (!accessToken || !companyId || !deviceId) return;
    const fetchTypes = async () => {
      try {
        const data = await listLeaveTypes(companyId, deviceId, accessToken);
        setLeaveTypes(data.leave_types);
      } catch {
        // non-fatal — rules will show ids
      }
    };
    fetchTypes();
  }, [policyId, accessToken, companyId, deviceId, leaveTypes.length]);

  // ---- Load policy rules (edit mode) -----------------------------
  const loadRules = useCallback(async () => {
    if (!policyId) return;
    if (!accessToken || !companyId || !deviceId) return;
    setLoadingRules(true);
    try {
      const list = await getPolicyRules(companyId, policyId, deviceId, accessToken);
      setRules(list);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load rules');
    } finally {
      setLoadingRules(false);
    }
  }, [policyId, accessToken, companyId, deviceId]);

  // Refetch rules whenever the screen regains focus (e.g. after
  // returning from AddPolicyRule).
  useFocusEffect(
    useCallback(() => {
      if (policyId) loadRules();
    }, [policyId, loadRules]),
  );

  // ---- Load positions (when scope = position) --------------------
  useEffect(() => {
    if (appliesToType !== 'position') return;
    if (positions.length > 0) return;
    if (!accessToken || !companyId || !deviceId) return;

    const fetchPositions = async () => {
      setLoadingPositions(true);
      try {
        const res = await listPositions(
          companyId,
          deviceId,
          { limit: 200, offset: 0 },
          accessToken,
        );
        setPositions(res.data?.positions ?? []);
      } catch (error: any) {
        Alert.alert(
          'Unable to load positions',
          error?.message || 'Please try again.',
        );
      } finally {
        setLoadingPositions(false);
      }
    };
    fetchPositions();
  }, [appliesToType, accessToken, companyId, deviceId, positions.length]);

  // ---- Load work centers (when scope = work_center) --------------
  useEffect(() => {
    if (appliesToType !== 'work_center') return;
    if (workCenters.length > 0) return;
    if (!accessToken || !companyId || !deviceId) return;

    const fetchWorkCenters = async () => {
      setLoadingWorkCenters(true);
      try {
        const response = await axiosInstance.get(
          `/companies/${companyId}/attendance/work-centers`,
          {
            headers: {
              'X-Company-ID': companyId,
              'X-Device-ID': deviceId,
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            params: { page: 1, page_size: 200 },
          },
        );
        setWorkCenters(extractWorkCenters(response.data));
      } catch (error: any) {
        Alert.alert(
          'Unable to load work centers',
          error?.message || 'Please try again.',
        );
      } finally {
        setLoadingWorkCenters(false);
      }
    };
    fetchWorkCenters();
  }, [appliesToType, accessToken, companyId, deviceId, workCenters.length]);

  // ---- Selected labels -------------------------------------------
  const selectedPosition = useMemo(
    () => positions.find((p) => p.position_id === appliesToPositionId),
    [positions, appliesToPositionId],
  );

  const selectedWorkCenter = useMemo(
    () =>
      workCenters.find((wc) => wc.work_center_code === appliesToWorkCenterCode),
    [workCenters, appliesToWorkCenterCode],
  );

  // ---- Rule labels -----------------------------------------------
  const leaveTypeName = (id: string) => {
    const t = leaveTypes.find((x) => x.leave_type_id === id);
    return t ? `${t.name} (${t.code})` : id;
  };

  // ---- Delete rule ------------------------------------------------
  const handleDeleteRule = (rule: PolicyRule) => {
    Alert.alert(
      'Delete Rule',
      `Remove the rule for "${leaveTypeName(rule.leave_type_id)}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!policyId || !accessToken || !companyId || !deviceId) return;
            setDeletingRuleId(rule.policy_rule_id);
            try {
              await deletePolicyRule(
                companyId,
                policyId,
                rule.policy_rule_id,
                deviceId,
                accessToken,
              );
              setRules((prev) =>
                prev.filter((r) => r.policy_rule_id !== rule.policy_rule_id),
              );
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Delete failed');
            } finally {
              setDeletingRuleId(null);
            }
          },
        },
      ],
    );
  };

  // ---- Submit ----------------------------------------------------
  const handleSubmit = async () => {
    if (allLocationsMode) {
      Alert.alert(
        'Pick a Location',
        'Switch to a specific location before creating or editing policies.',
      );
      return;
    }
    if (!policyName.trim()) {
      Alert.alert('Error', 'Policy name is required');
      return;
    }
    const priorityNum = parseInt(priority, 10);
    if (isNaN(priorityNum) || priorityNum <= 0) {
      Alert.alert('Error', 'Priority must be a positive number');
      return;
    }
    if (appliesToType === 'position' && !appliesToPositionId) {
      Alert.alert('Error', 'Please select a Position');
      return;
    }
    if (appliesToType === 'work_center' && !appliesToWorkCenterCode) {
      Alert.alert('Error', 'Please select a Work Center');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      const appliesPayload = {
        applies_to_type: appliesToType,
        applies_to_position_id:
          appliesToType === 'position' ? appliesToPositionId : null,
        applies_to_work_center_code:
          appliesToType === 'work_center' ? appliesToWorkCenterCode : null,
      };

      if (policyId) {
        const payload: UpdatePolicyConfigPayload = {
          policy_name: policyName.trim(),
          priority: priorityNum,
          effective_from: toDateOnly(effectiveFrom),
          effective_to: effectiveTo ? toDateOnly(effectiveTo) : null,
          ...appliesPayload,
        };
        await updatePolicyConfig(companyId, policyId, deviceId, accessToken, payload);
        Alert.alert('Success', 'Policy updated');
      } else {
        const payload: CreatePolicyConfigPayload = {
          policy_name: policyName.trim(),
          priority: priorityNum,
          effective_from: toDateOnly(effectiveFrom),
          effective_to: effectiveTo ? toDateOnly(effectiveTo) : null,
          ...appliesPayload,
        };
        await createPolicyConfig(companyId, deviceId, accessToken, payload);
        Alert.alert('Success', 'Policy created', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  // ---- Loading screen -------------------------------------------
  if (fetching) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading policy...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {policyId ? 'Edit Policy' : 'New Policy'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.formContainer}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {allLocationsMode ? (
          <View style={styles.banner}>
            <Icon name="information-outline" size={14} color={ERROR_COLOR} />
            <Text style={styles.bannerText}>
              All-Locations view is read-only. Switch to a specific location to edit.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {/* Policy Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Policy Name *</Text>
            <TextInput
              style={styles.input}
              value={policyName}
              onChangeText={setPolicyName}
              placeholder="e.g. Standard Annual Leave"
            />
          </View>

          {/* Applies To */}
          <View style={styles.field}>
            <Text style={styles.label}>Applies To *</Text>
            <View style={styles.pickerRow}>
              {APPLIES_TO_OPTIONS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.option, appliesToType === value && styles.optionActive]}
                  onPress={() => {
                    setAppliesToType(value);
                    if (value !== 'position') setAppliesToPositionId('');
                    if (value !== 'work_center') setAppliesToWorkCenterCode('');
                  }}
                >
                  <Text
                    style={[
                      styles.optionText,
                      appliesToType === value && styles.optionTextActive,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Position picker */}
          {appliesToType === 'position' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Position *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowPositionPicker((s) => !s)}
                disabled={loadingPositions}
              >
                <Text style={styles.selectText} numberOfLines={1}>
                  {loadingPositions
                    ? 'Loading positions...'
                    : selectedPosition
                      ? positionDisplayTitle(selectedPosition)
                      : 'Select position'}
                </Text>
                <Icon
                  name={showPositionPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={TEXT_SECONDARY}
                />
              </TouchableOpacity>
              {showPositionPicker ? (
                <ScrollView
                  style={styles.optionsContainer}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {positions.length === 0 ? (
                    <Text style={styles.optionEmpty}>No positions available</Text>
                  ) : (
                    positions.map((pos) => (
                      <TouchableOpacity
                        key={pos.position_id}
                        style={styles.optionItem}
                        onPress={() => {
                          setAppliesToPositionId(pos.position_id);
                          setShowPositionPicker(false);
                        }}
                      >
                        <Text style={styles.optionText}>
                          {positionDisplayTitle(pos)}
                        </Text>
                        <Text style={styles.optionSub}>
                          {(pos as any).job_title
                            ? `${(pos as any).job_title}${
                                (pos as any).job_code
                                  ? ` · ${(pos as any).job_code}`
                                  : ''
                              }`
                            : pos.position_id}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          {/* Work Center picker */}
          {appliesToType === 'work_center' ? (
            <View style={styles.field}>
              <Text style={styles.label}>Work Center *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowWorkCenterPicker((s) => !s)}
                disabled={loadingWorkCenters}
              >
                <Text style={styles.selectText} numberOfLines={1}>
                  {loadingWorkCenters
                    ? 'Loading work centers...'
                    : selectedWorkCenter
                      ? `${selectedWorkCenter.name} (${selectedWorkCenter.work_center_code})`
                      : 'Select work center'}
                </Text>
                <Icon
                  name={showWorkCenterPicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={TEXT_SECONDARY}
                />
              </TouchableOpacity>
              {showWorkCenterPicker ? (
                <ScrollView
                  style={styles.optionsContainer}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                  {workCenters.length === 0 ? (
                    <Text style={styles.optionEmpty}>No work centers available</Text>
                  ) : (
                    workCenters.map((wc) => (
                      <TouchableOpacity
                        key={wc.work_center_code}
                        style={styles.optionItem}
                        onPress={() => {
                          setAppliesToWorkCenterCode(wc.work_center_code);
                          setShowWorkCenterPicker(false);
                        }}
                      >
                        <Text style={styles.optionText}>
                          {wc.name} ({wc.work_center_code})
                        </Text>
                        {wc.location_name || wc.city ? (
                          <Text style={styles.optionSub}>
                            {wc.location_name}
                            {wc.city ? ` • ${wc.city}` : ''}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              ) : null}
            </View>
          ) : null}

          {/* Priority */}
          <View style={styles.field}>
            <Text style={styles.label}>Priority *</Text>
            <TextInput
              style={styles.input}
              value={priority}
              onChangeText={setPriority}
              keyboardType="numeric"
              placeholder="100"
            />
            <Text style={styles.helperText}>
              Lower number = higher priority. Must be &gt; 0.
            </Text>
          </View>

          {/* Effective From */}
          <View style={styles.field}>
            <Text style={styles.label}>Effective From *</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker('from')}
            >
              <Text>{effectiveFrom.toLocaleDateString()}</Text>
              <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>

          {/* Effective To */}
          <View style={styles.field}>
            <Text style={styles.label}>Effective To (optional)</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker('to')}
            >
              <Text>
                {effectiveTo ? effectiveTo.toLocaleDateString() : 'No end date'}
              </Text>
              <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
            {effectiveTo ? (
              <TouchableOpacity
                onPress={() => setEffectiveTo(null)}
                style={styles.clearDate}
              >
                <Text style={styles.clearDateText}>Clear end date</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || allLocationsMode) && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={loading || allLocationsMode}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {policyId ? 'Update' : 'Create'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ============ RULES SECTION (edit mode only) ============ */}
        {policyId ? (
          <View style={[styles.card, { marginTop: 16 }]}>
            <View style={styles.rulesHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rulesTitle}>Rules</Text>
                <Text style={styles.rulesSubtitle}>
                  {rules.length} rule{rules.length === 1 ? '' : 's'} · each defines
                  accrual for one leave type
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addRuleButton}
                onPress={() =>
                  navigation.navigate('AddPolicyRule', { policyId })
                }
                disabled={allLocationsMode}
              >
                <Icon name="plus" size={16} color="#fff" />
                <Text style={styles.addRuleText}>Add Rule</Text>
              </TouchableOpacity>
            </View>

            {loadingRules ? (
              <View style={styles.rulesLoading}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                <Text style={styles.rulesLoadingText}>Loading rules...</Text>
              </View>
            ) : rules.length === 0 ? (
              <View style={styles.rulesEmpty}>
                <Icon name="file-document-outline" size={28} color={TEXT_SECONDARY} />
                <Text style={styles.rulesEmptyTitle}>No rules yet</Text>
                <Text style={styles.rulesEmptyText}>
                  Add a rule to define how a leave type accrues under this policy.
                </Text>
              </View>
            ) : (
              rules.map((r, idx) => (
                <View
                  key={r.policy_rule_id}
                  style={[
                    styles.ruleItem,
                    idx === rules.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ruleTypeName} numberOfLines={1}>
                      {leaveTypeName(r.leave_type_id)}
                    </Text>
                    <View style={styles.ruleMetaRow}>
                      <View style={styles.rulePill}>
                        <Text style={styles.rulePillText}>
                          {r.total_days} day{r.total_days === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <View style={styles.rulePill}>
                        <Text style={styles.rulePillText}>
                          {r.accrual_method}
                        </Text>
                      </View>
                      {r.carry_forward_limit !== null &&
                      r.carry_forward_limit !== undefined ? (
                        <View style={styles.rulePill}>
                          <Text style={styles.rulePillText}>
                            CF {r.carry_forward_limit}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.ruleDeleteButton}
                    onPress={() => handleDeleteRule(r)}
                    disabled={deletingRuleId === r.policy_rule_id || allLocationsMode}
                  >
                    {deletingRuleId === r.policy_rule_id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <Icon name="delete-outline" size={18} color="#ef4444" />
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      <DateTimePickerModal
        isVisible={!!showDatePicker}
        mode="date"
        date={
          showDatePicker === 'from' ? effectiveFrom : effectiveTo || new Date()
        }
        onConfirm={(date) => {
          if (showDatePicker === 'from') setEffectiveFrom(date);
          else setEffectiveTo(date);
          setShowDatePicker(null);
        }}
        onCancel={() => setShowDatePicker(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },

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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    color: ERROR_COLOR,
    fontWeight: '600',
  },

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
  optionText: { fontSize: 13, color: TEXT_PRIMARY },
  optionSub: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  optionTextActive: { color: PRIMARY_COLOR, fontWeight: '600' },
  optionEmpty: { fontSize: 13, color: TEXT_SECONDARY, padding: 12 },

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

  // Dropdown list — bounded & scrollable so it doesn't burst out
  // of the card when there are many positions / work centers.
  optionsContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 220,
    overflow: 'hidden',
  },
  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },

  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  clearDate: { marginTop: 4, alignSelf: 'flex-start' },
  clearDateText: { fontSize: 12, color: PRIMARY_COLOR },

  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // --- Rules section ---
  rulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  rulesSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  addRuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: PRIMARY_COLOR,
  },
  addRuleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  rulesLoading: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  rulesLoadingText: { fontSize: 12, color: TEXT_SECONDARY },
  rulesEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BORDER_COLOR,
    borderRadius: 10,
  },
  rulesEmptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 8,
  },
  rulesEmptyText: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
    textAlign: 'center',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  ruleTypeName: {
    fontSize: 14,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  ruleMetaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  rulePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: PRIMARY_COLOR + '15',
  },
  rulePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  ruleDeleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});