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
import { listComponentDefinitions, deleteComponentDefinition } from '@b2b/api-client';
import { ComponentDefinition } from '@b2b/shared-types';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'ComponentDefinitionList'>;

export default function ComponentDefinitionList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [definitions, setDefinitions] = useState<ComponentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await listComponentDefinitions(companyId, deviceId, accessToken);
      setDefinitions(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch component definitions');
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

  const handleDelete = (statutoryCode: string) => {
    Alert.alert(
      'Delete Definition',
      `Delete ${statutoryCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComponentDefinition(companyId!, statutoryCode, deviceId!, accessToken!);
              Alert.alert('Success', 'Deleted');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Delete failed');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: ComponentDefinition }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate('EditComponentDefinition', { statutoryCode: item.statutory_code })
      }
    >
      <View style={styles.cardHeader}>
        <Text style={styles.code}>{item.statutory_code}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.country_code}</Text>
        </View>
      </View>
      <Text style={styles.desc}>{item.description}</Text>
      <Text style={styles.meta}>
        Basis: {item.calculation_basis} | Employee: {item.has_employee ? 'Yes' : 'No'} | Employer: {item.has_employer ? 'Yes' : 'No'}
      </Text>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.statutory_code)}
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
        <Text style={styles.headerTitle}>Component Definitions</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateComponentDefinition')}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={definitions}
          keyExtractor={(item) => item.statutory_code}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No definitions found</Text>
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
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: { fontSize: 16, fontWeight: '700', color: TEXT_PRIMARY },
  badge: {
    backgroundColor: PRIMARY_COLOR + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 12, color: PRIMARY_COLOR, fontWeight: '600' },
  desc: { fontSize: 14, color: TEXT_PRIMARY, marginTop: 4 },
  meta: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 4 },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});