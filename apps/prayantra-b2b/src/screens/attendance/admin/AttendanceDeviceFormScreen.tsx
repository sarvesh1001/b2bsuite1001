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

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  attendanceCreateDevice,
  attendanceGetDevice,
  attendanceUpdateDevice,
} from '@b2b/api-client';

import type {
  AttendanceDevice,
  AttendanceSourceType,
} from '@b2b/shared-types';

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
  { AttendanceDeviceForm: { deviceId?: string } },
  'AttendanceDeviceForm'
>;

// ============================================================
// CONSTANTS
// ============================================================

const DEVICE_SOURCE_OPTIONS: {
  value: AttendanceSourceType;
  label: string;
  icon: string;
  tone: string;
  requiresWorkCenter: boolean;
  desc: string;
}[] = [
  {
    value: 'biometric',
    label: 'Biometric',
    icon: 'fingerprint',
    tone: '#8B5CF6',
    requiresWorkCenter: true,
    desc: 'Fingerprint / face reader',
  },
  {
    value: 'kiosk',
    label: 'Kiosk',
    icon: 'tablet-dashboard',
    tone: '#6366F1',
    requiresWorkCenter: true,
    desc: 'Self-service punch station',
  },
  {
    value: 'classroom',
    label: 'Classroom',
    icon: 'school-outline',
    tone: '#EC4899',
    requiresWorkCenter: true,
    desc: 'Classroom attendance device',
  },
  {
    value: 'mobile',
    label: 'Mobile',
    icon: 'cellphone',
    tone: '#10B981',
    requiresWorkCenter: false,
    desc: 'Registered employee phone',
  },
  {
    value: 'web',
    label: 'Web',
    icon: 'web',
    tone: '#3B82F6',
    requiresWorkCenter: false,
    desc: 'Browser-based check-in',
  },
  {
    value: 'manual',
    label: 'Manual',
    icon: 'account-edit-outline',
    tone: '#F59E0B',
    requiresWorkCenter: false,
    desc: 'Admin-driven entry point',
  },
  {
    value: 'auto',
    label: 'Auto',
    icon: 'robot-outline',
    tone: '#94A3B8',
    requiresWorkCenter: false,
    desc: 'Automated / IoT sensors',
  },
  {
    value: 'system',
    label: 'System',
    icon: 'cog-outline',
    tone: '#94A3B8',
    requiresWorkCenter: false,
    desc: 'Internal system events',
  },
];

// ============================================================
// HELPERS
// ============================================================

