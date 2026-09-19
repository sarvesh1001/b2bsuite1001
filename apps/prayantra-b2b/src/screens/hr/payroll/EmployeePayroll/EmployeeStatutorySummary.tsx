import React, { useState, useCallback } from 'react';
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
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getEmployeeStatutorySummary } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EmployeeStatutorySummary'>;
type RouteProps = RouteProp<RootStackParamList, 'EmployeeStatutorySummary'>;

export default function EmployeeStatutorySummary() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [financialYearStart, setFinancialYearStart] = useState(
    new Date(new Date().getFullYear(), 3, 1)
  );

  const fetchSummary = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getEmployeeStatutorySummary(companyId, userId, deviceId, accessToken, {
        financial_year_start: financialYearStart.toISOString(),
      });
      setSummary(res.data);
    } catch (error) {
      console.error('Failed to fetch statutory summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [financialYearStart])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statutory Summary</Text>
        <Text style={styles.fyLabel}>
          FY {financialYearStart.getFullYear()}-{financialYearStart.getFullYear() + 1}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {summary ? (
          <View style={styles.card}>
            {Object.entries(summary).map(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                return (
                  <View key={key} style={styles.section}>
                    <Text style={styles.sectionTitle}>{key.toUpperCase()}</Text>
                    {Object.entries(value).map(([k, v]) => (
                      <View key={k} style={styles.row}>
                        <Text style={styles.key}>{k}</Text>
                        <Text style={styles.value}>
                          {typeof v === 'number' ? `₹${v.toLocaleString()}` : String(v)}
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              }
              return (
                <View key={key} style={styles.row}>
                  <Text style={styles.key}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                  <Text style={styles.value}>
                    {typeof value === 'number' ? `₹${value.toLocaleString()}` : String(value)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No statutory summary available</Text>
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
  fyLabel: { fontSize: 12, color: TEXT_SECONDARY },
  loader: { marginTop: 40 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  key: { fontSize: 13, color: TEXT_SECONDARY, flex: 1 },
  value: { fontSize: 13, fontWeight: '500', color: TEXT_PRIMARY },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});