import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  Share,
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
  attendanceIssueDeviceToken,
  attendanceGetCurrentDeviceToken,
  revokeAllDeviceTokens,
} from '@b2b/api-client';

import type {
  AttendanceDeviceToken,
  AttendanceSourceType,
} from '@b2b/shared-types';

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
// TYPES
// ============================================================

type RouteT = RouteProp<
  {
    AttendanceDeviceTokens: {
      deviceId: string;
      deviceCode?: string;
      deviceSourceType?: string;
    };
  },
  'AttendanceDeviceTokens'
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

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  try {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  } catch {
    return null;
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceDeviceTokensScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteT>();
  const { deviceId, deviceCode, deviceSourceType } = route.params;

  const { companyId, deviceId: myDeviceId, accessToken, locationId } =
    useUserAuthStore();

  const [current, setCurrent] = useState<AttendanceDeviceToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [rawTokenModal, setRawTokenModal] = useState<string | null>(null);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  const sourceType = (deviceSourceType ?? 'biometric') as AttendanceSourceType;

  const fetchCurrent = useCallback(
    async (isRefresh = false) => {
      if (!companyId || !myDeviceId || !accessToken) return;
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const res: any = await attendanceGetCurrentDeviceToken(
          companyId,
          deviceId,
          myDeviceId,
          accessToken,
        );
        setCurrent(res?.data ?? null);
      } catch (err: any) {
        setSnack({
          text:
            err?.response?.data?.error ||
            err?.message ||
            'Failed to load token',
          tone: 'err',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, myDeviceId, accessToken, deviceId],
  );

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const handleIssue = () => {
    if (!companyId || !myDeviceId || !accessToken) return;
    const doIssue = async () => {
      setActing('issue');
      try {
        const res: any = await attendanceIssueDeviceToken(
          companyId,
          deviceId,
          myDeviceId,
          accessToken,
          locationId ?? '',
          { source_type: sourceType },
        );
        const raw = res?.data?.raw_token ?? '';
        setRawTokenModal(raw);
        await fetchCurrent(true);
      } catch (err: any) {
        setSnack({
          text:
            err?.response?.data?.error ||
            err?.message ||
            'Failed to issue token',
          tone: 'err',
        });
      } finally {
        setActing(null);
      }
    };

    if (current) {
      Alert.alert(
        'Issue new token',
        'This will immediately revoke the current token. The device will need to be reconfigured with the new one.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Issue', style: 'destructive', onPress: doIssue },
        ],
      );
    } else {
      doIssue();
    }
  };

  const handleRevokeAll = () => {
    Alert.alert(
      'Revoke all tokens',
      'The device will be locked out until a new token is issued.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            if (!companyId || !myDeviceId || !accessToken) return;
            setActing('revoke-all');
            try {
              await revokeAllDeviceTokens(
                companyId,
                deviceId,
                myDeviceId,
                accessToken,
                locationId ?? '',
                { reason: 'Revoked by admin' },
              );
              setSnack({ text: 'All tokens revoked', tone: 'ok' });
              await fetchCurrent(true);
            } catch (err: any) {
              setSnack({
                text:
                  err?.response?.data?.error ||
                  err?.message ||
                  'Failed to revoke',
                tone: 'err',
              });
            } finally {
              setActing(null);
            }
          },
        },
      ],
    );
  };

  const copyRaw = async (token: string) => {
    try {
      await Share.share({
        title: 'Device token',
        message: token,
      });
    } catch {
      // user cancelled
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchCurrent(true)}
            tintColor={PRIMARY_COLOR}
          />
        }
      >
        {/* Device banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Icon name="key-variant" size={20} color={PRIMARY_COLOR} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerLabel}>Device</Text>
            <Text style={styles.bannerValue} numberOfLines={1}>
              {deviceCode || deviceId.slice(0, 12) + '…'}
            </Text>
          </View>
          <View style={styles.sourcePill}>
            <Text style={styles.sourcePillText}>
              {sourceType.toUpperCase()}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          </View>
        ) : current ? (
          <View style={styles.tokenCard}>
            <View style={styles.tokenHeader}>
              <View style={styles.livePill}>
                <View style={styles.liveDot} />
                <Text style={styles.livePillText}>ACTIVE TOKEN</Text>
              </View>
              <Text style={styles.tokenVersion}>
                v{current.token_version}
              </Text>
            </View>

            <Text style={styles.tokenId}>
              {current.token_id.slice(0, 8)}…
            </Text>

            <View style={styles.tokenGrid}>
              <TokenCell
                icon="source-branch"
                label="Source"
                value={current.source_type}
              />
              <TokenCell
                icon="shield-lock-outline"
                label="Status"
                value={current.is_active ? 'Active' : 'Inactive'}
                valueTone={current.is_active ? '#10B981' : '#94A3B8'}
              />
              <TokenCell
                icon="calendar-plus"
                label="Issued"
                value={prettyTime(current.issued_at)}
              />
              <TokenCell
                icon="calendar-clock"
                label="Expires"
                value={
                  current.expires_at
                    ? `${prettyTime(current.expires_at)} (${
                        daysUntil(current.expires_at) ?? '—'
                      }d)`
                    : 'never'
                }
              />
            </View>

            <View style={styles.tokenActions}>
              <TouchableOpacity
                style={styles.primaryAction}
                onPress={handleIssue}
                disabled={acting === 'issue'}
                activeOpacity={0.85}
              >
                {acting === 'issue' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon
                      name="refresh"
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.primaryActionText}>Rotate token</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerAction}
                onPress={handleRevokeAll}
                disabled={acting === 'revoke-all'}
                activeOpacity={0.85}
              >
                {acting === 'revoke-all' ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Icon name="cancel" size={16} color="#EF4444" />
                    <Text style={styles.dangerActionText}>Revoke</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon name="key-off" size={28} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No active token</Text>
            <Text style={styles.emptyMsg}>
              Issue a token so this device can authenticate its punches.
            </Text>
            <TouchableOpacity
              style={styles.issueBtn}
              onPress={handleIssue}
              disabled={acting === 'issue'}
              activeOpacity={0.9}
            >
              {acting === 'issue' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="plus" size={18} color="#FFFFFF" />
                  <Text style={styles.issueBtnText}>Issue token</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Info panel */}
        <View style={styles.infoPanel}>
          <Icon
            name="information-outline"
            size={16}
            color={PRIMARY_COLOR}
          />
          <Text style={styles.infoPanelText}>
            The raw token is shown only once when issued. Copy it
            immediately and configure the device. Each new token
            replaces the previous one.
          </Text>
        </View>
      </ScrollView>

      {/* Raw token modal */}
      <Modal
        visible={!!rawTokenModal}
        animationType="fade"
        transparent
        onRequestClose={() => setRawTokenModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Icon name="key-check" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Token issued</Text>
                <Text style={styles.modalSub}>
                  Copy this now — it won't be shown again
                </Text>
              </View>
            </View>

            <View style={styles.tokenRawBox}>
              <Text style={styles.tokenRawText} selectable>
                {rawTokenModal ?? ''}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnGhost}
                onPress={() => setRawTokenModal(null)}
              >
                <Text style={styles.modalBtnGhostText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={() =>
                  rawTokenModal ? copyRaw(rawTokenModal) : undefined
                }
              >
                <Icon name="share-variant" size={16} color="#FFFFFF" />
                <Text style={styles.modalBtnPrimaryText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
// SUBCOMPONENT
// ============================================================

function TokenCell({
  icon,
  label,
  value,
  valueTone,
}: {
  icon: string;
  label: string;
  value: string;
  valueTone?: string;
}) {
  return (
    <View style={styles.tokenCell}>
      <View style={styles.tokenCellTop}>
        <Icon name={icon} size={11} color={TEXT_SECONDARY} />
        <Text style={styles.tokenCellLabel}>{label}</Text>
      </View>
      <Text
        style={[
          styles.tokenCellValue,
          valueTone ? { color: valueTone } : null,
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  scroll: { padding: 20, paddingBottom: 60 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    marginBottom: 16,
  },
  bannerIcon: {
    width: 38,
    height: 38,
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
    fontSize: 13,
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

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  tokenCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  tokenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#D1FAE5',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  livePillText: {
    color: '#065F46',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  tokenVersion: {
    marginLeft: 'auto',
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '700',
  },
  tokenId: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontFamily: 'Courier',
    marginBottom: 14,
  },

  tokenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tokenCell: { width: '48%' },
  tokenCellTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tokenCellLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tokenCellValue: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },

  tokenActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER_COLOR,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  dangerAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerActionText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
  },

  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  emptyTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 14,
  },
  emptyMsg: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 260,
  },
  issueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  issueBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  infoPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}25`,
  },
  infoPanelText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 16,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
  },
  modalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  modalSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },
  tokenRawBox: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#0F172A',
  },
  tokenRawText: {
    color: '#E2E8F0',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
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
  modalBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});