import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { LineChart } from 'react-native-chart-kit';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getCompanyPayrollTrend } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CompanyPayrollTrend'>;
const screenWidth = Dimensions.get('window').width - 32;

export default function CompanyPayrollTrend() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trendData, setTrendData] = useState<{
    labels: string[];
    datasets: { data: number[]; label?: string }[];
  }>({ labels: [], datasets: [] });
  const [summary, setSummary] = useState({
    totalGross: 0,
    totalNet: 0,
    totalEmployees: 0,
  });

  const fetchTrend = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getCompanyPayrollTrend(companyId, deviceId, accessToken, {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      });
      // Assuming response data structure: { labels: string[], datasets: [{ data: number[], label: string }], summary: {...} }
      const data = res.data;
      setTrendData({
        labels: data.labels || [],
        datasets: data.datasets || [],
      });
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch payroll trend:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTrend();
    }, [startDate, endDate])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrend();
    setRefreshing(false);
  };

  const formatDate = (date: Date) => date.toLocaleDateString();

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(63, 81, 181, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '2', stroke: '#3f51b5' },
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Payroll Trend</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Date Filters */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Text style={styles.filterLabel}>From:</Text>
          <Text style={styles.filterValue}>{formatDate(startDate)}</Text>
          <Icon name="calendar" size={18} color={TEXT_SECONDARY} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowEndPicker(true)}
        >
          <Text style={styles.filterLabel}>To:</Text>
          <Text style={styles.filterValue}>{formatDate(endDate)}</Text>
          <Icon name="calendar" size={18} color={TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Gross</Text>
          <Text style={styles.summaryValue}>₹{summary.totalGross.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Net</Text>
          <Text style={styles.summaryValue}>₹{summary.totalNet.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Employees</Text>
          <Text style={styles.summaryValue}>{summary.totalEmployees}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
        ) : trendData.labels.length > 0 && trendData.datasets.length > 0 ? (
          <>
            {trendData.datasets.map((dataset, index) => (
              <View key={index} style={styles.chartCard}>
                <Text style={styles.chartTitle}>{dataset.label || 'Trend'}</Text>
                <LineChart
                  data={{
                    labels: trendData.labels,
                    datasets: [{ data: dataset.data }],
                  }}
                  width={screenWidth}
                  height={200}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              </View>
            ))}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No trend data available</Text>
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        date={startDate}
        onConfirm={(date) => {
          setShowStartPicker(false);
          setStartDate(date);
        }}
        onCancel={() => setShowStartPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        date={endDate}
        onConfirm={(date) => {
          setShowEndPicker(false);
          setEndDate(date);
        }}
        onCancel={() => setShowEndPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  filterLabel: { fontSize: 13, color: TEXT_SECONDARY, marginRight: 4 },
  filterValue: { fontSize: 13, fontWeight: '500', color: TEXT_PRIMARY, marginRight: 6 },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  summaryCard: { alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: TEXT_SECONDARY },
  summaryValue: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  loader: { marginTop: 40 },
  chartCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  chartTitle: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  chart: { marginVertical: 8, borderRadius: 12 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});