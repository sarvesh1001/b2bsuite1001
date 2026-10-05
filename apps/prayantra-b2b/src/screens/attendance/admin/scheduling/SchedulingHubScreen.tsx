import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';

import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

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
} from '../../../../constants/colors';

// ============================================================
// FEATURES
// ============================================================

const FEATURES = [
  {
    key: 'calendars',
    label: 'Work Calendars',
    sub: 'Yearly calendars with holidays',
    icon: 'calendar-star',
    screen: 'AttendanceCalendarsList',
    tone: '#3B82F6',
  },
  {
    key: 'templates',
    label: 'Shift Templates',
    sub: 'Office, shift and class schedules',
    icon: 'calendar-clock',
    screen: 'AttendanceScheduleTemplates',
    tone: '#8B5CF6',
  },
  {
    key: 'generate',
    label: 'Generate Schedule',
    sub: 'Bulk-create future instances',
    icon: 'auto-fix',
    screen: 'AttendanceBulkGenerate',
    tone: '#10B981',
  },
  {
    key: 'instances',
    label: 'Instances',
    sub: 'Browse scheduled days',
    icon: 'calendar-multiple-check',
    screen: 'AttendanceInstancesList',
    tone: '#F59E0B',
  },
  {
    key: 'overrides',
    label: 'Overrides',
    sub: 'Force work or off for a day',
    icon: 'calendar-edit',
    // ✅ was 'AttendanceOverridesList' — real route is 'AttendanceScheduleOverrides'
    screen: 'AttendanceScheduleOverrides',
    tone: '#EF4444',
  },
  {
    key: 'wc-shifts',
    label: 'Work Center Shifts',
    sub: 'Map work centers to shift templates',
    icon: 'link-variant',
    screen: 'AttendanceWorkCenterShiftMapping',
    tone: '#0EA5E9',
  },
  {
    key: 'stats',
    label: 'Schedule Stats',
    sub: 'Instances, users, coverage',
    icon: 'chart-timeline-variant',
    screen: 'AttendanceScheduleStats',
    tone: '#10B981',
  },
];

// ============================================================
// SCREEN
// ============================================================

export default function SchedulingHubScreen() {
  const navigation = useNavigation<any>();

  const renderFeature = ({
    item,
    index,
  }: {
    item: (typeof FEATURES)[number];
    index: number;
  }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => navigation.navigate(item.screen as never)}
    >
      <View style={[styles.cardAccent, { backgroundColor: item.tone }]} />
      <Text style={styles.cardNumber}>
        {String(index + 1).padStart(2, '0')}
      </Text>

      <View style={[styles.cardIcon, { backgroundColor: `${item.tone}14` }]}>
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
          <Text style={styles.heroTitle}>Scheduling</Text>
        </View>
      </View>
      <Text style={styles.heroSub}>
        Calendars, templates and bulk schedule generation
      </Text>
    </LinearGradient>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={FEATURES}
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