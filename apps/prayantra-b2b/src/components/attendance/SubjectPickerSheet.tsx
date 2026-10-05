import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { searchEmployeesTypeahead } from '@b2b/api-client';
import type { AttendanceSubjectType } from '@b2b/shared-types';

import { useUserAuthStore } from '../../store/userAuthStore';
import { UserAvatar } from '../UserAvatar';

import {
  PRIMARY_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../constants/colors';

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 300;

export interface PickedSubject {
  user_id: string;
  username?: string;
  full_name?: string;
  job_title?: string;
  department_name?: string;
}

interface Props {
  visible: boolean;
  subjectType: AttendanceSubjectType;
  title?: string;
  onClose: () => void;
  onSelect: (subject: PickedSubject) => void;
}

// ────────────────────────────────────────────────────────────
// Typeahead router.
//
// Today: all three subject types hit the HR typeahead, because that's
// the only one that exists. When the academics / sales modules ship
// their own typeahead endpoints, drop them in here:
//
//   student  → searchStudentsTypeahead  (academics module)
//   customer → searchCustomersTypeahead (sales/subscription module)
//
// Nothing outside this file needs to change.
// ────────────────────────────────────────────────────────────
async function searchForSubject(
  _subjectType: AttendanceSubjectType,
  companyId: string,
  deviceId: string,
  accessToken: string,
  q: string,
  page: number,
): Promise<any> {
  return searchEmployeesTypeahead(
    companyId,
    deviceId,
    accessToken,
    { q, page, page_size: PAGE_SIZE },
    false,
  );
}

function normalizeRow(row: any): PickedSubject | null {
  if (!row || typeof row !== 'object') return null;
  const id = row.user_id ?? row.UserID ?? row.id;
  if (!id) return null;
  return {
    user_id: String(id),
    username: row.username ?? row.Username ?? undefined,
    full_name: row.full_name ?? row.FullName ?? undefined,
    job_title:
      row.job_title ??
      row.JobTitle ??
      row.position_title ??
      row.PositionTitle ??
      undefined,
    department_name: row.department_name ?? row.DepartmentName ?? undefined,
  };
}

export default function SubjectPickerSheet({
  visible,
  subjectType,
  title,
  onClose,
  onSelect,
}: Props) {
  const { companyId, deviceId, accessToken } = useUserAuthStore();

  const [term, setTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rows, setRows] = useState<PickedSubject[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset every open
  useEffect(() => {
    if (visible) {
      setTerm('');
      setActiveQuery('');
      setRows([]);
      setPage(1);
      setHasMore(true);
      setError(null);
    }
  }, [visible]);

  // Debounce term → activeQuery
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = term.trim();
      if (q !== activeQuery) setActiveQuery(q);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [term, activeQuery]);

  const fetchPage = useCallback(
    async (targetPage: number, replace: boolean, q: string) => {
      if (!companyId || !deviceId || !accessToken) return;

      try {
        if (replace) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const res: any = await searchForSubject(
          subjectType,
          companyId,
          deviceId,
          accessToken,
          q,
          targetPage,
        );

        const data = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data?.data)
          ? res.data.data
          : [];

        const normalized = data
          .map(normalizeRow)
          .filter((x: PickedSubject | null): x is PickedSubject => !!x);

        setRows((prev) => (replace ? normalized : [...prev, ...normalized]));
        setPage(targetPage);
        setHasMore(normalized.length === PAGE_SIZE);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Failed to load subjects',
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [companyId, deviceId, accessToken, subjectType],
  );

  useEffect(() => {
    if (!visible) return;
    fetchPage(1, true, activeQuery);
  }, [visible, activeQuery, fetchPage]);

  const handleEnd = () => {
    if (!hasMore || loading || loadingMore) return;
    fetchPage(page + 1, false, activeQuery);
  };

  const handlePick = (row: PickedSubject) => {
    Keyboard.dismiss();
    onSelect(row);
  };

  const clear = () => {
    setTerm('');
    setActiveQuery('');
    Keyboard.dismiss();
  };

  const renderRow = ({ item }: { item: PickedSubject }) => {
    const name = item.full_name || item.username || item.user_id;
    const sub = item.job_title || item.department_name || '';
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => handlePick(item)}
      >
        <UserAvatar
          userId={item.user_id}
          username={item.username}
          fullName={item.full_name}
          size={44}
        />
        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>
            {name}
          </Text>
          {!!sub && (
            <Text style={styles.rowSub} numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>
        <Icon name="chevron-right" size={18} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <Text style={styles.title}>
              {title ?? `Pick ${subjectType}`}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Icon name="magnify" size={18} color={TEXT_SECONDARY} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, username…"
              placeholderTextColor={TEXT_SECONDARY}
              value={term}
              onChangeText={setTerm}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {term.length > 0 && (
              <TouchableOpacity onPress={clear} style={styles.clearBtn}>
                <Icon name="close" size={16} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Icon name="alert-circle-outline" size={28} color="#EF4444" />
              <Text style={styles.errText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchPage(1, true, activeQuery)}
              >
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(item) => item.user_id}
              renderItem={renderRow}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              onEndReached={handleEnd}
              onEndReachedThreshold={0.4}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Icon
                    name="account-search-outline"
                    size={28}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyTitle}>
                    {activeQuery ? 'No matches' : 'Start typing to search'}
                  </Text>
                </View>
              }
              ListFooterComponent={
                loadingMore ? (
                  <View style={{ paddingVertical: 16 }}>
                    <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                  </View>
                ) : null
              }
            />
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 420,
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginTop: 8,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { flex: 1, color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: CARD_BACKGROUND,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },
  clearBtn: { padding: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  rowBody: { flex: 1 },
  rowName: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '600' },
  rowSub: { color: TEXT_SECONDARY, fontSize: 11, marginTop: 2 },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER_COLOR,
    marginLeft: 76,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  errText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  emptyTitle: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 10,
  },
});