// apps/prayantra-b2b/src/screens/hr/leave/admin/LeaveBalanceAdminScreen.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
// ⚠️ FIXED: the client function is called getUserLeaveBalance, not
//    getEmployeeLeaveBalance. It already exists in packages/api-client
//    and hits GET /companies/:companyId/leave/query/users/:userId/balance
//    which is exactly the HR route (handler: GetLeaveBalanceForUser).
import { getUserLeaveBalance } from '@b2b/api-client';
import { LeaveBalance } from '@b2b/shared-types';
import UserSearchModal, { PickedUser } from '../../../../components/UserSearchModal';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<
  RootStackParamList,
  'LeaveBalanceAdminScreen'
>;

const fmtDays = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(2)));
};

export default function LeaveBalanceAdminScreen() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PickedUser | null>(null);

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalances = useCallback(
    async (showRefresh = false) => {
      if (!accessToken || !companyId || !deviceId) return;
      if (!selectedUser?.user_id) {
        setBalances([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await getUserLeaveBalance(
          companyId,
          selectedUser.user_id,
          deviceId,
          accessToken,
        );
        setBalances(data.balances ?? []);
      } catch {
        setBalances([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, companyId, deviceId, selectedUser?.user_id],
  );

  // Auto-fetch when a user is picked.
  useEffect(() => {
    if (selectedUser?.user_id) {
      fetchBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.user_id]);

  const handlePickUser = (u: PickedUser) => {
    setSelectedUser(u);
  };

  const clearUser = () => {
    setSelectedUser(null);
    setBalances([]);
  };

  const renderItem = ({ item }: { item: LeaveBalance }) => {
    const hasCf =
      item.carry_forward !== null && item.carry_forward !== undefined;
    return (
      <View style={styles.card}>
        <Text style={styles.leaveType}>
          {item.leave_type_name} ({item.leave_type_code})
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Total Entitled:</Text>
          <Text style={styles.value}>{fmtDays(item.total_entitled)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Accrued:</Text>
          <Text style={styles.value}>{fmtDays(item.accrued)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Consumed:</Text>
          <Text style={styles.value}>{fmtDays(item.consumed)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Balance:</Text>
          <Text
            style={[
              styles.value,
              { color: item.balance > 0 ? '#10b981' : '#ef4444' },
            ]}
          >
            {fmtDays(item.balance)}
          </Text>
        </View>
        {hasCf && (
          <View style={styles.row}>
            <Text style={styles.label}>Carry Forward Limit:</Text>
            <Text style={styles.value}>{item.carry_forward}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Balance</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.pickerTrigger}
          onPress={() => setPickerOpen(true)}
          activeOpacity={0.7}
        >
          <Icon
            name={selectedUser ? 'account-check' : 'account-search'}
            size={20}
            color={selectedUser ? PRIMARY_COLOR : TEXT_SECONDARY}
          />
          <Text
            style={[
              styles.pickerTriggerText,
              selectedUser && styles.pickerTriggerTextActive,
            ]}
            numberOfLines={1}
          >
            {selectedUser
              ? selectedUser.full_name ||
                selectedUser.username ||
                selectedUser.user_id
              : 'Search user…'}
          </Text>
          {selectedUser ? (
            <TouchableOpacity onPress={clearUser} style={styles.clearBtn}>
              <Icon name="close-circle" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ) : (
            <Icon name="chevron-right" size={18} color={TEXT_SECONDARY} />
          )}
        </TouchableOpacity>
      </View>

      {selectedUser?.user_id ? (
        loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          </View>
        ) : (
          <FlatList
            data={balances}
            keyExtractor={(item) => item.leave_type_id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchBalances(true)}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="cash" size={60} color={TEXT_SECONDARY} />
                <Text style={styles.emptyTitle}>No Balance Data</Text>
              </View>
            }
          />
        )
      ) : (
        <View style={styles.promptContainer}>
          <View style={styles.promptIconWrap}>
            <Icon name="wallet-outline" size={48} color={PRIMARY_COLOR} />
          </View>
          <Text style={styles.promptTitle}>Pick a user to get started</Text>
          <Text style={styles.promptSubtitle}>
            Search for a user above to view their leave balances.
          </Text>
          <TouchableOpacity
            style={styles.promptButton}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.85}
          >
            <Icon name="magnify" size={18} color="#fff" />
            <Text style={styles.promptButtonText}>Search user</Text>
          </TouchableOpacity>
        </View>
      )}

      <UserSearchModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePickUser}
        title="Select user"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  filterRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  pickerTriggerText: { flex: 1, fontSize: 14, color: TEXT_SECONDARY },
  pickerTriggerTextActive: { color: TEXT_PRIMARY, fontWeight: '600' },
  clearBtn: { padding: 2 },
  listContent: { padding: 16, flexGrow: 1 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  leaveType: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  label: { fontSize: 14, color: TEXT_SECONDARY },
  value: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  promptContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  promptIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: PRIMARY_COLOR + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    textAlign: 'center',
  },
  promptSubtitle: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  promptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },
  promptButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    flex: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
  },
});