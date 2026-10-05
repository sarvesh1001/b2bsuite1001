import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';

import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { listExemptions, deleteExemption } from '@b2b/api-client';

import type {
  AttendanceExemption,
  AttendanceSubjectType,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';

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

function ymdShort(iso: string): string {
  try {
    const d = new Date(iso);
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
    const a = new Date(from).getTime();
    const b = new Date(to).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  } catch {
    return 0;
  }
}

function isActiveToday(from: string, to: string): boolean {
  const today = ymd(new Date());
  return from <= today && today <= to;
}

const SUBJECT_TONE: Record<string, string> = {
  employee: '#3B82F6',
  student: '#EC4899',
  customer: '#8B5CF6',
};

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceExemptionsListScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [rows, setRows] = useState<AttendanceExemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] =
    useState<AttendanceSubjectType | 'all'>('all');

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const filter: any = { page: 1, page_size: 200 };
        if (subjectFilter !== 'all') filter.subject_type = subjectFilter;

        const res: any = await listExemptions(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          filter,
        );

        // Backend returns { data: [...] } (bare array) — be defensive.
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
    [companyId, deviceId, accessToken, locationId, subjectFilter],
  );

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  useEffect(() => {
    fetchAll();
  }, [subjectFilter]);

  const handleDelete = (e: AttendanceExemption) => {
    Alert.alert(
      'Delete exemption',
      `Remove exemption for ${e.subject_type} ${e.subject_id.slice(0, 8)}…?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !deviceId || !accessToken) return;
            setDeletingId(e.exemption_id);
            try {
              await deleteExemption(
                companyId,
                e.exemption_id,
                deviceId,
                accessToken,
                locationId ?? '',
              );
              setRows((prev) =>
                prev.filter((x) => x.exemption_id !== e.exemption_id),
              );
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.error ||
                  err?.message ||
                  'Failed to delete exemption',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderRow = ({ item }: { item: AttendanceExemption }) => {
    const tone = SUBJECT_TONE[item.subject_type] ?? '#64748B';
    const active = isActiveToday(item.from_date, item.to_date);
    const isDeleting = deletingId === item.exemption_id;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('AttendanceExemptionForm', {
            exemptionId: item.exemption_id,
          })
        }
      >
        <View style={[styles.cardAccent, { backgroundColor: tone }]} />

        <View style={styles.cardHeader}>
          <UserAvatar
            userId={item.subject_id}
            username={undefined}
            fullName={undefined}
            size={44}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.subject_id.slice(0, 12)}…
            </Text>
            <View style={styles.typeRow}>
              <View style={[styles.typePill, { backgroundColor: `${tone}18` }]}>
                <Text style={[styles.typePillText, { color: tone }]}>
                  {item.subject_type.toUpperCase()}
                </Text>
              </View>
              {active ? (
                <View style={styles.activePill}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              ) : null}
            </View>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Icon name="trash-can-outline" size={16} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dateStrip}>
          <View style={styles.dateCell}>
            <Icon name="calendar-start" size={13} color={TEXT_SECONDARY} />
            <Text style={styles.dateCellText}>{ymdShort(item.from_date)}</Text>
          </View>
          <Icon name="arrow-right" size={14} color="#CBD5E1" />
          <View style={styles.dateCell}>
            <Icon name="calendar-end" size={13} color={TEXT_SECONDARY} />
            <Text style={styles.dateCellText}>{ymdShort(item.to_date)}</Text>
          </View>
          <View style={styles.dayChip}>
            <Text style={styles.dayChipText}>
              {daysBetween(item.from_date, item.to_date)}d
            </Text>
          </View>
        </View>

        {item.reason ? (
          <View style={styles.reasonRow}>
            <Icon name="comment-text-outline" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.reasonText} numberOfLines={2}>
              {item.reason}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const FilterBar = () => (
    <View style={styles.filterBar}>
      {(['all', 'employee', 'student', 'customer'] as const).map((k) => {
        const active = subjectFilter === k;
        return (
          <TouchableOpacity
            key={k}
            onPress={() => setSubjectFilter(k as any)}
            style={[styles.filterChip, active && styles.filterChipActive]}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.filterChipText,
                active && styles.filterChipTextActive,
              ]}
            >
              {k === 'all' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FilterBar />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading exemptions…</Text>
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
          keyExtractor={(item) => item.exemption_id}
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
              <Icon
                name="shield-off-outline"
                size={32}
                color="#94A3B8"
              />
              <Text style={styles.errTitle}>No exemptions</Text>
              <Text style={styles.errMsg}>
                Exemptions excuse a subject from attendance for a date range.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AttendanceExemptionForm', {})}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
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

  listContent: { padding: 16, paddingBottom: 100 },

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
  cardName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#D1FAE5',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
  },
  activePillText: {
    color: '#065F46',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
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
  dateCellText: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },
  dayChip: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  dayChipText: {
    color: '#475569',
    fontSize: 10,
    fontWeight: '700',
  },

  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    marginLeft: 6,
  },
  reasonText: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 15,
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