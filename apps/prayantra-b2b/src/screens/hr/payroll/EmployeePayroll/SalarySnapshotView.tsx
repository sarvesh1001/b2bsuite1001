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
import { getSalarySnapshot } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'SalarySnapshotView'>;
type RouteProps = RouteProp<RootStackParamList, 'SalarySnapshotView'>;

export default function SalarySnapshotView() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [asOf, setAsOf] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchSnapshot = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getSalarySnapshot(companyId, userId, deviceId, accessToken, {
        as_of: asOf.toISOString(),
      });
      setSnapshot(res.data);
    } catch (error) {
      console.error('Failed to fetch snapshot:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSnapshot();
    }, [asOf])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSnapshot();
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
        <Text style={styles.headerTitle}>Salary Snapshot</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {snapshot ? (
          <View style={styles.card}>
            <Text style={styles.asOfLabel}>As of {asOf.toLocaleDateString()}</Text>
            <View style={styles.divider} />
            {Object.entries(snapshot).map(([key, value]) => (
              <View key={key} style={styles.row}>
                <Text style={styles.key}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.value}>
                  {typeof value === 'number' ? `₹${value.toLocaleString()}` : String(value)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No snapshot available</Text>
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
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  asOfLabel: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  divider: { height: 1, backgroundColor: BORDER_COLOR, marginVertical: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  key: { fontSize: 14, color: TEXT_SECONDARY, flex: 1 },
  value: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});