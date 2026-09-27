// apps/prayantra-b2b/src/screens/hr/leave/admin/PolicyConfigDetail.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  getPolicyConfig,
  getPolicyRules,
  addPolicyRule,
  updatePolicyRule,
  deletePolicyRule,
  listLeaveTypes,
} from '@b2b/api-client';
import {
  LeavePolicyConfig,
  PolicyRule,
  LeaveType,
  AccrualMethod,
} from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  SUCCESS_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type RouteProps = RouteProp<RootStackParamList, 'PolicyConfigDetail'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'PolicyConfigDetail'>;

const ACCRUAL_OPTIONS: { value: AccrualMethod; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const ALL_LOCATIONS_SENTINEL = 'ALL';

// ============================================================
// Rule modal state
// ============================================================
interface RuleDraft {
  policyRuleId?: string; // undefined = creating
  leaveTypeId: string;
  totalDays: string;
  accrualMethod: AccrualMethod;
  carryForwardLimit: string;
}

const emptyDraft: RuleDraft = {
  leaveTypeId: '',
  totalDays: '',
  accrualMethod: 'monthly',
  carryForwardLimit: '',
};

export default function PolicyConfigDetail() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { policyId } = route.params;

  const { accessToken, deviceId, companyId, locationId } = useUserAuthStore();
  const allLocationsMode = locationId === ALL_LOCATIONS_SENTINEL;

  const [policy, setPolicy] = useState<LeavePolicyConfig | null>(null);
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState<RuleDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ==========================================================
  // Load policy + rules + leave types
  // ==========================================================
  const loadAll = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId || !policyId) return;
    try {
      const [pol, rls, lts] = await Promise.all([
        getPolicyConfig(companyId, policyId, deviceId, accessToken),
        getPolicyRules(companyId, policyId, deviceId, accessToken),
        listLeaveTypes(companyId, deviceId, accessToken),
      ]);
      setPolicy(pol);
      setRules(Array.isArray(rls) ? rls : []);
      setLeaveTypes(Array.isArray(lts?.leave_types) ? lts.leave_types : []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load policy');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId, policyId, navigation]);
  useEffect(() => {
    setLoading(true);
    loadAll();
  }, [loadAll]);

  useFocusEffect(
    useCallback(() => {
      // Refresh on return from edit form
      loadAll();
    }, [loadAll]),
  );

  // ==========================================================
  // Rule modal handlers
  // ==========================================================
  const openCreateRule = () => {
    if (allLocationsMode) {
      Alert.alert(
        'Pick a Location',
        'Switch to a specific location before editing rules.',
      );
      return;
    }
    setDraft(emptyDraft);
    setShowTypePicker(false);
    setModalVisible(true);
  };

  const openEditRule = (rule: PolicyRule) => {
    if (allLocationsMode) {
      Alert.alert(
        'Pick a Location',
        'Switch to a specific location before editing rules.',
      );
      return;
    }
    setDraft({
      policyRuleId: rule.policy_rule_id,
      leaveTypeId: rule.leave_type_id,
      totalDays: String(rule.total_days),
      accrualMethod: rule.accrual_method,
      carryForwardLimit:
        rule.carry_forward_limit != null ? String(rule.carry_forward_limit) : '',
    });
    setShowTypePicker(false);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
  };

  const handleSaveRule = async () => {
    if (!accessToken || !companyId || !deviceId || !policyId) return;

    if (!draft.leaveTypeId) {
      Alert.alert('Error', 'Please select a leave type');
      return;
    }
    const days = parseInt(draft.totalDays, 10);
    if (!draft.totalDays || isNaN(days) || days <= 0) {
      Alert.alert('Error', 'Total days must be a positive number');
      return;
    }
    const carryForwardLimit =
      draft.carryForwardLimit.trim() === ''
        ? null
        : parseInt(draft.carryForwardLimit, 10);
    if (carryForwardLimit != null && carryForwardLimit < 0) {
      Alert.alert('Error', 'Carry forward limit cannot be negative');
      return;
    }

    setSaving(true);
    try {
      if (draft.policyRuleId) {
        await updatePolicyRule(
          companyId,
          policyId,
          draft.policyRuleId,
          deviceId,
          accessToken,
          {
            total_days: days,
            accrual_method: draft.accrualMethod,
            carry_forward_limit: carryForwardLimit,
          },
        );
      } else {
        await addPolicyRule(companyId, policyId, deviceId, accessToken, {
          leave_type_id: draft.leaveTypeId,
          total_days: days,
          accrual_method: draft.accrualMethod,
          carry_forward_limit: carryForwardLimit,
        });
      }
      setModalVisible(false);
      setRefreshing(true);
      await loadAll();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = (rule: PolicyRule) => {
    if (allLocationsMode) {
      Alert.alert(
        'Pick a Location',
        'Switch to a specific location before editing rules.',
      );
      return;
    }
    Alert.alert(
      'Delete Rule',
      'Remove this rule from the policy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) return;
            setDeletingId(rule.policy_rule_id);
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
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  // ==========================================================
  // Helpers
  // ==========================================================
  const leaveTypeName = (leaveTypeId: string): string => {
    const t = leaveTypes.find((x) => x.leave_type_id === leaveTypeId);
    return t ? `${t.name} (${t.code})` : leaveTypeId;
  };

  const scopeLabel = (): string => {
    if (!policy) return '';
    switch (policy.applies_to_type) {
      case 'company':
        return 'Company-wide';
      case 'position':
        return `Position · ${policy.applies_to_position_id ?? '—'}`;
      case 'work_center':
        return `Work Center · ${policy.applies_to_work_center_code ?? '—'}`;
      default:
        return policy.applies_to_type;
    }
  };

  // ==========================================================
  // Render
  // ==========================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading policy...</Text>
      </SafeAreaView>
    );
  }

  if (!policy) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="file-document-outline" size={60} color={TEXT_SECONDARY} />
          <Text style={styles.emptyTitle}>Policy not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Policy Detail</Text>
        <TouchableOpacity
          style={styles.editHeaderButton}
          onPress={() =>
            navigation.navigate('PolicyConfigForm', { policyId: policy.policy_id })
          }
        >
          <Icon name="pencil-outline" size={20} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <View />
        }
      >
        {/* ---- Policy card ---- */}
        <View style={styles.card}>
          <View style={styles.policyHeaderRow}>
            <Text style={styles.policyName}>{policy.policy_name}</Text>
            <View
              style={[
                styles.statusBadge,
                policy.is_active ? styles.activeBadge : styles.inactiveBadge,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: policy.is_active ? SUCCESS_COLOR : ERROR_COLOR },
                ]}
              >
                {policy.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Scope</Text>
            <Text style={styles.infoValue}>{scopeLabel()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Priority</Text>
            <Text style={styles.infoValue}>{policy.priority}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Effective From</Text>
            <Text style={styles.infoValue}>
              {new Date(policy.effective_from).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Effective To</Text>
            <Text style={styles.infoValue}>
              {policy.effective_to
                ? new Date(policy.effective_to).toLocaleDateString()
                : 'No end date'}
            </Text>
          </View>
        </View>

        {/* ---- Rules section ---- */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Rules</Text>
            <Text style={styles.sectionSubtitle}>
              {rules.length === 0
                ? 'No rules yet'
                : `${rules.length} rule${rules.length === 1 ? '' : 's'}`}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addRuleButton,
              allLocationsMode && styles.addRuleButtonDisabled,
            ]}
            onPress={openCreateRule}
            disabled={allLocationsMode}
          >
            <Icon name="plus" size={16} color="#fff" />
            <Text style={styles.addRuleText}>Add Rule</Text>
          </TouchableOpacity>
        </View>

        {allLocationsMode ? (
          <View style={styles.banner}>
            <Icon name="information-outline" size={14} color={ERROR_COLOR} />
            <Text style={styles.bannerText}>
              All-Locations view is read-only. Switch to a specific location to edit.
            </Text>
          </View>
        ) : null}

        {rules.length === 0 ? (
          <View style={styles.emptyRules}>
            <Icon name="playlist-plus" size={40} color={TEXT_SECONDARY} />
            <Text style={styles.emptyRulesTitle}>No rules defined</Text>
            <Text style={styles.emptyRulesSubtitle}>
              Add a rule to specify which leave types this policy provides, and
              how many days.
            </Text>
          </View>
        ) : (
          rules.map((rule) => {
            const isDeleting = deletingId === rule.policy_rule_id;
            return (
              <View key={rule.policy_rule_id} style={styles.ruleCard}>
                <View style={styles.ruleTop}>
                  <View style={styles.ruleIcon}>
                    <Icon name="calendar-check" size={20} color={PRIMARY_COLOR} />
                  </View>
                  <View style={styles.ruleInfo}>
                    <Text style={styles.ruleType} numberOfLines={1}>
                      {leaveTypeName(rule.leave_type_id)}
                    </Text>
                    <Text style={styles.ruleMeta}>
                      {rule.total_days} day{rule.total_days === 1 ? '' : 's'} ·{' '}
                      {rule.accrual_method}
                      {rule.carry_forward_limit != null
                        ? ` · CF limit ${rule.carry_forward_limit}`
                        : ''}
                    </Text>
                  </View>
                  <View style={styles.ruleActions}>
                    <TouchableOpacity
                      style={[styles.ruleAction, styles.ruleEdit]}
                      onPress={() => openEditRule(rule)}
                      disabled={allLocationsMode}
                    >
                      <Icon name="pencil-outline" size={16} color={PRIMARY_COLOR} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ruleAction, styles.ruleDelete]}
                      onPress={() => handleDeleteRule(rule)}
                      disabled={isDeleting || allLocationsMode}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size="small" color={ERROR_COLOR} />
                      ) : (
                        <Icon name="delete-outline" size={16} color={ERROR_COLOR} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ==================== Rule Modal ==================== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {draft.policyRuleId ? 'Edit Rule' : 'Add Rule'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
                <Icon name="close" size={22} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* Leave Type */}
              <Text style={styles.fieldLabel}>Leave Type *</Text>
              <TouchableOpacity
                style={[
                  styles.selectButton,
                  draft.policyRuleId ? styles.selectDisabled : null,
                ]}
                onPress={() => {
                  if (!draft.policyRuleId) setShowTypePicker((s) => !s);
                }}
                disabled={!!draft.policyRuleId}
              >
                <Text style={styles.selectText}>
                  {draft.leaveTypeId
                    ? leaveTypeName(draft.leaveTypeId)
                    : 'Select leave type'}
                </Text>
                <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
              </TouchableOpacity>
              {draft.policyRuleId ? (
                <Text style={styles.helperText}>
                  Leave type cannot be changed after creation.
                </Text>
              ) : null}
              {showTypePicker ? (
                <View style={styles.optionsContainer}>
                  {leaveTypes.length === 0 ? (
                    <Text style={styles.optionEmpty}>No leave types available</Text>
                  ) : (
                    leaveTypes.map((lt) => (
                      <TouchableOpacity
                        key={lt.leave_type_id}
                        style={styles.optionItem}
                        onPress={() => {
                          setDraft((d) => ({ ...d, leaveTypeId: lt.leave_type_id }));
                          setShowTypePicker(false);
                        }}
                      >
                        <Text style={styles.optionText}>
                          {lt.name} ({lt.code})
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : null}

              {/* Total Days */}
              <Text style={styles.fieldLabel}>Total Days *</Text>
              <TextInput
                style={styles.input}
                value={draft.totalDays}
                onChangeText={(v) => setDraft((d) => ({ ...d, totalDays: v }))}
                keyboardType="numeric"
                placeholder="e.g. 20"
              />

              {/* Accrual Method */}
              <Text style={styles.fieldLabel}>Accrual Method *</Text>
              <View style={styles.chipRow}>
                {ACCRUAL_OPTIONS.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.chip,
                      draft.accrualMethod === value && styles.chipActive,
                    ]}
                    onPress={() =>
                      setDraft((d) => ({ ...d, accrualMethod: value }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draft.accrualMethod === value && styles.chipTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Carry Forward Limit */}
              <Text style={styles.fieldLabel}>Carry Forward Limit (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.carryForwardLimit}
                onChangeText={(v) =>
                  setDraft((d) => ({ ...d, carryForwardLimit: v }))
                }
                keyboardType="numeric"
                placeholder="Leave empty for none"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveRule}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>
                    {draft.policyRuleId ? 'Update Rule' : 'Add Rule'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  editHeaderButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR + '15',
  },

  content: { padding: 16, paddingBottom: 40 },

  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 20,
  },
  policyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  policyName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: { backgroundColor: '#D1FAE5' },
  inactiveBadge: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 11, fontWeight: '700' },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: { fontSize: 13, color: TEXT_SECONDARY },
  infoValue: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  sectionSubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  addRuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: PRIMARY_COLOR,
  },
  addRuleButtonDisabled: { opacity: 0.5 },
  addRuleText: { color: '#fff', fontSize: 12, fontWeight: '700' },

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

  emptyRules: {
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DCE2EA',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  emptyRulesTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  emptyRulesSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },

  ruleCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 10,
  },
  ruleTop: { flexDirection: 'row', alignItems: 'center' },
  ruleIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR + '15',
  },
  ruleInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  ruleType: {
    fontSize: 14,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  ruleMeta: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 3,
  },
  ruleActions: { flexDirection: 'row', gap: 6 },
  ruleAction: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  ruleEdit: { backgroundColor: PRIMARY_COLOR + '15' },
  ruleDelete: { backgroundColor: '#FEF2F2' },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },

  // ---- Modal ----
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: BACKGROUND_COLOR,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  modalClose: { padding: 4 },

  modalBody: { padding: 20, paddingBottom: 12 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 6,
  },
  helperText: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 4 },
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
  selectDisabled: { backgroundColor: '#F3F4F6' },
  selectText: { fontSize: 14, color: TEXT_PRIMARY, flex: 1, marginRight: 8 },
  optionsContainer: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  optionText: { fontSize: 14, color: TEXT_PRIMARY },
  optionEmpty: { padding: 12, fontSize: 13, color: TEXT_SECONDARY },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: PRIMARY_COLOR + '20',
    borderColor: PRIMARY_COLOR,
  },
  chipText: { fontSize: 13, color: TEXT_PRIMARY },
  chipTextActive: { color: PRIMARY_COLOR, fontWeight: '700' },

  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});