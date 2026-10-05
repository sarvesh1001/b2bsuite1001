import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  attendanceListDevices,
  deviceHealthCheck,
  adminForceDeviceResync,
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
// HELPERS
// ============================================================

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  try {
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

type Health = 'healthy' | 'degraded' | 'stale' | 'offline' | 'unknown';

function deriveHealth(d: AttendanceDevice): {
  status: Health;
  tone: string;
  icon: string;
} {
  if (!d.is_active) {
    return {
      status: 'offline',
      tone: '#94A3B8',
      icon: 'power-plug-off-outline',
    };
  }
  if (!d.last_seen_at) {
    return { status: 'unknown', tone: '#94A3B8', icon: 'help-circle-outline' };
  }
  const diff = Date.now() - new Date(d.last_seen_at).getTime();
  const minutes = diff / 60000;
  if (minutes < 15) {
    return { status: 'healthy', tone: '#10B981', icon: 'check-circle-outline' };
  }
  if (minutes < 60 * 6) {
    return { status: 'degraded', tone: '#F59E0B', icon: 'alert-outline' };
  }
  return { status: 'stale', tone: '#EF4444', icon: 'clock-alert-outline' };
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceBiometricSyncStatusScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [rows, setRows] = useState<AttendanceDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await attendanceListDevices(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          {
            source_type: 'biometric',
            include_inactive: true,
            page: 1,
            page_size: 100,
          },
        );

        const list: AttendanceDevice[] = res?.data?.devices ?? [];
        setRows(list);
      } catch (e: any) {
        setError(
          e?.response?.data?.error ||
            e?.message ||
            'Unable to load devices.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const handleForceResync = (d: AttendanceDevice) => {
    Alert.alert(
      'Force resync',
      `Reset the sync state for ${d.device_name || d.device_code}? The next sync will be a full transfer of all embeddings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Force resync',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !deviceId || !accessToken) return;
            setBusyId(d.device_id);
            try {
              await adminForceDeviceResync(
                companyId,
                d.device_id,
                deviceId,
                accessToken,
                locationId ?? '',
              );
              setSnack({
                text: 'Sync state reset — device will full-sync next',
                tone: 'ok',
              });
              await fetchAll(true);
            } catch (e: any) {
              setSnack({
                text:
                  e?.response?.data?.error ||
                  e?.message ||
                  'Failed to reset sync',
                tone: 'err',
              });
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const handleHealthCheck = async (d: AttendanceDevice) => {
    if (!companyId || !deviceId || !accessToken) return;
    setBusyId(d.device_id);
    try {
      const res: any = await deviceHealthCheck(
        companyId,
        deviceId,
        accessToken,
      );
      setSnack({
        text: `Service: ${res?.data?.status ?? 'unknown'}`,
        tone: 'ok',
      });
    } catch (e: any) {
      setSnack({
        text:
          e?.response?.data?.error ||
          e?.message ||
          'Health check failed',
        tone: 'err',
      });
    } finally {
      setBusyId(null);
    }
  };

  const stats = useMemo(() => {
    let healthy = 0;
    let degraded = 0;
    let stale = 0;
    let offline = 0;
    let unknown = 0;
    for (const d of rows) {
      const { status } = deriveHealth(d);
      if (status === 'healthy') healthy++;
      else if (status === 'degraded') degraded++;
      else if (status === 'stale') stale++;
      else if (status === 'offline') offline++;
      else unknown++;
    }
    return { healthy, degraded, stale, offline, unknown, total: rows.length };
  }, [rows]);

  const renderRow = ({ item }: { item: AttendanceDevice }) => {
    const h = deriveHealth(item);
    const isBusy = busyId === item.device_id;

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: h.tone }]} />
        <View style={styles.cardHeader}>
          <View
            style={[styles.iconWrap, { backgroundColor: `${h.tone}15` }]}
          >
            <Icon name={h.icon} size={22} color={h.tone} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.device_name || item.device_code}
            </Text>
            <Text style={styles.cardCode} numberOfLines={1}>
              {item.device_code}
            </Text>
          </View>
          <View style={[styles.healthPill, { backgroundColor: `${h.tone}18` }]}>
            <View
              style={[styles.healthDot, { backgroundColor: h.tone }]}
            />
            <Text style={[styles.healthPillText, { color: h.tone }]}>
              {h.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <MetaCell
            icon="clock-outline"
            label="Last seen"
            value={relativeTime(item.last_seen_at)}
            valueTone={h.tone}
          />
          <MetaCell
            icon="shield-check-outline"
            label="Trusted"
            value={item.is_trusted ? 'Yes' : 'No'}
            valueTone={item.is_trusted ? '#10B981' : '#EF4444'}
          />
          <MetaCell
            icon="factory"
            label="Work center"
            value={item.work_center_code ?? '—'}
          />
          <MetaCell
            icon="calendar-clock"
            label="Installed"
            value={relativeTime(item.installed_at)}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => handleHealthCheck(item)}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            ) : (
              <>
                <Icon name="heart-pulse" size={14} color={PRIMARY_COLOR} />
                <Text style={styles.outlineBtnText}>Health</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => handleForceResync(item)}
            disabled={isBusy}
            activeOpacity={0.85}
          >
            <Icon name="refresh" size={14} color="#EF4444" />
            <Text style={styles.dangerBtnText}>Force resync</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {!loading && rows.length > 0 ? (
        <View style={styles.summaryStrip}>
          <SummaryCell label="Healthy" count={stats.healthy} tone="#10B981" />
          <View style={styles.summaryDivider} />
          <SummaryCell label="Degraded" count={stats.degraded} tone="#F59E0B" />
          <View style={styles.summaryDivider} />
          <SummaryCell label="Stale" count={stats.stale} tone="#EF4444" />
          <View style={styles.summaryDivider} />
          <SummaryCell label="Offline" count={stats.offline} tone="#94A3B8" />
        </View>
      ) : null}

      <View style={styles.intro}>
        <Icon name="information-outline" size={16} color={PRIMARY_COLOR} />
        <Text style={styles.introText}>
          Health is inferred from last-seen timestamps. Force resync clears
          the device's sync state; its next sync will fetch all embeddings
          fresh.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading devices…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load</Text>
          <Text style={styles.errMsg}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchAll()}
          >
            <Text style={styles.retryTxt}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.device_id}
          renderItem={renderRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(true)}
              tintColor={PRIMARY_COLOR}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="fingerprint" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No biometric devices</Text>
              <Text style={styles.errMsg}>
                Register a biometric device under Devices first.
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => navigation.navigate('AttendanceDevicesList')}
              >
                <Text style={styles.retryTxt}>Go to Devices</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={3200}
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

function SummaryCell({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <View style={styles.summaryCell}>
      <Text style={[styles.summaryNum, { color: tone }]}>{count}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function MetaCell({
  icon,
  label,
  value,
  valueTone,
}: {
  icon: string;
  label: string;
  value: string;
  valueTone?: string;
}) {
  return (
    <View style={styles.metaCell}>
      <View style={styles.metaCellTop}>
        <Icon name={icon} size={11} color={TEXT_SECONDARY} />
        <Text style={styles.metaCellLabel}>{label}</Text>
      </View>
      <Text
        style={[
          styles.metaCellValue,
          valueTone ? { color: valueTone } : null,
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  summaryCell: { flex: 1, alignItems: 'center' },
  summaryNum: { fontSize: 20, fontWeight: '800' },
  summaryLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  summaryDivider: { width: 1, height: 28, backgroundColor: BORDER_COLOR },

  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}25`,
  },
  introText: { flex: 1, color: TEXT_PRIMARY, fontSize: 11, lineHeight: 16 },

  listContent: { padding: 16, paddingBottom: 40 },

  card: {
    position: 'relative',
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 6,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  cardCode: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Courier',
  },
  healthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  healthDot: { width: 6, height: 6, borderRadius: 3 },
  healthPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginLeft: 6,
    gap: 10,
  },
  metaCell: { width: '48%' },
  metaCellTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaCellLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  metaCellValue: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  outlineBtnText: { color: PRIMARY_COLOR, fontSize: 11, fontWeight: '700' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  dangerBtnText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  loadingText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 10 },
  errTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  errMsg: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },
  retryTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
});