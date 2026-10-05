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
import {
  Text,
  ActivityIndicator,
  Switch,
} from 'react-native-paper';

import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { listPolicies, deletePolicy } from '@b2b/api-client';

import type { AttendancePolicy } from '@b2b/shared-types';

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
// SCREEN
// ============================================================

export default function AttendancePoliciesListScreen() {
  const navigation = useNavigation<any>();
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [includeInactive, setIncludeInactive] = useState(true);
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

        const res: any = await listPolicies(companyId, deviceId, accessToken, {
          include_inactive: includeInactive,
        });

        const list: AttendancePolicy[] = res?.data?.policies ?? [];
        setPolicies(list);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load policies.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, includeInactive],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleDelete = (p: AttendancePolicy) => {
    Alert.alert(
      'Delete policy',
      `Delete "${p.policy_code}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !deviceId || !accessToken) return;
            setDeletingId(p.policy_id);
            try {
              await deletePolicy(
                companyId,
                p.policy_id,
                deviceId,
                accessToken,
                locationId ?? '',
              );
              setPolicies((prev) =>
                prev.filter((x) => x.policy_id !== p.policy_id),
              );
            } catch (err: any) {
              Alert.alert(
                'Error',
                err?.response?.data?.error ||
                  err?.message ||
                  'Failed to delete policy',
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const renderPolicy = ({ item }: { item: AttendancePolicy }) => {
    const scope = item.work_center_code
      ? `Work Center · ${item.work_center_code}`
      : item.position_id
      ? `Position · ${item.position_id.slice(0, 8)}…`
      : 'Company-wide';
    const isDeleting = deletingId === item.policy_id;

    return (
      <TouchableOpacity
        style={[styles.card, !item.is_active && styles.cardInactive]}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('AttendancePolicyForm', {
            policyId: item.policy_id,
          })
        }
      >
        <View
          style={[
            styles.cardAccent,
            { backgroundColor: item.is_active ? PRIMARY_COLOR : '#94A3B8' },
          ]}
        />

        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardCode} numberOfLines={1}>
              {item.policy_code}
            </Text>
            <Text style={styles.cardType} numberOfLines={1}>
              {item.policy_type}
            </Text>
          </View>
          <View
            style={[
              styles.activePill,
              {
                backgroundColor: item.is_active ? '#D1FAE5' : '#F1F5F9',
              },
            ]}
          >
            <View
              style={[
                styles.activeDot,
                {
                  backgroundColor: item.is_active ? '#10B981' : '#94A3B8',
                },
              ]}
            />
            <Text
              style={[
                styles.activePillText,
                { color: item.is_active ? '#065F46' : '#475569' },
              ]}
            >
              {item.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Icon name="target" size={12} color={TEXT_SECONDARY} />
          <Text style={styles.metaText} numberOfLines={1}>
            {scope}
          </Text>
        </View>

        <View style={styles.ruleChips}>
          {item.rules?.grace_period != null && (
            <RuleChip label={`Grace ${item.rules.grace_period}m`} />
          )}
          {item.rules?.half_day_after != null && (
            <RuleChip label={`Half-day ≤ ${item.rules.half_day_after}m`} />
          )}
          {item.rules?.max_late_allowed != null && (
            <RuleChip label={`Max late ${item.rules.max_late_allowed}m`} />
          )}
          {item.rules?.overtime_threshold != null && (
            <RuleChip label={`OT ≥ ${item.rules.overtime_threshold}m`} />
          )}
          {item.rules?.auto_checkout === true && (
            <RuleChip label="Auto checkout" tone="#10B981" />
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.assignBtn}
            onPress={() =>
              navigation.navigate('AttendancePolicyAssign', {
                policyId: item.policy_id,
              })
            }
          >
            <Icon name="link-variant" size={14} color={PRIMARY_COLOR} />
            <Text style={styles.assignBtnText}>Assign</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() =>
              navigation.navigate('AttendancePolicyForm', {
                policyId: item.policy_id,
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
      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.filterTitle}>Show inactive</Text>
          <Text style={styles.filterSub}>
            {policies.length} polic{policies.length === 1 ? 'y' : 'ies'}
          </Text>
        </View>
        <Switch
          value={includeInactive}
          onValueChange={setIncludeInactive}
          color={PRIMARY_COLOR}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading policies…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="alert-circle-outline" size={32} color="#EF4444" />
          <Text style={styles.errTitle}>Couldn't load policies</Text>
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
          data={policies}
          keyExtractor={(item) => item.policy_id}
          renderItem={renderPolicy}
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
              <Icon name="shield-off-outline" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No policies yet</Text>
              <Text style={styles.errMsg}>
                Create your first attendance policy below.
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AttendancePolicyForm', {})}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ============================================================
// SUBCOMPONENT
// ============================================================

function RuleChip({ label, tone = '#475569' }: { label: string; tone?: string }) {
  return (
    <View style={[styles.ruleChip, { backgroundColor: `${tone}12` }]}>
      <Text style={[styles.ruleChipText, { color: tone }]}>{label}</Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
  },
  filterTitle: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '700' },
  filterSub: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },

  listContent: {
    padding: 20,
    paddingBottom: 100,
  },

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
  cardInactive: { opacity: 0.75 },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginLeft: 6,
  },
  cardCode: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '800',
  },
  cardType: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },

  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activePillText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    marginLeft: 6,
  },
  metaText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    flex: 1,
  },

  ruleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginLeft: 6,
  },
  ruleChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ruleChipText: {
    fontSize: 10,
    fontWeight: '600',
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
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  assignBtnText: {
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