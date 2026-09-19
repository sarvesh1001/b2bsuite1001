import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getAttendanceRules, activateAttendanceRule, deactivateAttendanceRule } from '@b2b/api-client';
import { AttendanceRule } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  SUCCESS_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'AttendanceRuleList'>;

export default function AttendanceRuleList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [rules, setRules] = useState<AttendanceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  const fetchRules = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (filterType) params.rule_type = filterType;
      if (showActiveOnly) params.is_active = true;
      const res = await getAttendanceRules(companyId, deviceId, accessToken, params);
      setRules(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch attendance rules');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRules();
    }, [filterType, showActiveOnly])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRules();
    setRefreshing(false);
  };

  const handleToggleActive = async (rule: AttendanceRule) => {
    try {
      if (rule.is_active) {
        await deactivateAttendanceRule(companyId!, rule.id, deviceId!, accessToken!);
      } else {
        await activateAttendanceRule(companyId!, rule.id, deviceId!, accessToken!);
      }
      Alert.alert('Success', `Rule ${rule.is_active ? 'deactivated' : 'activated'}`);
      fetchRules();
    } catch (error) {
      Alert.alert('Error', 'Failed to update rule status');
    }
  };

  const renderItem = ({ item }: { item: AttendanceRule }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('EditAttendanceRule', { ruleId: item.id })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.ruleType}>{item.rule_type}</Text>
        <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <Text style={styles.detail}>
        {item.calculation_type} - {item.value}
        {item.calculation_type === 'percentage' ? '%' : ''}
        {item.based_on && ` (based on ${item.based_on})`}
      </Text>
      {item.threshold_minutes !== undefined && (
        <Text style={styles.detail}>Threshold: {item.threshold_minutes} min</Text>
      )}
      <Text style={styles.detail}>Component: {item.component_code}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, item.is_active ? styles.deactivateButton : styles.activateButton]}
          onPress={() => handleToggleActive(item)}
        >
          <Icon
            name={item.is_active ? 'close' : 'check'}
            size={16}
            color={item.is_active ? ERROR_COLOR : SUCCESS_COLOR}
          />
          <Text style={[styles.actionText, item.is_active ? styles.deactivateText : styles.activateText]}>
            {item.is_active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
        {/* Delete button removed – use deactivation instead */}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Rules</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateAttendanceRule')}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by rule type"
          value={filterType}
          onChangeText={setFilterType}
        />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active only</Text>
          <Switch
            value={showActiveOnly}
            onValueChange={setShowActiveOnly}
            trackColor={{ false: '#767577', true: PRIMARY_COLOR }}
          />
        </View>
        <TouchableOpacity
          style={styles.bulkButton}
          onPress={() => navigation.navigate('BulkDeactivateRules')}
        >
          <Icon name="playlist-remove" size={20} color={ERROR_COLOR} />
          <Text style={styles.bulkText}>Bulk Deactivate</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={rules}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No attendance rules found</Text>
            </View>
          }
        />
      )}
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
  addButton: { padding: 4 },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  switchLabel: { fontSize: 13, color: TEXT_SECONDARY },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: ERROR_COLOR,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bulkText: { fontSize: 13, color: ERROR_COLOR, marginLeft: 4 },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ruleType: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  activeBadge: { backgroundColor: SUCCESS_COLOR + '20' },
  inactiveBadge: { backgroundColor: ERROR_COLOR + '20' },
  statusText: { fontSize: 11, fontWeight: '600' },
  detail: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activateButton: { backgroundColor: SUCCESS_COLOR + '15' },
  deactivateButton: { backgroundColor: ERROR_COLOR + '15' },
  actionText: { fontSize: 12, marginLeft: 4 },
  activateText: { color: SUCCESS_COLOR },
  deactivateText: { color: ERROR_COLOR },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});