// apps/prayantra-b2b/src/components/JobPicker.tsx
//
// Reusable job selector used by Create/EditPosition forms.
// Loads the company's jobs via listJobs() and returns the picked job
// (not just the id) so callers can display the job's flags inline.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { listJobs } from '@b2b/api-client';
import type { Job } from '@b2b/shared-types';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../constants/colors';

type Props = {
  companyId: string;
  deviceId: string;
  accessToken: string;
  value: string | null;
  onChange: (job: Job | null) => void;
  placeholder?: string;
  showInactive?: boolean;
};

export default function JobPicker({
  companyId,
  deviceId,
  accessToken,
  value,
  onChange,
  placeholder = 'Select a job',
  showInactive = false,
}: Props) {
  const navigation = useNavigation<StackNavigationProp<any>>();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [query, setQuery] = useState('');

  const selectedJob = useMemo(
    () => jobs.find((j) => j.job_id === value) ?? null,
    [jobs, value],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listJobs(companyId, deviceId, accessToken, {
        active_only: !showInactive,
      });
      setJobs(res.data?.jobs ?? []);
    } catch (e) {
      console.warn('JobPicker: failed to load jobs', e);
    } finally {
      setLoading(false);
    }
  }, [companyId, deviceId, accessToken, showInactive]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const filtered = useMemo(() => {
    if (!query.trim()) return jobs;
    const q = query.toLowerCase();
    return jobs.filter(
      (j) =>
        j.job_title.toLowerCase().includes(q) ||
        j.job_code.toLowerCase().includes(q),
    );
  }, [jobs, query]);

  const handlePick = (job: Job) => {
    onChange(job);
    setOpen(false);
    setQuery('');
  };

  const handleCreate = () => {
    setOpen(false);
    navigation.navigate('CreateJob');
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setOpen(true)}
        style={styles.trigger}
      >
        <Icon
          name="briefcase-outline"
          size={18}
          color={selectedJob ? PRIMARY_COLOR : '#94A3B8'}
        />
        <Text
          style={[styles.triggerText, !selectedJob && styles.placeholder]}
          numberOfLines={1}
        >
          {selectedJob
            ? `${selectedJob.job_title} · ${selectedJob.job_code}`
            : placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              style={styles.headerBtn}
            >
              <Icon name="close" size={22} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Job</Text>
            <TouchableOpacity onPress={handleCreate} style={styles.headerBtn}>
              <Icon name="plus" size={22} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Icon name="magnify" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs"
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={PRIMARY_COLOR} />
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.center}>
              <Icon name="briefcase-off-outline" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {jobs.length === 0 ? 'No jobs yet' : 'No matches'}
              </Text>
              <Text style={styles.emptyText}>
                {jobs.length === 0
                  ? 'Create your first job to start building positions.'
                  : 'Try a different search term.'}
              </Text>
              {jobs.length === 0 && (
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={handleCreate}
                >
                  <Icon name="plus" size={16} color="#FFF" />
                  <Text style={styles.createBtnText}>Create a job</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(j) => j.job_id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.job_id === value;
                return (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => handlePick(item)}
                  >
                    <View style={styles.rowIcon}>
                      <Icon
                        name="briefcase-outline"
                        size={18}
                        color={PRIMARY_COLOR}
                      />
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.job_title}
                      </Text>
                      <Text style={styles.rowSub} numberOfLines={1}>
                        {item.job_code}
                        {item.attendance_required ? ' · Attendance' : ''}
                        {item.overtime_allowed ? ' · OT' : ''}
                        {!item.is_active ? ' · Inactive' : ''}
                      </Text>
                    </View>
                    {isSelected && (
                      <Icon
                        name="check-circle"
                        size={20}
                        color={PRIMARY_COLOR}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    backgroundColor: CARD_BACKGROUND,
  },
  triggerText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
  },
  placeholder: { color: '#94A3B8' },

  modal: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  header: {
    minHeight: 56,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
    backgroundColor: '#FFF',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    minHeight: 44,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    backgroundColor: CARD_BACKGROUND,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: TEXT_PRIMARY,
    padding: 0,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },

  createBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },
  createBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

  listContent: { paddingHorizontal: 12, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
  },
  rowSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}08`,
  },
  rowIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  rowSub: { marginTop: 2, fontSize: 11, color: TEXT_SECONDARY },
});