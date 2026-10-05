// apps/prayantra-b2b/src/screens/hr/HREmployeeDetail.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useUserAuthStore } from '../../store/userAuthStore';
import {
  getEmployeeDetailsByIDs,
  updateUserPhone,
} from '@b2b/api-client';
import type { DecryptedEmployeeDetails } from '@b2b/shared-types';
import { UserAvatar } from '../../components/UserAvatar';

// 👇 NEW — lifecycle status card + action sheet + hook
import {
  LifecycleStatusCard,
  LifecycleAction,
} from '../../components/LifecycleStatusCard';
import { LifecycleActionSheet } from '../../components/LifecycleActionSheet';
import { useEmployeeLifecycle } from '../../hooks/useEmployeeLifecycle';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../constants/colors';
import { RootStackParamList } from '../../navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'HREmployeeDetail'>;
type DetailRouteProp = RouteProp<RootStackParamList, 'HREmployeeDetail'>;

const TAG = '[HREmployeeDetail]';
const log = (...args: any[]) => console.log(TAG, ...args);
const logWarn = (...args: any[]) => console.warn(TAG, ...args);
const logErr = (...args: any[]) => console.error(TAG, ...args);

// ---------- helpers ----------
const fmtDate = (v?: string | null) => {
  if (!v) return '—';
  try {
    const d = new Date(v);
    if (isNaN(d.getTime())) return v;
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return v;
  }
};

const val = (v?: string | null) => (v && String(v).trim() ? String(v) : '—');

/**
 * Strips everything except digits and a leading `+` so the value can be
 * safely embedded in a tel:/sms: URI. Spaces, dashes, parens, dots are
 * removed — the dialer handles them fine, but cleaner is safer.
 */
const toDialableNumber = (raw: string): string => {
  const trimmed = raw.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^\d]/g, '');
  return hasLeadingPlus ? `+${digits}` : digits;
};

