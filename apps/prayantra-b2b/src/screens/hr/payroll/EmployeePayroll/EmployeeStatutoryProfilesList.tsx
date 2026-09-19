import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
import { getEmployeeActiveProfiles, getProfileHistory } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EmployeeStatutoryProfiles'>;
type RouteProps = RouteProp<RootStackParamList, 'EmployeeStatutoryProfiles'>;

export default function EmployeeStatutoryProfilesList() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { userId, statutoryCode } = route.params; // statutoryCode may be undefined
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [activeProfiles, setActiveProfiles] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [asOf, setAsOf] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const fetchData = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      if (activeTab === 'active') {
        const res = await getEmployeeActiveProfiles(companyId, userId, deviceId, accessToken, {
          asOf: asOf.toISOString(),
        });
        // If statutoryCode is provided, filter by it; otherwise show all
        const filtered = statutoryCode
          ? res.data?.filter((p: any) => p.statutory_code === statutoryCode)
          : res.data;
        setActiveProfiles(filtered || []);
      } else {
        // History tab – only available if statutoryCode is provided
        if (!statutoryCode) {
          setHistory([]);
          return;
        }
        const res = await getProfileHistory(companyId, userId, statutoryCode, deviceId, accessToken);
        setHistory(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [activeTab, asOf, statutoryCode])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.code}>{item.statutory_code}</Text>
      <Text style={styles.optIn}>Opt-in: {item.opt_in ? 'Yes' : 'No'}</Text>
      <Text style={styles.effective}>
        Effective: {new Date(item.effective_from).toLocaleDateString()}
        {item.effective_to && ` → ${new Date(item.effective_to).toLocaleDateString()}`}
      </Text>
    </View>
  );

  // Determine if history tab should be shown
  const showHistoryTab = !!statutoryCode;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {statutoryCode ? `${statutoryCode} Profiles` : 'Statutory Profiles'}
        </Text>
        {activeTab === 'active' && (
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        )}
      </View>

      {showHistoryTab && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.activeTab]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={activeTab === 'active' ? activeProfiles : history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {activeTab === 'active'
                  ? 'No active profiles'
                  : 'No history records'}
              </Text>
            </View>
          }
        />
      )}

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={asOf}
        onConfirm={(date) => { setShowDatePicker(false); setAsOf(date); }}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: PRIMARY_COLOR },
  tabText: { fontSize: 14, color: TEXT_SECONDARY },
  activeTabText: { color: PRIMARY_COLOR, fontWeight: '600' },
  loader: { marginTop: 40 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  code: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  optIn: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  effective: { fontSize: 13, color: TEXT_SECONDARY },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});