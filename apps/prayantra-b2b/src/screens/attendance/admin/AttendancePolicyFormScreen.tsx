import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  ActivityIndicator,
  Snackbar,
  Switch,
} from 'react-native-paper';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getPolicy,
  createPolicy,
  updatePolicy,
} from '@b2b/api-client';

import type {
  AttendancePolicy,
  PolicyRules,
  AttendanceSourceType,
} from '@b2b/shared-types';

import { CANONICAL_SOURCE_TYPES } from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';

// ============================================================
// TYPES
// ============================================================

type FormRouteProp = RouteProp<
  { AttendancePolicyForm: { policyId?: string } },
  'AttendancePolicyForm'
>;

const POLICY_TYPES = [
  'work_center',
  'position',
  'company_default',
] as const;

// ============================================================
// SCREEN
// ============================================================

export default function AttendancePolicyFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<FormRouteProp>();
  const { policyId } = route.params || {};

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();
  const isEdit = !!policyId;

  // -------- Basic fields --------
  const [code, setCode] = useState('');
  const [type, setType] = useState<string>('work_center');
  const [scope, setScope] = useState<'work_center' | 'position'>('work_center');
  const [workCenterCode, setWorkCenterCode] = useState('');
  const [positionId, setPositionId] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // -------- Rules --------
  const [gracePeriod, setGracePeriod] = useState('');
  const [maxLateAllowed, setMaxLateAllowed] = useState('');
  const [halfDayAfter, setHalfDayAfter] = useState('');
  const [overtimeThreshold, setOvertimeThreshold] = useState('');
  const [autoCheckout, setAutoCheckout] = useState(false);
  const [requireWorkCenter, setRequireWorkCenter] = useState(false);
  const [allowSelfService, setAllowSelfService] = useState(true);
  const [allowAdminMarking, setAllowAdminMarking] = useState(true);
  const [allowDeviceMarking, setAllowDeviceMarking] = useState(true);
  const [allowedSourceTypes, setAllowedSourceTypes] = useState<
    AttendanceSourceType[]
  >(['mobile', 'web', 'biometric']);

  // -------- Async --------
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  // ============================================================
  // LOAD
  // ============================================================

  useEffect(() => {
    if (!isEdit) return;
    if (!companyId || !deviceId || !accessToken || !policyId) return;

    (async () => {
      try {
        const res: any = await getPolicy(
          companyId,
          policyId,
          deviceId,
          accessToken,
        );
        const p: AttendancePolicy | null = res?.data ?? null;
        if (!p) return;

        setCode(p.policy_code);
        setType(p.policy_type);
        if (p.work_center_code) {
          setScope('work_center');
          setWorkCenterCode(p.work_center_code);
        } else if (p.position_id) {
          setScope('position');
          setPositionId(p.position_id);
        }
        setIsActive(p.is_active);

        const r = p.rules || {};
        setGracePeriod(r.grace_period?.toString() ?? '');
        setMaxLateAllowed(r.max_late_allowed?.toString() ?? '');
        setHalfDayAfter(r.half_day_after?.toString() ?? '');
        setOvertimeThreshold(r.overtime_threshold?.toString() ?? '');
        setAutoCheckout(r.auto_checkout ?? false);
        setRequireWorkCenter(r.require_work_center ?? false);
        setAllowSelfService(r.allow_self_service ?? true);
        setAllowAdminMarking(r.allow_admin_marking ?? true);
        setAllowDeviceMarking(r.allow_device_marking ?? true);
        setAllowedSourceTypes(r.allowed_source_types ?? []);
      } catch (err: any) {
        setSnack({
          text:
            err?.response?.data?.error ||
            err?.message ||
            'Failed to load policy',
          tone: 'err',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, deviceId, accessToken, isEdit, policyId]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const validationError = useMemo(() => {
    if (!code.trim()) return 'Policy code is required';
    if (!type) return 'Policy type is required';
    if (scope === 'work_center' && !workCenterCode.trim()) {
      return 'Work center code is required';
    }
    if (scope === 'position' && !positionId.trim()) {
      return 'Position ID is required';
    }
    return null;
  }, [code, type, scope, workCenterCode, positionId]);

  const canSubmit = !validationError && !submitting;

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    if (!companyId || !deviceId || !accessToken) {
      setSnack({ text: 'Session missing. Please log in again.', tone: 'err' });
      return;
    }
    if (validationError) {
      setSnack({ text: validationError, tone: 'err' });
      return;
    }

    setSubmitting(true);
    try {
      const rules: PolicyRules = {};
      if (gracePeriod.trim()) rules.grace_period = Number(gracePeriod);
      if (maxLateAllowed.trim())
        rules.max_late_allowed = Number(maxLateAllowed);
      if (halfDayAfter.trim()) rules.half_day_after = Number(halfDayAfter);
      if (overtimeThreshold.trim())
        rules.overtime_threshold = Number(overtimeThreshold);
      rules.auto_checkout = autoCheckout;
      rules.require_work_center = requireWorkCenter;
      rules.allow_self_service = allowSelfService;
      rules.allow_admin_marking = allowAdminMarking;
      rules.allow_device_marking = allowDeviceMarking;
      rules.allowed_source_types = allowedSourceTypes;

      const payload: any = {
        policy_code: code.trim(),
        policy_type: type,
        rules,
        is_active: isActive,
        description: description.trim() || null,
      };
      if (scope === 'work_center') {
        payload.work_center_code = workCenterCode.trim();
        payload.position_id = null;
      } else {
        payload.position_id = positionId.trim();
        payload.work_center_code = null;
      }

      if (isEdit && policyId) {
        await updatePolicy(
          companyId,
          policyId,
          deviceId,
          accessToken,
          locationId ?? '',
          payload,
        );
        setSnack({ text: 'Policy updated', tone: 'ok' });
      } else {
        await createPolicy(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          payload,
        );
        setSnack({ text: 'Policy created', tone: 'ok' });
      }

      setTimeout(() => navigation.goBack(), 800);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to save policy',
        tone: 'err',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading policy…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Identity */}
          <Text style={styles.sectionLabel}>Policy code</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="e.g. WC_MUMBAI_OFFICE"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>
            Policy type
          </Text>
          <View style={styles.chipsRow}>
            {POLICY_TYPES.map((t) => {
              const active = type === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {t.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Scope */}
          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            Applied to
          </Text>
          <View style={styles.scopeRow}>
            <TouchableOpacity
              onPress={() => setScope('work_center')}
              style={[
                styles.scopeCard,
                scope === 'work_center' && styles.scopeCardActive,
              ]}
              activeOpacity={0.85}
            >
              <Icon
                name="factory"
                size={18}
                color={scope === 'work_center' ? PRIMARY_COLOR : '#64748B'}
              />
              <Text
                style={[
                  styles.scopeLabel,
                  scope === 'work_center' && { color: PRIMARY_COLOR },
                ]}
              >
                Work Center
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setScope('position')}
              style={[
                styles.scopeCard,
                scope === 'position' && styles.scopeCardActive,
              ]}
              activeOpacity={0.85}
            >
              <Icon
                name="badge-account"
                size={18}
                color={scope === 'position' ? PRIMARY_COLOR : '#64748B'}
              />
              <Text
                style={[
                  styles.scopeLabel,
                  scope === 'position' && { color: PRIMARY_COLOR },
                ]}
              >
                Position
              </Text>
            </TouchableOpacity>
          </View>

          {scope === 'work_center' ? (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={workCenterCode}
              onChangeText={setWorkCenterCode}
              placeholder="Work center code"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          ) : (
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={positionId}
              onChangeText={setPositionId}
              placeholder="Position UUID"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          )}

          <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
            Description (optional)
          </Text>
          <TextInput
            style={[styles.input, { minHeight: 70 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Notes for other admins"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          {/* Rules */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
            Rules
          </Text>

          <View style={styles.numGrid}>
            <NumField
              label="Grace period (min)"
              value={gracePeriod}
              onChange={setGracePeriod}
            />
            <NumField
              label="Max late (min)"
              value={maxLateAllowed}
              onChange={setMaxLateAllowed}
            />
            <NumField
              label="Half-day ≤ (min)"
              value={halfDayAfter}
              onChange={setHalfDayAfter}
            />
            <NumField
              label="Overtime ≥ (min)"
              value={overtimeThreshold}
              onChange={setOvertimeThreshold}
            />
          </View>

          <ToggleRow
            label="Auto checkout"
            sub="Close an open session at expected end time"
            value={autoCheckout}
            onValueChange={setAutoCheckout}
          />
          <ToggleRow
            label="Require work center"
            sub="Refuse punches without a work center reference"
            value={requireWorkCenter}
            onValueChange={setRequireWorkCenter}
          />

          <Text style={[styles.subLabel, { marginTop: 18 }]}>
            Allowed sources
          </Text>
          <View style={styles.chipsRowWrap}>
            {CANONICAL_SOURCE_TYPES.map((src) => {
              const active = allowedSourceTypes.includes(src);
              return (
                <TouchableOpacity
                  key={src}
                  onPress={() =>
                    setAllowedSourceTypes((prev) =>
                      active
                        ? prev.filter((x) => x !== src)
                        : [...prev, src],
                    )
                  }
                  style={[
                    styles.smallChip,
                    active && styles.smallChipActive,
                  ]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.smallChipText,
                      active && styles.smallChipTextActive,
                    ]}
                  >
                    {src}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ToggleRow
            label="Allow self-service punch"
            sub="Mobile / web self check-in"
            value={allowSelfService}
            onValueChange={setAllowSelfService}
          />
          <ToggleRow
            label="Allow admin marking"
            sub="Manual corrections from an admin"
            value={allowAdminMarking}
            onValueChange={setAllowAdminMarking}
          />
          <ToggleRow
            label="Allow device marking"
            sub="Biometric / kiosk devices"
            value={allowDeviceMarking}
            onValueChange={setAllowDeviceMarking}
          />

          {/* Active */}
          <View style={styles.activeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeLabel}>Policy active</Text>
              <Text style={styles.activeSub}>
                Inactive policies are skipped by the resolver
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              color={PRIMARY_COLOR}
            />
          </View>

          {/* Validation */}
          {validationError ? (
            <View style={styles.validation}>
              <Icon name="alert-circle-outline" size={14} color="#B45309" />
              <Text style={styles.validationText}>{validationError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submit, !canSubmit && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon
                  name={isEdit ? 'content-save-outline' : 'plus'}
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.submitText}>
                  {isEdit ? 'Save changes' : 'Create policy'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={3000}
        style={{
          backgroundColor: snack?.tone === 'ok' ? '#065F46' : '#991B1B',
        }}
      >
        <Text style={{ color: '#FFFFFF' }}>{snack?.text ?? ''}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.numField}>
      <Text style={styles.numLabel}>{label}</Text>
      <TextInput
        style={styles.numInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^\d]/g, ''))}
        keyboardType="number-pad"
        placeholder="—"
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onValueChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} color={PRIMARY_COLOR} />
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  scroll: { padding: 20, paddingBottom: 60 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 10 },

  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#FFFFFF',
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipTextActive: { color: '#FFFFFF' },

  scopeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scopeCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  scopeCardActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}08`,
  },
  scopeLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },

  numGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  numField: { width: '48%' },
  numLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
  },
  numInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#FFFFFF',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
  },
  toggleLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  toggleSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },

  chipsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  smallChipActive: { backgroundColor: PRIMARY_COLOR },
  smallChipText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  smallChipTextActive: { color: '#FFFFFF' },

  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  activeLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  activeSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },

  validation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  validationText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});