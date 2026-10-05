import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Snackbar } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { listPolicies, assignPolicy } from '@b2b/api-client';

import type {
  AttendancePolicy,
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
    AttendancePolicyAssign: {
      policyId?: string;
      subjectType?: AttendanceSubjectType;
      subjectId?: string;
    };
  },
  'AttendancePolicyAssign'
>;

const SUBJECT_OPTIONS: AttendanceSubjectType[] = [
  'employee',
  'student',
  'customer',
];

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isDateValid(s: string): boolean {
  if (!s) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendancePolicyAssignScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteT>();
  const {
    policyId: presetPolicyId,
    subjectType: presetSubjectType,
    subjectId: presetSubjectId,
  } = route.params || {};

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  // Policy
  const [policies, setPolicies] = useState<AttendancePolicy[]>([]);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] =
    useState<AttendancePolicy | null>(null);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  // Subject
  const [subjectType, setSubjectType] = useState<AttendanceSubjectType>(
    presetSubjectType ?? 'employee',
  );
  const [subject, setSubject] = useState<{
    user_id: string;
    full_name?: string;
    username?: string;
  } | null>(presetSubjectId ? { user_id: presetSubjectId } : null);
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);

  // Dates
  const [effectiveFrom, setEffectiveFrom] = useState(ymd(new Date()));
  const [effectiveTo, setEffectiveTo] = useState('');

  // Async
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  // ============================================================
  // LOAD POLICIES
  // ============================================================

  const fetchPolicies = useCallback(async () => {
    if (!companyId || !deviceId || !accessToken) return;
    try {
      setPolicyLoading(true);
      const res: any = await listPolicies(companyId, deviceId, accessToken, {
        include_inactive: false,
      });
      const list: AttendancePolicy[] = res?.data?.policies ?? [];
      setPolicies(list);

      if (presetPolicyId) {
        const found = list.find((p) => p.policy_id === presetPolicyId);
        if (found) setSelectedPolicy(found);
      }
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to load policies',
        tone: 'err',
      });
    } finally {
      setPolicyLoading(false);
    }
  }, [companyId, deviceId, accessToken, presetPolicyId]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // ============================================================
  // VALIDATION
  // ============================================================

  const validationError = useMemo(() => {
    if (!selectedPolicy) return 'Pick a policy';
    if (!subject) return 'Pick a subject';
    if (!isDateValid(effectiveFrom))
      return 'Effective from must be YYYY-MM-DD';
    if (effectiveTo.trim() && !isDateValid(effectiveTo))
      return 'Effective to must be YYYY-MM-DD';
    if (
      effectiveTo.trim() &&
      isDateValid(effectiveFrom) &&
      isDateValid(effectiveTo) &&
      effectiveTo.trim() < effectiveFrom
    ) {
      return 'Effective to cannot be before effective from';
    }
    return null;
  }, [selectedPolicy, subject, effectiveFrom, effectiveTo]);

  const canSubmit = !validationError && !submitting;

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async () => {
    if (!companyId || !deviceId || !accessToken) {
      setSnack({ text: 'Session missing. Please log in again.', tone: 'err' });
      return;
    }
    if (validationError) {
      setSnack({ text: validationError, tone: 'err' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        policy_id: selectedPolicy!.policy_id,
        subject_type: subjectType,
        subject_id: subject!.user_id,
        effective_from: effectiveFrom,
        effective_to: effectiveTo.trim() || null,
      };

      const res: any = await assignPolicy(
        companyId,
        deviceId,
        accessToken,
        locationId ?? '',
        payload,
      );

      const msg = res?.data?.message ?? res?.message ?? 'Policy assigned';
      setSnack({ text: msg, tone: 'ok' });
      setTimeout(() => navigation.goBack(), 900);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to assign policy',
        tone: 'err',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <View style={styles.intro}>
            <Icon name="information-outline" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.introText}>
              Assigning a policy overrides any work-center or position policy
              for the subject, effective from the date you set.
            </Text>
          </View>

          {/* Policy */}
          <Text style={styles.sectionLabel}>Policy</Text>
          {policyLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={PRIMARY_COLOR} />
            </View>
          ) : selectedPolicy ? (
            <View style={styles.selectedCard}>
              <View style={styles.policyIconWrap}>
                <Icon
                  name="shield-account-outline"
                  size={20}
                  color={PRIMARY_COLOR}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.policyCode} numberOfLines={1}>
                  {selectedPolicy.policy_code}
                </Text>
                <Text style={styles.policyType} numberOfLines={1}>
                  {selectedPolicy.policy_type}
                  {selectedPolicy.work_center_code
                    ? ` · ${selectedPolicy.work_center_code}`
                    : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => setPolicyModalOpen(true)}
              >
                <Icon name="pencil" size={13} color={PRIMARY_COLOR} />
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : policies.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="shield-off-outline" size={26} color="#94A3B8" />
              <Text style={styles.emptyText}>
                No active policies. Create one first.
              </Text>
              <TouchableOpacity
                style={styles.emptyAction}
                onPress={() => navigation.navigate('AttendancePolicyForm', {})}
              >
                <Icon name="plus" size={14} color="#FFFFFF" />
                <Text style={styles.emptyActionText}>Create policy</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickBtn}
              onPress={() => setPolicyModalOpen(true)}
              activeOpacity={0.85}
            >
              <Icon
                name="shield-search"
                size={18}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.pickBtnText}>Pick a policy</Text>
              <Icon name="chevron-right" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          )}

          {/* Subject */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Subject type
          </Text>
          <View style={styles.typeGrid}>
            {SUBJECT_OPTIONS.map((t) => {
              const active = subjectType === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                  onPress={() => {
                    setSubjectType(t);
                    if (!presetSubjectId) setSubject(null);
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

          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Subject
          </Text>
          {subject ? (
            <View style={styles.subjectRow}>
              <UserAvatar
                userId={subject.user_id}
                username={subject.username}
                fullName={subject.full_name}
                size={40}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectName} numberOfLines={1}>
                  {subject.full_name ||
                    subject.username ||
                    subject.user_id}
                </Text>
                <Text style={styles.subjectSub} numberOfLines={1}>
                  {subject.user_id}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => setSubjectPickerOpen(true)}
              >
                <Icon name="pencil" size={13} color={PRIMARY_COLOR} />
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.pickBtn}
              onPress={() => setSubjectPickerOpen(true)}
              activeOpacity={0.85}
            >
              <Icon
                name="account-search-outline"
                size={20}
                color={PRIMARY_COLOR}
              />
              <Text style={styles.pickBtnText}>Pick {subjectType}</Text>
              <Icon name="chevron-right" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          )}

          {/* Effective dates */}
          <Text style={[styles.sectionLabel, { marginTop: 22 }]}>
            Effective period
          </Text>
          <View style={styles.dateRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateFieldLabel}>From</Text>
              <TextInput
                style={styles.input}
                value={effectiveFrom}
                onChangeText={setEffectiveFrom}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateFieldLabel}>To (optional)</Text>
              <TextInput
                style={styles.input}
                value={effectiveTo}
                onChangeText={setEffectiveTo}
                placeholder="Open-ended"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          </View>
          <View style={styles.quickDates}>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => setEffectiveFrom(ymd(new Date()))}
            >
              <Text style={styles.quickChipText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                const d = new Date();
                d.setDate(d.getDate() + 1);
                setEffectiveFrom(ymd(d));
              }}
            >
              <Text style={styles.quickChipText}>Tomorrow</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickChip}
              onPress={() => {
                setEffectiveTo('');
              }}
            >
              <Text style={styles.quickChipText}>Clear end</Text>
            </TouchableOpacity>
          </View>

          {/* Preview */}
          {selectedPolicy && subject ? (
            <View style={styles.previewCard}>
              <Icon name="check-circle-outline" size={16} color="#10B981" />
              <Text style={styles.previewText}>
                Assign{' '}
                <Text style={styles.previewStrong}>
                  {selectedPolicy.policy_code}
                </Text>{' '}
                to{' '}
                <Text style={styles.previewStrong}>
                  {subject.full_name ||
                    subject.username ||
                    subject.user_id.slice(0, 8)}
                </Text>{' '}
                starting{' '}
                <Text style={styles.previewStrong}>{effectiveFrom}</Text>
                {effectiveTo.trim()
                  ? ` until ${effectiveTo.trim()}`
                  : ' (open-ended)'}
                .
              </Text>
            </View>
          ) : null}

          {/* Validation */}
          {validationError ? (
            <View style={styles.validation}>
              <Icon name="alert-circle-outline" size={14} color="#B45309" />
              <Text style={styles.validationText}>{validationError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submit, !canSubmit && { opacity: 0.5 }]}
            onPress={handleSubmit}
            disabled={!canSubmit}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="link-variant" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Assign policy</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Policy picker modal */}
      <PolicyPickerModal
        visible={policyModalOpen}
        policies={policies}
        onClose={() => setPolicyModalOpen(false)}
        onSelect={(p) => {
          setSelectedPolicy(p);
          setPolicyModalOpen(false);
        }}
      />

      {/* Subject picker */}
      <SubjectPickerSheet
        visible={subjectPickerOpen}
        subjectType={subjectType}
        title={`Pick ${subjectType}`}
        onClose={() => setSubjectPickerOpen(false)}
        onSelect={(p: PickedSubject) => {
          setSubject({
            user_id: p.user_id,
            full_name: p.full_name,
            username: p.username,
          });
          setSubjectPickerOpen(false);
        }}
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
// POLICY PICKER MODAL
// ============================================================

