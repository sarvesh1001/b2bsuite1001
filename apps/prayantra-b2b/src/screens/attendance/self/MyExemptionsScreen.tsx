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

import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { listExemptions } from '@b2b/api-client';

import type { AttendanceExemption } from '@b2b/shared-types';

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

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    return d.toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function daysBetween(from: string, to: string): number {
  try {
    const a = new Date(`${from}T00:00:00`).getTime();
    const b = new Date(`${to}T00:00:00`).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  } catch {
    return 0;
  }
}

type ExemptionState = 'active' | 'upcoming' | 'past';

function classifyExemption(e: AttendanceExemption): ExemptionState {
  const today = ymd(new Date());
  const from = e.from_date.slice(0, 10);
  const to = e.to_date.slice(0, 10);
  if (today > to) return 'past';
  if (today < from) return 'upcoming';
  return 'active';
}

const STATE_META: Record<
  ExemptionState,
  { label: string; tone: string; icon: string }
> = {
  active: { label: 'Active', tone: '#10B981', icon: 'check-circle-outline' },
  upcoming: {
    label: 'Upcoming',
    tone: '#3B82F6',
    icon: 'calendar-clock',
  },
  past: { label: 'Past', tone: '#94A3B8', icon: 'history' },
};

// ============================================================
// SCREEN
// ============================================================

export default function MyExemptionsScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId, user } =
    useUserAuthStore();

  const userId = user?.user_id ?? null;

  const [rows, setRows] = useState<AttendanceExemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | ExemptionState>('all');

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken || !userId) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await listExemptions(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          {
            subject_type: 'employee',
            subject_id: userId,
            page: 1,
            page_size: 200,
          },
        );

        const list: AttendanceExemption[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.exemptions)
          ? res.data.exemptions
          : [];

        setRows(list);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load exemptions.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId, userId],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const decorated = useMemo(
    () =>
      rows
        .map((r) => ({ row: r, state: classifyExemption(r) }))
        .sort((a, b) => {
          // active → upcoming → past; within each, newest first
          const order = { active: 0, upcoming: 1, past: 2 };
          const diff = order[a.state] - order[b.state];
          if (diff !== 0) return diff;
          return b.row.from_date.localeCompare(a.row.from_date);
        }),
    [rows],
  );

  const filtered = useMemo(() => {
    if (filter === 'all') return decorated;
    return decorated.filter((d) => d.state === filter);
  }, [decorated, filter]);

  const counts = useMemo(() => {
    let active = 0;
    let upcoming = 0;
    let past = 0;
    for (const d of decorated) {
      if (d.state === 'active') active++;
      else if (d.state === 'upcoming') upcoming++;
      else past++;
    }
    return { active, upcoming, past, all: decorated.length };
  }, [decorated]);

  // ============================================================
  // ROW
  // ============================================================

  const renderRow = ({
    item,
  }: {
    item: { row: AttendanceExemption; state: ExemptionState };
  }) => {
    const { row, state } = item;
    const meta = STATE_META[state];

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: meta.tone }]} />

        <View style={styles.cardHeader}>
          <View
            style={[styles.iconWrap, { backgroundColor: `${meta.tone}15` }]}
          >
            <Icon name={meta.icon} size={20} color={meta.tone} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {row.reason || 'Exemption'}
            </Text>
            <Text style={styles.cardSub}>
              {daysBetween(row.from_date, row.to_date)} day
              {daysBetween(row.from_date, row.to_date) === 1 ? '' : 's'}
            </Text>
          </View>
          <View
            style={[styles.statePill, { backgroundColor: `${meta.tone}18` }]}
          >
            <View
              style={[styles.stateDot, { backgroundColor: meta.tone }]}
            />
            <Text style={[styles.statePillText, { color: meta.tone }]}>
              {meta.label.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.dateStrip}>
          <View style={styles.dateCell}>
            <Icon name="calendar-start" size={13} color={TEXT_SECONDARY} />
            <Text style={styles.dateText}>{fmtDate(row.from_date)}</Text>
          </View>
          <Icon name="arrow-right" size={14} color="#CBD5E1" />
          <View style={styles.dateCell}>
            <Icon name="calendar-end" size={13} color={TEXT_SECONDARY} />
            <Text style={styles.dateText}>{fmtDate(row.to_date)}</Text>
          </View>
        </View>

        {row.approved_by ? (
          <View style={styles.approvedRow}>
            <Icon name="account-check-outline" size={12} color="#10B981" />
            <Text style={styles.approvedText}>
              Approved by {row.approved_by.slice(0, 8)}…
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  // ============================================================
  // MAIN
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Intro */}
      <View style={styles.intro}>
        <Icon name="information-outline" size={16} color={PRIMARY_COLOR} />
        <Text style={styles.introText}>
          Exemptions excuse you from attendance requirements for a set of
          dates. Your HR team grants them.
        </Text>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'upcoming', 'past'] as const).map((k) => {
          const active = filter === k;
          const count =
            k === 'all'
              ? counts.all
              : k === 'active'
              ? counts.active
              : k === 'upcoming'
              ? counts.upcoming
              : counts.past;
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
                {k === 'all'
                  ? `All (${count})`
                  : `${k.charAt(0).toUpperCase() + k.slice(1)} (${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading your exemptions…</Text>
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
          data={filtered}
          keyExtractor={(item) => item.row.exemption_id}
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
              <Icon name="shield-outline" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>
                {filter === 'all'
                  ? 'No exemptions'
                  : `No ${filter} exemptions`}
              </Text>
              <Text style={styles.errMsg}>
                {filter === 'all'
                  ? 'You currently have no attendance exemptions on file.'
                  : `No exemptions are currently ${filter}.`}
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

  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}25`,
  },
  introText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 16,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
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

  listContent: { padding: 20, paddingBottom: 40 },

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
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  cardSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  stateDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  dateStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginLeft: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
  },
  dateCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
  },

  approvedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    marginLeft: 6,
  },
  approvedText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
  },

  center: {
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