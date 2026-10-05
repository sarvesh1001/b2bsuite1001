import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  attendanceListDevices,
  getDeviceStatistics,
} from '@b2b/api-client';

import type {
  AttendanceDevice,
  AttendanceDeviceStatistics,
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
// HELPERS
// ============================================================

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'never';
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    if (days < 30) return `${days}d ago`;
    return d.toLocaleDateString();
  } catch {
    return iso;
  }
}

const SOURCE_TONE: Record<string, string> = {
  biometric: '#8B5CF6',
  kiosk: '#6366F1',
  classroom: '#EC4899',
  mobile: '#10B981',
  web: '#3B82F6',
  manual: '#F59E0B',
  correction: '#EF4444',
  auto: '#94A3B8',
  system: '#94A3B8',
};

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceDevicesListScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [stats, setStats] = useState<AttendanceDeviceStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    'all' | 'active' | 'inactive' | 'trusted'
  >('all');

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const [listRes, statsRes] = await Promise.allSettled([
          attendanceListDevices(
            companyId,
            deviceId,
            accessToken,
            locationId ?? undefined,
            {
              include_inactive: true,
              page: 1,
              page_size: 100,
            },
          ),
          getDeviceStatistics(companyId, deviceId, accessToken),
        ]);

        if (listRes.status === 'fulfilled') {
          const list: AttendanceDevice[] =
            (listRes.value as any)?.data?.devices ?? [];
          setDevices(list);
        } else {
          setDevices([]);
        }

        if (statsRes.status === 'fulfilled') {
          setStats((statsRes.value as any)?.data ?? null);
        } else {
          setStats(null);
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load devices.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  useEffect(() => {
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'active':
        return devices.filter((d) => d.is_active);
      case 'inactive':
        return devices.filter((d) => !d.is_active);
      case 'trusted':
        return devices.filter((d) => d.is_trusted);
      default:
        return devices;
    }
  }, [devices, filter]);

  const goDetail = (d: AttendanceDevice) => {
    navigation.navigate('AttendanceDeviceDetail', {
      deviceId: d.device_id,
    });
  };

  const renderDevice = ({ item }: { item: AttendanceDevice }) => {
    const tone = SOURCE_TONE[item.source_type] ?? '#64748B';

    return (
      <TouchableOpacity
        style={[styles.card, !item.is_active && styles.cardInactive]}
        activeOpacity={0.85}
        onPress={() => goDetail(item)}
      >
        <View style={[styles.cardAccent, { backgroundColor: tone }]} />

        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: `${tone}15` }]}>
            <Icon
              name={
                item.source_type === 'biometric'
                  ? 'fingerprint'
                  : item.source_type === 'kiosk'
                  ? 'tablet-dashboard'
                  : item.source_type === 'classroom'
                  ? 'school-outline'
                  : 'cellphone-link'
              }
              size={22}
              color={tone}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.device_name || item.device_code}
            </Text>
            <Text style={styles.cardCode} numberOfLines={1}>
              {item.device_code}
            </Text>
          </View>
          <View style={styles.pillsCol}>
            {item.is_trusted ? (
              <View style={styles.trustedPill}>
                <Icon name="shield-check" size={10} color="#065F46" />
                <Text style={styles.trustedPillText}>TRUSTED</Text>
              </View>
            ) : (
              <View style={styles.untrustedPill}>
                <Icon name="shield-alert-outline" size={10} color="#991B1B" />
                <Text style={styles.untrustedPillText}>UNTRUSTED</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.metaGrid}>
          <MetaCell
            icon="tag-outline"
            label="Source"
            value={item.source_type}
          />
          <MetaCell
            icon="factory"
            label="Work Center"
            value={item.work_center_code ?? '—'}
          />
          <MetaCell
            icon="clock-outline"
            label="Last Seen"
            value={relativeTime(item.last_seen_at)}
          />
          <MetaCell
            icon="circle"
            label="Status"
            value={item.is_active ? 'Active' : 'Inactive'}
            valueTone={item.is_active ? '#10B981' : '#94A3B8'}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <>
      {/* Stats */}
      <View style={styles.statsRow}>
        <Stat
          label="Total"
          value={stats?.total_devices ?? devices.length}
          tone="#3B82F6"
          icon="devices"
        />
        <Stat
          label="Active"
          value={stats?.active_devices ?? 0}
          tone="#10B981"
          icon="check-circle-outline"
        />
        <Stat
          label="Trusted"
          value={stats?.trusted_devices ?? 0}
          tone="#8B5CF6"
          icon="shield-check-outline"
        />
        <Stat
          label="Inactive"
          value={stats?.inactive_devices ?? 0}
          tone="#94A3B8"
          icon="close-circle-outline"
        />
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'trusted', 'inactive'] as const).map((k) => {
          const active = filter === k;
          return (
            <TouchableOpacity
              key={k}
              onPress={() => setFilter(k)}
              style={[
                styles.filterChip,
                active && styles.filterChipActive,
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading devices…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load devices</Text>
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
          data={filtered}
          keyExtractor={(item) => item.device_id}
          renderItem={renderDevice}
          ListHeaderComponent={<Header />}
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
              <Icon name="devices" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No devices</Text>
              <Text style={styles.errMsg}>
                {filter === 'all'
                  ? 'Register your first biometric or kiosk device.'
                  : `No ${filter} devices.`}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AttendanceDeviceForm', {})}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENTS
// ============================================================

function Stat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: string;
  icon: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tone}15` }]}>
        <Icon name={icon} size={14} color={tone} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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

  listContent: { padding: 16, paddingBottom: 96 },

  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  statIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 18,
  },
  statLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.3,
  },

  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  filterChipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipTextActive: { color: '#FFFFFF' },

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
  cardInactive: { opacity: 0.7 },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
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
  cardName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  cardCode: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Courier',
  },
  pillsCol: { alignItems: 'flex-end', gap: 4 },
  trustedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#D1FAE5',
  },
  trustedPillText: {
    color: '#065F46',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  untrustedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#FEE2E2',
  },
  untrustedPillText: {
    color: '#991B1B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginLeft: 6,
    gap: 8,
  },
  metaCell: {
    width: '48%',
  },
  metaCellTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaCellLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaCellValue: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
    textTransform: 'capitalize',
  },

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

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
});