function isDateValid(s: string): boolean {
  if (!s) return true; // optional
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

function ymdOnly(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return '';
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceDeviceFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<FormRouteProp>();
  const { deviceId } = route.params || {};
  const isEdit = !!deviceId;

  const {
    companyId,
    deviceId: myDeviceId,
    accessToken,
    locationId,
  } = useUserAuthStore();

  // ---- Form state ----
  const [sourceType, setSourceType] =
    useState<AttendanceSourceType>('biometric');
  const [deviceCode, setDeviceCode] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [workCenterCode, setWorkCenterCode] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [macAddress, setMacAddress] = useState('');
  const [installedAt, setInstalledAt] = useState('');
  const [isActive, setIsActive] = useState(true);

  // ---- Async ----
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  // ============================================================
  // LOAD (edit mode)
  // ============================================================

  useEffect(() => {
    if (!isEdit) return;
    if (!companyId || !myDeviceId || !accessToken || !deviceId) return;

    (async () => {
      try {
        const res: any = await attendanceGetDevice(
          companyId,
          deviceId,
          myDeviceId,
          accessToken,
          locationId ?? undefined,
        );
        const d: AttendanceDevice | null = res?.data ?? null;
        if (!d) return;

        setSourceType(d.source_type);
        setDeviceCode(d.device_code ?? '');
        setDeviceName(d.device_name ?? '');
        setManufacturer(d.manufacturer ?? '');
        setModel(d.model ?? '');
        setWorkCenterCode(d.work_center_code ?? '');
        setIpAddress(d.ip_address ?? '');
        setMacAddress(d.mac_address ?? '');
        setInstalledAt(ymdOnly(d.installed_at));
        setIsActive(d.is_active ?? true);
      } catch (err: any) {
        setSnack({
          text:
            err?.response?.data?.error ||
            err?.message ||
            'Failed to load device',
          tone: 'err',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, myDeviceId, accessToken, locationId, isEdit, deviceId]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const selectedSource = useMemo(
    () => DEVICE_SOURCE_OPTIONS.find((o) => o.value === sourceType),
    [sourceType],
  );

  const validationError = useMemo(() => {
    if (!sourceType) return 'Source type is required';
    if (!deviceCode.trim()) return 'Device code is required';
    if (selectedSource?.requiresWorkCenter && !workCenterCode.trim()) {
      return `Work center code is required for ${sourceType} devices`;
    }
    if (installedAt.trim() && !isDateValid(installedAt.trim())) {
      return 'Installed date must be YYYY-MM-DD';
    }
    if (ipAddress.trim() && ipAddress.trim().length < 7) {
      return 'IP address looks invalid';
    }
    return null;
  }, [
    sourceType,
    deviceCode,
    selectedSource,
    workCenterCode,
    installedAt,
    ipAddress,
  ]);

  const canSubmit = !validationError && !submitting;

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    if (!companyId || !myDeviceId || !accessToken) {
      setSnack({ text: 'Session missing. Please log in again.', tone: 'err' });
      return;
    }
    if (validationError) {
      setSnack({ text: validationError, tone: 'err' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        source_type: sourceType,
        device_code: deviceCode.trim(),
        device_name: deviceName.trim() || null,
        manufacturer: manufacturer.trim() || null,
        model: model.trim() || null,
        work_center_code: workCenterCode.trim() || null,
        ip_address: ipAddress.trim() || null,
        mac_address: macAddress.trim() || null,
        is_active: isActive,
        installed_at: installedAt.trim()
          ? `${installedAt.trim()}T00:00:00Z`
          : null,
      };

      if (isEdit && deviceId) {
        // source_type is not editable — strip it so the backend
        // doesn't reject the update.
        const { source_type, ...rest } = payload;
        await attendanceUpdateDevice(
          companyId,
          deviceId,
          myDeviceId,
          accessToken,
          locationId ?? '',
          rest,
        );
        setSnack({ text: 'Device updated', tone: 'ok' });
      } else {
        await attendanceCreateDevice(
          companyId,
          myDeviceId,
          accessToken,
          locationId ?? '',
          payload,
        );
        setSnack({ text: 'Device registered', tone: 'ok' });
      }

      setTimeout(() => navigation.goBack(), 800);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to save device',
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
          <Text style={styles.loadingText}>Loading device…</Text>
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
          {/* Source type */}
          <Text style={styles.sectionLabel}>Source type</Text>
          {isEdit ? (
            <View style={styles.immutableRow}>
              <Icon
                name={selectedSource?.icon ?? 'devices'}
                size={16}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.immutableText}>
                {sourceType} · cannot be changed after creation
              </Text>
            </View>
          ) : (
            <View style={styles.sourceGrid}>
              {DEVICE_SOURCE_OPTIONS.map((opt) => {
                const active = sourceType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.sourceCard,
                      active && styles.sourceCardActive,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => setSourceType(opt.value)}
                  >
                    <View
                      style={[
                        styles.sourceIcon,
                        { backgroundColor: `${opt.tone}15` },
                        active && { backgroundColor: opt.tone },
                      ]}
                    >
                      <Icon
                        name={opt.icon}
                        size={18}
                        color={active ? '#FFFFFF' : opt.tone}
                      />
                    </View>
                    <Text
                      style={[
                        styles.sourceLabel,
                        active && { color: opt.tone },
                      ]}
                      numberOfLines={1}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.sourceDesc} numberOfLines={2}>
                      {opt.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {selectedSource?.requiresWorkCenter ? (
            <View style={styles.notice}>
              <Icon name="information-outline" size={14} color="#B45309" />
              <Text style={styles.noticeText}>
                {sourceType} devices must be bound to a work center.
              </Text>
            </View>
          ) : null}

          {/* Identity */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Identity
          </Text>
          <TextInput
            style={styles.input}
            value={deviceCode}
            onChangeText={setDeviceCode}
            placeholder="Device code (e.g. BIO-MUM-01)"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Display name (optional)"
            placeholderTextColor="#94A3B8"
          />

          {/* Hardware */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Hardware (optional)
          </Text>
          <View style={styles.twoCol}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={manufacturer}
              onChangeText={setManufacturer}
              placeholder="Manufacturer"
              placeholderTextColor="#94A3B8"
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={model}
              onChangeText={setModel}
              placeholder="Model"
              placeholderTextColor="#94A3B8"
            />
          </View>
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={macAddress}
            onChangeText={setMacAddress}
            placeholder="MAC address (AA:BB:CC:DD:EE:FF)"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {/* Network */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Network
          </Text>
          <TextInput
            style={styles.input}
            value={ipAddress}
            onChangeText={setIpAddress}
            placeholder="IP address (optional)"
            placeholderTextColor="#94A3B8"
            keyboardType="numbers-and-punctuation"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* Work center */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Work center
            {selectedSource?.requiresWorkCenter ? (
              <Text style={styles.requiredMark}> *</Text>
            ) : null}
          </Text>
          <TextInput
            style={styles.input}
            value={workCenterCode}
            onChangeText={setWorkCenterCode}
            placeholder="e.g. WC-MUM-01"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          {/* Installed */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Installed on (optional)
          </Text>
          <TextInput
            style={styles.input}
            value={installedAt}
            onChangeText={setInstalledAt}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />

          {/* Active */}
          <View style={styles.activeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.activeLabel}>Device active</Text>
              <Text style={styles.activeSub}>
                Inactive devices are ignored by the punch server
              </Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              color={PRIMARY_COLOR}
            />
          </View>

          {/* Trust note */}
          {isEdit ? (
            <View style={styles.trustNote}>
              <Icon name="shield-key-outline" size={14} color={TEXT_SECONDARY} />
              <Text style={styles.trustNoteText}>
                Trust is managed from the device detail screen.
              </Text>
            </View>
          ) : (
            <View style={styles.trustNote}>
              <Icon name="shield-alert-outline" size={14} color="#B45309" />
              <Text style={styles.trustNoteText}>
                New devices start untrusted. Mark as trusted from the detail
                screen once the device is online.
              </Text>
            </View>
          )}

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
                  {isEdit ? 'Save changes' : 'Register device'}
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
    marginBottom: 10,
  },
  requiredMark: { color: '#EF4444' },

  sourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sourceCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sourceCardActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}06`,
  },
  sourceIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  sourceLabel: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },
  sourceDesc: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 3,
    lineHeight: 13,
  },

  immutableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  immutableText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  noticeText: {
    flex: 1,
    color: '#92400E',
    fontSize: 11,
    fontWeight: '600',
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

  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },

  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
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

  trustNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  trustNoteText: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 15,
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