import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../store/userAuthStore';
import { searchEmployeesTypeahead } from '@b2b/api-client';
import { UserAvatar } from './UserAvatar';
import {
  PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY,
  CARD_BACKGROUND, BORDER_COLOR, BACKGROUND_COLOR,
} from '../constants/colors';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PickedUser {
  user_id: string;
  username?: string;
  full_name?: string | null;
  employee_id?: string;
  job_title?: string | null;
  position_title?: string | null;
  department_name?: string | null;
  primary_location_id?: string | null;
  primary_location_name?: string | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: PickedUser) => void;
  /** Optional: hide these user_ids from the results (e.g. already in the org unit). */
  excludeUserIds?: string[];
  title?: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

/* ------------------------------------------------------------------ */
/* Lean normalizer — handles snake_case AND PascalCase from the API    */
/* ------------------------------------------------------------------ */

const pick = <T = any>(row: any, snake: string, pascal: string): T | undefined =>
  row?.[snake] ?? row?.[pascal];

const normalize = (raw: any): PickedUser | null => {
  if (!raw || typeof raw !== 'object') return null;
  const uid = pick<string>(raw, 'user_id', 'UserID');
  if (!uid) return null;

  return {
    user_id: uid,
    username: pick<string>(raw, 'username', 'Username') ?? undefined,
    full_name: pick(raw, 'full_name', 'FullName') ?? null,
    employee_id: pick<string>(raw, 'employee_id', 'EmployeeID') ?? undefined,
    job_title: pick(raw, 'job_title', 'JobTitle') ?? null,
    position_title: pick(raw, 'position_title', 'PositionTitle') ?? null,
    department_name: pick(raw, 'department_name', 'DepartmentName') ?? null,
    primary_location_id: pick(raw, 'primary_location_id', 'PrimaryLocationID') ?? null,
    primary_location_name: pick(raw, 'primary_location_name', 'PrimaryLocationName') ?? null,
  };
};

const extract = (res: any): PickedUser[] => {
  if (!res) return [];
  const data = res.data ?? res?.data?.data ?? [];
  if (!Array.isArray(data)) return [];
  return data.map(normalize).filter((u): u is PickedUser => u !== null);
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function UserSearchModal({
  visible,
  onClose,
  onSelect,
  excludeUserIds,
  title = 'Select User',
}: Props) {
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [users, setUsers] = useState<PickedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const excluded = useMemo(() => new Set(excludeUserIds ?? []), [excludeUserIds]);

  const fetchUsers = useCallback(
    async (q: string) => {
      if (!accessToken || !companyId || !deviceId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await searchEmployeesTypeahead(
          companyId,
          deviceId,
          accessToken,
          { q, page: 1, page_size: PAGE_SIZE },
          false,
        );
        setUsers(extract(res));
      } catch (e: any) {
        setError(
          e?.response?.data?.error ||
            e?.response?.data?.message ||
            e?.message ||
            'Failed to search users',
        );
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, companyId, deviceId],
  );

  // Reset on open
  useEffect(() => {
    if (visible) {
      setQuery('');
      setActiveQuery('');
      setError(null);
      fetchUsers('');
    }
  }, [visible, fetchUsers]);

  // Debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = query.trim();
      if (q === activeQuery) return;
      setActiveQuery(q);
      fetchUsers(q);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, activeQuery, fetchUsers]);

  const visibleUsers = useMemo(
    () => users.filter((u) => !excluded.has(u.user_id)),
    [users, excluded],
  );

  const handleSelect = (u: PickedUser) => {
    onSelect(u);
    onClose();
  };

  const renderItem = ({ item }: { item: PickedUser }) => {
    const displayName = item.full_name || item.username || item.user_id;
    const subtitle = item.job_title || item.position_title || null;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => handleSelect(item)}
      >
        <UserAvatar
          userId={item.user_id}
          username={item.username}
          fullName={item.full_name ?? undefined}
          size={40}
          style={styles.avatar}
        />
        <View style={styles.rowInfo}>
          <Text style={styles.rowName} numberOfLines={1}>{displayName}</Text>
          <View style={styles.rowSub}>
            {item.username ? (
              <>
                <Icon name="at" size={11} color={TEXT_SECONDARY} />
                <Text style={styles.rowSubText} numberOfLines={1}>{item.username}</Text>
              </>
            ) : null}
          </View>
          {(subtitle || item.department_name || item.primary_location_name) ? (
            <View style={styles.rowChips}>
              {item.department_name ? (
                <View style={styles.chip}>
                  <Icon name="domain" size={10} color={TEXT_SECONDARY} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {item.department_name}
                  </Text>
                </View>
              ) : null}
              {item.primary_location_name ? (
                <View style={styles.chip}>
                  <Icon name="map-marker-outline" size={10} color={TEXT_SECONDARY} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {item.primary_location_name}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        <Icon name="chevron-right" size={20} color={TEXT_SECONDARY} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={22} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Icon name="magnify" size={18} color={TEXT_SECONDARY} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, username..."
              placeholderTextColor={TEXT_SECONDARY}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
                <Icon name="close-circle" size={16} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.listWrap}>
            {loading && visibleUsers.length === 0 ? (
              <View style={styles.centerBlock}>
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              </View>
            ) : error ? (
              <View style={styles.centerBlock}>
                <Icon name="alert-circle-outline" size={42} color="#ef4444" />
                <Text style={styles.emptyTitle}>Search failed</Text>
                <Text style={styles.emptySubtitle}>{error}</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => fetchUsers(activeQuery)}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={visibleUsers}
                keyExtractor={(u) => u.user_id}
                renderItem={renderItem}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.centerBlock}>
                    <Icon name="account-off-outline" size={42} color={TEXT_SECONDARY} />
                    <Text style={styles.emptyTitle}>
                      {activeQuery ? 'No matching users' : 'No users available'}
                    </Text>
                    <Text style={styles.emptySubtitle}>
                      {activeQuery
                        ? 'Try a different name or username'
                        : 'Add employees first, then come back here'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: BACKGROUND_COLOR,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    height: '85%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: TEXT_PRIMARY },
  closeButton: { padding: 4 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    marginHorizontal: 16, marginTop: 12, marginBottom: 8,
    paddingHorizontal: 12, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER_COLOR, height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1, height: '100%', fontSize: 14,
    color: TEXT_PRIMARY, paddingVertical: 0,
  },
  clearBtn: { padding: 4 },

  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: BORDER_COLOR,
  },
  avatar: { marginRight: 12 },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  rowSub: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  rowSubText: { marginLeft: 3, fontSize: 11, color: TEXT_SECONDARY, flex: 1 },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F4F6F9',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
    maxWidth: 140,
  },
  chipText: { fontSize: 10, color: TEXT_SECONDARY, flexShrink: 1 },

  centerBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle: {
    fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY,
    marginTop: 12, textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12, color: TEXT_SECONDARY, marginTop: 4,
    textAlign: 'center', paddingHorizontal: 30,
  },
  retryBtn: {
    marginTop: 14, paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: PRIMARY_COLOR, borderRadius: 8,
  },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});