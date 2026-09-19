import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getCompanyFineSummary } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CompanyFineSummary'>;

export default function CompanyFineSummary() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const fetchSummary = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (fromDate) params.from_date = fromDate.toISOString().split('T')[0];
      if (toDate) params.to_date = toDate.toISOString().split('T')[0];
      const res = await getCompanyFineSummary(companyId, deviceId, accessToken, params);
      setSummary(res.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
    }, [fromDate, toDate])
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
        <Text style={styles.headerTitle}>Company Fine Summary</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowFromPicker(true)}>
          <Text style={styles.dateText}>
            {fromDate ? fromDate.toLocaleDateString() : 'From'}
          </Text>
          <Icon name="calendar" size={16} color={TEXT_SECONDARY} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowToPicker(true)}>
          <Text style={styles.dateText}>
            {toDate ? toDate.toLocaleDateString() : 'To'}
          </Text>
          <Icon name="calendar" size={16} color={TEXT_SECONDARY} />
        </TouchableOpacity>
        {(fromDate || toDate) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => { setFromDate(null); setToDate(null); }}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {summary && (
          <>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Fines</Text>
              <Text style={styles.statValue}>{summary.total_fines || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Amount</Text>
              <Text style={styles.statValue}>₹{summary.total_amount || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Unprocessed Count</Text>
              <Text style={styles.statValue}>{summary.unprocessed_count || 0}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Processed Count</Text>
              <Text style={styles.statValue}>{summary.processed_count || 0}</Text>
            </View>
            {summary.by_category && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>By Category</Text>
                {Object.entries(summary.by_category).map(([category, count]) => (
                  <View key={category} style={styles.row}>
                    <Text style={styles.rowLabel}>{category}</Text>
                    <Text style={styles.rowValue}>{String(count)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={showFromPicker}
        mode="date"
        date={fromDate || new Date()}
        onConfirm={(date) => { setShowFromPicker(false); setFromDate(date); }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showToPicker}
        mode="date"
        date={toDate || new Date()}
        onConfirm={(date) => { setShowToPicker(false); setToDate(date); }}
        onCancel={() => setShowToPicker(false)}
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    alignItems: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
    marginRight: 8,
    flex: 0.4,
    justifyContent: 'space-between',
  },
  dateText: { fontSize: 13, color: TEXT_PRIMARY },
  clearButton: { paddingHorizontal: 10, paddingVertical: 6 },
  clearText: { fontSize: 13, color: PRIMARY_COLOR },
  loader: { marginTop: 40 },
  content: { padding: 16, paddingBottom: 40 },
  statCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: { fontSize: 14, color: TEXT_SECONDARY },
  statValue: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  section: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  rowLabel: { fontSize: 14, color: TEXT_SECONDARY },
  rowValue: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
});