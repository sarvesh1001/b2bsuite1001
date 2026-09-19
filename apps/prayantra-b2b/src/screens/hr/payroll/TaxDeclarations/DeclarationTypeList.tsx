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
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { listDeclarationTypes, updateDeclarationType } from '@b2b/api-client';
import { DeclarationType } from '@b2b/shared-types';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'DeclarationTypeList'>;

export default function DeclarationTypeList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [types, setTypes] = useState<DeclarationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTypes = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await listDeclarationTypes(companyId, deviceId, accessToken);
      setTypes(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch declaration types');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTypes();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTypes();
    setRefreshing(false);
  };

  const handleToggleActive = async (type: DeclarationType) => {
    try {
      await updateDeclarationType(
        companyId!,
        type.type_code,
        deviceId!,
        accessToken!,
        { is_active: !type.is_active }
      );
      Alert.alert('Success', `Type ${type.is_active ? 'deactivated' : 'activated'}`);
      fetchTypes();
    } catch (error) {
      Alert.alert('Error', 'Failed to update type status');
    }
  };

  const renderItem = ({ item }: { item: DeclarationType }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('EditDeclarationType', { typeCode: item.type_code })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.code}>{item.type_code}</Text>
          <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
        {/* Toggle Active/Inactive button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleToggleActive(item);
          }}
          style={[
            styles.toggleButton,
            item.is_active ? styles.deactivateButton : styles.activateButton,
          ]}
        >
          <Icon
            name={item.is_active ? 'close' : 'check'}
            size={18}
            color={item.is_active ? ERROR_COLOR : SUCCESS_COLOR}
          />
          <Text
            style={[
              styles.toggleText,
              item.is_active ? styles.deactivateText : styles.activateText,
            ]}
          >
            {item.is_active ? 'Deactivate' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.description}>{item.description}</Text>
      <Text style={styles.limit}>Max Limit: {item.max_limit}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Declaration Types</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateDeclarationType')}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={types}
          keyExtractor={(item) => item.type_code}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No declaration types found</Text>
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  code: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  activeBadge: { backgroundColor: SUCCESS_COLOR + '20' },
  inactiveBadge: { backgroundColor: ERROR_COLOR + '20' },
  statusText: { fontSize: 11, fontWeight: '500' },
  description: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 4 },
  limit: { fontSize: 13, color: TEXT_PRIMARY, marginTop: 2 },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activateButton: { backgroundColor: SUCCESS_COLOR + '15' },
  deactivateButton: { backgroundColor: ERROR_COLOR + '15' },
  toggleText: { fontSize: 12, marginLeft: 4 },
  activateText: { color: SUCCESS_COLOR },
  deactivateText: { color: ERROR_COLOR },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});