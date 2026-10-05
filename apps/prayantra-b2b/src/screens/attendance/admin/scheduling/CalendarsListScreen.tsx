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

import {
  listWorkCalendars,
  deleteWorkCalendar,
} from '@b2b/api-client';

import type { WorkCalendar } from '@b2b/shared-types';

import { useUserAuthStore } from '../../../../store/userAuthStore';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

// ============================================================
// HELPERS
// ============================================================

const WEEKDAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ============================================================
// SCREEN
// ============================================================

export default function CalendarsListScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [rows, setRows] = useState<WorkCalendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await listWorkCalendars(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
        );

        const list: WorkCalendar[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.calendars)
          ? res.data.calendars
          : [];

        setRows(list);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load calendars.',
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

  const handleDelete = (c: WorkCalendar) => {
    Alert.alert(
      'Delete calendar',
      `Delete "${c.name}" (${c.year})? This fails if templates still reference it.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !deviceId || !accessToken) return;
            setDeletingId(c.calendar_id);
            try {
              await deleteWorkCalendar(
                companyId,
                c.calendar_id,
                deviceId,
                accessToken,
                locationId ?? '',
              );
              setRows((prev) =>
                prev.filter((x) => x.calendar_id !== c.calendar_id),
              );
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.error ||
                  err?.message ||
                  'Failed to delete calendar',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderRow = ({ item }: { item: WorkCalendar }) => {
    const holidayCount = Object.keys(item.holidays ?? {}).length;
    const workingCount = item.working_days?.length ?? 0;
    const isDeleting = deletingId === item.calendar_id;

    return (
      <TouchableOpacity
        style={[styles.card, !item.is_active && styles.cardInactive]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('AttendanceCalendarForm', {
            calendarId: item.calendar_id,
          })
        }
      >
        <View style={styles.cardAccent} />
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Icon name="calendar-star" size={22} color={PRIMARY_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardYear}>{item.year}</Text>
          </View>
          <View style={styles.statusWrap}>
            {item.is_active ? (
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activePillText}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactivePill}>
                <Text style={styles.inactivePillText}>INACTIVE</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.weekStrip}>
          {WEEKDAY_SHORT.map((d, idx) => {
            const isWorking = item.working_days?.includes(idx);
            return (
              <View
                key={idx}
                style={[
                  styles.weekCell,
                  isWorking && styles.weekCellActive,
                ]}
              >
                <Text
                  style={[
                    styles.weekCellText,
                    isWorking && styles.weekCellTextActive,
                  ]}
                >
                  {d}
                </Text>
              </View>
            );
          })}
          <Text style={styles.weekHint}>
            {workingCount}/7 working days
          </Text>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaCell}>
            <Icon name="earth" size={11} color={TEXT_SECONDARY} />
            <Text style={styles.metaLabel}>Timezone</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {item.timezone}
            </Text>
          </View>
          <View style={styles.metaCell}>
            <Icon name="party-popper" size={11} color={TEXT_SECONDARY} />
            <Text style={styles.metaLabel}>Holidays</Text>
            <Text style={styles.metaValue}>{holidayCount}</Text>
          </View>
          <View style={styles.metaCell}>
            <Icon name="map-marker-outline" size={11} color={TEXT_SECONDARY} />
            <Text style={styles.metaLabel}>Location</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {item.location_id
                ? item.location_id.slice(0, 8) + '…'
                : 'Company-wide'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.availBtn}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate('AttendanceCalendarAvailability', {
                calendarId: item.calendar_id,
              })
            }
          >
            <Icon name="calendar-search" size={13} color={PRIMARY_COLOR} />
            <Text style={styles.availBtnText}>Availability</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              navigation.navigate('AttendanceCalendarForm', {
                calendarId: item.calendar_id,
              })
            }
          >
            <Icon name="pencil" size={16} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Icon name="delete-outline" size={16} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading calendars…</Text>
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
          keyExtractor={(item) => item.calendar_id}
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
              <Icon name="calendar-blank-outline" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No calendars yet</Text>
              <Text style={styles.errMsg}>
                Create a calendar per year (and per location, if you have
                multiple sites).
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AttendanceCalendarForm', {})}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

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
  cardInactive: { opacity: 0.7 },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: PRIMARY_COLOR,
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
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  cardName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  cardYear: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Courier',
    fontWeight: '700',
  },
  statusWrap: { alignItems: 'flex-end' },
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
  inactivePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
  inactivePillText: {
    color: '#475569',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  weekStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    marginLeft: 6,
  },
  weekCell: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  weekCellActive: { backgroundColor: PRIMARY_COLOR },
  weekCellText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
  },
  weekCellTextActive: { color: '#FFFFFF' },
  weekHint: {
    marginLeft: 'auto',
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '600',
  },

  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    marginLeft: 6,
    gap: 8,
  },
  metaCell: { flex: 1, minWidth: 100 },
  metaLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  metaValue: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  availBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}12`,
    marginRight: 'auto',
  },
  availBtnText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: '700',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
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