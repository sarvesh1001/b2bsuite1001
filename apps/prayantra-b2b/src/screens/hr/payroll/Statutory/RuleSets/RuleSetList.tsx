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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { listRuleSets, activateRuleSet, deactivateRuleSet } from '@b2b/api-client';
import { RuleSet } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  SUCCESS_COLOR,
  ERROR_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'RuleSetList'>;

export default function RuleSetList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [ruleSets, setRuleSets] = useState<RuleSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await listRuleSets(companyId, deviceId, accessToken);
      setRuleSets(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch rule sets');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleActivate = async (id: string) => {
    try {
      await activateRuleSet(companyId!, id, deviceId!, accessToken!);
      Alert.alert('Success', 'Rule set activated');
      fetchData();
    } catch (error) {
      Alert.alert('Error', 'Activation failed');
    }
  };

  const handleDeactivate = async (id: string) => {
    Alert.alert(
      'Deactivate',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateRuleSet(companyId!, id, deviceId!, accessToken!);
              Alert.alert('Success', 'Deactivated');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Deactivation failed');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: RuleSet }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('RuleSetDetail', { ruleSetId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.version}>{item.version_label}</Text>
        <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <Text style={styles.country}>Country: {item.country_code}</Text>
      <Text style={styles.date}>Effective: {new Date(item.effective_from).toLocaleDateString()}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditRuleSet', { ruleSetId: item.id })}
        >
          <Icon name="pencil" size={18} color="#fff" />
        </TouchableOpacity>
        {!item.is_active ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.activateButton]}
            onPress={() => handleActivate(item.id)}
          >
            <Icon name="check" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.deactivateButton]}
            onPress={() => handleDeactivate(item.id)}
          >
            <Icon name="close" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rule Sets</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateRuleSet')}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={ruleSets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No rule sets found</Text>
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
  version: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadge: { backgroundColor: SUCCESS_COLOR + '20' },
  inactiveBadge: { backgroundColor: ERROR_COLOR + '20' },
  statusText: { fontSize: 12, fontWeight: '600' },
  country: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 4 },
  date: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: { backgroundColor: PRIMARY_COLOR },
  activateButton: { backgroundColor: SUCCESS_COLOR },
  deactivateButton: { backgroundColor: ERROR_COLOR },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});