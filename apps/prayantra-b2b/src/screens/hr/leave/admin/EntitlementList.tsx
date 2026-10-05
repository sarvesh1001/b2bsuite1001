// apps/prayantra-b2b/src/screens/hr/leave/admin/EntitlementList.tsx
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  listEntitlements,
  recalculateEntitlement,
  getUserDisplayName,
  listLeaveTypes,
  resolveSingleUser,
} from '@b2b/api-client';
import { Entitlement } from '@b2b/shared-types';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'EntitlementList'>;

interface DisplayNameEntry {
  full_name?: string | null;
  username?: string;
}

export default function EntitlementList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false); // starts false; only flips true when a user is picked
  const [refreshing, setRefreshing] = useState(false);
  const [recalcId, setRecalcId] = useState<string | null>(null);
  const [resolvingUserId, setResolvingUserId] = useState<string | null>(null);

  // user picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PickedUser | null>(null);

  // display-name cache: user_id → { full_name, username }
  const [nameCache, setNameCache] = useState<Record<string, DisplayNameEntry>>({});

  // leave type cache: leave_type_id → { code, name }
  const [leaveTypeMap, setLeaveTypeMap] = useState<
    Record<string, { code: string; name: string }>
  >({});

  // ------------------------------------------------------------------
  // Fetch entitlements for the CURRENTLY SELECTED user.
  //
  // Guarded: does nothing (and clears the list) when no user is picked.
  // That's what keeps the screen from loading everyone's entitlements
  // on open — the fetch only runs once a user has been chosen.
  // ------------------------------------------------------------------
  const fetchEntitlements = useCallback(
    async (showRefresh = false) => {
      if (!accessToken || !companyId || !deviceId) return;

      // No user picked → nothing to fetch; keep the empty state honest.
      if (!selectedUser?.user_id) {
        setEntitlements([]);
        setTotal(0);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const params = {
          page: 1,
          page_size: 50,
          user_id: selectedUser.user_id, // 👈 always scoped to the picked user
        };

        const data = await listEntitlements(companyId, deviceId, accessToken, params);
        setEntitlements(data.entitlements);
        setTotal(data.pagination.total);
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to load entitlements');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [accessToken, companyId, deviceId, selectedUser?.user_id],
  );

  // ------------------------------------------------------------------
  // Fetch on focus — but only when a user is already selected.
  //
  // This covers two cases:
  //   1. User picks a user → `selectedUser` changes → callback identity
  //      changes → useFocusEffect re-runs → fetch fires.
  //   2. User navigates away (CreateEntitlement / Re-resolve) and comes
  //      back → focus re-fires → we refresh for the same user.
  //
  // On first open, selectedUser is null → no fetch → empty state shows.
  // ------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (selectedUser?.user_id) {
        fetchEntitlements();
      }
    }, [selectedUser?.user_id, fetchEntitlements]),
  );

  // ------------------------------------------------------------------
  // One-shot leave type fetch — feeds the card label
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!accessToken || !companyId || !deviceId) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await listLeaveTypes(companyId, deviceId, accessToken);
        if (cancelled) return;
        const map: Record<string, { code: string; name: string }> = {};
        for (const lt of data.leave_types) {
          map[lt.leave_type_id] = { code: lt.code, name: lt.name };
        }
        setLeaveTypeMap(map);
      } catch {
        // silent — card falls back to the raw UUID
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, companyId, deviceId]);

  // ------------------------------------------------------------------
  // Resolve display names for any unseen user_ids.
  //
  // With the new flow, entitlements only ever contains rows for the
  // picked user, so this is effectively a 1-row resolve — the batch
  // loop is kept as a safety net for future multi-user views.
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!accessToken || !companyId || !deviceId) return;

    const missing = Array.from(
      new Set(
        entitlements
          .map((e) => e.user_id)
          .filter((uid) => uid && !nameCache[uid]),
      ),
    );
    if (missing.length === 0) return;

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        missing.map(async (uid) => {
          try {
            const d = await getUserDisplayName(companyId, uid, deviceId, accessToken);
            return [uid, d ? { full_name: d.full_name, username: d.username } : {}] as const;
          } catch {
            return [uid, {}] as const;
          }
        }),
      );
      if (cancelled) return;
      setNameCache((prev) => {
        const next = { ...prev };
        for (const [uid, entry] of results) next[uid] = entry;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [entitlements, accessToken, companyId, deviceId, nameCache]);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const displayNameFor = useCallback(
    (userId: string): string => {
      const entry = nameCache[userId];
      if (!entry) return 'Loading…';
      const name = entry.full_name?.trim();
      if (name) return name;
      if (entry.username) return `@${entry.username}`;
      return 'Unknown user';
    },
    [nameCache],
  );

  const subtitleFor = useCallback(
    (userId: string): string | null => {
      const entry = nameCache[userId];
      if (!entry?.username || !entry?.full_name) return null;
      return `@${entry.username}`;
    },
    [nameCache],
  );

  const leaveTypeLabel = useCallback(
    (id: string): { primary: string; secondary: string | null } => {
      const hit = leaveTypeMap[id];
      if (hit) return { primary: hit.name, secondary: hit.code };
      return { primary: id, secondary: null };
    },
    [leaveTypeMap],
  );

  // ------------------------------------------------------------------
  // Refresh balance — hits POST /leave/hr/recalculate/{entitlementID}
  //
  // Reads the CURRENT entitlement row, sums its ledger, and returns a
  // LeaveBalance. Does NOT re-run policy resolution.
  // ------------------------------------------------------------------
  const handleRecalculate = (item: Entitlement) => {
    Alert.alert(
      'Refresh balance',
      'Recompute the balance from this entitlement’s ledger?\n\n' +
        'This does not re-run policy resolution. Use “Re-resolve policy” ' +
        'if the entitlement is on the wrong policy tier.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refresh',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) {
              console.warn('[RefreshBalance] missing auth state', {
                hasToken: !!accessToken,
                companyId,
                deviceId,
              });
              return;
            }

            const url = `/api/v1/companies/${companyId}/leave/hr/recalculate/${item.entitlement_id}`;
            console.log('[RefreshBalance] ▶️ firing', {
              url,
              method: 'POST',
              companyId,
              entitlementId: item.entitlement_id,
              userId: item.user_id,
              leaveTypeId: item.leave_type_id,
              currentTotalDays: item.total_days,
            });

            setRecalcId(item.entitlement_id);
            const started = Date.now();
            try {
              const result = await recalculateEntitlement(
                companyId,
                item.entitlement_id,
                deviceId,
                accessToken,
              );
              console.log('[RefreshBalance] ✅ success', {
                elapsedMs: Date.now() - started,
                entitlementId: item.entitlement_id,
                response: result,
              });
              Alert.alert('Success', 'Balance refreshed');
              fetchEntitlements();
            } catch (error: any) {
              console.error('[RefreshBalance] ❌ failed', {
                elapsedMs: Date.now() - started,
                entitlementId: item.entitlement_id,
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
              });
              Alert.alert('Error', error?.message || 'Refresh failed');
            } finally {
              setRecalcId(null);
            }
          },
        },
      ],
    );
  };

  // ------------------------------------------------------------------
  // Re-resolve policy — hits POST /leave/hr/policies/resolve/user/{userId}
  // ------------------------------------------------------------------
  const handleReResolve = (item: Entitlement) => {
    const displayName = displayNameFor(item.user_id);
    const lt = leaveTypeLabel(item.leave_type_id);

    Alert.alert(
      'Re-resolve policy',
      `Re-run policy resolution for this user?\n\n` +
        `User: ${displayName}\n` +
        `Leave type: ${lt.primary}\n\n` +
        `This looks up the winning policy tier ` +
        `(position > work center > company) and rewrites the entitlement ` +
        `if the tier changed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-resolve',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) {
              console.warn('[ReResolve] missing auth state', {
                hasToken: !!accessToken,
                companyId,
                deviceId,
              });
              return;
            }

            const url = `/api/v1/companies/${companyId}/leave/hr/policies/resolve/user/${item.user_id}`;
            console.log('[ReResolve] ▶️ firing', {
              url,
              method: 'POST',
              companyId,
              userId: item.user_id,
              entitlementId: item.entitlement_id,
              leaveTypeId: item.leave_type_id,
            });

            setResolvingUserId(item.user_id);
            const started = Date.now();
            try {
              const result = await resolveSingleUser(
                companyId,
                item.user_id,
                deviceId,
                accessToken,
                { reason: 'manual from EntitlementList' },
              );
              console.log('[ReResolve] ✅ success', {
                elapsedMs: Date.now() - started,
                userId: item.user_id,
                response: result,
              });
              Alert.alert('Success', 'Policy re-resolved');
              fetchEntitlements();
            } catch (error: any) {
              console.error('[ReResolve] ❌ failed', {
                elapsedMs: Date.now() - started,
                userId: item.user_id,
                status: error?.response?.status,
                statusText: error?.response?.statusText,
                data: error?.response?.data,
                message: error?.message,
              });
              Alert.alert('Error', error?.message || 'Re-resolve failed');
            } finally {
              setResolvingUserId(null);
            }
          },
        },
      ],
    );
  };

  // ------------------------------------------------------------------
  // Picker handlers
  // ------------------------------------------------------------------
  const handlePickUser = (user: PickedUser) => {
    // Seed the name cache so the header chip renders instantly
    setNameCache((prev) => ({
      ...prev,
      [user.user_id]: { full_name: user.full_name ?? null, username: user.username },
    }));
    // Set the selected user — the useFocusEffect callback above re-runs
    // because its dependency changed, which fires fetchEntitlements.
    setSelectedUser(user);
  };

  const clearSelectedUser = () => {
    setSelectedUser(null);
    setEntitlements([]);
    setTotal(0);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  const renderItem = ({ item }: { item: Entitlement }) => {
    const displayName = displayNameFor(item.user_id);
    const sub = subtitleFor(item.user_id);
    const lt = leaveTypeLabel(item.leave_type_id);
    const isRecalcBusy = recalcId === item.entitlement_id;
    const isResolveBusy = resolvingUserId === item.user_id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="account-circle-outline" size={20} color={PRIMARY_COLOR} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.userName} numberOfLines={1}>
              {displayName}
            </Text>
            {sub ? (
              <Text style={styles.userSub} numberOfLines={1}>
                {sub}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Leave type — resolved via leaveTypeMap, falls back to UUID */}
        <View style={styles.leaveTypeRow}>
          <Icon name="tag-outline" size={14} color={TEXT_SECONDARY} />
          <Text style={styles.leaveTypeName} numberOfLines={1}>
            {lt.primary}
          </Text>
          {lt.secondary ? (
            <View style={styles.leaveTypeChip}>
              <Text style={styles.leaveTypeChipText}>{lt.secondary}</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.detail}>Total Days: {item.total_days}</Text>
        <Text style={styles.detail}>
          Effective:{' '}
          {new Date(item.effective_from).toLocaleDateString()} –{' '}
          {item.effective_to
            ? new Date(item.effective_to).toLocaleDateString()
            : 'No end'}
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.reresolveButton}
            onPress={() => handleReResolve(item)}
            disabled={isResolveBusy}
          >
            {isResolveBusy ? (
              <ActivityIndicator size="small" color="#7c3aed" />
            ) : (
              <>
                <Icon name="refresh" size={12} color="#7c3aed" />
                <Text style={styles.reresolveText}>Re-resolve policy</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.recalcButton}
            onPress={() => handleRecalculate(item)}
            disabled={isRecalcBusy}
          >
            {isRecalcBusy ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            ) : (
              <Text style={styles.recalcText}>Refresh balance</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Full-screen loader only when we're actively fetching FOR A USER.
  // Never blocks the picker — if no user is picked, we show the empty
  // state with the picker CTA instead.
  const showFullScreenLoader = loading && selectedUser?.user_id && entitlements.length === 0;

  if (showFullScreenLoader) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading entitlements…</Text>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Entitlements</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            navigation.navigate({ name: 'CreateEntitlement', params: {} })
          }
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* User picker — the ONLY way to load data */}
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
            <TouchableOpacity onPress={clearSelectedUser} style={styles.clearBtn}>
              <Icon name="close-circle" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ) : (
            <Icon name="chevron-right" size={18} color={TEXT_SECONDARY} />
          )}
        </TouchableOpacity>
      </View>

      {/* Result count — only when a user is selected and we have data */}
      {selectedUser?.user_id && entitlements.length > 0 && (
        <Text style={styles.resultHint}>
          {total} entitlement{total === 1 ? '' : 's'} for this user
        </Text>
      )}

      {selectedUser?.user_id ? (
        <FlatList
          data={entitlements}
          keyExtractor={(item) => item.entitlement_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchEntitlements(true)}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Icon
                  name="alert-circle-outline"
                  size={60}
                  color={TEXT_SECONDARY}
                />
                <Text style={styles.emptyTitle}>No Entitlements Found</Text>
                <Text style={styles.emptySubtitle}>
                  This user has no entitlements yet
                </Text>
              </View>
            )
          }
        />
      ) : (
        <View style={styles.promptContainer}>
          <View style={styles.promptIconWrap}>
            <Icon name="account-search" size={48} color={PRIMARY_COLOR} />
          </View>
          <Text style={styles.promptTitle}>Pick a user to get started</Text>
          <Text style={styles.promptSubtitle}>
            Search for a user above to view their leave entitlements.
            {'\n'}
            You can re-resolve policies or refresh balances per entitlement.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },

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
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  filterRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
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
  pickerTriggerText: {
    flex: 1,
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  pickerTriggerTextActive: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  clearBtn: { padding: 2 },

  resultHint: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 4,
  },

  listContent: { padding: 16, flexGrow: 1 },

  // ── Empty-state prompt (no user picked) ───────────────────────
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
  promptButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Entitlement card ──────────────────────────────────────────
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  userSub: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 1,
  },

  leaveTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 2,
    gap: 6,
  },
  leaveTypeName: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: '500',
    flexShrink: 1,
  },
  leaveTypeChip: {
    backgroundColor: PRIMARY_COLOR + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  leaveTypeChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    letterSpacing: 0.5,
  },

  detail: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  reresolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#7c3aed20',
    borderRadius: 6,
    marginRight: 8,
  },
  reresolveText: {
    color: '#7c3aed',
    fontWeight: '600',
    fontSize: 12,
  },
  recalcButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: PRIMARY_COLOR + '20',
    borderRadius: 6,
  },
  recalcText: { color: PRIMARY_COLOR, fontWeight: '600', fontSize: 12 },

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
  emptySubtitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 4,
    textAlign: 'center',
  },
});