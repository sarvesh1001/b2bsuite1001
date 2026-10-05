import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  attendanceGetDevice,
  attendanceActivateDevice,
  attendanceDeactivateDevice,
  markDeviceTrusted,
  attendanceRevokeDeviceTrust,
  attendanceDeleteDevice,
  deviceHealthCheck,
} from '@b2b/api-client';

import type { AttendanceDevice } from '@b2b/shared-types';

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

type DetailRouteProp = RouteProp<
  { AttendanceDeviceDetail: { deviceId: string } },
  'AttendanceDeviceDetail'
>;

// ============================================================
// HELPERS
// ============================================================

function prettyTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceDeviceDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<DetailRouteProp>();
  const { deviceId } = route.params;

  const { companyId, deviceId: myDeviceId, accessToken, locationId } = useUserAuthStore();

  const [device, setDevice] = useState<AttendanceDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [healthOpen, setHealthOpen] = useState(false);
  const [health, setHealth] = useState<{
    status: string;
    timestamp: string;
  } | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  const fetchDevice = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !myDeviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const res: any = await attendanceGetDevice(
          companyId,
          deviceId,
          myDeviceId,
          accessToken,
          locationId ?? undefined,
        );
        setDevice(res?.data ?? null);
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
        setRefreshing(false);
      }
    },
    [companyId, myDeviceId, accessToken, locationId, deviceId],
  );

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const runAction = async (
    key: string,
    fn: () => Promise<any>,
    successMsg: string,
  ) => {
    if (!companyId || !myDeviceId || !accessToken) return;
    setActing(key);
    try {
      await fn();
      setSnack({ text: successMsg, tone: 'ok' });
      await fetchDevice(true);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Action failed',
        tone: 'err',
      });
    } finally {
      setActing(null);
    }
  };

  const handleToggleActive = () => {
    if (!device) return;
    if (device.is_active) {
      Alert.alert('Deactivate', 'Stop accepting punches from this device?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () =>
            runAction(
              'active',
              () =>
                attendanceDeactivateDevice(
                  companyId!,
                  device.device_id,
                  myDeviceId!,
                  accessToken!,
                  locationId ?? '',
                ),
              'Device deactivated',
            ),
        },
      ]);
    } else {
      runAction(
        'active',
        () =>
          attendanceActivateDevice(
            companyId!,
            device.device_id,
            myDeviceId!,
            accessToken!,
            locationId ?? '',
          ),
        'Device activated',
      );
    }
  };

  const handleToggleTrust = () => {
    if (!device) return;
    if (device.is_trusted) {
      Alert.alert('Revoke trust', 'Device will be rejected by the server.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () =>
            runAction(
              'trust',
              () =>
                attendanceRevokeDeviceTrust(
                  companyId!,
                  device.device_id,
                  myDeviceId!,
                  accessToken!,
                  locationId ?? '',
                ),
              'Trust revoked',
            ),
        },
      ]);
    } else {
      runAction(
        'trust',
        () =>
          markDeviceTrusted(
            companyId!,
            device.device_id,
            myDeviceId!,
            accessToken!,
            locationId ?? '',
          ),
        'Device trusted',
      );
    }
  };

  const handleDelete = () => {
    if (!device) return;
    Alert.alert(
      'Delete device',
      `Soft-delete ${device.device_code}? Enrollments and tokens will need to be re-created if you re-register.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !myDeviceId || !accessToken) return;
            setActing('delete');
            try {
              await attendanceDeleteDevice(
                companyId,
                device.device_id,
                myDeviceId,
                accessToken,
                locationId ?? '',
              );
              setSnack({ text: 'Device deleted', tone: 'ok' });
              setTimeout(() => navigation.goBack(), 700);
            } catch (err: any) {
              setSnack({
                text:
                  err?.response?.data?.error ||
                  err?.message ||
                  'Delete failed',
                tone: 'err',
              });
            } finally {
              setActing(null);
            }
          },
        },
      ],
    );
  };

  const handleHealthCheck = async () => {
    if (!companyId || !myDeviceId || !accessToken) return;
    setHealthOpen(true);
    setHealthLoading(true);
    setHealth(null);
    try {
      const res: any = await deviceHealthCheck(
        companyId,
        myDeviceId,
        accessToken,
      );
      setHealth(res?.data ?? { status: 'unknown', timestamp: '' });
    } catch (err: any) {
      setHealth({
        status: 'unreachable',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setHealthLoading(false);
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

  if (!device) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Icon name="devices" size={32} color="#94A3B8" />
          <Text style={styles.errTitle}>Device not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDevice(true)}
            tintColor={PRIMARY_COLOR}
          />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon
              name={
                device.source_type === 'biometric'
                  ? 'fingerprint'
                  : device.source_type === 'kiosk'
                  ? 'tablet-dashboard'
                  : device.source_type === 'classroom'
                  ? 'school-outline'
                  : 'cellphone-link'
              }
              size={30}
              color="#FFFFFF"
            />
          </View>
          <Text style={styles.heroName} numberOfLines={1}>
            {device.device_name || device.device_code}
          </Text>
          <Text style={styles.heroCode}>{device.device_code}</Text>

          <View style={styles.heroPills}>
            <Pill
              icon="circle"
              label={device.is_active ? 'Active' : 'Inactive'}
              tone={device.is_active ? '#10B981' : '#94A3B8'}
            />
            <Pill
              icon="shield-check"
              label={device.is_trusted ? 'Trusted' : 'Untrusted'}
              tone={device.is_trusted ? '#8B5CF6' : '#EF4444'}
            />
            <Pill
              icon="tag-outline"
              label={device.source_type}
              tone="#3B82F6"
            />
          </View>
        </View>

        {/* Info grid */}
        <Text style={styles.sectionTitle}>Device info</Text>
        <View style={styles.infoGrid}>
          <InfoRow label="Manufacturer" value={device.manufacturer ?? '—'} />
          <InfoRow label="Model" value={device.model ?? '—'} />
          <InfoRow
            label="Work center"
            value={device.work_center_code ?? '—'}
          />
          <InfoRow label="IP address" value={device.ip_address ?? '—'} />
          <InfoRow label="MAC address" value={device.mac_address ?? '—'} />
          <InfoRow
            label="Geofence"
            value={
              device.geofence_id
                ? device.geofence_id.slice(0, 8) + '…'
                : '—'
            }
          />
          <InfoRow
            label="Installed"
            value={prettyTime(device.installed_at)}
          />
          <InfoRow
            label="Last seen"
            value={prettyTime(device.last_seen_at)}
          />
          <InfoRow label="Created" value={prettyTime(device.created_at)} />
          <InfoRow label="Device ID" value={device.device_id.slice(0, 8) + '…'} />
        </View>

        {/* Actions */}
        <Text style={styles.sectionTitle}>Actions</Text>
        <ActionRow
          icon={device.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
          label={device.is_active ? 'Deactivate device' : 'Activate device'}
          sub={
            device.is_active
              ? 'Stop accepting punches'
              : 'Resume accepting punches'
          }
          tone={device.is_active ? '#F59E0B' : '#10B981'}
          busy={acting === 'active'}
          onPress={handleToggleActive}
        />
        <ActionRow
          icon={device.is_trusted ? 'shield-off-outline' : 'shield-check-outline'}
          label={device.is_trusted ? 'Revoke trust' : 'Mark as trusted'}
          sub={
            device.is_trusted
              ? 'Server will reject punches'
              : 'Required for the device to punch'
          }
          tone={device.is_trusted ? '#EF4444' : '#8B5CF6'}
          busy={acting === 'trust'}
          onPress={handleToggleTrust}
        />
        <ActionRow
          icon="heart-pulse"
          label="Health check"
          sub="Ping the device service"
          tone="#3B82F6"
          busy={false}
          onPress={handleHealthCheck}
        />
        <ActionRow
          icon="pencil-outline"
          label="Edit device"
          sub="Code, hardware, network, work center"
          tone={PRIMARY_COLOR}
          busy={false}
          onPress={() =>
            navigation.navigate('AttendanceDeviceForm', {
              deviceId: device.device_id,
            })
          }
        />
        <ActionRow
          icon="account-multiple-plus-outline"
          label="Manage enrollments"
          sub="Map users to this device's user codes"
          tone="#0EA5E9"
          busy={false}
          onPress={() =>
            navigation.navigate('AttendanceDeviceEnrollments', {
              deviceId: device.device_id,
              deviceCode: device.device_code,
              deviceSourceType: device.source_type,
            })
          }
        />
        <ActionRow
          icon="key-outline"
          label="Device tokens"
          sub="Issue or revoke auth tokens"
          tone="#6366F1"
          busy={false}
          onPress={() =>
            navigation.navigate('AttendanceDeviceTokens', {
              deviceId: device.device_id,
              deviceCode: device.device_code,
              deviceSourceType: device.source_type,
            })
          }
        />
        <ActionRow
          icon="delete-outline"
          label="Delete device"
          sub="Soft-delete; enrollments preserved"
          tone="#EF4444"
          busy={acting === 'delete'}
          onPress={handleDelete}
        />

        {device.metadata && Object.keys(device.metadata).length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Metadata</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                {JSON.stringify(device.metadata, null, 2)}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      {/* Health modal */}
      <Modal
        visible={healthOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setHealthOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Device health</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setHealthOpen(false)}
              >
                <Icon name="close" size={16} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            {healthLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
              </View>
            ) : health ? (
              <>
                <View
                  style={[
                    styles.healthBadge,
                    {
                      backgroundColor:
                        health.status === 'healthy'
                          ? '#D1FAE5'
                          : '#FEE2E2',
                    },
                  ]}
                >
                  <Icon
                    name={
                      health.status === 'healthy'
                        ? 'check-circle'
                        : 'alert-circle'
                    }
                    size={16}
                    color={health.status === 'healthy' ? '#065F46' : '#991B1B'}
                  />
                  <Text
                    style={[
                      styles.healthBadgeText,
                      {
                        color:
                          health.status === 'healthy' ? '#065F46' : '#991B1B',
                      },
                    ]}
                  >
                    {health.status.toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.healthTime}>
                  {prettyTime(health.timestamp)}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

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

function Pill({
  icon,
  label,
  tone,
}: {
  icon: string;
  label: string;
  tone: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: `${tone}25` }]}>
      <Icon name={icon} size={10} color={tone} />
      <Text style={[styles.pillText, { color: tone }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  sub,
  tone,
  busy,
  onPress,
}: {
  icon: string;
  label: string;
  sub: string;
  tone: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.actionRow}
      activeOpacity={0.85}
      onPress={onPress}
      disabled={busy}
    >
      <View style={[styles.actionIcon, { backgroundColor: `${tone}15` }]}>
        <Icon name={icon} size={18} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSub}>{sub}</Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={tone} />
      ) : (
        <Icon name="chevron-right" size={18} color="#CBD5E1" />
      )}
    </TouchableOpacity>
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
  errTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },

  hero: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    marginBottom: 14,
  },
  heroName: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },
  heroCode: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontFamily: 'Courier',
    marginTop: 4,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },

  infoGrid: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
    gap: 12,
  },
  infoLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    width: 100,
  },
  infoValue: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '500',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 8,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  actionSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },

  codeBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  codeText: {
    color: '#E2E8F0',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalCenter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  healthBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  healthTime: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 10,
  },
});