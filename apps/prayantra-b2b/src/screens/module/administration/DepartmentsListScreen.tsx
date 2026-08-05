// apps/prayantra-b2b/src/screens/module/administration/DepartmentsListScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card, ActivityIndicator, FAB } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { listDepartments, deleteDepartment } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Department } from '@b2b/shared-types';
import { RootStackParamList } from '../../../navigation';

import {
  PRIMARY_COLOR,
  ERROR_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  SUCCESS_COLOR,
} from '../../../constants/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'DepartmentsList'>;

export default function DepartmentsListScreen() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const fetchDepartments = async () => {
    if (!accessToken || !companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listDepartments(
        companyId,
        deviceId!,
        { page: 1, limit: 100 },
        accessToken
      );
      setDepartments(res.data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load departments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDepartments();
    }, [accessToken, companyId])
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Department',
      'Are you sure you want to delete this department?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDepartment(companyId!, deviceId!, id, accessToken!);
              fetchDepartments();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || error.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Department }) => (
    <Card style={[styles.card, { backgroundColor: CARD_BACKGROUND }]}>
      <Card.Content>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text variant="titleMedium" style={[styles.name, { color: TEXT_PRIMARY }]}>
              {item.department_name}
            </Text>
            {item.module_code && (
              <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
                Module: {item.module_code}
              </Text>
            )}
            <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
              ID: {item.department_id}
            </Text>
            <View style={styles.statusBadge}>
              <Text
                style={[
                  styles.statusText,
                  item.is_active ? styles.active : styles.inactive,
                ]}
              >
                {item.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('EditDepartment', { departmentId: item.department_id })
              }
              style={styles.actionButton}
            >
              <Icon name="pencil" size={24} color={PRIMARY_COLOR} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.department_id)}
              style={styles.actionButton}
            >
              <Icon name="delete" size={24} color={ERROR_COLOR} />
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
      <FlatList
        data={departments}
        keyExtractor={(item) => item.department_id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 80 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchDepartments} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {/* ✅ Fixed icon – removed '-off' suffix */}
            <Icon name="office-building" size={64} color="#ccc" />
            <Text variant="bodyLarge" style={{ marginTop: 8, color: TEXT_PRIMARY }}>
              No departments found
            </Text>
            <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
              Tap the + button to create one
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB
        style={[styles.fab, { bottom: 16 + insets.bottom, backgroundColor: PRIMARY_COLOR }]}
        icon="plus"
        onPress={() => navigation.navigate('CreateDepartment')}
        color="white"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  statusBadge: {
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  active: {
    color: SUCCESS_COLOR,
    backgroundColor: '#D1FAE5',
  },
  inactive: {
    color: ERROR_COLOR,
    backgroundColor: '#FEE2E2',
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  actionButton: {
    padding: 6,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
  },
});