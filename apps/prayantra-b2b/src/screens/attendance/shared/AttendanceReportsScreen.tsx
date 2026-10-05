import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput as RNTextInput,
  Share,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { Text, ActivityIndicator, Snackbar, Switch } from 'react-native-paper';

import { useRoute, RouteProp } from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { generateReport, streamEvents } from '@b2b/api-client';

import type { AttendanceSubjectType } from '@b2b/shared-types';

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

type RepRouteProp = RouteProp<
  { AttendanceReports: { subjectType: AttendanceSubjectType } },
  'AttendanceReports'
>;

type ReportFormat = 'csv' | 'json';
type StreamFormat = 'csv' | 'jsonl';

// ============================================================
// HELPERS
// ============================================================

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function rangeForDays(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { start: ymd(start), end: ymd(end) };
}

async function blobToText(blobOrText: any): Promise<string> {
  if (typeof blobOrText === 'string') return blobOrText;
  if (blobOrText && typeof blobOrText.text === 'function') {
    try {
      return await blobOrText.text();
    } catch {
      // fall through
    }
  }
  return String(blobOrText);
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceReportsScreen() {
  const route = useRoute<RepRouteProp>();
  const { subjectType } = route.params;

  const { companyId, deviceId, accessToken, locationId } = useUserAuthStore();

  const [range, setRange] = useState(rangeForDays(6));
  const [presetKey, setPresetKey] = useState<string>('7d');

  const [mode, setMode] = useState<'summary' | 'events'>('summary');
  const [format, setFormat] = useState<ReportFormat>('csv');
  const [includeEvents, setIncludeEvents] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState('');
  const [previewMeta, setPreviewMeta] = useState<{ name: string; kind: string } | null>(null);

  const [snack, setSnack] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);

  const presets = [
    { key: 'today', label: 'Today', days: 0 },
    { key: 'yesterday', label: 'Yesterday', days: 1 },
    { key: '7d', label: 'Last 7 days', days: 6 },
    { key: '30d', label: 'Last 30 days', days: 29 },
    { key: '90d', label: 'Last 90 days', days: 89 },
  ];

  const applyPreset = (days: number, key: string) => {
    setRange(rangeForDays(days));
    setPresetKey(key);
  };

  // ============================================================
  // GENERATE
  // ============================================================

  const handleGenerate = async () => {
    if (!companyId || !deviceId || !accessToken) {
      setSnack({ text: 'Session missing. Please log in again.', tone: 'err' });
      return;
    }

    setGenerating(true);
    try {
      if (mode === 'summary') {
        const blob: any = await generateReport(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          {
            type: format,
            start_date: range.start,
            end_date: range.end,
            subject_type: subjectType,
            include_events: includeEvents,
          },
        );
        const text = await blobToText(blob);
        setPreviewText(text);
        setPreviewMeta({
          name: `attendance_summary_${subjectType}_${range.start}_${range.end}.${format}`,
          kind: format === 'csv' ? 'CSV' : 'JSON',
        });
        setPreviewOpen(true);
      } else {
        // events → stream endpoint. Uses jsonl or csv.
        const streamFmt: StreamFormat = format === 'json' ? 'jsonl' : 'csv';
        const blob: any = await streamEvents(
          companyId,
          deviceId,
          accessToken,
          locationId ?? undefined,
          {
            format: streamFmt,
            start_date: range.start,
            end_date: range.end,
            subject_type: subjectType,
          },
        );
        const text = await blobToText(blob);
        setPreviewText(text);
        setPreviewMeta({
          name: `attendance_events_${subjectType}_${range.start}_${range.end}.${streamFmt}`,
          kind: streamFmt.toUpperCase(),
        });
        setPreviewOpen(true);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to generate report';
      setSnack({ text: msg, tone: 'err' });
    } finally {
      setGenerating(false);
    }
  };

  // ============================================================
  // SHARE
  // ============================================================

  const handleShare = async () => {
    if (!previewText || !previewMeta) return;
    try {
      await Share.share({
        title: previewMeta.name,
        message: previewText,
      });
    } catch (err: any) {
      setSnack({ text: 'Share cancelled', tone: 'err' });
    }
  };

  const previewLines = useMemo(() => {
    if (!previewText) return { total: 0, head: '' };
    const lines = previewText.split('\n');
    return {
      total: lines.length,
      head: lines.slice(0, 40).join('\n'),
    };
  }, [previewText]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Date range */}
        <Text style={styles.sectionLabel}>Date range</Text>
        <View style={styles.presetWrap}>
          {presets.map((p) => {
            const active = presetKey === p.key;
            return (
              <TouchableOpacity
                key={p.key}
                onPress={() => applyPreset(p.days, p.key)}
                style={[styles.presetChip, active && styles.presetChipActive]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    active && styles.presetChipTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.rangeRow}>
          <RNTextInput
            style={[styles.rangeInput, { flex: 1 }]}
            value={range.start}
            onChangeText={(v) => setRange((r) => ({ ...r, start: v }))}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
          />
          <Icon name="arrow-right" size={16} color="#94A3B8" />
          <RNTextInput
            style={[styles.rangeInput, { flex: 1 }]}
            value={range.end}
            onChangeText={(v) => setRange((r) => ({ ...r, end: v }))}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
          />
        </View>

        {/* Mode */}
        <Text style={[styles.sectionLabel, { marginTop: 26 }]}>
          Report contents
        </Text>
        <View style={styles.modeRow}>
          <ModeCard
            icon="table-large"
            title="Summaries"
            sub="Daily attendance rows"
            active={mode === 'summary'}
            onPress={() => setMode('summary')}
          />
          <ModeCard
            icon="timeline-clock-outline"
            title="Raw events"
            sub="Every punch & correction"
            active={mode === 'events'}
            onPress={() => setMode('events')}
          />
        </View>

        {/* Include events toggle — only meaningful for summary mode */}
        {mode === 'summary' && (
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Include raw events</Text>
              <Text style={styles.switchSub}>
                Append every punch to the summaries
              </Text>
            </View>
            <Switch
              value={includeEvents}
              onValueChange={setIncludeEvents}
              color={PRIMARY_COLOR}
            />
          </View>
        )}

        {/* Format */}
        <Text style={[styles.sectionLabel, { marginTop: 26 }]}>
          Format
        </Text>
        <View style={styles.formatRow}>
          <FormatChip
            label="CSV"
            icon="file-delimited-outline"
            active={format === 'csv'}
            onPress={() => setFormat('csv')}
          />
          <FormatChip
            label={mode === 'events' ? 'JSONL' : 'JSON'}
            icon="code-json"
            active={format === 'json'}
            onPress={() => setFormat('json')}
          />
        </View>

        {/* Generate */}
        <TouchableOpacity
          style={[styles.generate, generating && { opacity: 0.6 }]}
          onPress={handleGenerate}
          disabled={generating}
          activeOpacity={0.9}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="file-export-outline" size={18} color="#FFFFFF" />
              <Text style={styles.generateText}>Generate report</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.helper}>
          Reports are generated server-side. You'll be able to preview and share.
        </Text>
      </ScrollView>

      {/* Preview Modal */}
      <Modal
        visible={previewOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View style={styles.previewBackdrop}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewKind}>{previewMeta?.kind}</Text>
                <Text style={styles.previewName} numberOfLines={1}>
                  {previewMeta?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setPreviewOpen(false)}
              >
                <Icon name="close" size={16} color={TEXT_PRIMARY} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewStats}>
              <Icon name="format-list-numbered" size={14} color={TEXT_SECONDARY} />
              <Text style={styles.previewStatsText}>
                {previewLines.total} rows · showing first 40
              </Text>
            </View>

            <ScrollView style={styles.previewScroll}>
              <RNTextInput
                editable={false}
                multiline
                value={previewLines.head}
                style={styles.previewCode}
              />
            </ScrollView>

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewSecondary}
                onPress={() => setPreviewOpen(false)}
              >
                <Text style={styles.previewSecondaryText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewPrimary}
                onPress={handleShare}
              >
                <Icon name="share-variant" size={16} color="#FFFFFF" />
                <Text style={styles.previewPrimaryText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={!!snack}
        onDismiss={() => setSnack(null)}
        duration={3200}
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
// SUBCOMPONENTS
// ============================================================

function ModeCard({
  icon,
  title,
  sub,
  active,
  onPress,
}: {
  icon: string;
  title: string;
  sub: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.modeCard, active && styles.modeCardActive]}
    >
      <View
        style={[
          styles.modeIcon,
          active && { backgroundColor: PRIMARY_COLOR },
        ]}
      >
        <Icon
          name={icon}
          size={20}
          color={active ? '#FFFFFF' : PRIMARY_COLOR}
        />
      </View>
      <Text style={[styles.modeTitle, active && { color: PRIMARY_COLOR }]}>
        {title}
      </Text>
      <Text style={styles.modeSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

function FormatChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.formatChip, active && styles.formatChipActive]}
    >
      <Icon
        name={icon}
        size={16}
        color={active ? '#FFFFFF' : PRIMARY_COLOR}
      />
      <Text
        style={[styles.formatChipText, active && { color: '#FFFFFF' }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  scroll: { padding: 20, paddingBottom: 40 },

  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  presetChipActive: { backgroundColor: PRIMARY_COLOR },
  presetChipText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    fontWeight: '600',
  },
  presetChipTextActive: { color: '#FFFFFF' },

  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rangeInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    color: TEXT_PRIMARY,
    backgroundColor: '#FFFFFF',
  },

  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  modeCardActive: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: `${PRIMARY_COLOR}08`,
  },
  modeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${PRIMARY_COLOR}15`,
    marginBottom: 10,
  },
  modeTitle: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  modeSub: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 3,
    lineHeight: 14,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  switchTitle: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  switchSub: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 2,
  },

  formatRow: { flexDirection: 'row', gap: 10 },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  formatChipActive: { backgroundColor: PRIMARY_COLOR },
  formatChipText: {
    color: PRIMARY_COLOR,
    fontSize: 12,
    fontWeight: '700',
  },

  generate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: PRIMARY_COLOR,
  },
  generateText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  helper: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 14,
    lineHeight: 16,
  },

  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'flex-end',
  },
  previewCard: {
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  previewKind: {
    color: PRIMARY_COLOR,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  previewName: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  previewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  previewStatsText: {
    color: TEXT_SECONDARY,
    fontSize: 11,
  },
  previewScroll: {
    flex: 1,
    marginTop: 10,
    paddingHorizontal: 20,
  },
  previewCode: {
    fontFamily: 'Courier',
    fontSize: 11,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    minHeight: 200,
    textAlignVertical: 'top',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  previewSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  previewSecondaryText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  previewPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: PRIMARY_COLOR,
  },
  previewPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});