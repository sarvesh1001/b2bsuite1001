// apps/mobile/src/screens/admin/CompanyManagement/CompanyDepartmentsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  ActivityIndicator,
  Card,
  Chip,
  FAB,
  Portal,
  Provider as PaperProvider,
  TextInput,
  Button,
  Modal, // ✅ import Modal from react-native-paper
} from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getCompanyDepartments,
  CompanyDepartment,
  addCompanyDepartment,
  softDeleteDepartment,
  activateDepartment,
} from '../../../services/admin';

export default function CompanyDepartmentsScreen() {
  const route = useRoute();
  const { companyId } = route.params as { companyId: string };

  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  // Modal state for adding department
  const [modalVisible, setModalVisible] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  // --- Department Actions ---

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) {
      Alert.alert('Error', 'Department name is required');
      return;
    }
    setSubmitting(true);
    try {
      await addCompanyDepartment(companyId, {
        department_name: newDeptName.trim(),
        // system_department_id can be omitted to create a custom department
      });
      Alert.alert('Success', 'Department added');
      setModalVisible(false);
      setNewDeptName('');
      fetchDepartments();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: CompanyDepartment) => {
    try {
      if (item.is_active) {
        // Soft-delete (mark inactive)
        await softDeleteDepartment(companyId, item.department_id);
        Alert.alert('Success', 'Department deactivated');
      } else {
        // Activate
        await activateDepartment(companyId, item.department_id);
        Alert.alert('Success', 'Department activated');
      }
      fetchDepartments();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Action failed');
    }
  };

  const handleSoftDelete = async (item: CompanyDepartment) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to soft-delete "${item.department_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await softDeleteDepartment(companyId, item.department_id);
              Alert.alert('Success', 'Department soft-deleted');
              fetchDepartments();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Delete failed');
            }
          },
        },
      ]
    );
  };

  // --- Render ---

  const renderItem = ({ item }: { item: CompanyDepartment }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.deptName}>
            {item.department_name}
          </Text>
          <View style={styles.actionIcons}>
            <Chip
              style={[
                styles.statusChip,
                { backgroundColor: item.is_active ? '#E8F5E9' : '#FFEBEE' },
              ]}
              textStyle={{ color: item.is_active ? '#2E7D32' : '#C62828' }}
            >
              {item.is_active ? 'Active' : 'Inactive'}
            </Chip>
            <TouchableOpacity
              onPress={() => handleToggleActive(item)}
              style={styles.iconButton}
            >
              <Icon
                name={item.is_active ? 'eye-off' : 'eye'}
                size={20}
                color="#7B2FBE"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSoftDelete(item)}
              style={styles.iconButton}
            >
              <Icon name="delete" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
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
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <PaperProvider>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
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
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#7B2FBE']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No departments found
              </Text>
            </View>
          }
        />

        {/* FAB to add department */}
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => setModalVisible(true)}
          color="white"
          theme={{ colors: { primary: '#7B2FBE' } }}
        />

        {/* ✅ Corrected Modal – wrap content in a View */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
          >
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Add Department</Text>
              <TextInput
                mode="outlined"
                label="Department Name"
                value={newDeptName}
                onChangeText={setNewDeptName}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalCancelButton}
                  labelStyle={{ color: '#666' }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleAddDepartment}
                  loading={submitting}
                  disabled={submitting}
                  style={styles.modalSaveButton}
                  theme={{ colors: { primary: '#7B2FBE' } }}
                >
                  Add
                </Button>
              </View>
            </View>
          </Modal>
        </Portal>
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 }, // extra bottom for FAB
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deptName: {
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    marginRight: 8,
  },
  iconButton: {
    padding: 4,
    marginLeft: 4,
  },
  systemDept: { color: '#666', marginTop: 4 },
  parent: { color: '#666', marginTop: 2 },
  createdAt: { color: '#888', marginTop: 2, fontSize: 12 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: { color: '#999' },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#7B2FBE',
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 24,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalCancelButton: {
    marginRight: 8,
    borderColor: '#ccc',
  },
  modalSaveButton: {
    backgroundColor: '#7B2FBE',
  },
});