import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';

import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  adminListFaceEmbeddings,
  adminDeactivateFace,
  adminActivateFace,
  adminRotateEmbeddingModel,
} from '@b2b/api-client';

import type {
  FaceEmbedding,
  AttendanceSubjectType,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';

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

const SUBJECT_TONE: Record<string, string> = {
  employee: '#3B82F6',
  student: '#EC4899',
  customer: '#8B5CF6',
};

const MODEL_LABEL: Record<string, string> = {
  mobilefacenet_v1: 'MobileFaceNet',
  arcface_v1: 'ArcFace',
  facenet_v1: 'FaceNet',
  sface_2021dec: 'SFace 2021',
};

const ROTATE_OPTIONS = [
  'mobilefacenet_v1',
  'arcface_v1',
  'facenet_v1',
  'sface_2021dec',
];

// ============================================================
// HELPERS
// ============================================================

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceFaceEmbeddingsScreen() {
  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [rows, setRows] = useState<FaceEmbedding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<AttendanceSubjectType | 'all'>(
    'all',
  );
  const [modelFilter, setModelFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<FaceEmbedding | null>(null);
  const [rotateTarget, setRotateTarget] = useState<FaceEmbedding | null>(null);
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

        const res: any = await adminListFaceEmbeddings(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
        );

        const list: FaceEmbedding[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
          ? res
          : [];
        setRows(list);
      } catch (e: any) {
        setError(
          e?.response?.data?.error ||
            e?.message ||
            'Unable to load embeddings.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, deviceId, accessToken, locationId],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.model_version);
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (typeFilter !== 'all') out = out.filter((r) => r.subject_type === typeFilter);
    if (modelFilter) out = out.filter((r) => r.model_version === modelFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter((r) => r.subject_id.toLowerCase().includes(q));
    }
    return out;
  }, [rows, typeFilter, modelFilter, search]);

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleDeactivate = (row: FaceEmbedding) => {
    const doDeactivate = async (reason: string) => {
      if (!companyId || !deviceId || !accessToken) return;
      setBusyId(row.embedding_id);
      try {
        await adminDeactivateFace(
          companyId,
          deviceId,
          accessToken,
          locationId ?? '',
          {
            subject_type: row.subject_type,
            subject_id: row.subject_id,
            reason: reason.trim() || 'Deactivated by admin',
          },
        );
        setSnack({ text: 'Face deactivated', tone: 'ok' });
        await fetchAll(true);
      } catch (e: any) {
        setSnack({
          text:
            e?.response?.data?.error ||
            e?.message ||
            'Failed to deactivate',
          tone: 'err',
        });
      } finally {
        setBusyId(null);
      }
    };

    Alert.alert(
      'Deactivate face',
      `Deactivate face for ${row.subject_id.slice(0, 12)}…? Devices will drop it on next sync.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => doDeactivate('Deactivated by admin'),
        },
      ],
    );
  };

  const handleActivate = async (row: FaceEmbedding) => {
    if (!companyId || !deviceId || !accessToken) return;
    setBusyId(row.embedding_id);
    try {
      await adminActivateFace(
        companyId,
        deviceId,
        accessToken,
        locationId ?? '',
        {
          subject_type: row.subject_type,
          subject_id: row.subject_id,
          reason: 'Reactivated by admin',
        },
      );
      setSnack({ text: 'Face activated', tone: 'ok' });
      await fetchAll(true);
    } catch (e: any) {
      setSnack({
        text:
          e?.response?.data?.error ||
          e?.message ||
          'Failed to activate',
        tone: 'err',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRotate = async (newVersion: string) => {
    if (!rotateTarget || !companyId || !deviceId || !accessToken) return;
    setBusyId(rotateTarget.embedding_id);
    try {
      await adminRotateEmbeddingModel(
        companyId,
        deviceId,
        accessToken,
        locationId ?? '',
        {
          embedding_id: rotateTarget.embedding_id,
          new_version: newVersion,
        },
      );
      setSnack({ text: 'Model version updated', tone: 'ok' });
      setRotateTarget(null);
      setDetail(null);
      await fetchAll(true);
    } catch (e: any) {
      setSnack({
        text:
          e?.response?.data?.error ||
          e?.message ||
          'Failed to rotate',
        tone: 'err',
      });
    } finally {
      setBusyId(null);
    }
  };

  // ============================================================
  // ROW
  // ============================================================

  const renderRow = ({ item }: { item: FaceEmbedding }) => {
    const tone = SUBJECT_TONE[item.subject_type] ?? '#64748B';
    const isBusy = busyId === item.embedding_id;
    const modelLabel = MODEL_LABEL[item.model_version] ?? item.model_version;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => setDetail(item)}
      >
        <View style={[styles.cardAccent, { backgroundColor: tone }]} />

        <View style={styles.cardHeader}>
          <UserAvatar
            userId={item.subject_id}
            username={undefined}
            fullName={undefined}
            size={44}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.subject_id.slice(0, 14)}…
            </Text>
            <View style={styles.chipsRow}>
              <View style={[styles.typePill, { backgroundColor: `${tone}15` }]}>
                <Text style={[styles.typePillText, { color: tone }]}>
                  {item.subject_type.toUpperCase()}
                </Text>
              </View>
              <View style={styles.modelPill}>
                <Icon name="cube-outline" size={10} color={TEXT_SECONDARY} />
                <Text style={styles.modelPillText}>
                {modelLabel} · {item.embedding_vector?.length ?? '?'}D
                </Text>
              </View>
            </View>
          </View>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: item.is_active ? '#D1FAE5' : '#F1F5F9' },
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                { color: item.is_active ? '#065F46' : '#475569' },
              ]}
            >
              {item.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <View style={styles.metaStrip}>
          <Icon name="calendar-plus" size={11} color={TEXT_SECONDARY} />
          <Text style={styles.metaText}>Enrolled {fmtDate(item.created_at)}</Text>
        </View>

        <View style={styles.actions}>
          {item.is_active ? (
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => handleDeactivate(item)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Icon
                    name="account-cancel-outline"
                    size={13}
                    color="#EF4444"
                  />
                  <Text style={styles.dangerBtnText}>Deactivate</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.successBtn}
              onPress={() => handleActivate(item)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <Icon
                    name="account-check-outline"
                    size={13}
                    color="#10B981"
                  />
                  <Text style={styles.successBtnText}>Activate</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================================
  // MAIN
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.filterPanel}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          <TouchableOpacity
            style={[styles.chip, typeFilter === 'all' && styles.chipActive]}
            onPress={() => setTypeFilter('all')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.chipText,
                typeFilter === 'all' && styles.chipTextActive,
              ]}
            >
              All ({rows.length})
            </Text>
          </TouchableOpacity>
          {(['employee', 'student', 'customer'] as const).map((t) => {
            const active = typeFilter === t;
            const tone = SUBJECT_TONE[t];
            const count = rows.filter((r) => r.subject_type === t).length;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.chip,
                  active && { backgroundColor: tone, borderColor: tone },
                ]}
                onPress={() => setTypeFilter(t)}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
          {models.map((m) => {
            const active = modelFilter === m;
            return (
              <TouchableOpacity
                key={m}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setModelFilter(active ? null : m)}
                activeOpacity={0.85}
              >
                <Icon
                  name="cube-outline"
                  size={11}
                  color={active ? '#FFFFFF' : TEXT_SECONDARY}
                />
                <Text
                  style={[
                    styles.chipText,
                    { marginLeft: 4 },
                    active && styles.chipTextActive,
                  ]}
                >
                  {MODEL_LABEL[m] ?? m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.searchWrap}>
          <Icon name="magnify" size={16} color={TEXT_SECONDARY} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by subject ID…"
            placeholderTextColor={TEXT_SECONDARY}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close" size={14} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading embeddings…</Text>
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
          data={filtered}
          keyExtractor={(item) => item.embedding_id}
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
              <Icon name="fingerprint" size={32} color="#94A3B8" />
              <Text style={styles.errTitle}>No embeddings</Text>
              <Text style={styles.errMsg}>
                {rows.length === 0
                  ? 'No faces have been enrolled yet. Enrollment happens on biometric devices.'
                  : 'No embeddings match your filters.'}
              </Text>
            </View>
          }
        />
      )}

      <DetailModal
        embedding={detail}
        onClose={() => setDetail(null)}
        onRotate={() => setRotateTarget(detail)}
      />

      <RotateModal
        target={rotateTarget}
        onClose={() => setRotateTarget(null)}
        onSubmit={handleRotate}
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
// DETAIL MODAL
// ============================================================

function DetailModal({
  embedding,
  onClose,
  onRotate,
}: {
  embedding: FaceEmbedding | null;
  onClose: () => void;
  onRotate: () => void;
}) {
  if (!embedding) return null;
  const modelLabel =
    MODEL_LABEL[embedding.model_version] ?? embedding.model_version;

  const Row = ({ k, v }: { k: string; v: string }) => (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{k}</Text>
      <Text style={styles.detailVal} numberOfLines={2}>
        {v}
      </Text>
    </View>
  );

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxHeight: '85%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Face embedding</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Row k="Subject type" v={embedding.subject_type} />
            <Row k="Subject ID" v={embedding.subject_id} />
            <Row
              k="Model"
              v={`${modelLabel} (${embedding.model_version})`}
            />
            <Row
            k="Dimension"
            v={`${embedding.embedding_vector?.length ?? 0} floats`}
            />
            <Row k="Status" v={embedding.is_active ? 'Active' : 'Inactive'} />
            <Row
              k="Enrolled"
              v={
                embedding.created_at
                  ? new Date(embedding.created_at).toLocaleString()
                  : '—'
              }
            />
            <Row k="Enrolled by" v={embedding.created_by ?? '—'} />
            <Row k="Embedding ID" v={embedding.embedding_id} />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtnGhost} onPress={onClose}>
              <Text style={styles.modalBtnGhostText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalBtnPrimary}
              onPress={onRotate}
            >
              <Icon name="cube-send" size={14} color="#FFFFFF" />
              <Text style={styles.modalBtnPrimaryText}>Rotate model</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// ROTATE MODAL
// ============================================================

function RotateModal({
  target,
  onClose,
  onSubmit,
}: {
  target: FaceEmbedding | null;
  onClose: () => void;
  onSubmit: (newVersion: string) => void;
}) {
  const [version, setVersion] = useState('');

  useEffect(() => {
    if (target) setVersion('');
  }, [target]);

  if (!target) return null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdropCenter}>
        <View style={styles.dialogCard}>
          <Text style={styles.modalTitle}>Rotate model version</Text>
          <Text style={styles.dialogSub}>Current: {target.model_version}</Text>

          <Text style={styles.dialogLabel}>New version</Text>
          <TextInput
            style={styles.dialogInput}
            value={version}
            onChangeText={setVersion}
            placeholder="sface_2021dec"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.presetChips}>
            {ROTATE_OPTIONS.map((v) => (
              <TouchableOpacity
                key={v}
                style={[
                  styles.presetChip,
                  version === v && styles.presetChipActive,
                ]}
                onPress={() => setVersion(v)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    version === v && styles.presetChipTextActive,
                  ]}
                >
                  {v}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalBtnGhost}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalBtnPrimary,
                !version.trim() && { opacity: 0.5 },
              ]}
              disabled={!version.trim()}
              onPress={() => onSubmit(version.trim())}
            >
              <Text style={styles.modalBtnPrimaryText}>Rotate</Text>
            </TouchableOpacity>
          </View>
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

  filterPanel: {
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
    paddingBottom: 12,
  },
  chipsScroll: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  chipText: { color: TEXT_SECONDARY, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#F8FAFC',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: TEXT_PRIMARY,
    paddingVertical: 0,
  },

  listContent: { padding: 16, paddingBottom: 40 },

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
  cardAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 6,
  },
  cardName: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 5,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typePillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  modelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
  modelPillText: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '700',
  },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  metaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginLeft: 6,
  },
  metaText: { color: TEXT_SECONDARY, fontSize: 11, fontWeight: '600' },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  dangerBtnText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
  },
  successBtnText: { color: '#10B981', fontSize: 12, fontWeight: '700' },

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

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  dialogSub: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Courier',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
    gap: 12,
  },
  detailKey: { color: TEXT_SECONDARY, fontSize: 11, fontWeight: '600' },
  detailVal: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
    maxWidth: '65%',
  },
  dialogLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#F8FAFC',
    fontFamily: 'Courier',
  },
  presetChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  presetChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  presetChipActive: { backgroundColor: PRIMARY_COLOR },
  presetChipText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '700',
  },
  presetChipTextActive: { color: '#FFFFFF' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },
  modalBtnPrimaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
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