import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Snackbar, Switch } from 'react-native-paper';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listSources,
  createSource,
  updateSourceStatus,
} from '@b2b/api-client';

import type {
  AttendanceSource,
  AttendanceSourceType,
} from '@b2b/shared-types';

import { CANONICAL_SOURCE_TYPES } from '@b2b/shared-types';

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
// CONSTANTS
// ============================================================

const SOURCE_META: Record<
  string,
  { icon: string; tone: string; desc: string }
> = {
  manual: {
    icon: 'account-edit-outline',
    tone: '#F59E0B',
    desc: 'Admin marks attendance manually',
  },
  mobile: {
    icon: 'cellphone',
    tone: '#10B981',
    desc: 'Employee phone check-in',
  },
  web: {
    icon: 'web',
    tone: '#3B82F6',
    desc: 'Browser-based check-in',
  },
  biometric: {
    icon: 'fingerprint',
    tone: '#8B5CF6',
    desc: 'Fingerprint / face reader',
  },
  kiosk: {
    icon: 'tablet-dashboard',
    tone: '#6366F1',
    desc: 'Self-service kiosk',
  },
  classroom: {
    icon: 'school-outline',
    tone: '#EC4899',
    desc: 'Classroom attendance device',
  },
  auto: {
    icon: 'robot-outline',
    tone: '#94A3B8',
    desc: 'Automated / IoT sensors',
  },
  system: {
    icon: 'cog-outline',
    tone: '#94A3B8',
    desc: 'System-generated events',
  },
  correction: {
    icon: 'file-document-edit-outline',
    tone: '#EF4444',
    desc: 'Corrections by admin',
  },
};

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceSourcesListScreen() {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [sources, setSources] = useState<AttendanceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !deviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res: any = await listSources(
          companyId,
          deviceId,
          accessToken,
          { active_only: false },
        );

        const list: AttendanceSource[] = Array.isArray(res?.data)
          ? res.data
          : [];
        setSources(list);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load sources.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const toggleSource = async (src: AttendanceSource) => {
    if (!companyId || !deviceId || !accessToken) return;
    setBusyType(src.source_type);
    try {
      await updateSourceStatus(
        companyId,
        src.source_type,
        deviceId,
        accessToken,
        locationId ?? '',
        { is_active: !src.is_active },
      );
      setSnack({
        text: `${src.source_type} ${!src.is_active ? 'enabled' : 'disabled'}`,
        tone: 'ok',
      });
      await fetchAll(true);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to update source',
        tone: 'err',
      });
    } finally {
      setBusyType(null);
    }
  };

  const handleCreate = async (
    type: AttendanceSourceType,
    name: string,
  ) => {
    if (!companyId || !deviceId || !accessToken) return;
    try {
      await createSource(
        companyId,
        deviceId,
        accessToken,
        locationId ?? '',
        { source_type: type, name: name.trim() || undefined },
      );
      setSnack({ text: 'Source created', tone: 'ok' });
      setCreateOpen(false);
      await fetchAll(true);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to create source',
        tone: 'err',
      });
    }
  };

  const existingTypes = new Set(sources.map((s) => s.source_type));

  const renderRow = ({ item }: { item: AttendanceSource }) => {
    const meta = SOURCE_META[item.source_type] ?? {
      icon: 'tag-outline',
      tone: '#64748B',
      desc: '',
    };
    const isBusy = busyType === item.source_type;

    return (
      <View style={[styles.card, !item.is_active && styles.cardInactive]}>
        <View style={[styles.cardAccent, { backgroundColor: meta.tone }]} />
        <View style={styles.cardHeader}>
          <View
            style={[styles.iconWrap, { backgroundColor: `${meta.tone}15` }]}
          >
            <Icon name={meta.icon} size={22} color={meta.tone} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.name || item.source_type}
            </Text>
            <Text style={styles.cardType} numberOfLines={1}>
              {item.source_type}
            </Text>
          </View>
          <View style={styles.statusWrap}>
            {item.is_active ? (
              <View style={styles.activePill}>
                <View style={styles.activeDot} />
                <Text style={styles.activePillText}>ACTIVE</Text>
              </View>
            ) : (
              <View style={styles.inactivePill}>
                <Text style={styles.inactivePillText}>DISABLED</Text>
              </View>
            )}
          </View>
        </View>

        {meta.desc ? (
          <Text style={styles.desc} numberOfLines={2}>
            {meta.desc}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            Created{' '}
            {new Date(item.created_at).toLocaleDateString([], {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          <View style={styles.switchWrap}>
            {isBusy ? (
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            ) : (
              <Switch
                value={item.is_active}
                onValueChange={() => toggleSource(item)}
                color={PRIMARY_COLOR}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Intro */}
      <View style={styles.intro}>
        <Icon name="information-outline" size={16} color={PRIMARY_COLOR} />
        <Text style={styles.introText}>
          Enable or disable the channels that can record attendance. Devices
          and mobile apps authenticate against these.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
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
          data={sources}
          keyExtractor={(item) => item.source_id}
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
              <Icon name="source-branch" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No sources yet</Text>
              <Text style={styles.errMsg}>
                Create your first attendance source below.
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => setCreateOpen(true)}
      >
        <Icon name="plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create modal */}
      <CreateSourceModal
        visible={createOpen}
        existing={existingTypes}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={3000}
        style={{
          backgroundColor: snack?.tone === 'ok' ? '#065F46' : '#991B1B',
        }}
      >
        <Text style={{ color: '#FFFFFF' }}>{snack?.text ?? ''}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

// ============================================================
// CREATE MODAL
// ============================================================

function CreateSourceModal({
  visible,
  existing,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  existing: Set<string>;
  onClose: () => void;
  onSubmit: (type: AttendanceSourceType, name: string) => Promise<void>;
}) {
  const [type, setType] = useState<AttendanceSourceType>('mobile');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setType('mobile');
      setName('');
      setBusy(false);
    }
  }, [visible]);

  const available = CANONICAL_SOURCE_TYPES.filter((t) => !existing.has(t));
  const canSubmit = available.includes(type);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add source</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {available.length === 0 ? (
              <View style={styles.emptyModal}>
                <Icon name="check-circle-outline" size={28} color="#10B981" />
                <Text style={styles.emptyModalText}>
                  All source types are already configured.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.modalLabel}>Source type</Text>
                <View style={styles.typeGrid}>
                  {available.map((t) => {
                    const active = type === t;
                    const meta = SOURCE_META[t];
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.typeChip,
                          active && styles.typeChipActive,
                        ]}
                        onPress={() => setType(t)}
                        activeOpacity={0.85}
                      >
                        <Icon
                          name={meta?.icon ?? 'tag-outline'}
                          size={14}
                          color={active ? '#FFFFFF' : meta?.tone ?? '#64748B'}
                        />
                        <Text
                          style={[
                            styles.typeChipText,
                            active && styles.typeChipTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.modalLabel, { marginTop: 16 }]}>
                  Display name (optional)
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={name}
                  onChangeText={setName}
                  placeholder={`${type} attendance`}
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="sentences"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    onPress={onClose}
                    style={styles.modalBtnGhost}
                  >
                    <Text style={styles.modalBtnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalBtn,
                      (!canSubmit || busy) && { opacity: 0.5 },
                    ]}
                    onPress={async () => {
                      setBusy(true);
                      try {
                        await onSubmit(type, name);
                      } finally {
                        setBusy(false);
                      }
                    }}
                    disabled={!canSubmit || busy}
                  >
                    {busy ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalBtnText}>Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}25`,
  },
  introText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 16,
  },

  listContent: { padding: 20, paddingBottom: 100 },

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
  },
  cardName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  cardType: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
    fontFamily: 'Courier',
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
    backgroundColor: '#FEE2E2',
  },
  inactivePillText: {
    color: '#991B1B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  desc: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 10,
    marginLeft: 6,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginLeft: 6,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  footerText: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 10,
  },
  switchWrap: { minWidth: 50, alignItems: 'flex-end' },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  modalLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#F8FAFC',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  typeChipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  typeChipTextActive: { color: '#FFFFFF' },
  emptyModal: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyModalText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },

  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  modalBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  modalBtnGhost: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  modalBtnGhostText: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
    fontSize: 13,
  },
});