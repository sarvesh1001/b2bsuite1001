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
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getComponentBreakdownTrend } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'ComponentBreakdownTrend'>;
type RouteProps = RouteProp<RootStackParamList, 'ComponentBreakdownTrend'>;

const screenWidth = Dimensions.get('window').width - 32;

export default function ComponentBreakdownTrend() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { componentCode } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() - 3, 1)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trendData, setTrendData] = useState<{
    labels: string[];
    data: number[];
  }>({ labels: [], data: [] });

  const fetchTrend = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getComponentBreakdownTrend(companyId, componentCode, deviceId, accessToken, {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      });
      const data = res.data;
      setTrendData({
        labels: data.labels || [],
        data: data.data || [],
      });
    } catch (error) {
      console.error('Failed to fetch component trend:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTrend();
    }, [startDate, endDate, componentCode])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTrend();
    setRefreshing(false);
  };

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`, // red for component
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: '6', strokeWidth: '2', stroke: '#ef4444' },
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Component Trend: {componentCode}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
        ) : trendData.labels.length > 0 && trendData.data.length > 0 ? (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Trend for {componentCode}</Text>
            <LineChart
              data={{
                labels: trendData.labels,
                datasets: [{ data: trendData.data }],
              }}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No trend data available</Text>
          </View>
        )}
      </ScrollView>
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
  content: { padding: 16, paddingBottom: 40 },
  loader: { marginTop: 40 },
  chartCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  chartTitle: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  chart: { marginVertical: 8, borderRadius: 12 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});