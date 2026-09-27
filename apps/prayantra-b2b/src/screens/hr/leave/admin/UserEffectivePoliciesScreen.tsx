import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getEffectivePolicies } from '@b2b/api-client';
import type { LeavePolicyRuleResolution } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type RouteProps = RouteProp<RootStackParamList, 'UserEffectivePolicies'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'UserEffectivePolicies'>;

const todayISO = () => new Date().toISOString().slice(0, 10);

// PascalCase — the Go struct has no json tags on this one.
const readRule = (r: any): LeavePolicyRuleResolution => ({
  PolicyID: r.PolicyID ?? r.policy_id ?? '',
  LeaveTypeID: r.LeaveTypeID ?? r.leave_type_id ?? '',
  TotalDays: r.TotalDays ?? r.total_days ?? 0,
  AccrualMethod: r.AccrualMethod ?? r.accrual_method ?? '',
  CarryForwardLimit: r.CarryForwardLimit ?? r.carry_forward_limit ?? null,
});

export default function UserEffectivePoliciesScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { userId, username, asOf: initialAsOf } = route.params;

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [asOf, setAsOf] = useState<string>(initialAsOf || todayISO());
  const [rules, setRules] = useState<LeavePolicyRuleResolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getEffectivePolicies(
        companyId,
        userId,
        deviceId,
        accessToken,
        asOf,
      );
      setRules((res?.policies ?? []).map(readRule));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load policies');
      setRules([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId, userId, asOf]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Effective Policies</Text>
          <Text style={styles.headerSubtitle}>
            {username ? username : userId.slice(0, 8)}
          </Text>
        </View>
      </View>

      {/* As-of date picker */}
      <View style={styles.configBar}>
        <Text style={styles.configLabel}>As of</Text>
        <View style={styles.dateBox}>
          <Icon name="calendar-outline" size={14} color={TEXT_SECONDARY} />
          <TextInput
            style={styles.dateInput}
            value={asOf}
            onChangeText={setAsOf}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.reloadBtn} onPress={load}>
          <Icon name="refresh" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      ) : rules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="file-question-outline" size={50} color={TEXT_SECONDARY} />
          <Text style={styles.emptyTitle}>No policies match</Text>
          <Text style={styles.emptySubtitle}>
            No active policy rules matched this user on {asOf}. Try a different
            date or seed a company-wide policy.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
        >
          {/* Header row for the mini-table */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.th, { flex: 3 }]}>Leave type</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Days</Text>
            <Text style={[styles.th, { flex: 2, textAlign: 'right' }]}>Accrual</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>CF</Text>
          </View>

          {rules.map((r, i) => (
            <View
              key={`${r.PolicyID}-${r.LeaveTypeID}-${i}`}
              style={styles.tableRow}
            >
              <View style={{ flex: 3 }}>
                <Text style={styles.tdMain} numberOfLines={1}>
                  {r.LeaveTypeID.slice(0, 8)}…
                </Text>
                <Text style={styles.tdSub} numberOfLines={1}>
                  policy {r.PolicyID.slice(0, 8)}…
                </Text>
              </View>
              <Text style={[styles.tdMain, { flex: 1, textAlign: 'right' }]}>
                {r.TotalDays}
              </Text>
              <Text style={[styles.tdSub, { flex: 2, textAlign: 'right' }]}>
                {r.AccrualMethod || '—'}
              </Text>
              <Text style={[styles.tdSub, { flex: 1, textAlign: 'right' }]}>
                {r.CarryForwardLimit ?? '—'}
              </Text>
            </View>
          ))}

          <View style={styles.noteBox}>
            <Icon name="information-outline" size={14} color={TEXT_SECONDARY} />
            <Text style={styles.noteText}>
              Rows are shown as raw policy rules — IDs are truncated. If two
              rules match the same leave type, the backend's resolver has
              already picked the winner (lowest priority number).
            </Text>
          </View>
        </ScrollView>
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
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  headerSubtitle: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },

  configBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
  },
  configLabel: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY },
  dateBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    backgroundColor: '#fff',
  },
  dateInput: { flex: 1, marginLeft: 8, fontSize: 14, color: TEXT_PRIMARY },
  reloadBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyTitle: { marginTop: 12, fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 18,
  },

  listContent: { padding: 16, paddingBottom: 40 },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tableHeader: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: BORDER_COLOR,
  },
  th: {
    fontSize: 11,
    fontWeight: '800',
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
  },
  tdMain: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '600' },
  tdSub: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },

  noteBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  noteText: { flex: 1, fontSize: 11, color: TEXT_SECONDARY, lineHeight: 16 },
});