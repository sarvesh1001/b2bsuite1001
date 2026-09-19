import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getStructure, removeComponentFromStructure, reorderComponents } from '@b2b/api-client';
import { SalaryStructure, StructureComponent } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'StructureDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'StructureDetail'>;

export default function StructureDetail() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { structureId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [structure, setStructure] = useState<SalaryStructure | null>(null);
  const [components, setComponents] = useState<StructureComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getStructure(companyId, structureId, deviceId, accessToken);
      const data = res.data as any;
      setStructure(data);
      setComponents(data.components || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load structure');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [structureId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleRemoveComponent = (componentCode: string) => {
    Alert.alert(
      'Remove Component',
      `Are you sure you want to remove ${componentCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeComponentFromStructure(
                companyId!,
                structureId,
                componentCode,
                deviceId!,
                accessToken!
              );
              Alert.alert('Success', 'Component removed');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove component');
            }
          },
        },
      ]
    );
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const updated = [...components];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setComponents(updated);
    const codes = updated.map(c => c.component_code);
    Alert.alert(
      'Reorder Components',
      'Apply this new order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            try {
              await reorderComponents(companyId!, structureId, deviceId!, accessToken!, {
                component_codes: codes,
              });
              Alert.alert('Success', 'Order updated');
              fetchData();
            } catch (error) {
              Alert.alert('Error', 'Failed to reorder');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!structure) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Structure Detail</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddComponentToStructure', { structureId })}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Structure Info */}
        <View style={styles.infoCard}>
          <Text style={styles.name}>{structure.structure_name}</Text>
          <Text style={styles.currency}>Currency: {structure.currency_code}</Text>
          <View style={styles.statusRow}>
            <Text style={styles.status}>
              {structure.is_published ? '✅ Published' : '📝 Draft'}
            </Text>
            <Text style={styles.status}>
              {structure.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Components List */}
        <Text style={styles.sectionTitle}>Components ({components.length})</Text>
        {components.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No components added yet</Text>
            <TouchableOpacity
              style={styles.addComponentButton}
              onPress={() => navigation.navigate('AddComponentToStructure', { structureId })}
            >
              <Text style={styles.addComponentText}>Add Component</Text>
            </TouchableOpacity>
          </View>
        ) : (
          components.map((comp, index) => (
            <View key={comp.component_code} style={styles.componentCard}>
              <TouchableOpacity
                style={styles.componentContent}
                onPress={() =>
                  navigation.navigate('EditStructureComponent', {
                    structureId,
                    componentCode: comp.component_code,
                  })
                }
              >
                <Text style={styles.componentCode}>{comp.component_code}</Text>
                <Text style={styles.componentValue}>
                  {comp.calculation_type === 'percentage' ? `${comp.value}%` : comp.value}
                </Text>
                <Text style={styles.componentOrder}>Order: {comp.sequence_order}</Text>
              </TouchableOpacity>
              <View style={styles.componentActions}>
                {index > 0 && (
                  <TouchableOpacity
                    style={styles.moveButton}
                    onPress={() => handleReorder(index, index - 1)}
                  >
                    <Icon name="arrow-up" size={18} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                )}
                {index < components.length - 1 && (
                  <TouchableOpacity
                    style={styles.moveButton}
                    onPress={() => handleReorder(index, index + 1)}
                  >
                    <Icon name="arrow-down" size={18} color={TEXT_SECONDARY} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleRemoveComponent(comp.component_code)}
                >
                  <Icon name="delete" size={20} color={ERROR_COLOR} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.assignButton}
          onPress={() => navigation.navigate('AssignStructure', { structureId })}
        >
          <Text style={styles.assignText}>Assign to Employee</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.assignButton, styles.bulkAssignButton]}
          onPress={() => navigation.navigate('BulkAssignStructure', { structureId })}
        >
          <Text style={styles.assignText}>Bulk Assign</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loader: { marginTop: 40 },
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
  content: { padding: 16, paddingBottom: 40 },
  infoCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
  },
  name: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  currency: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 2 },
  statusRow: { flexDirection: 'row', marginTop: 6, justifyContent: 'space-between' },
  status: { fontSize: 13, color: TEXT_SECONDARY },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginVertical: 12,
  },
  emptyCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
  },
  emptyText: { color: TEXT_SECONDARY, fontSize: 14 },
  addComponentButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 6,
  },
  addComponentText: { color: '#fff', fontWeight: '600' },
  componentCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  componentContent: { flex: 1 },
  componentCode: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  componentValue: { fontSize: 13, color: TEXT_SECONDARY },
  componentOrder: { fontSize: 12, color: TEXT_SECONDARY },
  componentActions: { flexDirection: 'row', alignItems: 'center' },
  moveButton: { padding: 4 },
  deleteButton: { padding: 4 },
  assignButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  bulkAssignButton: {
    backgroundColor: '#6c757d',
    marginTop: 8,
  },
  assignText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});