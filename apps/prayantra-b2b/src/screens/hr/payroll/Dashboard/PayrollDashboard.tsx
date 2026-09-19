import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'PayrollDashboard'>;

// Quick action item – only screens that don't require params
interface QuickAction {
  icon: string;
  label: string;
  screen: keyof RootStackParamList; // will be cast to any later
}

const quickActions: QuickAction[] = [
  { icon: 'lock', label: 'Locks', screen: 'LockList' },
  { icon: 'cash-multiple', label: 'Adjustments', screen: 'AdjustmentList' },
  { icon: 'cash', label: 'Payroll Runs', screen: 'PayrollRunList' },
  { icon: 'file-document', label: 'Structures', screen: 'StructureList' },
  { icon: 'file-document-edit', label: 'Attendance Rules', screen: 'AttendanceRuleList' },
  { icon: 'format-list-bulleted', label: 'Components', screen: 'ComponentList' },
];

export default function PayrollDashboard() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalRuns: 0,
    pendingAdjustments: 0,
    activeLoans: 0,
  });

  const fetchStats = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      // In a real app, you'd call a stats endpoint, but we can mock for now
      setStats({
        totalEmployees: 45,
        totalRuns: 3,
        pendingAdjustments: 7,
        activeLoans: 12,
      });
    } catch (error) {
      console.error('Failed to fetch payroll stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payroll</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CompanyPayrollTrend')}>
          <Icon name="chart-line" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
        ) : (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard
                title="Employees"
                value={stats.totalEmployees}
                icon="account-group"
                color="#4CAF50"
              />
              <StatCard
                title="Payroll Runs"
                value={stats.totalRuns}
                icon="calendar-check"
                color="#2196F3"
              />
              <StatCard
                title="Pending Adjustments"
                value={stats.pendingAdjustments}
                icon="alert-circle"
                color="#FF9800"
              />
              <StatCard
                title="Active Loans"
                value={stats.activeLoans}
                icon="handshake"
                color="#9C27B0"
              />
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.screen}
                  style={styles.actionCard}
                  onPress={() => navigation.navigate(action.screen as any)} // all these screens have no params
                >
                  <View style={styles.actionIcon}>
                    <Icon name={action.icon} size={28} color={PRIMARY_COLOR} />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Activity / Upcoming */}
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityCard}>
              <Text style={styles.activityText}>No recent activity</Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loader: {
    marginTop: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  statTitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 16,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '30%',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PRIMARY_COLOR + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  activityText: {
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
});