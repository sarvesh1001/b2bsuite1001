import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';

import {
  useNavigation,
  useRoute,
  RouteProp,
} from '@react-navigation/native';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import type { AttendanceSubjectType } from '@b2b/shared-types';

import {
  PRIMARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// ============================================================
// TYPES
// ============================================================

type HubRouteProp = RouteProp<
  { AttendanceAdminHub: { subjectType: AttendanceSubjectType } },
  'AttendanceAdminHub'
>;

interface HubFeature {
  key: string;
  label: string;
  sub: string;
  icon: string;
  screen: string;
  params?: Record<string, unknown>;
  tone: string;
}

// ============================================================
// FEATURES
// ============================================================

function featuresFor(subjectType: AttendanceSubjectType): HubFeature[] {
  return [
    {
      key: 'live',
      label: 'Live Board',
      sub: 'Who is in right now',
      icon: 'account-clock',
      screen: 'TeamAttendanceDashboard',
      params: { subjectType },
      tone: '#10B981',
    },
    {
      key: 'search',
      label: 'Events',
      sub: 'Search raw punches',
      icon: 'magnify',
      screen: 'AttendanceSearch',
      params: { subjectType },
      tone: '#3B82F6',
    },
    {
      key: 'corrections',
      label: 'Corrections',
      sub: 'Fix a day',
      icon: 'file-document-edit-outline',
      screen: 'AttendanceCorrections',
      params: { subjectType },
      tone: '#F59E0B',
    },
    {
      key: 'reports',
      label: 'Reports',
      sub: 'CSV / JSON export',
      icon: 'download',
      screen: 'AttendanceReports',
      params: { subjectType },
      tone: '#8B5CF6',
    },
    {
      key: 'policies',
      label: 'Policies',
      sub: 'Grace, half-day rules',
      icon: 'shield-account-outline',
      screen: 'AttendancePoliciesList',
      tone: '#EF4444',
    },
    {
      key: 'policyAssign',
      label: 'Assign Policy',
      sub: 'Attach a policy to a subject',
      icon: 'link-variant',
      screen: 'AttendancePolicyAssign',
      tone: '#8B5CF6',
    },
    {
      key: 'rules',
      label: 'Company Rules',
      sub: 'Source types & timezone',
      icon: 'gavel',
      screen: 'AttendanceCompanyRules',
      tone: '#0EA5E9',
    },
    {
      key: 'exemptions',
      label: 'Exemptions',
      sub: 'Excuse from attendance',
      icon: 'shield-off-outline',
      screen: 'AttendanceExemptionsList',
      tone: '#6366F1',
    },
    {
      key: 'devices',
      label: 'Devices',
      sub: 'Biometric, kiosk, classroom',
      icon: 'fingerprint',
      screen: 'AttendanceDevicesList',
      tone: '#14B8A6',
    },
    // ============================================================
    // NEW — analytics + operations
    // ============================================================
    {
      key: 'companyStats',
      label: 'Company Stats',
      sub: 'Attendance across the company',
      icon: 'chart-timeline-variant',
      screen: 'AttendanceCompanyStats',
      tone: '#3B82F6',
    },
    {
      key: 'subjectStats',
      label: 'Subject Stats',
      sub: 'Per-person analytics',
      icon: 'account-chart-outline',
      screen: 'AttendanceSubjectStats',
      tone: '#10B981',
    },
    {
      key: 'resolution',
      label: 'Resolution',
      sub: 'Manual recalc triggers',
      icon: 'refresh',
      screen: 'AttendanceResolution',
      tone: '#F97316',
    },
    {
      key: 'scheduling',
      label: 'Scheduling',
      sub: 'Calendars & shift templates',
      icon: 'calendar-multiple',
      screen: 'AttendanceSchedulingHub',
      tone: '#0EA5E9',
    },
    {
      key: 'sessions',
      label: 'Sessions',
      sub: 'Class / session attendance',
      icon: 'calendar-check-outline',
      screen: 'AttendanceSessionSummaries',
      tone: '#EC4899',
    },
    // ============================================================
    // NEW — biometrics (clustered at the end with sessions)
    // ============================================================
    {
      key: 'faceEmbeddings',
      label: 'Face Embeddings',
      sub: 'Enrolled faces on file',
      icon: 'fingerprint',
      screen: 'AttendanceFaceEmbeddings',
      tone: '#8B5CF6',
    },
    {
      key: 'biometricSync',
      label: 'Biometric Sync',
      sub: 'Device sync health',
      icon: 'sync-circle',
      screen: 'AttendanceBiometricSyncStatus',
      tone: '#0EA5E9',
    },
  ];
}

// ============================================================
// SCREEN
// ============================================================

export default function AttendanceAdminHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<HubRouteProp>();
  const { subjectType } = route.params;

  const features = featuresFor(subjectType);

  const renderFeature = ({
    item,
    index,
  }: {
    item: HubFeature;
    index: number;
  }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() =>
        navigation.navigate(
          item.screen as never,
          item.params as never,
        )
      }
    >
      <View style={[styles.cardAccent, { backgroundColor: item.tone }]} />
      <Text style={styles.cardNumber}>
        {String(index + 1).padStart(2, '0')}
      </Text>

      <View
        style={[styles.cardIcon, { backgroundColor: `${item.tone}14` }]}
      >
        <Icon name={item.icon} size={24} color={item.tone} />
      </View>

      <Text style={styles.cardLabel} numberOfLines={1}>
        {item.label}
      </Text>
      <Text style={styles.cardSub} numberOfLines={2}>
        {item.sub}
      </Text>

      <View
        style={[styles.cardArrow, { backgroundColor: `${item.tone}12` }]}
      >
        <Icon name="arrow-right" size={14} color={item.tone} />
      </View>
    </TouchableOpacity>
  );

  const Header = () => (
    <LinearGradient
      colors={GRADIENT_COLORS}
      start={GRADIENT_START}
      end={GRADIENT_END}
      style={styles.hero}
    >
      <View style={styles.heroTop}>
        <TouchableOpacity
          style={styles.heroBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Icon name="arrow-left" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.heroSmall}>ATTENDANCE</Text>
          <Text style={styles.heroTitle}>Admin Hub</Text>
        </View>
      </View>
      <Text style={styles.heroSub}>
        Configure and manage {subjectType} attendance
      </Text>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={features}
        keyExtractor={(item) => item.key}
        renderItem={renderFeature}
        numColumns={2}
        ListHeaderComponent={<Header />}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  listContent: { paddingBottom: 40 },
  columnWrapper: {
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  hero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 22,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  heroBtn: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroSmall: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    marginTop: 12,
    fontWeight: '500',
  },

  card: {
    width: '48%',
    minHeight: 148,
    padding: 16,
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardNumber: {
    position: 'absolute',
    top: 14,
    right: 14,
    color: '#CBD5E1',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cardIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 14,
    paddingRight: 24,
  },
  cardSub: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    marginTop: 4,
    lineHeight: 14,
    paddingRight: 22,
  },
  cardArrow: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});