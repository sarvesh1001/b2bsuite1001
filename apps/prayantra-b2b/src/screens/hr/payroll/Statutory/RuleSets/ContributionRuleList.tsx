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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { listContributionRules, deleteContributionRule } from '@b2b/api-client';
import { ContributionRule } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'ContributionRuleList'>;
type RouteProps = RouteProp<RootStackParamList, 'ContributionRuleList'>;

export default function ContributionRuleList() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [rules, setRules] = useState<ContributionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatutoryCode, setFilterStatutoryCode] = useState('');

  const fetchRules = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatutoryCode) params.statutory_code = filterStatutoryCode;
      const res = await listContributionRules(companyId, ruleSetId, deviceId, accessToken, params);
      setRules(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch contribution rules');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchRules();
    }, [filterStatutoryCode])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRules();
    setRefreshing(false);
  };

  const handleDelete = (ruleId: string) => {
    Alert.alert(
      'Delete Rule',
      'Are you sure you want to delete this contribution rule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteContributionRule(companyId!, ruleSetId, ruleId, deviceId!, accessToken!);
              Alert.alert('Success', 'Rule deleted');
              fetchRules();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete rule');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ContributionRule }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('EditContributionRule', { ruleSetId, ruleId: item.id })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.code}>{item.statutory_code}</Text>
        <Text style={[styles.side, item.contribution_side === 'employee' ? styles.employee : styles.employer]}>
          {item.contribution_side}
        </Text>
      </View>
      <Text style={styles.type}>{item.calculation_type} - {item.rate_value}{item.calculation_type === 'percentage' ? '%' : ''}</Text>
      {item.wage_ceiling && <Text style={styles.ceiling}>Wage Ceiling: {item.wage_ceiling}</Text>}
      <Text style={styles.effective}>Effective: {new Date(item.effective_from).toLocaleDateString()}</Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          e.stopPropagation();
          handleDelete(item.id);
        }}
      >
        <Icon name="delete" size={20} color={ERROR_COLOR} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contribution Rules</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateContributionRule', { ruleSetId })}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by Statutory Code"
          value={filterStatutoryCode}
          onChangeText={setFilterStatutoryCode}
        />
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
              <Text style={styles.emptyText}>No contribution rules found</Text>
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
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
  },
  loader: { marginTop: 40 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  side: { fontSize: 12, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  employee: { backgroundColor: '#E3F2FD', color: '#1976D2' },
  employer: { backgroundColor: '#FCE4EC', color: '#C62828' },
  type: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  ceiling: { fontSize: 13, color: TEXT_SECONDARY },
  effective: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  deleteButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});