// apps/mobile/src/screens/admin/CompanyManagement/CompanyDepartmentsScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
  Modal,
  SegmentedButtons,
  Searchbar,
} from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getCompanyDepartments,
  CompanyDepartment,
  addCompanyDepartment,
  softDeleteDepartment,
  activateDepartment,
  getSystemDepartments,
  getDeactivatedDepartments,
  SystemDepartment,
} from '../../../services/admin';

export default function CompanyDepartmentsScreen() {
  const route = useRoute();
  const { companyId } = route.params as { companyId: string };

  // Active departments
  const [departments, setDepartments] = useState<CompanyDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);

  // Inactive departments
  const [showInactive, setShowInactive] = useState(false);
  const [inactiveDepartments, setInactiveDepartments] = useState<CompanyDepartment[]>([]);
  const [loadingInactive, setLoadingInactive] = useState(false);

  // Add modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSystemDeptId, setSelectedSystemDeptId] = useState<string | null>(null);
  const [newDeptName, setNewDeptName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // System departments
  const [systemDepartments, setSystemDepartments] = useState<SystemDepartment[]>([]);
  const [loadingSystemDepts, setLoadingSystemDepts] = useState(true);

  // Filtered system depts based on search
  const filteredSystemDepts = useMemo(() => {
    if (!searchQuery.trim()) return systemDepartments;
    const q = searchQuery.toLowerCase();
    return systemDepartments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.module_code.toLowerCase().includes(q)
    );
  }, [systemDepartments, searchQuery]);

  // Fetch active departments
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

  // Fetch inactive departments
  const fetchInactiveDepartments = async () => {
    setLoadingInactive(true);
    try {
      const data = await getDeactivatedDepartments(companyId);
      setInactiveDepartments(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load inactive departments');
    } finally {
      setLoadingInactive(false);
    }
  };

  // Fetch system departments
  const fetchSystemDepartments = async () => {
    setLoadingSystemDepts(true);
    try {
      const data = await getSystemDepartments();
      setSystemDepartments(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load system departments');
    } finally {
      setLoadingSystemDepts(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchSystemDepartments();
  }, [companyId]);

  useEffect(() => {
    if (showInactive) {
      fetchInactiveDepartments();
    }
  }, [showInactive]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDepartments();
    if (showInactive) fetchInactiveDepartments();
  };

  // --- Department Actions ---

  const handleAddDepartment = async () => {
    if (!selectedSystemDeptId) {
      Alert.alert('Error', 'Please select a system department.');
      return;
    }
    if (!newDeptName.trim()) {
      Alert.alert('Error', 'Please enter a department name.');
      return;
    }

    setSubmitting(true);
    try {
      await addCompanyDepartment(companyId, {
        system_department_id: selectedSystemDeptId,
        department_name: newDeptName.trim(),
      });
      Alert.alert('Success', 'Department added');
      // Reset and close
      setModalVisible(false);
      setSelectedSystemDeptId(null);
      setNewDeptName('');
      setSearchQuery('');
      fetchDepartments();
      if (showInactive) fetchInactiveDepartments();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add department');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: CompanyDepartment) => {
    try {
      if (item.is_active) {
        await softDeleteDepartment(companyId, item.department_id);
        Alert.alert('Success', 'Department deactivated');
      } else {
        await activateDepartment(companyId, item.department_id);
        Alert.alert('Success', 'Department reactivated');
      }
      fetchDepartments();
      if (showInactive) fetchInactiveDepartments();
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
              if (showInactive) fetchInactiveDepartments();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Delete failed');
            }
          },
        },
      ]
    );
  };

  // --- Render Helpers ---

  const renderDepartmentItem = (item: CompanyDepartment, isInactive: boolean = false) => (
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
            {isInactive ? (
              <TouchableOpacity
                onPress={() => handleToggleActive(item)}
                style={styles.iconButton}
              >
                <Icon name="eye" size={20} color="#2E7D32" />
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => handleToggleActive(item)}
                  style={styles.iconButton}
                >
                  <Icon name="eye-off" size={20} color="#7B2FBE" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSoftDelete(item)}
                  style={styles.iconButton}
                >
                  <Icon name="delete" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </>
            )}
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

  // --- Main Render ---

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
          <View style={styles.headerRow}>
            <Text variant="headlineMedium" style={styles.title}>
              Departments
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {showInactive ? `${inactiveDepartments.length} inactive` : `${total} active`}
            </Text>
          </View>
          <SegmentedButtons
            value={showInactive ? 'inactive' : 'active'}
            onValueChange={(val) => setShowInactive(val === 'inactive')}
            buttons={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
            style={styles.segmented}
          />
        </View>

        <FlatList
          data={showInactive ? inactiveDepartments : departments}
          renderItem={({ item }) => renderDepartmentItem(item, showInactive)}
          keyExtractor={(item) => item.department_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || (showInactive && loadingInactive)}
              onRefresh={onRefresh}
              colors={['#7B2FBE']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                {showInactive ? 'No inactive departments' : 'No departments found'}
              </Text>
            </View>
          }
        />

        {/* FAB to add department */}
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => {
            setModalVisible(true);
            if (systemDepartments.length === 0) fetchSystemDepartments();
            // Reset selection when opening
            setSelectedSystemDeptId(null);
            setNewDeptName('');
            setSearchQuery('');
          }}
          color="white"
          theme={{ colors: { primary: '#7B2FBE' } }}
        />

        {/* Add Department Modal – inline system department list */}
        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <View style={styles.modal}>
              <Text style={styles.modalTitle}>Add Department</Text>

              {/* Step 1: Select system department */}
              <Text style={styles.stepLabel}>1. Select a system department</Text>
              <Searchbar
                placeholder="Search system departments..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor="#7B2FBE"
                theme={{ colors: { primary: '#7B2FBE' } }}
              />
              {loadingSystemDepts ? (
                <ActivityIndicator style={{ marginVertical: 12 }} size="small" color="#7B2FBE" />
              ) : (
                <FlatList
                  data={filteredSystemDepts}
                  keyExtractor={(item) => item.system_department_id}
                  style={styles.systemList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.systemCard,
                        selectedSystemDeptId === item.system_department_id && styles.systemCardSelected,
                      ]}
                      onPress={() => {
                        setSelectedSystemDeptId(item.system_department_id);
                        // Pre-fill name with the department's name (editable)
                        setNewDeptName(item.name);
                      }}
                    >
                      <Text style={styles.systemCardName}>{item.name}</Text>
                      <Text style={styles.systemCardModule}>{item.module_code}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyListText}>No system departments found</Text>
                  }
                />
              )}

              {/* Step 2: Enter custom name (auto-filled) */}
              <Text style={[styles.stepLabel, { marginTop: 12 }]}>2. Customize department name</Text>
              <TextInput
                mode="outlined"
                label="Department Name"
                value={newDeptName}
                onChangeText={setNewDeptName}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
                editable={!!selectedSystemDeptId}
                autoFocus={!!selectedSystemDeptId}
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
                  disabled={submitting || !selectedSystemDeptId || !newDeptName.trim()}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  segmented: { marginTop: 8 },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 24,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  searchBar: {
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  searchInput: { fontSize: 14 },
  systemList: {
    maxHeight: 200,
    marginBottom: 8,
  },
  systemCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#fafafa',
  },
  systemCardSelected: {
    borderColor: '#7B2FBE',
    backgroundColor: '#EDE7F6',
  },
  systemCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  systemCardModule: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 12,
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