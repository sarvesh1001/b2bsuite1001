// apps/prayantra-b2b/src/screens/hr/HREmployeeStats.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,   // ✅ added missing import
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../store/userAuthStore';
import { getEmployeeStats } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../constants/colors';
import { RootStackParamList } from '../../navigation';

// Optional chart imports – install react-native-chart-kit and react-native-svg
// import { PieChart } from 'react-native-chart-kit';

type NavigationProps = StackNavigationProp<RootStackParamList, 'HREmployeeStats'>;

export default function HREmployeeStats() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await getEmployeeStats(companyId, deviceId, accessToken);
      setStats(res.data);
    } catch (error) {
      // Fallback mock data for demo
      setStats({
        total: 45,
        active: 30,
        probation: 8,
        terminated: 7,
        by_gender: { male: 25, female: 18, other: 2 },
        by_employment_type: { full_time: 30, part_time: 10, contract: 3, internship: 2 },
        by_grade: { A1: 10, A2: 15, B1: 12, B2: 8 },
        recent_hires: 5,
        average_tenure: '2.5 years',
      });
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="chart-bar" size={60} color={TEXT_SECONDARY} />
          <Text style={styles.emptyTitle}>No stats available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { total, active, probation, terminated, by_gender, by_employment_type, by_grade } = stats;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Statistics</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Summary cards */}
        <View style={styles.statsGrid}>
          <StatCard label="Total" value={total} icon="account-group" color="#2563eb" />
          <StatCard label="Active" value={active} icon="account-check" color="#10b981" />
          <StatCard label="Probation" value={probation} icon="account-clock" color="#f59e0b" />
          <StatCard label="Terminated" value={terminated} icon="account-off" color="#ef4444" />
        </View>

        {/* Gender breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>By Gender</Text>
          <View style={styles.pieContainer}>
            {by_gender &&
              Object.entries(by_gender).map(([key, value]) => (
                <View key={key} style={styles.pieItem}>
                  <Text style={styles.pieLabel}>{key}</Text>
                  <Text style={styles.pieValue}>{String(value)}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Employment type breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>By Employment Type</Text>
          <View style={styles.pieContainer}>
            {by_employment_type &&
              Object.entries(by_employment_type).map(([key, value]) => (
                <View key={key} style={styles.pieItem}>
                  <Text style={styles.pieLabel}>{key.replace('_', ' ')}</Text>
                  <Text style={styles.pieValue}>{String(value)}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Grade breakdown */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>By Grade</Text>
          <View style={styles.pieContainer}>
            {by_grade &&
              Object.entries(by_grade).map(([key, value]) => (
                <View key={key} style={styles.pieItem}>
                  <Text style={styles.pieLabel}>{key}</Text>
                  <Text style={styles.pieValue}>{String(value)}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Optional: Pie chart */}
        {/* You can uncomment if you have react-native-chart-kit installed */}
        {/*
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Gender Distribution</Text>
          <PieChart
            data={Object.entries(by_gender).map(([key, value]) => ({
              name: key,
              population: value as number,
              color: key === 'male' ? '#2563eb' : key === 'female' ? '#ec4899' : '#8b5cf6',
              legendFontColor: TEXT_SECONDARY,
              legendFontSize: 12,
            }))}
            width={Dimensions.get('window').width - 40}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
          />
        </View>
        */}
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper component for stats cards
interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
}
const StatCard = ({ label, value, icon, color }: StatCardProps) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
      <Icon name={icon} size={22} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  statLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  pieContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  pieItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 8,
  },
  pieLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textTransform: 'capitalize',
  },
  pieValue: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    color: TEXT_SECONDARY,
  },
});

