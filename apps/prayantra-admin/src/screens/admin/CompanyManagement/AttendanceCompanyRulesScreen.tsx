import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  ActivityIndicator,
  Snackbar,
  Switch,
} from 'react-native-paper';

import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getCompanyRules,
  updateCompanyRules,
} from '@b2b/api-client';

import type {
  CompanyAttendanceRules,
  AttendanceSourceType,
} from '@b2b/shared-types';

import { CANONICAL_SOURCE_TYPES } from '@b2b/shared-types';

import { useAuthStore } from '../../../store/authStore';
import { TimeZonePicker } from '../../../components/TimeZonePicker';
import { isSupportedTimezone } from '../../../utils/timezone';
import { DEFAULT_TIMEZONE } from '../../../constants/timezones';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';

// ============================================================
// Route params
// ============================================================

type AttendanceRulesRouteParams = {
  companyId: string;
  companyName?: string;
};

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceCompanyRulesScreen() {
  const navigation = useNavigation<any>();
  const route =
    useRoute<RouteProp<Record<string, AttendanceRulesRouteParams>, string>>();

  const { companyId, companyName } = route.params;

  // Admin auth
  const accessToken = useAuthStore((s) => s.accessToken);
  const deviceId = useAuthStore((s) => s.deviceId);

  const [allowedSources, setAllowedSources] = useState<AttendanceSourceType[]>([
    'mobile',
    'web',
    'biometric',
  ]);
  const [allowMultipleCheckins, setAllowMultipleCheckins] = useState(false);
  const [timezone, setTimezone] = useState<string>(DEFAULT_TIMEZONE);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<{
    text: string;
    tone: 'ok' | 'err';
  } | null>(null);

  // ----------------------------------------------------------
  // Fetch
  // ----------------------------------------------------------
  const fetchRules = useCallback(async () => {
    if (!companyId || !deviceId || !accessToken) return;
    try {
      setLoading(true);
      const res: any = await getCompanyRules(companyId, deviceId, accessToken);
      const rules: CompanyAttendanceRules | null = res?.data ?? null;
      if (rules) {
        setAllowedSources(rules.allowed_source_types ?? []);
        setAllowMultipleCheckins(rules.allow_multiple_checkins ?? false);
        setTimezone(rules.timezone ?? DEFAULT_TIMEZONE);
      }
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to load company rules',
        tone: 'err',
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, deviceId, accessToken]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------
  const toggleSource = (src: AttendanceSourceType) => {
    setAllowedSources((prev) =>
      prev.includes(src) ? prev.filter((x) => x !== src) : [...prev, src],
    );
  };

  const handleSubmit = async () => {
    if (!companyId || !deviceId || !accessToken) {
      setSnack({ text: 'Session missing. Please log in again.', tone: 'err' });
      return;
    }
    if (allowedSources.length === 0) {
      setSnack({ text: 'Select at least one source', tone: 'err' });
      return;
    }
    if (!timezone.trim()) {
      setSnack({ text: 'Timezone is required', tone: 'err' });
      return;
    }
    // ── Client-side validation matching the backend.
    if (!isSupportedTimezone(timezone)) {
      setSnack({
        text: `'${timezone}' is not a valid IANA timezone`,
        tone: 'err',
      });
      return;
    }

    setSubmitting(true);
    try {
      await updateCompanyRules(
        companyId,
        deviceId,
        accessToken,
        '', // company-wide, not location-scoped
        {
          allowed_source_types: allowedSources,
          allow_multiple_checkins: allowMultipleCheckins,
          timezone: timezone.trim(),
        },
      );
      setSnack({ text: 'Company rules updated', tone: 'ok' });
      setTimeout(() => navigation.goBack(), 700);
    } catch (err: any) {
      setSnack({
        text:
          err?.response?.data?.error ||
          err?.message ||
          'Failed to update rules',
        tone: 'err',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ----------------------------------------------------------
  // Loading
  // ----------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Icon name="arrow-left" size={20} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Attendance Rules</Text>
            {companyName ? (
              <Text style={styles.headerSub} numberOfLines={1}>
                {companyName}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingText}>Loading rules…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
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
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Icon name="arrow-left" size={20} color={TEXT_PRIMARY} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Attendance Rules</Text>
              {companyName ? (
                <Text style={styles.headerSub} numberOfLines={1}>
                  {companyName}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Intro */}
          <View style={styles.intro}>
            <Icon name="information-outline" size={16} color={PRIMARY_COLOR} />
            <Text style={styles.introText}>
              These settings apply company-wide. Per-policy rules override them
              at punch time.
            </Text>
          </View>

          {/* Source types */}
          <Text style={styles.sectionLabel}>Allowed source types</Text>
          <Text style={styles.sectionHint}>
            Which channels can record attendance at all
          </Text>
          <View style={styles.chipsWrap}>
            {CANONICAL_SOURCE_TYPES.map((src) => {
              const active = allowedSources.includes(src);
              return (
                <TouchableOpacity
                  key={src}
                  onPress={() => toggleSource(src)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.85}
                >
                  <Icon
                    name={active ? 'check-circle' : 'circle-outline'}
                    size={14}
                    color={active ? '#FFFFFF' : '#94A3B8'}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      active && styles.chipTextActive,
                    ]}
                  >
                    {src}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Toggle */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Allow multiple check-ins</Text>
              <Text style={styles.toggleSub}>
                Permits more than one pair of check-in / check-out per day
              </Text>
            </View>
            <Switch
              value={allowMultipleCheckins}
              onValueChange={setAllowMultipleCheckins}
              color={PRIMARY_COLOR}
            />
          </View>

          {/* Timezone — now a shared picker */}
          <View style={{ marginTop: 24 }}>
            <TimeZonePicker
              label="Company timezone"
              hint="Fallback for any subject whose work center or location has no explicit timezone"
              value={timezone}
              onChange={setTimezone}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submit, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="content-save-outline" size={18} color="#FFFFFF" />
                <Text style={styles.submitText}>Save rules</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Snackbar */}
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
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  scroll: { padding: 20, paddingBottom: 60 },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 10 },

  // ---- Header ----
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  headerTitle: { color: TEXT_PRIMARY, fontSize: 18, fontWeight: '800' },
  headerSub: { color: TEXT_SECONDARY, fontSize: 12, marginTop: 2 },

  // ---- Intro ----
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
    fontSize: 12,
    lineHeight: 17,
  },

  // ---- Section labels ----
  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionHint: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginBottom: 12,
    lineHeight: 16,
  },

  // ---- Chips ----
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  chipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chipTextActive: { color: '#FFFFFF' },

  // ---- Toggle ----
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  toggleLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },

  // ---- Submit ----
  submit: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 32,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});