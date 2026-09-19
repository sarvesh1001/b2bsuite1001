// apps/prayantra-b2b/src/screens/module/administration/EmployeeLocationAccessScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listLocations,
  getEmployeeLocations,
  setEmployeeLocations,
} from '@b2b/api-client';
import type {
  AccessibleLocation,
  LocationAccessScope,
  LocationAccessLevel,
} from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';
import {
  BACKGROUND_COLOR, CARD_BACKGROUND, PRIMARY_COLOR,
  TEXT_PRIMARY, TEXT_SECONDARY, ERROR_COLOR,
  GRADIENT_COLORS, GRADIENT_START, GRADIENT_END,
} from '../../../constants/colors';

type Nav = StackNavigationProp<RootStackParamList, 'EmployeeLocationAccess'>;
type Rt = RouteProp<RootStackParamList, 'EmployeeLocationAccess'>;

const SCOPES: { value: LocationAccessScope; label: string; desc: string }[] = [
  { value: 'PRIMARY',  label: 'Primary only', desc: 'Access limited to the primary location.' },
  { value: 'SELECTED', label: 'Selected',     desc: 'Pick specific locations with per-location access.' },
  { value: 'ALL',      label: 'All',          desc: 'Access every active location in the company.' },
];

// Only VIEW and MANAGE are supported now.
const LEVELS: LocationAccessLevel[] = ['VIEW', 'MANAGE'];

const LEVEL_LABELS: Record<string, string> = {
  VIEW: 'View',
  MANAGE: 'Manage',
};

