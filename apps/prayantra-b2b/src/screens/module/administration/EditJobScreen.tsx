// apps/prayantra-b2b/src/screens/module/administration/EditJobScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Switch, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getJob,
  updateJob,
  deactivateJob,
  reactivateJob,
  getJobPositionCount,
  deleteJob,
} from '@b2b/api-client';
import type { Job } from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';
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
} from '../../../constants/colors';

type RouteProps = RouteProp<RootStackParamList, 'EditJob'>;
type Nav = StackNavigationProp<RootStackParamList, 'EditJob'>;

export default function EditJobScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProps>();
  const insets = useSafeAreaInsets();
  const { jobId } = route.params;

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSchedulable, setIsSchedulable] = useState(true);
  const [attendanceRequired, setAttendanceRequired] = useState(true);
  const [overtimeAllowed, setOvertimeAllowed] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // =======================================================
  // LOAD
  // =======================================================
  useEffect(() => {
    (async () => {
      if (!accessToken || !companyId || !deviceId) {
        setLoading(false);
        return;
      }
      try {
        const res = await getJob(companyId, deviceId, jobId, accessToken);
        const j = res.data;
        setJob(j);
        setTitle(j.job_title);
        setDescription(j.description ?? '');
        setIsSchedulable(j.is_schedulable);
        setAttendanceRequired(j.attendance_required);
        setOvertimeAllowed(j.overtime_allowed);
        setIsActive(j.is_active);
      } catch (e: any) {
        Alert.alert(
          'Unable to Load',
          e?.response?.data?.message || 'Failed to load job.',
          [{ text: 'Go Back', onPress: () => navigation.goBack() }],
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, companyId, deviceId, jobId, navigation]);

  // =======================================================
  // SAVE
  // =======================================================
  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Job title is required.');
      return;
    }
    try {
      setSaving(true);
      await updateJob(companyId!, deviceId!, accessToken!, jobId, {
        job_title: title.trim(),
        description: description.trim() || null,
        is_schedulable: isSchedulable,
        attendance_required: attendanceRequired,
        overtime_allowed: overtimeAllowed,
        is_active: isActive,
      });
      Alert.alert('Saved', 'Job updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert(
        'Unable to Save',
        e?.response?.data?.message || 'Failed to update job.',
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // DEACTIVATE / REACTIVATE
  // =======================================================
  const handleToggleActive = () => {
    if (!job) return;
    Alert.alert(
      isActive ? 'Deactivate job' : 'Reactivate job',
      isActive
        ? `"${job.job_title}" will be hidden from new positions.`
        : `"${job.job_title}" will be available for new positions again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isActive ? 'Deactivate' : 'Reactivate',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setBusy(true);
              if (isActive) {
                await deactivateJob(
                  companyId!,
                  deviceId!,
                  accessToken!,
                  jobId,
                );
              } else {
                await reactivateJob(
                  companyId!,
                  deviceId!,
                  accessToken!,
                  jobId,
                );
              }
              setIsActive(!isActive);
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.response?.data?.message || 'Operation failed',
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  // =======================================================
  // DELETE
  // =======================================================
  const handleDelete = async () => {
    if (!job) return;
    try {
      setBusy(true);
      const res = await getJobPositionCount(
        companyId!,
        deviceId!,
        accessToken!,
        jobId,
      );
      const count = res.data?.position_count ?? 0;

      if (count > 0) {
        Alert.alert(
          'Cannot delete',
          `This job is used by ${count} position${
            count === 1 ? '' : 's'
          }. Deactivate it instead.`,
        );
        return;
      }

      Alert.alert(
        'Delete job',
        `Permanently delete "${job.job_title}"? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteJob(
                  companyId!,
                  deviceId!,
                  accessToken!,
                  jobId,
                );
                navigation.goBack();
              } catch (e: any) {
                Alert.alert(
                  'Error',
                  e?.response?.data?.message || 'Failed to delete job',
                );
              }
            },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.response?.data?.message || 'Failed to check job usage',
      );
    } finally {
      setBusy(false);
    }
  };

  // =======================================================
  // LOADING
  // =======================================================
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingScreen}>
          <View style={styles.loadingIcon}>
            <Icon
              name="briefcase-edit-outline"
              size={28}
              color={PRIMARY_COLOR}
            />
          </View>
          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={{ marginTop: 20 }}
          />
          <Text style={styles.loadingTitle}>Loading job</Text>
          <Text style={styles.loadingSubtitle}>Please wait...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // MAIN
  // =======================================================
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Icon name="arrow-left" size={21} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Edit Job</Text>
              <Text style={styles.headerSubtitle}>
                Update this catalog entry
              </Text>
            </View>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isActive
                    ? 'rgba(34,197,94,0.25)'
                    : 'rgba(148,163,184,0.25)',
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor: isActive
                      ? '#22C55E'
                      : '#94A3B8',
                  },
                ]}
              />
              <Text style={styles.statusPillText}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* IMMUTABLE CODE */}
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyLabel}>JOB CODE</Text>
            <Text style={styles.readOnlyValue}>
              {job?.job_code ?? '—'}
            </Text>
            <Text style={styles.readOnlyHint}>
              The code is immutable. To change it, delete this job and
              create a new one.
            </Text>
          </View>

          {/* IDENTITY */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Icon
                name="information-outline"
                size={19}
                color={PRIMARY_COLOR}
              />
            </View>
            <View style={styles.sectionTextContainer}>
              <Text style={styles.sectionTitle}>Identity</Text>
              <Text style={styles.sectionSubtitle}>
                Update the display name and description
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>
                Job Title
                <Text style={styles.required}> *</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Cashier"
                placeholderTextColor="#9AA4B2"
                autoCapitalize="words"
              />
            </View>

            <View style={[styles.field, { marginBottom: 0 }]}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.optionalBadge}>OPTIONAL</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Short description of this role"
                placeholderTextColor="#9AA4B2"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* FLAGS */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View style={styles.sectionIcon}>
              <Icon
                name="tune-variant"
                size={19}
                color={PRIMARY_COLOR}
              />
            </View>
            <View style={styles.sectionTextContainer}>
              <Text style={styles.sectionTitle}>Default Behavior</Text>
              <Text style={styles.sectionSubtitle}>
                Changes here affect every position built from this job
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <SettingRow
              icon="calendar-check-outline"
              title="Schedulable"
              description="Include seats from this job in shift scheduling"
              value={isSchedulable}
              onChange={setIsSchedulable}
            />
            <View style={styles.divider} />

            <SettingRow
              icon="clock-check-outline"
              title="Attendance Required"
              description="Seats must have a work center for attendance"
              value={attendanceRequired}
              onChange={setAttendanceRequired}
            />
            <View style={styles.divider} />

            <SettingRow
              icon="clock-plus-outline"
              title="Overtime Allowed"
              description="Employees on seats from this job can log overtime"
              value={overtimeAllowed}
              onChange={setOvertimeAllowed}
            />
          </View>

          {/* STATE */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <View style={styles.sectionIcon}>
              <Icon
                name="shield-check-outline"
                size={19}
                color={PRIMARY_COLOR}
              />
            </View>
            <View style={styles.sectionTextContainer}>
              <Text style={styles.sectionTitle}>State</Text>
              <Text style={styles.sectionSubtitle}>
                Activate, deactivate, or delete
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <SettingRow
              icon="check-circle-outline"
              title="Active"
              description="Inactive jobs cannot be used for new positions"
              value={isActive}
              onChange={(v) => {
                // Toggle through the API so we surface errors consistently.
                if (v !== isActive) handleToggleActive();
              }}
            />

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.dangerRow}
              onPress={handleDelete}
              disabled={busy}
              activeOpacity={0.75}
            >
              <View style={styles.dangerIcon}>
                <Icon
                  name="delete-outline"
                  size={20}
                  color={ERROR_COLOR}
                />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.dangerTitle}>Delete job</Text>
                <Text style={styles.settingDescription}>
                  Only allowed when no positions reference this job
                </Text>
              </View>
              <Icon
                name="chevron-right"
                size={21}
                color={TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </View>

          {/* SUBMIT */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || busy}
            activeOpacity={0.85}
            style={styles.submitWrapper}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.submitButton}
            >
              {saving ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Icon
                    name="content-save-outline"
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========================================================
// Setting row
// =========================================================
function SettingRow({
  icon,
  title,
  description,
  value,
  onChange,
}: {
  icon: string;
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View
        style={[
          styles.settingIcon,
          value && styles.settingIconActive,
        ]}
      >
        <Icon
          name={icon}
          size={20}
          color={value ? PRIMARY_COLOR : '#64748B'}
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        color={PRIMARY_COLOR}
      />
    </View>
  );
}

// =========================================================
// Styles
// =========================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  header: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  headerTitleContainer: { flex: 1, marginLeft: 12 },
  headerTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '700' },
  headerSubtitle: {
    marginTop: 3,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 9,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  readOnlyBox: {
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  readOnlyLabel: {
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  readOnlyValue: {
    marginTop: 5,
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  readOnlyHint: {
    marginTop: 6,
    color: TEXT_SECONDARY,
    fontSize: 10,
    lineHeight: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  sectionTextContainer: { marginLeft: 10, flex: 1 },
  sectionTitle: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  sectionSubtitle: {
    marginTop: 3,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },

  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: '#E5EAF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 7,
    elevation: 1,
  },

  field: { marginBottom: 16 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  label: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '600' },
  required: { color: ERROR_COLOR },
  optionalBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
    color: '#64748B',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.4,
    overflow: 'hidden',
  },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    backgroundColor: CARD_BACKGROUND,
    color: TEXT_PRIMARY,
    fontSize: 14,
  },
  textarea: { minHeight: 80, textAlignVertical: 'top' },

  settingRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
  },
  settingIconActive: { backgroundColor: `${PRIMARY_COLOR}12` },
  settingContent: { flex: 1, marginLeft: 10, marginRight: 8 },
  settingTitle: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '600' },
  settingDescription: {
    marginTop: 3,
    color: TEXT_SECONDARY,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },
  divider: { height: 1, backgroundColor: '#EDF0F4' },

  dangerRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dangerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#FEF2F2',
  },
  dangerTitle: {
    color: ERROR_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },

  submitWrapper: {
    marginTop: 20,
    borderRadius: 13,
    overflow: 'hidden',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  submitButton: {
    minHeight: 55,
    paddingHorizontal: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    borderRadius: 13,
  },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingIcon: {
    width: 65,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  loadingTitle: {
    marginTop: 14,
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '700',
  },
  loadingSubtitle: {
    marginTop: 4,
    color: TEXT_SECONDARY,
    fontSize: 10,
  },
});