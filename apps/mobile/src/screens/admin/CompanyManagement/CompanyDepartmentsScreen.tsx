// screens/admin/CompanyManagement/CompanyDepartmentsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';

import { getCompanyDepartments, CompanyDepartment } from '../../../services/admin';

export default function CompanyDepartmentsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { companyId } = route.params as { companyId: string };

  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchDepartments = async () => {
    try {
      const result = await getCompanyDepartments(companyId, 100);
      setDepartments(result.departments || []);
      setTotal(result.meta?.total || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load departments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [companyId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDepartments();
  };

  const renderItem = ({ item }: { item: CompanyDepartment }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.deptName}>
            {item.department_name}
          </Text>
          <Chip
            style={[
              styles.statusChip,
              { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' },
            ]}
            textStyle={{ color: item.is_active ? '#2E7D32' : '#C62828' }}
          >
            {item.is_active ? 'Active' : 'Inactive'}
          </Chip>
        </View>
        {item.system_department_name ? (
          <Text variant="bodySmall" style={styles.systemDept}>
            System: {item.system_department_name} ({item.module_code || 'N/A'})
          </Text>
        ) : null}
        {item.parent_department_id && (
          <Text variant="bodySmall" style={styles.parent}>
            Parent: {item.parent_department_id}
          </Text>
        )}
        <Text variant="bodySmall" style={styles.createdAt}>
          Created: {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Departments
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} departments
        </Text>
      </View>

      <FlatList
        data={departments}
        renderItem={renderItem}
        keyExtractor={(item) => item.department_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No departments found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deptName: { fontWeight: '600', color: '#1A1A1A', flex: 1 },
  statusChip: { marginLeft: 8 },
  systemDept: { color: '#666', marginTop: 4 },
  parent: { color: '#666', marginTop: 2 },
  createdAt: { color: '#888', marginTop: 2, fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});