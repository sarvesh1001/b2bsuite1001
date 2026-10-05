// apps/prayantra-b2b/src/screens/hr/RemindersListScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import type {
  Reminder,
  ReminderSeverity,
  ReminderStatus,
} from '@b2b/shared-types';
import { useReminderFeed } from '../../hooks/useReminders';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../constants/colors';
import type { RootStackParamList } from '../../navigation';

type Nav = StackNavigationProp<RootStackParamList, 'RemindersList'>;
type Filter = 'all' | 'unread' | 'critical';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'unread',   label: 'Unread' },
  { key: 'critical', label: 'Critical' },
];

const SEV: Record<
  ReminderSeverity,
  { accent: string; chipBg: string; chipFg: string }
> = {
  critical: { accent: '#EF4444', chipBg: '#FEE2E2', chipFg: '#991B1B' },
  warning:  { accent: '#F59E0B', chipBg: '#FEF3C7', chipFg: '#92400E' },
  info:     { accent: '#3B82F6', chipBg: '#DBEAFE', chipFg: '#1E40AF' },
};

const typeIcon = (t: string): string => {
  if (t.startsWith('probation_')) return 'account-clock';
  if (t.startsWith('on_hold_'))   return 'pause-circle';
  if (t.startsWith('notice_'))    return 'calendar-alert';
  return 'bell-outline';
};

const relative = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

export default function RemindersListScreen() {
  const navigation = useNavigation<Nav>();
  const [filter, setFilter] = useState<Filter>('all');

  const params = useMemo(() => {
    if (filter === 'unread')   return { status: 'unread' as ReminderStatus };
    if (filter === 'critical') return {
      severity: 'critical' as ReminderSeverity,
      status: 'unread' as ReminderStatus,
    };
    return {};
  }, [filter]);

  const feed = useReminderFeed(params);

  useFocusEffect(
    useCallback(() => {
      feed.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]),
  );

  const handleTap = async (r: Reminder) => {
    if (r.status === 'unread') await feed.markRead(r.reminder_id);

    const action = r.action_payload;
    if (action?.employee_id) {
      navigation.navigate('HREmployeeDetail', {
        userId: action.employee_id,
        employeeProfileId: action.employee_profile_id,
      });
    }
  };

  const handleDismiss = (r: Reminder) => {
    Alert.alert(
      'Dismiss reminder',
      'Hide this from your feed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Dismiss',
          style: 'destructive',
          onPress: () => feed.dismiss(r.reminder_id),
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Reminder }) => {
    const s = SEV[item.severity] ?? SEV.info;
    const unread = item.status === 'unread';

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleTap(item)}
        style={[styles.card, unread && styles.cardUnread]}
      >
        <View style={[styles.cardAccent, { backgroundColor: s.accent }]} />

        <View style={[styles.iconWrap, { backgroundColor: s.chipBg }]}>
          <Icon name={typeIcon(item.reminder_type)} size={20} color={s.chipFg} />
        </View>

        <View style={styles.cardBody}>
          <View style={styles.titleRow}>
            <Text
              numberOfLines={2}
              style={[styles.title, unread && styles.titleUnread]}
            >
              {item.title}
            </Text>
            {unread && <View style={[styles.dot, { backgroundColor: s.accent }]} />}
          </View>

          {!!item.body && (
            <Text numberOfLines={2} style={styles.body}>
              {item.body}
            </Text>
          )}

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{relative(item.created_at)}</Text>
            <View style={styles.metaDot} />
            <View style={[styles.chip, { backgroundColor: s.chipBg }]}>
              <Text style={[styles.chipText, { color: s.chipFg }]}>
                {item.severity.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.dismissBtn}
          onPress={() => handleDismiss(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="close" size={16} color={TEXT_SECONDARY} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const sections = feed.groups.map((g) => ({
    title: g.label,
    date: g.date,
    data: g.items,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Reminders</Text>

        {feed.unread > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={feed.markAllRead}
          >
            <Icon name="check-all" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Feed */}
      {feed.isLoading && sections.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading reminders…</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.reminder_id}
          renderItem={renderItem}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={feed.isFetching && !feed.isLoading}
              onRefresh={feed.refetch}
            />
          }
          ListEmptyComponent={
            !feed.isLoading ? (
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Icon
                    name="bell-check-outline"
                    size={40}
                    color={PRIMARY_COLOR}
                  />
                </View>
                <Text style={styles.emptyTitle}>You're all caught up</Text>
                <Text style={styles.emptySubtitle}>
                  {filter === 'unread'
                    ? 'No unread reminders right now.'
                    : filter === 'critical'
                    ? 'No critical reminders. Nice.'
                    : 'New reminders about probation, notice, and on-hold will show up here.'}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

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
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  markAllBtn: {
    backgroundColor: PRIMARY_COLOR,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipsRow: { gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  filterChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  filterText: { fontSize: 12, fontWeight: '600', color: TEXT_SECONDARY },
  filterTextActive: { color: '#FFFFFF' },

  listContent: { paddingHorizontal: 16, paddingBottom: 30, flexGrow: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
  },
  sectionCount: { fontSize: 11, fontWeight: '700', color: TEXT_SECONDARY },

  card: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  cardUnread: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#F8FAFF',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    marginRight: 12,
  },
  cardBody: { flex: 1, paddingRight: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  titleUnread: { fontWeight: '800' },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  body: { marginTop: 4, fontSize: 12, color: TEXT_SECONDARY, lineHeight: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  metaText: { fontSize: 11, color: TEXT_SECONDARY },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: TEXT_SECONDARY,
    marginHorizontal: 6,
  },
  chip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  chipText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  dismissBtn: { position: 'absolute', top: 10, right: 10, padding: 4 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 16, fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
});