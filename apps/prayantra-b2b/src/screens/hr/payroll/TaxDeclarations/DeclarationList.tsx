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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listDeclarationsByUser, listDeclarationsByFinancialYear } from '@b2b/api-client';
import { TaxDeclaration } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  SUCCESS_COLOR,
  WARNING_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'DeclarationList'>;

export default function DeclarationList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterUserId, setFilterUserId] = useState('');
  const [filterFinancialYear, setFilterFinancialYear] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchDeclarations = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      let res;
      if (filterUserId.trim()) {
        res = await listDeclarationsByUser(companyId, filterUserId.trim(), deviceId, accessToken, {
          financial_year: filterFinancialYear.trim() || undefined,
        });
      } else {
        res = await listDeclarationsByFinancialYear(companyId, deviceId, accessToken, {
          financial_year: filterFinancialYear.trim() || undefined,
          status: filterStatus.trim() || undefined,
        });
      }
      setDeclarations(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch declarations');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDeclarations();
    }, [filterUserId, filterFinancialYear, filterStatus])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDeclarations();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return SUCCESS_COLOR;
      case 'rejected': return ERROR_COLOR;
      case 'submitted': return WARNING_COLOR;
      default: return TEXT_SECONDARY;
    }
  };

  const renderItem = ({ item }: { item: TaxDeclaration }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EditDeclaration', { declarationId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.user}>User: {item.user_id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
      <Text style={styles.type}>Type: {item.declaration_type}</Text>
      <Text style={styles.amount}>Amount: {item.amount}</Text>
      <Text style={styles.year}>Financial Year: {item.financial_year}</Text>
      <Text style={styles.meta}>Created: {new Date(item.created_at).toLocaleString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tax Declarations</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateDeclaration')}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TextInput
          style={styles.filterInput}
          placeholder="User ID (optional)"
          value={filterUserId}
          onChangeText={setFilterUserId}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Financial Year (e.g., 2025-26)"
          value={filterFinancialYear}
          onChangeText={setFilterFinancialYear}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Status (e.g., verified)"
          value={filterStatus}
          onChangeText={setFilterStatus}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={declarations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No declarations found</Text>
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
    marginBottom: 6,
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  user: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '500' },
  type: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 2 },
  year: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  meta: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});