const InfoRow = ({
  icon,
  label,
  value,
  mono,
  onEdit,
  onValuePress,
}: {
  icon: string;
  label: string;
  value: string;
  mono?: boolean;
  /** When present, shows a small pencil button on the right that
   *  invokes this handler. Used for the editable Phone row. */
  onEdit?: () => void;
  /** When present, the value itself becomes tappable (e.g. to open a
   *  Call / Message action sheet). Pencil and value handlers are
   *  independent. */
  onValuePress?: () => void;
}) => {
  const valueNode = (
    <Text style={[styles.rowValue, mono && styles.rowValueMono]} numberOfLines={2}>
      {value}
    </Text>
  );

  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon name={icon} size={16} color={PRIMARY_COLOR} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {onValuePress ? (
          <TouchableOpacity
            onPress={onValuePress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value}`}
          >
            {valueNode}
          </TouchableOpacity>
        ) : (
          valueNode
        )}
      </View>
      {onEdit && (
        <TouchableOpacity
          style={styles.rowEditBtn}
          onPress={onEdit}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={`Edit ${label}`}
        >
          <Icon name="pencil-outline" size={15} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const Section = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Icon name={icon} size={16} color={TEXT_PRIMARY} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

export default function HREmployeeDetail() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DetailRouteProp>();
  const { userId } = route.params;

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [data, setData] = useState<DecryptedEmployeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- phone-edit modal state ----
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  // ---- phone-actions (call / message) sheet ----
  const [phoneActionsVisible, setPhoneActionsVisible] = useState(false);

  // ---- lifecycle state ----
  const lifecycle = useEmployeeLifecycle(
    data?.employee_profile_id ?? undefined,
    userId,
  );
  const [lifecycleSheet, setLifecycleSheet] = useState<LifecycleAction | null>(null);
  const [lifecycleSubmitting, setLifecycleSubmitting] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) {
      logWarn('fetch skipped — missing auth context');
      setError('Missing authentication');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      log('── fetchDetail ──', { userId, companyId });
      const res = await getEmployeeDetailsByIDs(companyId, deviceId, accessToken, {
        user_ids: [userId],
      });
      const first = (res as any)?.data?.[0] ?? null;
      log('detail hydrated:', { userId, found: !!first });
      setData(first);
      if (!first) setError('Employee not found in your scope');
    } catch (err: any) {
      logErr('getEmployeeDetailsByIDs FAILED:', err);
      setError(
        err?.response?.data?.error || err?.message || 'Failed to load employee details',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail]),
  );

  // ---- phone edit handlers ----
  const openPhoneEditor = useCallback(() => {
    if (!data) return;
    setPhoneDraft((data as any).phone_number ?? '');
    setPhoneModalVisible(true);
  }, [data]);

  const savePhone = useCallback(async () => {
    const next = phoneDraft.trim().replace(/\s/g, '');
    const current = (data as any)?.phone_number ?? '';

    if (!next) {
      Alert.alert('Phone Required', 'Please enter a phone number.');
      return;
    }
    if (next === current) {
      setPhoneModalVisible(false);
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Authentication Error', 'Session info missing. Log in again.');
      return;
    }

    setSavingPhone(true);
    log('submitting phone update', { userId, next });
    try {
      await updateUserPhone(companyId, userId, next, deviceId, accessToken);
      log('phone updated');
      setPhoneModalVisible(false);
      await fetchDetail();
      Alert.alert('Saved', 'Phone number updated.');
    } catch (err: any) {
      logErr('updateUserPhone failed', err);
      Alert.alert(
        'Unable to Update',
        err?.userMessage ||
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Something went wrong.',
      );
    } finally {
      setSavingPhone(false);
    }
  }, [phoneDraft, data, accessToken, companyId, deviceId, userId, fetchDetail]);

  // ---- phone actions (call / message) ----
  const phoneRaw = (data as any)?.phone_number ?? '';
  const phoneDialable = phoneRaw ? toDialableNumber(phoneRaw) : '';
  const hasCallable = !!phoneDialable;

  const openPhoneActions = useCallback(() => {
    if (!hasCallable) {
      Alert.alert('No phone number', 'This employee has no phone number on file.');
      return;
    }
    setPhoneActionsVisible(true);
  }, [hasCallable]);

  const performCall = useCallback(async () => {
    setPhoneActionsVisible(false);
    const url = `tel:${phoneDialable}`;
    log('opening dialer', url);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Cannot Call', 'This device cannot place phone calls.');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      logErr('tel: failed', err);
      Alert.alert('Cannot Call', 'Something went wrong opening the dialer.');
    }
  }, [phoneDialable]);

  const performMessage = useCallback(async () => {
    setPhoneActionsVisible(false);
    const url = `sms:${phoneDialable}`;
    log('opening messages', url);
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Cannot Message', 'This device cannot send text messages.');
        return;
      }
      await Linking.openURL(url);
    } catch (err) {
      logErr('sms: failed', err);
      Alert.alert('Cannot Message', 'Something went wrong opening Messages.');
    }
  }, [phoneDialable]);

  const performCopyNumber = useCallback(async () => {
    setPhoneActionsVisible(false);
    // Copy-to-clipboard is optional — no extra dep here, but you can add
    // @react-native-clipboard/clipboard if you want a proper "copied" toast.
    // Placeholder: show the number in an Alert so it's easy to copy manually.
    Alert.alert('Phone Number', phoneRaw, [{ text: 'OK' }]);
  }, [phoneRaw]);

  // ---- lifecycle action handlers ----

  const handleLifecycleAction = useCallback((action: LifecycleAction) => {
    setLifecycleSheet(action);
  }, []);

  const handleLifecycleSubmit = useCallback(
    async (payload: any) => {
      setLifecycleSubmitting(true);
      try {
        switch (lifecycleSheet) {
          case 'confirm_probation':
            await lifecycle.confirm(payload);
            break;
          case 'fail_probation':
            await lifecycle.fail(payload);
            break;
          case 'extend_probation':
            await lifecycle.extend(payload);
            break;
          case 'start_notice':
            await lifecycle.noticeStart(payload);
            break;
          case 'cancel_notice':
            await lifecycle.noticeCancel(payload);
            break;
          case 'start_on_hold':
            await lifecycle.onHoldStart(payload);
            break;
          case 'end_on_hold':
            await lifecycle.onHoldEnd();
            break;
        }
        setLifecycleSheet(null);
        // Also refetch the base detail so hero card status pill updates too.
        fetchDetail();
      } catch (err: any) {
        // The sheet itself surfaces the error via the catch in handleSubmit;
        // but we re-throw so it knows not to close.
        throw err;
      } finally {
        setLifecycleSubmitting(false);
      }
    },
    [lifecycleSheet, lifecycle, fetchDetail],
  );

  // ---------- loading ----------
  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  // ---------- error ----------
  if (error || !data) {
    return (
      <SafeAreaView style={styles.center}>
        <Icon name="alert-circle-outline" size={44} color="#ef4444" />
        <Text style={styles.errorTitle}>{error || 'Not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchDetail}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const displayName = data.full_name || data.username || 'Unnamed Employee';
  const statusColor =
    data.employment_status === 'active'
      ? '#10b981'
      : data.employment_status === 'probation' || data.employment_status === 'notice'
      ? '#f59e0b'
      : data.employment_status === 'terminated'
      ? '#ef4444'
      : '#64748b';

  const costCenterDisplay =
    (data as any).cost_center_name ||
    (data as any).cost_center ||
    (data as any).cost_center_code ||
    '—';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Details</Text>

        <TouchableOpacity
          style={styles.editHeaderBtn}
          onPress={() =>
            navigation.navigate('HREmployeeForm', {
              employeeId: data.user_id,
            })
          }
        >
          <Icon name="pencil" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ---------- Hero card ---------- */}
        <View style={styles.hero}>
          <UserAvatar
            userId={data.user_id}
            username={data.username}
            fullName={data.full_name ?? undefined}
            size={76}
          />
          <Text style={styles.heroName}>{displayName}</Text>
          <Text style={styles.heroSub}>@{val(data.username)}</Text>

          <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {(data.employment_status || 'unknown').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ==========================================================
            LIFECYCLE STATUS CARD
            ----------------------------------------------------------
            Shows the current lifecycle phase (probation / notice /
            on-hold / active / terminated) with the relevant action
            buttons. Reads from /status-now which is location-scoped
            via X-Location-ID (attached by the axios interceptor).
        ========================================================== */}
        <LifecycleStatusCard
          status={lifecycle.status}
          loading={lifecycle.isLoading}
          onAction={handleLifecycleAction}
        />

        {/* ---------- Contact ---------- */}
        <Section title="Contact" icon="card-account-phone-outline">
          {/* Phone — tap value to call/message, tap pencil to edit */}
          <InfoRow
            icon="phone-outline"
            label="Phone"
            value={val(data.phone_number)}
            onValuePress={hasCallable ? openPhoneActions : undefined}
            onEdit={openPhoneEditor}
          />
          <InfoRow icon="email-outline" label="Email" value={val(data.email)} />
        </Section>

        {/* ---------- Employment ---------- */}
        <Section title="Employment" icon="briefcase-outline">
          <InfoRow icon="badge-account-outline" label="Employee ID" value={val(data.employee_id)} mono />
          <InfoRow icon="account-tie-outline" label="Role" value={val(data.role_name)} />
          <InfoRow icon="account-hard-hat" label="Position" value={val(data.position_title)} />
          <InfoRow icon="office-building-outline" label="Department" value={val(data.department_name)} />
          <InfoRow icon="map-marker-outline" label="Primary Location" value={val(data.primary_location_name)} />
          <InfoRow icon="shield-account-outline" label="Location Scope" value={val(data.location_access_scope)} />
          <InfoRow icon="calendar-check-outline" label="Hire Date" value={fmtDate(data.hire_date)} />
          <InfoRow icon="calendar-account-outline" label="Employment Type" value={val(data.employment_type)} />
          <InfoRow icon="calendar-clock-outline" label="Probation Ends" value={fmtDate((data as any).probation_end_date)} />
        </Section>

        {/* ---------- Personal ---------- */}
        <Section title="Personal" icon="account-outline">
          <InfoRow icon="cake-variant-outline" label="Date of Birth" value={fmtDate(data.date_of_birth)} />
          <InfoRow icon="gender-male-female" label="Gender" value={val(data.gender)} />
          <InfoRow icon="heart-outline" label="Marital Status" value={val(data.marital_status)} />
          <InfoRow icon="flag-outline" label="Nationality" value={val(data.nationality)} />
          <InfoRow icon="identifier" label="Tax ID" value={val(data.tax_id)} mono />
          <InfoRow
            icon="shield-key-outline"
            label="Social Security ID"
            value={val(data.social_security_id)}
            mono
          />
        </Section>

        {/* ---------- Organisation ---------- */}
        <Section title="Organisation" icon="sitemap-outline">
          <InfoRow icon="account-supervisor-outline" label="Reports To" value={val(data.reports_to)} mono />
          <InfoRow icon="medal-outline" label="Grade" value={val(data.grade)} />
          <InfoRow icon="currency-usd" label="Cost Center" value={val(costCenterDisplay)} />
        </Section>

        {/* ---------- Meta ---------- */}
        <Section title="Record" icon="information-outline">
          <InfoRow icon="identifier" label="User ID" value={data.user_id} mono />
          <InfoRow icon="identifier" label="Profile ID" value={val(data.employee_profile_id)} mono />
          <InfoRow icon="calendar-plus" label="Joined (user)" value={fmtDate(data.user_created_at)} />
          <InfoRow icon="calendar-edit" label="Profile Updated" value={fmtDate(data.profile_updated_at)} />
          <InfoRow icon="login-variant" label="Last Login" value={fmtDate(data.user_last_login)} />
        </Section>
      </ScrollView>

      {/* ============================================================
          LIFECYCLE ACTION SHEET
          ------------------------------------------------------------
          One modal that adapts to whichever action the user tapped
          on the LifecycleStatusCard. Validates fields, submits via
          useEmployeeLifecycle, and closes on success. The card's
          actions invalidate ['reminderFeed'] + ['reminderCounts']
          so the HR bell badge updates without a manual refresh.
      ============================================================ */}
      <LifecycleActionSheet
        visible={lifecycleSheet !== null}
        action={lifecycleSheet}
        submitting={lifecycleSubmitting}
        onClose={() => !lifecycleSubmitting && setLifecycleSheet(null)}
        onSubmit={handleLifecycleSubmit}
      />

      {/* ============================================================
          PHONE ACTIONS (CALL / MESSAGE) — small bottom sheet
      ============================================================ */}
      <Modal
        visible={phoneActionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhoneActionsVisible(false)}
      >
        <Pressable
          style={styles.actionsOverlay}
          onPress={() => setPhoneActionsVisible(false)}
        >
          <Pressable style={styles.actionsSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.actionsHandle} />

            {/* Header: who + which number */}
            <View style={styles.actionsHeader}>
              <Text style={styles.actionsTitle}>{displayName}</Text>
              <Text style={styles.actionsNumber}>{phoneRaw}</Text>
            </View>

            {/* Call */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={performCall}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Call"
            >
              <View style={[styles.actionIcon, { backgroundColor: '#DCFCE7' }]}>
                <Icon name="phone" size={19} color="#16A34A" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Call</Text>
                <Text style={styles.actionHint}>Open dialer with this number</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#B4BCC8" />
            </TouchableOpacity>

            {/* Message */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={performMessage}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <View style={[styles.actionIcon, { backgroundColor: '#DBEAFE' }]}>
                <Icon name="message-text-outline" size={19} color="#2563EB" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Send Message</Text>
                <Text style={styles.actionHint}>Open Messages with this number</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#B4BCC8" />
            </TouchableOpacity>

            {/* Show number (light-weight “copy” affordance) */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={performCopyNumber}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Show number"
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F1F5F9' }]}>
                <Icon name="content-copy" size={19} color="#475569" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionLabel}>Copy Number</Text>
                <Text style={styles.actionHint}>Show the number to copy manually</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#B4BCC8" />
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              style={styles.actionsCancel}
              onPress={() => setPhoneActionsVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.actionsCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ============================================================
          PHONE EDIT MODAL
      ============================================================ */}
      <Modal
        visible={phoneModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !savingPhone && setPhoneModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%' }}
          >
            <Pressable
              style={styles.modalSheet}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <View style={styles.modalTitleIcon}>
                    <Icon name="phone-outline" size={20} color={PRIMARY_COLOR} />
                  </View>
                  <View>
                    <Text style={styles.modalTitle}>Update Phone</Text>
                    <Text style={styles.modalSubtitle}>{displayName}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => !savingPhone && setPhoneModalVisible(false)}
                >
                  <Icon name="close" size={20} color={TEXT_SECONDARY} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWrap}>
                  <Icon name="phone-outline" size={18} color={PRIMARY_COLOR} />
                  <RNTextInput
                    value={phoneDraft}
                    onChangeText={setPhoneDraft}
                    placeholder="Enter phone number"
                    placeholderTextColor="#A0A8B5"
                    keyboardType="phone-pad"
                    style={styles.inputField}
                    autoFocus
                    editable={!savingPhone}
                  />
                </View>
                <Text style={styles.inputHint}>
                  Digits only. Country code optional but recommended.
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                  onPress={() => !savingPhone && setPhoneModalVisible(false)}
                  activeOpacity={0.85}
                  disabled={savingPhone}
                >
                  <Text style={styles.modalBtnGhostText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  onPress={savePhone}
                  activeOpacity={0.85}
                  disabled={savingPhone}
                >
                  {savingPhone ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name="content-save-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.modalBtnPrimaryText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// =========================================================
// STYLES
// =========================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
    paddingHorizontal: 24,
  },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
  errorTitle: {
    marginTop: 10,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  backLink: { marginTop: 12, color: PRIMARY_COLOR, fontWeight: '600' },

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
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  editHeaderBtn: {
    backgroundColor: PRIMARY_COLOR,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: 16, paddingBottom: 40 },

  hero: {
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  heroName: { marginTop: 12, fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY },
  heroSub: { marginTop: 3, fontSize: 13, color: TEXT_SECONDARY },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginTop: 10,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  statusPillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },

  section: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  sectionTitle: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    letterSpacing: 0.2,
  },
  sectionBody: { paddingHorizontal: 14, paddingVertical: 6 },

  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 9 },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${PRIMARY_COLOR}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 10,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  rowValue: {
    marginTop: 2,
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  rowValueMono: { fontFamily: 'monospace', fontSize: 12 },
  rowEditBtn: {
    marginLeft: 8,
    marginTop: 4,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },

  // =======================================================
  // PHONE ACTIONS SHEET (Call / Message / Copy)
  // =======================================================
  actionsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.48)',
  },
  actionsSheet: {
    width: '100%',
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 22,
  },
  actionsHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 3,
    backgroundColor: '#D8DEE6',
  },
  actionsHeader: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  actionsTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  actionsNumber: {
    marginTop: 3,
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  actionRow: {
    minHeight: 62,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  actionText: { flex: 1, marginLeft: 12 },
  actionLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  actionHint: {
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '500',
  },
  actionsCancel: {
    marginTop: 6,
    marginHorizontal: 16,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  actionsCancelText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },

  // =======================================================
  // PHONE EDIT MODAL
  // =======================================================
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.48)',
  },
  modalSheet: {
    width: '100%',
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 3,
    backgroundColor: '#D8DEE6',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  modalTitleIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  modalTitle: {
    marginLeft: 10,
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  modalSubtitle: {
    marginLeft: 10,
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '500',
  },
  modalClose: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F1F3F6',
  },
  modalBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  inputLabel: {
    color: TEXT_PRIMARY,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputWrap: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  inputField: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '500',
  },
  inputHint: {
    marginTop: 6,
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalBtn: {
    flex: 1,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
  },
  modalBtnGhost: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
  },
  modalBtnGhostText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  modalBtnPrimary: {
    backgroundColor: PRIMARY_COLOR,
  },
  modalBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});