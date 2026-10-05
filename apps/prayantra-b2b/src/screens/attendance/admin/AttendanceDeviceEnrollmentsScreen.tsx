import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listDeviceEnrollments,
  listRevokedDeviceEnrollments,
  enrollUser,
  attendanceRevokeEnrollment,
  attendanceUnrevokeEnrollment,
} from '@b2b/api-client';

import type {
  AttendanceDeviceEnrollment,
  AttendanceSourceType,
  AttendanceSubjectType,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';
import SubjectPickerSheet, {
  PickedSubject,
} from '../../../components/attendance/SubjectPickerSheet';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';

// ============================================================
// TYPES
// ============================================================

type RouteT = RouteProp<
  {
    AttendanceDeviceEnrollments: {
      deviceId: string;
      deviceCode?: string;
      deviceSourceType?: string;
    };
  },
  'AttendanceDeviceEnrollments'
>;

// ============================================================
// HELPERS
// ============================================================

function prettyTime(iso: string | null | undefined): string {
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

const SUBJECT_TONE: Record<string, string> = {
  employee: '#3B82F6',
  student: '#EC4899',
  customer: '#8B5CF6',
};

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceDeviceEnrollmentsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteT>();
  const { deviceId, deviceCode, deviceSourceType } = route.params;

  const { companyId, deviceId: myDeviceId, accessToken, locationId } =
    useUserAuthStore();

  const [tab, setTab] = useState<'active' | 'revoked'>('active');
  const [activeRows, setActiveRows] = useState<AttendanceDeviceEnrollment[]>([]);
  const [revokedRows, setRevokedRows] = useState<AttendanceDeviceEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] =
    useState<AttendanceDeviceEnrollment | null>(null);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  const sourceType = (deviceSourceType ?? 'biometric') as AttendanceSourceType;

  const fetchAll = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !myDeviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const [aRes, rRes] = await Promise.allSettled([
          listDeviceEnrollments(
            companyId,
            deviceId,
            myDeviceId,
            accessToken,
            locationId ?? undefined,
          ),
          listRevokedDeviceEnrollments(
            companyId,
            deviceId,
            myDeviceId,
            accessToken,
            locationId ?? undefined,
          ),
        ]);

        setActiveRows(
          aRes.status === 'fulfilled'
            ? (aRes.value as any)?.data ?? []
            : [],
        );
        setRevokedRows(
          rRes.status === 'fulfilled'
            ? (rRes.value as any)?.data ?? []
            : [],
        );
      } catch (err: any) {
        setError(
          err?.response?.data?.error ||
            err?.message ||
            'Unable to load enrollments.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, myDeviceId, accessToken, locationId, deviceId],
  );

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const rows = tab === 'active' ? activeRows : revokedRows;

  // ============================================================
  // ACTIONS
  // ============================================================

  const handleRevoke = async (reason: string) => {
    if (!revokeTarget || !companyId || !myDeviceId || !accessToken) return;
    setBusyId(revokeTarget.mapping_id);
    try {
      await attendanceRevokeEnrollment(
        companyId,
        deviceId,
        myDeviceId,
        accessToken,
        locationId ?? '',
        {
          device_user_code: revokeTarget.device_user_code,
          source_type: revokeTarget.source_type,
          reason,
        },
      );
      setSnack({ text: 'Enrollment revoked', tone: 'ok' });
      setRevokeTarget(null);
      await fetchAll(true);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to revoke',
        tone: 'err',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleUnrevoke = (row: AttendanceDeviceEnrollment) => {
    Alert.alert(
      'Restore enrollment',
      `Re-enable ${row.device_user_code}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            if (!companyId || !myDeviceId || !accessToken) return;
            setBusyId(row.mapping_id);
            try {
              await attendanceUnrevokeEnrollment(
                companyId,
                deviceId,
                myDeviceId,
                accessToken,
                locationId ?? '',
                {
                  device_user_code: row.device_user_code,
                  source_type: row.source_type,
                  reason: 'Restored by admin',
                },
              );
              setSnack({ text: 'Enrollment restored', tone: 'ok' });
              await fetchAll(true);
            } catch (err: any) {
              setSnack({
                text:
                  err?.response?.data?.error ||
                  err?.message ||
                  'Failed to restore',
                tone: 'err',
              });
            } finally {
              setBusyId(null);
            }
          },
        },
      ],
    );
  };

  const handleEnroll = async (
    subject: PickedSubject,
    deviceUserCode: string,
    subjectType: AttendanceSubjectType,
  ) => {
    if (!companyId || !myDeviceId || !accessToken) return;
    try {
      await enrollUser(
        companyId,
        deviceId,
        myDeviceId,
        accessToken,
        locationId ?? '',
        {
          user_id: subject.user_id,
          device_user_code: deviceUserCode,
          source_type: sourceType,
          subject_type: subjectType,
        },
      );
      setSnack({ text: 'User enrolled', tone: 'ok' });
      setEnrollOpen(false);
      await fetchAll(true);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to enroll',
        tone: 'err',
      });
    }
  };

  // ============================================================
  // RENDER ROW
  // ============================================================

  const renderRow = ({ item }: { item: AttendanceDeviceEnrollment }) => {
    const tone = SUBJECT_TONE[item.subject_type] ?? '#64748B';
    const isActive = item.is_active;
    const isBusy = busyId === item.mapping_id;

    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: tone }]} />

        <View style={styles.cardHeader}>
          <UserAvatar
            userId={item.subject_id}
            username={undefined}
            fullName={undefined}
            size={42}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardName} numberOfLines={1}>
              {item.subject_id.slice(0, 12)}…
            </Text>
            <View style={styles.typeRow}>
              <View style={[styles.typePill, { backgroundColor: `${tone}18` }]}>
                <Text style={[styles.typePillText, { color: tone }]}>
                  {item.subject_type.toUpperCase()}
                </Text>
              </View>
              {isActive ? (
                <View style={styles.activePill}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              ) : (
                <View style={styles.revokedPill}>
                  <Text style={styles.revokedPillText}>REVOKED</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.codeStrip}>
          <Icon name="badge-account-outline" size={13} color={TEXT_SECONDARY} />
          <Text style={styles.codeStripText} numberOfLines={1}>
            {item.device_user_code}
          </Text>
          <View style={styles.verChip}>
            <Text style={styles.verChipText}>v{item.enrollment_version}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Enrolled</Text>
          <Text style={styles.metaValue}>{prettyTime(item.enrolled_at)}</Text>
        </View>
        {item.last_used_at ? (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Last used</Text>
            <Text style={styles.metaValue}>
              {prettyTime(item.last_used_at)}
            </Text>
          </View>
        ) : null}
        {!isActive && item.revoked_reason ? (
          <View style={styles.reasonRow}>
            <Icon name="comment-text-outline" size={12} color={TEXT_SECONDARY} />
            <Text style={styles.reasonText} numberOfLines={2}>
              {item.revoked_reason}
            </Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {isActive ? (
            <TouchableOpacity
              style={styles.dangerBtn}
              activeOpacity={0.85}
              onPress={() => setRevokeTarget(item)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Icon name="account-cancel-outline" size={14} color="#EF4444" />
                  <Text style={styles.dangerBtnText}>Revoke</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.successBtn}
              activeOpacity={0.85}
              onPress={() => handleUnrevoke(item)}
              disabled={isBusy}
            >
              {isBusy ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <>
                  <Icon
                    name="account-check-outline"
                    size={14}
                    color="#10B981"
                  />
                  <Text style={styles.successBtnText}>Restore</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ============================================================
  // MAIN
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Device banner */}
      <View style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Icon name="fingerprint" size={20} color={PRIMARY_COLOR} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerLabel}>Device</Text>
          <Text style={styles.bannerValue} numberOfLines={1}>
            {deviceCode || deviceId.slice(0, 12) + '…'}
          </Text>
        </View>
        <View style={styles.sourcePill}>
          <Text style={styles.sourcePillText}>{sourceType.toUpperCase()}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['active', 'revoked'] as const).map((k) => {
          const active = tab === k;
          const count = k === 'active' ? activeRows.length : revokedRows.length;
          return (
            <TouchableOpacity
              key={k}
              onPress={() => setTab(k)}
              style={[styles.tab, active && styles.tabActive]}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.tabText, active && styles.tabTextActive]}
              >
                {k === 'active' ? 'Active' : 'Revoked'} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading enrollments…</Text>
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
          data={rows}
          keyExtractor={(item) => item.mapping_id}
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
              <Icon
                name={
                  tab === 'active'
                    ? 'account-plus-outline'
                    : 'account-off-outline'
                }
                size={32}
                color="#94A3B8"
              />
              <Text style={styles.errTitle}>
                {tab === 'active'
                  ? 'No active enrollments'
                  : 'No revoked enrollments'}
              </Text>
              <Text style={styles.errMsg}>
                {tab === 'active'
                  ? 'Enroll users so the device can resolve punches to them.'
                  : 'Revoked mappings appear here for audit.'}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => setEnrollOpen(true)}
      >
        <Icon name="account-plus" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Enroll modal */}
      <EnrollModal
        visible={enrollOpen}
        sourceType={sourceType}
        onClose={() => setEnrollOpen(false)}
        onSubmit={handleEnroll}
      />

      {/* Revoke modal */}
      <RevokeModal
        target={revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onSubmit={handleRevoke}
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
// ENROLL MODAL
// ============================================================

function EnrollModal({
  visible,
  sourceType,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  sourceType: AttendanceSourceType;
  onClose: () => void;
  onSubmit: (
    subject: PickedSubject,
    code: string,
    subjectType: AttendanceSubjectType,
  ) => Promise<void>;
}) {
  const [subjectType, setSubjectType] =
    useState<AttendanceSubjectType>('employee');
  const [subject, setSubject] = useState<PickedSubject | null>(null);
  const [code, setCode] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setSubjectType('employee');
      setSubject(null);
      setCode('');
    }
  }, [visible]);

  const valid = !!subject && code.trim().length >= 1;

  const handleSubmit = async () => {
    if (!valid || !subject) return;
    setBusy(true);
    try {
      await onSubmit(subject, code.trim(), subjectType);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enroll a user</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={styles.modalLabel}>Subject type</Text>
            <View style={styles.typeGrid}>
              {(['employee', 'student', 'customer'] as const).map((t) => {
                const active = subjectType === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => {
                      setSubjectType(t);
                      setSubject(null);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        active && styles.typeChipTextActive,
                      ]}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>
              Subject
            </Text>
            {subject ? (
              <View style={styles.subjectRow}>
                <UserAvatar
                  userId={subject.user_id}
                  username={subject.username}
                  fullName={subject.full_name}
                  size={38}
                />
                <Text style={styles.subjectName} numberOfLines={1}>
                  {subject.full_name || subject.username || subject.user_id}
                </Text>
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => setPickerOpen(true)}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.pickBtn}
                onPress={() => setPickerOpen(true)}
                activeOpacity={0.85}
              >
                <Icon
                  name="account-search-outline"
                  size={18}
                  color={PRIMARY_COLOR}
                />
                <Text style={styles.pickBtnText}>Pick {subjectType}</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.modalLabel, { marginTop: 16 }]}>
              Device user code
            </Text>
            <TextInput
              style={styles.modalInput}
              value={code}
              onChangeText={setCode}
              placeholder="e.g. 10023 or EMP-LOCAL-0099"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              The identifier this device will send in punches. Must be unique
              per device.
            </Text>

            <View style={styles.sourceHint}>
              <Icon name="information-outline" size={13} color={PRIMARY_COLOR} />
              <Text style={styles.sourceHintText}>
                Source: {sourceType}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={onClose} style={styles.modalBtnGhost}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  (!valid || busy) && { opacity: 0.5 },
                ]}
                onPress={handleSubmit}
                disabled={!valid || busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalBtnText}>Enroll</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      <SubjectPickerSheet
        visible={pickerOpen}
        subjectType={subjectType}
        title={`Pick ${subjectType}`}
        onClose={() => setPickerOpen(false)}
        onSelect={(p) => {
          setSubject(p);
          setPickerOpen(false);
        }}
      />
    </Modal>
  );
}

// ============================================================
// REVOKE MODAL
// ============================================================

function RevokeModal({
  target,
  onClose,
  onSubmit,
}: {
  target: AttendanceDeviceEnrollment | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (target) {
      setReason('');
      setBusy(false);
    }
  }, [target]);

  if (!target) return null;

  const valid = reason.trim().length >= 3;

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { maxWidth: 340 }]}>
          <Text style={styles.modalTitle}>Revoke enrollment</Text>
          <Text style={styles.revokeSub}>
            {target.device_user_code}
          </Text>

          <Text style={[styles.modalLabel, { marginTop: 14 }]}>
            Reason
          </Text>
          <TextInput
            style={[styles.modalInput, { minHeight: 70 }]}
            value={reason}
            onChangeText={setReason}
            placeholder="e.g. Employee left, card lost"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalBtnGhost}>
              <Text style={styles.modalBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalBtnDanger,
                (!valid || busy) && { opacity: 0.5 },
              ]}
              onPress={async () => {
                setBusy(true);
                try {
                  await onSubmit(reason.trim());
                } finally {
                  setBusy(false);
                }
              }}
              disabled={!valid || busy}
            >
              {busy ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalBtnText}>Revoke</Text>
              )}
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

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_COLOR,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}14`,
  },
  bannerLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bannerValue: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  sourcePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  sourcePillText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  tabActive: { backgroundColor: PRIMARY_COLOR },
  tabText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: { color: '#FFFFFF' },

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
  cardName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
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
  revokedPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#FEE2E2',
  },
  revokedPillText: {
    color: '#991B1B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  codeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginLeft: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  codeStripText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: '600',
  },
  verChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
  },
  verChipText: {
    color: '#475569',
    fontSize: 9,
    fontWeight: '800',
  },

  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
    marginLeft: 6,
  },
  metaLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '600',
  },
  metaValue: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '600',
  },

  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    marginLeft: 6,
  },
  reasonText: {
    flex: 1,
    color: TEXT_SECONDARY,
    fontSize: 11,
    lineHeight: 15,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  dangerBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  successBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
  },
  successBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
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
    maxHeight: '90%',
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
    paddingHorizontal: 14,
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
  },
  typeChipTextActive: { color: '#FFFFFF' },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  subjectName: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  changeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  changeBtnText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: '700',
  },

  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}40`,
    backgroundColor: `${PRIMARY_COLOR}08`,
  },
  pickBtnText: {
    color: PRIMARY_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },

  helperText: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 6,
  },
  sourceHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  sourceHintText: {
    color: PRIMARY_COLOR,
    fontSize: 11,
    fontWeight: '700',
  },

  revokeSub: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontFamily: 'Courier',
    marginTop: 4,
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
  modalBtnDanger: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
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