export default function EmployeeLocationAccessScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { employeeUserId, employeeName } = route.params;

  const { companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [locations, setLocations] = useState<AccessibleLocation[]>([]);
  const [scope, setScope] = useState<LocationAccessScope>('PRIMARY');
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [selected, setSelected] = useState<
    Record<string, LocationAccessLevel>
  >({});

  // =======================================================
  // LOAD
  // =======================================================
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        setLoading(true);
        const [locRes, empRes] = await Promise.all([
          listLocations(companyId, 1, 100),
          getEmployeeLocations(companyId, employeeUserId),
        ]);

        const list: AccessibleLocation[] =
          locRes?.locations ?? locRes?.data?.locations ?? [];
        setLocations(list);

        const emp = empRes?.data ?? empRes;
        setPrimaryId(emp?.primary_location_id ?? null);
        setScope(emp?.location_access_scope ?? 'PRIMARY');

        // employee location entries may come as `selected_locations` or `locations`
        const sel = emp?.selected_locations ?? emp?.locations ?? [];
        const map: Record<string, LocationAccessLevel> = {};
        (Array.isArray(sel) ? sel : []).forEach((s: any) => {
          const id = s.location_id ?? s.id;
          if (!id) return;
          // Coerce any legacy 'ADMIN' value down to 'MANAGE'.
          const raw = (s.access_level ?? 'VIEW') as string;
          const level: LocationAccessLevel =
            raw === 'ADMIN' ? 'MANAGE' : (raw as LocationAccessLevel);
          map[id] = LEVELS.includes(level) ? level : 'VIEW';
        });
        setSelected(map);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Could not load location access.');
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, employeeUserId]);

  // =======================================================
  // ACTIONS
  // =======================================================
  const toggleSelected = (locId: string) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[locId]) delete next[locId];
      else next[locId] = 'VIEW';
      return next;
    });
  };

  const cycleLevel = (locId: string) => {
    setSelected(prev => {
      const current = prev[locId] ?? 'VIEW';
      const idx = LEVELS.indexOf(current);
      const nextLevel = LEVELS[(idx + 1) % LEVELS.length];
      return { ...prev, [locId]: nextLevel };
    });
  };

  const handleSave = async () => {
    if (!companyId) return;
    if (scope === 'SELECTED' && Object.keys(selected).length === 0) {
      Alert.alert('Select at least one location', 'Or change scope.');
      return;
    }
    if (!primaryId) {
      Alert.alert('Pick a primary location');
      return;
    }

    try {
      setSaving(true);
      const key = `emp-loc-${employeeUserId}-${Date.now()}`;
      await setEmployeeLocations(
        companyId,
        employeeUserId,
        {
          primary_location_id: primaryId,
          location_access_scope: scope,
          selected_locations:
            scope === 'SELECTED'
              ? Object.entries(selected).map(([location_id, access_level]) => ({
                  location_id,
                  access_level,
                }))
              : undefined,
        },
        key
      );
      Alert.alert('Saved', 'Location access updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert(
        'Unable to save',
        e?.response?.data?.message || e?.message || 'Try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // RENDER
  // =======================================================
  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingTitle}>Loading access</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
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
          >
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerIcon}>
            <Icon name="account-marker-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Location Access</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {employeeName || employeeUserId}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ---------- SCOPE ---------- */}
        <SectionHeader
          icon="shield-account-outline"
          title="Access Scope"
          subtitle="How much of the company this employee can see"
        />
        <View style={styles.scopeCard}>
          {SCOPES.map((s, i) => {
            const active = scope === s.value;
            return (
              <TouchableOpacity
                key={s.value}
                activeOpacity={0.8}
                style={[
                  styles.scopeRow,
                  i !== SCOPES.length - 1 && styles.rowDivider,
                ]}
                onPress={() => setScope(s.value)}
              >
                <View
                  style={[
                    styles.scopeIcon,
                    active && { backgroundColor: `${PRIMARY_COLOR}18` },
                  ]}
                >
                  <Icon
                    name={
                      s.value === 'PRIMARY'
                        ? 'home-circle-outline'
                        : s.value === 'SELECTED'
                        ? 'checkbox-multiple-marked-outline'
                        : 'earth'
                    }
                    size={20}
                    color={active ? PRIMARY_COLOR : '#7D8794'}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 11 }}>
                  <Text
                    style={[
                      styles.scopeTitle,
                      active && { color: PRIMARY_COLOR },
                    ]}
                  >
                    {s.label}
                  </Text>
                  <Text style={styles.scopeDesc}>{s.desc}</Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    active && styles.radioOn,
                  ]}
                >
                  {active && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ---------- PRIMARY ---------- */}
        <SectionHeader
          icon="star-outline"
          title="Primary Location"
          subtitle="Where the employee is based"
        />
        <View style={styles.listCard}>
          {locations.map((loc, i) => {
            const active = primaryId === loc.location_id;
            return (
              <TouchableOpacity
                key={loc.location_id}
                activeOpacity={0.8}
                style={[
                  styles.row,
                  i !== locations.length - 1 && styles.rowDivider,
                ]}
                onPress={() => setPrimaryId(loc.location_id)}
              >
                <View style={[styles.dot, active && styles.dotOn]}>
                  {active && <View style={styles.dotInner} />}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.rowTitle}>{loc.location_name}</Text>
                  <Text style={styles.rowSub}>
                    {loc.location_code}
                    {loc.city ? ` • ${loc.city}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ---------- SELECTED LEVELS ---------- */}
        {scope === 'SELECTED' && (
          <>
            <SectionHeader
              icon="checkbox-multiple-marked-outline"
              title="Selected Locations"
              subtitle="Tap to enable, tap level to cycle access"
            />
            <View style={styles.listCard}>
              {locations.map((loc, i) => {
                const level = selected[loc.location_id];
                const active = !!level;
                return (
                  <View
                    key={loc.location_id}
                    style={[
                      styles.row,
                      i !== locations.length - 1 && styles.rowDivider,
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => toggleSelected(loc.location_id)}
                      style={[
                        styles.checkbox,
                        active && styles.checkboxOn,
                      ]}
                    >
                      {active && (
                        <Icon name="check" size={14} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => toggleSelected(loc.location_id)}
                      style={{ flex: 1, marginLeft: 10 }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rowTitle}>{loc.location_name}</Text>
                      <Text style={styles.rowSub}>{loc.location_code}</Text>
                    </TouchableOpacity>
                    {active && (
                      <TouchableOpacity
                        style={styles.levelBtn}
                        onPress={() => cycleLevel(loc.location_id)}
                      >
                        <Text style={styles.levelText}>
                          {LEVEL_LABELS[level] ?? level}
                        </Text>
                        <Icon
                          name="chevron-down"
                          size={14}
                          color={PRIMARY_COLOR}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ---------- SAVE ---------- */}
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
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="content-save-outline" size={20} color="#FFFFFF" />
                <Text style={styles.submitText}>Save Access</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- helpers ----------
function SectionHeader({
  icon, title, subtitle,
}: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <Icon name={icon} size={19} color={PRIMARY_COLOR} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  header: {
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  headerIcon: {
    width: 40, height: 40, marginLeft: 10, alignItems: 'center',
    justifyContent: 'center', borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerText: { marginLeft: 11, flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { marginTop: 2, color: 'rgba(255,255,255,0.7)', fontSize: 10 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 45 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 20, marginBottom: 11,
  },
  sectionHeaderIcon: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: `${PRIMARY_COLOR}10`,
  },
  sectionHeaderText: { marginLeft: 10, flex: 1 },
  sectionHeaderTitle: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },
  sectionHeaderSubtitle: { marginTop: 2, color: TEXT_SECONDARY, fontSize: 9 },

  scopeCard: {
    borderRadius: 15, backgroundColor: CARD_BACKGROUND,
    borderWidth: 1, borderColor: '#E5EAF0', overflow: 'hidden',
  },
  listCard: {
    borderRadius: 15, backgroundColor: CARD_BACKGROUND,
    borderWidth: 1, borderColor: '#E5EAF0', overflow: 'hidden',
  },
  scopeRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: '#EDF0F4' },
  scopeIcon: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: '#F3F5F8',
  },
  scopeTitle: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '700' },
  scopeDesc: { marginTop: 2, color: TEXT_SECONDARY, fontSize: 10, lineHeight: 14 },

  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: PRIMARY_COLOR },
  radioDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: PRIMARY_COLOR,
  },

  dot: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  dotOn: { borderColor: PRIMARY_COLOR },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY_COLOR },

  rowTitle: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '600' },
  rowSub: { marginTop: 3, color: TEXT_SECONDARY, fontSize: 10 },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#CBD5E1',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { borderColor: PRIMARY_COLOR, backgroundColor: PRIMARY_COLOR },

  levelBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  levelText: { color: PRIMARY_COLOR, fontSize: 10, fontWeight: '800' },

  submitWrapper: {
    marginTop: 24, borderRadius: 14, overflow: 'hidden',
    shadowColor: PRIMARY_COLOR, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  submitButton: {
    minHeight: 54, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 9,
  },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { marginTop: 13, color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
});