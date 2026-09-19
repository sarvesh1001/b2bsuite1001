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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { listDeductionLimits, deleteDeductionLimit } from '@b2b/api-client';
import { DeductionLimit } from '@b2b/shared-types';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'DeductionLimitList'>;
type RouteProps = RouteProp<RootStackParamList, 'DeductionLimitList'>;

export default function DeductionLimitList() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [limits, setLimits] = useState<DeductionLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLimits = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await listDeductionLimits(companyId, ruleSetId, deviceId, accessToken);
      setLimits(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch deduction limits');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLimits();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLimits();
    setRefreshing(false);
  };

  const handleDelete = (limitId: string) => {
    Alert.alert(
      'Delete Limit',
      'Are you sure you want to delete this deduction limit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDeductionLimit(companyId!, ruleSetId, limitId, deviceId!, accessToken!);
              Alert.alert('Success', 'Limit deleted');
              fetchLimits();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete limit');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: DeductionLimit }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EditDeductionLimit', { ruleSetId, limitId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.code}>{item.limit_code}</Text>
        <Text style={styles.value}>Limit: {item.limit_value}</Text>
      </View>
      {item.metadata && (
        <Text style={styles.meta}>Metadata: {JSON.stringify(item.metadata)}</Text>
      )}
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
        <Text style={styles.headerTitle}>Deduction Limits</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateDeductionLimit', { ruleSetId })}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={limits}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No deduction limits found</Text>
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  value: { fontSize: 14, color: TEXT_SECONDARY },
  meta: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 2 },
  deleteButton: { position: 'absolute', top: 8, right: 8, padding: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});