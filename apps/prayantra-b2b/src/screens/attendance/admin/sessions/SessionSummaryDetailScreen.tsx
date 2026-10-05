import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getSessionSummary } from '@b2b/api-client';

import type {
  AttendanceSessionSummary,
  AttendanceSubjectType,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../../store/userAuthStore';
import { UserAvatar } from '../../../../components/UserAvatar';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

// ============================================================
// TYPES
// ============================================================

type RouteT = RouteProp<
  {
    AttendanceSessionSummaryDetail: {
      sessionId: string;
      subjectType: AttendanceSubjectType;
      subjectId: string;
    };
  },
  'AttendanceSessionSummaryDetail'
>;

// ============================================================
// CONSTANTS
// ============================================================

const STATUS_META: Record<
  string,
  { label: string; tone: string; icon: string }
> = {
  present: {
    label: 'Present',
    tone: '#10B981',
    icon: 'check-circle-outline',
  },
  absent: {
    label: 'Absent',
    tone: '#EF4444',
    icon: 'close-circle-outline',
  },
  late: {
    label: 'Late',
    tone: '#F59E0B',
    icon: 'clock-alert-outline',
  },
  excused: {
    label: 'Excused',
    tone: '#0EA5E9',
    icon: 'shield-check-outline',
  },
};

// ============================================================
// HELPERS
// ============================================================

function prettyDateTime(iso: string | null | undefined): string {
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

function prettyDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function SessionSummaryDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteT>();
  const { sessionId, subjectType, subjectId } = route.params;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [summary, setSummary] = useState<AttendanceSessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await getSessionSummary(
          companyId,
          sessionId,
          deviceId,
          accessToken,
          {
            subject_type: subjectType,
            subject_id: subjectId,
          },
          locationId ?? undefined,
        );

        setSummary(res?.data ?? null);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load session summary.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId, sessionId, subjectType, subjectId],
  );

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const meta = summary ? STATUS_META[summary.status] : null;

  // ============================================================
  // RENDER
  // ============================================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !summary) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load</Text>
          <Text style={styles.errMsg}>
            {error ?? 'Session summary not found'}
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchSummary()}
          >
            <Text style={styles.retryTxt}>Try again</Text>
          </TouchableOpacity>
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
            onRefresh={() => fetchSummary(true)}
            tintColor={PRIMARY_COLOR}
          />
        }
      >
        {/* Status hero */}
        <View
          style={[
            styles.hero,
            { borderColor: meta?.tone ? `${meta.tone}40` : BORDER_COLOR },
          ]}
        >
          <View
            style={[
              styles.heroIcon,
              {
                backgroundColor: meta?.tone
                  ? `${meta.tone}15`
                  : '#F1F5F9',
              },
            ]}
          >
            <Icon
              name={meta?.icon ?? 'calendar-question'}
              size={30}
              color={meta?.tone ?? '#94A3B8'}
            />
          </View>
          <Text
            style={[
              styles.heroStatus,
              { color: meta?.tone ?? TEXT_PRIMARY },
            ]}
          >
            {meta?.label ?? summary.status.toUpperCase()}
          </Text>
          <Text style={styles.heroDate}>{prettyDate(summary.session_date)}</Text>
        </View>

        {/* Subject */}
        <Text style={styles.sectionTitle}>Subject</Text>
        <View style={styles.subjectCard}>
          <UserAvatar
            userId={summary.subject_id}
            username={undefined}
            fullName={undefined}
            size={48}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.subjectName} numberOfLines={1}>
              {summary.subject_id.slice(0, 14)}…
            </Text>
            <View style={styles.subjectMeta}>
              <View style={styles.subjectTypePill}>
                <Text style={styles.subjectTypeText}>
                  {summary.subject_type}
                </Text>
              </View>
              <Text style={styles.subjectId} numberOfLines={1}>
                {summary.subject_id}
              </Text>
            </View>
          </View>
        </View>

        {/* Session */}
        <Text style={styles.sectionTitle}>Session</Text>
        <View style={styles.infoGrid}>
          <InfoRow label="Session ID" value={summary.session_id} mono />
          <InfoRow
            label="Marked at"
            value={prettyDateTime(summary.marked_at)}
          />
          <InfoRow
            label="Marked by"
            value={summary.marked_by ?? 'System'}
          />
          <InfoRow
            label="Auto generated"
            value={summary.is_auto ? 'Yes' : 'No'}
          />
          <InfoRow label="Source" value={summary.source_type} />
          <InfoRow
            label="Device"
            value={summary.device_id ?? '—'}
          />
          <InfoRow
            label="Location"
            value={summary.employment_location_id ?? '—'}
          />
        </View>

        {/* Remarks */}
        {summary.remarks ? (
          <>
            <Text style={styles.sectionTitle}>Remarks</Text>
            <View style={styles.remarksCard}>
              <Icon
                name="comment-text-outline"
                size={14}
                color={TEXT_SECONDARY}
              />
              <Text style={styles.remarksText}>{summary.remarks}</Text>
            </View>
          </>
        ) : null}

        {/* Metadata */}
        {summary.metadata && Object.keys(summary.metadata).length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Metadata</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>
                {JSON.stringify(summary.metadata, null, 2)}
              </Text>
            </View>
          </>
        ) : null}

        {/* Audit */}
        <Text style={styles.sectionTitle}>Audit</Text>
        <View style={styles.infoGrid}>
          <InfoRow
            label="Created"
            value={prettyDateTime(summary.created_at)}
          />
          <InfoRow
            label="Last updated"
            value={prettyDateTime(summary.updated_at)}
          />
          <InfoRow label="Summary ID" value={summary.summary_id} mono />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENT
// ============================================================

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, mono && styles.infoValueMono]}
        numberOfLines={2}
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
  scroll: { padding: 20, paddingBottom: 60 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
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

  hero: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
  },
  heroIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatus: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 14,
    letterSpacing: 0.4,
  },
  heroDate: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
    textAlign: 'center',
  },

  sectionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 10,
  },

  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  subjectName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  subjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  subjectTypePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: `${PRIMARY_COLOR}15`,
  },
  subjectTypeText: {
    color: PRIMARY_COLOR,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  subjectId: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontFamily: 'Courier',
    flexShrink: 1,
  },

  infoGrid: {
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
    gap: 12,
  },
  infoLabel: {
    width: 110,
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '500',
  },
  infoValueMono: {
    fontFamily: 'Courier',
    fontSize: 11,
  },

  remarksCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  remarksText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 12,
    lineHeight: 17,
  },

  codeBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  codeText: {
    color: '#E2E8F0',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
  },
});