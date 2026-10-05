import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  TextInput,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
  useFocusEffect,
} from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { searchEvents } from '@b2b/api-client';

import type {
  AttendanceSubjectType,
  AttendancePunchEvent,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';
import { useUserDisplayName } from '../../../hooks/useUserDisplayName';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// ============================================================
// TYPES
// ============================================================

type DashRouteProp = RouteProp<
  { TeamAttendanceDashboard: { subjectType: AttendanceSubjectType } },
  'TeamAttendanceDashboard'
>;

interface LiveRow {
  subject_id: string;
  last_event: AttendancePunchEvent;
  status: 'in' | 'out';
  events_today: number;
}

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isInEvent(t: string): boolean {
  return (
    t === 'check_in' ||
    t === 'shift_start' ||
    t === 'class_start' ||
    t === 'session_join' ||
    t === 'break_end' ||
    t === 'manual_check_in'
  );
}

function isOutEvent(t: string): boolean {
  return (
    t === 'check_out' ||
    t === 'shift_end' ||
    t === 'class_end' ||
    t === 'session_leave' ||
    t === 'break_start' ||
    t === 'manual_check_out'
  );
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// ============================================================
// ROW COMPONENT (uses hook → must be its own component)
// ============================================================

function LiveSubjectRow({
  row,
  onPress,
}: {
  row: LiveRow;
  onPress: () => void;
}) {
    const { data: nameData } = useUserDisplayName(row.subject_id);
    const name = nameData?.full_name ?? nameData?.username ?? null;
  
  const statusTone = row.status === 'in' ? '#10B981' : '#94A3B8';
  const statusLabel = row.status === 'in' ? 'IN' : 'OUT';

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <UserAvatar
        userId={row.subject_id}
        username={undefined}
        fullName={name ?? undefined}
        size={44}
      />
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {name || row.subject_id}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          Last · {row.last_event.event_type} · {fmtTime(row.last_event.event_time)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View
          style={[styles.statusPill, { backgroundColor: `${statusTone}18` }]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: statusTone }]}
          />
          <Text style={[styles.statusPillText, { color: statusTone }]}>
            {statusLabel}
          </Text>
        </View>
        <Text style={styles.rowEventCount}>{row.events_today} events</Text>
      </View>
      <Icon name="chevron-right" size={18} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

// ============================================================
// SCREEN
// ============================================================

export default function TeamAttendanceDashboardScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<DashRouteProp>();
  const { subjectType } = route.params;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [rows, setRows] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const [search, setSearch] = useState('');

  const today = useMemo(() => ymd(new Date()), []);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await searchEvents(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          {
            start_date: today,
            end_date: today,
            subject_type: subjectType,
            page: 1,
            page_size: 1000,
          },
        );

        const events: AttendancePunchEvent[] = res?.data?.events ?? [];

        // Group by subject — events are newest-first from backend
        const map = new Map<string, LiveRow>();
        for (const e of events) {
          const existing = map.get(e.subject_id);
          if (!existing) {
            map.set(e.subject_id, {
              subject_id: e.subject_id,
              last_event: e,
              status: isInEvent(e.event_type) ? 'in' : 'out',
              events_today: 1,
            });
          } else {
            existing.events_today += 1;
            // Keep newest event_time as the "last" one
            if (new Date(e.event_time) > new Date(existing.last_event.event_time)) {
              existing.last_event = e;
              existing.status = isInEvent(e.event_type) ? 'in' : 'out';
            }
          }
        }

        setRows(Array.from(map.values()));
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load live status.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId, today, subjectType],
  );

  // Reload every time the screen focuses (live board)
  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  useEffect(() => {
    // Auto-refresh every 60s while mounted
    const t = setInterval(() => fetchAll(true), 60000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const filtered = useMemo(() => {
    let out = rows;
    if (filter === 'in') out = out.filter((r) => r.status === 'in');
    else if (filter === 'out') out = out.filter((r) => r.status === 'out');
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(
        (r) =>
          r.subject_id.toLowerCase().includes(q) ||
          (r.last_event.context?.work_center_code ?? '').toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, filter, search]);

  const counts = useMemo(() => {
    const inCount = rows.filter((r) => r.status === 'in').length;
    return { in: inCount, out: rows.length - inCount, total: rows.length };
  }, [rows]);

  const goMember = (r: LiveRow) => {
    navigation.navigate('TeamMemberAttendance', {
      subjectType,
      subjectId: r.subject_id,
    });
  };

  // ============================================================
  // HEADER
  // ============================================================

  const Header = () => (
    <>
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.heroSmall}>LIVE BOARD</Text>
            <Text style={styles.heroTitle}>
              {subjectType.charAt(0).toUpperCase() + subjectType.slice(1)}s
            </Text>
          </View>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => fetchAll(true)}
            activeOpacity={0.8}
          >
            <Icon name="refresh" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{counts.in}</Text>
            <Text style={styles.heroStatLbl}>IN</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{counts.out}</Text>
            <Text style={styles.heroStatLbl}>OUT</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{counts.total}</Text>
            <Text style={styles.heroStatLbl}>TOTAL</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filterRow}>
        {(['all', 'in', 'out'] as const).map((k) => {
          const active = filter === k;
          const label =
            k === 'all'
              ? `All (${counts.total})`
              : k === 'in'
              ? `In (${counts.in})`
              : `Out (${counts.out})`;
          return (
            <TouchableOpacity
              key={k}
              onPress={() => setFilter(k)}
              style={[styles.filterChip, active && styles.filterChipActive]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.searchWrap}>
        <Icon name="magnify" size={18} color={TEXT_SECONDARY} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Filter by ID or work center…"
          placeholderTextColor={TEXT_SECONDARY}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
    </>
  );

  // ============================================================
  // MAIN
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading live board…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load board</Text>
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
          keyExtractor={(item) => item.subject_id}
          renderItem={({ item }) => (
            <LiveSubjectRow row={item} onPress={() => goMember(item)} />
          )}
          ListHeaderComponent={<Header />}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchAll(true)}
              tintColor={PRIMARY_COLOR}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon name="account-clock-outline" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>Nobody yet</Text>
              <Text style={styles.errMsg}>
                {filter === 'all'
                  ? `No ${subjectType} activity today.`
                  : `No one is ${filter === 'in' ? 'in' : 'out'} right now.`}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  hero: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroSmall: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 3,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    justifyContent: 'space-around',
  },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatVal: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 30,
  },
  heroStatLbl: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 3,
  },
  heroDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowBody: { flex: 1 },
  rowName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rowEventCount: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '600',
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER_COLOR,
    marginLeft: 72,
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
});