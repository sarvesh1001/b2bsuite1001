// apps/prayantra-b2b/src/screens/module/administration/CreateJobScreen.tsx

import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { createJob } from '@b2b/api-client';
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

type Nav = StackNavigationProp<RootStackParamList, 'CreateJob'>;

// Derives an uppercase A-Z/0-9/_ code from the title. Empty input → ''.
const slugify = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');

export default function CreateJobScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [codeEdited, setCodeEdited] = useState(false);
  const [description, setDescription] = useState('');
  const [isSchedulable, setIsSchedulable] = useState(true);
  const [attendanceRequired, setAttendanceRequired] = useState(true);
  const [overtimeAllowed, setOvertimeAllowed] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectiveCode = codeEdited ? code : slugify(title);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Job title is required.');
      return;
    }

    if (effectiveCode && !/^[A-Z][A-Z0-9_]{0,49}$/.test(effectiveCode)) {
      Alert.alert(
        'Validation',
        'Job code must start with a letter and use only A–Z, 0–9, and _ (max 50 chars).',
      );
      return;
    }

    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Session information missing. Please log in again.');
      return;
    }

    try {
      setSaving(true);
      await createJob(companyId, deviceId, accessToken, {
        job_title: title.trim(),
        job_code: effectiveCode || undefined,
        description: description.trim() || undefined,
        is_schedulable: isSchedulable,
        attendance_required: attendanceRequired,
        overtime_allowed: overtimeAllowed,
      });

      Alert.alert(
        'Job Created',
        `"${title.trim()}" has been added to your job catalog.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }],
      );
    } catch (e: any) {
      Alert.alert(
        'Unable to Create Job',
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          e?.message ||
          'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  };

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
              <Text style={styles.headerTitle}>New Job</Text>
              <Text style={styles.headerSubtitle}>
                Add a role to the job catalog
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Icon
                name="briefcase-plus-outline"
                size={22}
                color="#FFFFFF"
              />
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
                Name and code for this job
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

            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Job Code</Text>
                <Text style={styles.optionalBadge}>OPTIONAL</Text>
              </View>
              <TextInput
                style={styles.input}
                value={code}
                onChangeText={(t) => {
                  setCode(t.toUpperCase());
                  setCodeEdited(true);
                }}
                placeholder="Auto-generated from title"
                placeholderTextColor="#9AA4B2"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                Will be saved as:{' '}
                <Text style={styles.helperTextEmphasis}>
                  {effectiveCode || '—'}
                </Text>
              </Text>
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
                These flags apply to every seat built from this job
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

          {/* INFO */}
          <View style={styles.infoBox}>
            <Icon
              name="information-outline"
              size={18}
              color={PRIMARY_COLOR}
            />
            <Text style={styles.infoText}>
              You can change these later. Editing them affects every
              position built from this job.
            </Text>
          </View>

          {/* SUBMIT */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
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
                  <Text style={styles.submitText}>Creating Job...</Text>
                </>
              ) : (
                <>
                  <Icon
                    name="plus-circle-outline"
                    size={21}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitText}>Create Job</Text>
                  <Icon
                    name="arrow-right"
                    size={19}
                    color="rgba(255,255,255,0.75)"
                  />
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
  headerIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

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
  label: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '600',
  },
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
  helperText: {
    marginTop: 5,
    color: TEXT_SECONDARY,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },
  helperTextEmphasis: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

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
  settingIconActive: {
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  settingContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  settingTitle: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  settingDescription: {
    marginTop: 3,
    color: TEXT_SECONDARY,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: '500',
  },
  divider: { height: 1, backgroundColor: '#EDF0F4' },

  infoBox: {
    marginTop: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 11,
    backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1,
    borderColor: `${PRIMARY_COLOR}18`,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#64748B',
    fontSize: 9,
    lineHeight: 14,
    fontWeight: '500',
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
  submitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});