function PolicyPickerModal({
  visible,
  policies,
  onClose,
  onSelect,
}: {
  visible: boolean;
  policies: AttendancePolicy[];
  onClose: () => void;
  onSelect: (p: AttendancePolicy) => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <SafeAreaView style={styles.modalCard} edges={['bottom']}>
          <View style={styles.modalGrabber} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pick a policy</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={16} color={TEXT_PRIMARY} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            {policies.length === 0 ? (
              <View style={styles.emptyModal}>
                <Icon name="shield-off-outline" size={26} color="#94A3B8" />
                <Text style={styles.emptyModalText}>No active policies.</Text>
              </View>
            ) : (
              policies.map((p) => (
                <TouchableOpacity
                  key={p.policy_id}
                  style={styles.modalRow}
                  activeOpacity={0.85}
                  onPress={() => onSelect(p)}
                >
                  <View style={styles.modalIcon}>
                    <Icon
                      name="shield-account-outline"
                      size={18}
                      color={PRIMARY_COLOR}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowTitle} numberOfLines={1}>
                      {p.policy_code}
                    </Text>
                    <Text style={styles.modalRowSub} numberOfLines={1}>
                      {p.policy_type}
                      {p.work_center_code
                        ? ` · ${p.work_center_code}`
                        : ''}
                    </Text>
                  </View>
                  <Icon name="chevron-right" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  scroll: { padding: 20, paddingBottom: 60 },

  intro: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}25`,
    marginBottom: 22,
  },
  introText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 11,
    lineHeight: 16,
  },

  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  loadingBox: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },

  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  policyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  policyCode: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '800',
  },
  policyType: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
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
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}40`,
  },
  pickBtnText: {
    flex: 1,
    color: PRIMARY_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },

  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  emptyText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  subjectName: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  subjectSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
  },

  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateFieldLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#FFFFFF',
  },
  quickDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  quickChipText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '700',
  },

  previewCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
  },
  previewText: {
    flex: 1,
    color: '#065F46',
    fontSize: 12,
    lineHeight: 18,
  },
  previewStrong: {
    fontWeight: '800',
  },

  validation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
  },
  validationText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },

  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  // ---- Modal ----
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalGrabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
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
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  modalIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  modalRowTitle: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  modalRowSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  emptyModal: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyModalText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginTop: 8,
  },
});