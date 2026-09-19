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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getEmployeeSalary } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EmployeeSalaryView'>;
type RouteProps = RouteProp<RootStackParamList, 'EmployeeSalaryView'>;

export default function EmployeeSalaryView() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [salary, setSalary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [asOf, setAsOf] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchSalary = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getEmployeeSalary(companyId, userId, deviceId, accessToken, {
        as_of: asOf.toISOString(),
      });
      setSalary(res.data);
    } catch (error) {
      console.error('Failed to fetch salary:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSalary();
    }, [asOf])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSalary();
    setRefreshing(false);
  };

  const formatDate = (date: Date) => date.toLocaleDateString();

  if (loading && !refreshing) {
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
        <Text style={styles.headerTitle}>Salary</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {salary ? (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Monthly CTC</Text>
              <Text style={styles.value}>₹{salary.monthly_ctc?.toLocaleString() || 'N/A'}</Text>
              <View style={styles.divider} />
              <Text style={styles.label}>Pay Type</Text>
              <Text style={styles.value}>{salary.pay_type || 'N/A'}</Text>
              <View style={styles.divider} />
              <Text style={styles.label}>Effective From</Text>
              <Text style={styles.value}>
                {salary.effective_from ? new Date(salary.effective_from).toLocaleDateString() : 'N/A'}
              </Text>
              {salary.effective_to && (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.label}>Effective To</Text>
                  <Text style={styles.value}>{new Date(salary.effective_to).toLocaleDateString()}</Text>
                </>
              )}
            </View>

            {salary.components && Object.keys(salary.components).length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Components</Text>
                {Object.entries(salary.components).map(([code, amount]) => (
                  <View key={code} style={styles.componentRow}>
                    <Text style={styles.componentCode}>{code}</Text>
                    <Text style={styles.componentAmount}>₹{Number(amount).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No salary data available</Text>
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={asOf}
        onConfirm={(date) => {
          setShowDatePicker(false);
          setAsOf(date);
        }}
        onCancel={() => setShowDatePicker(false)}
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
  dateButton: { padding: 4 },
  loader: { marginTop: 40 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  label: { fontSize: 13, color: TEXT_SECONDARY, marginBottom: 2 },
  value: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  divider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  componentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  componentCode: { fontSize: 14, color: TEXT_PRIMARY },
  componentAmount: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});