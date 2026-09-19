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
import { listComponents, listComponentsManagement, deactivateComponent } from '@b2b/api-client';
import { PayrollComponent } from '@b2b/shared-types';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'ComponentList'>;

export default function ComponentList() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [components, setComponents] = useState<PayrollComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showManagement, setShowManagement] = useState(false);

  const fetchComponents = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      let res;
      if (showManagement) {
        res = await listComponentsManagement(companyId, deviceId, accessToken);
      } else {
        res = await listComponents(companyId, deviceId, accessToken);
      }
      setComponents(res.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch components');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchComponents();
    }, [showManagement])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComponents();
    setRefreshing(false);
  };

  const handleDeactivate = (componentCode: string) => {
    Alert.alert(
      'Deactivate Component',
      `Are you sure you want to deactivate ${componentCode}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateComponent(companyId!, componentCode, deviceId!, accessToken!);
              Alert.alert('Success', 'Component deactivated');
              fetchComponents();
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate component');
            }
          },
        },
      ]
    );
  };

  // Helper to get badge style based on component type
  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'deduction':
        return styles.deductionBadge;
      case 'statutory':
        return styles.statutoryBadge;
      default:
        return styles.earningBadge;
    }
  };

  const renderItem = ({ item }: { item: PayrollComponent }) => {
    const isActive = item.is_active !== false;

    return (
      <TouchableOpacity
        style={[styles.card, !isActive && styles.inactiveCard]}
        onPress={() => navigation.navigate('ComponentDetail', { componentCode: item.component_code })}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.code, !isActive && styles.inactiveText]}>
            {item.component_code}
          </Text>
          <View style={styles.badgeContainer}>
            <View style={[styles.typeBadge, getTypeBadgeStyle(item.component_type)]}>
              <Text style={styles.typeText}>{item.component_type}</Text>
            </View>
            {!isActive && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>
        </View>
        <Text style={[styles.description, !isActive && styles.inactiveText]}>
          {item.description}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            Taxable: {item.is_taxable ? 'Yes' : 'No'}
          </Text>
          {item.contribution_side && (
            <Text style={styles.metaText}>
              Side: {item.contribution_side}
            </Text>
          )}
        </View>
        {showManagement && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('EditComponent', { componentCode: item.component_code })}
            >
              <Icon name="pencil" size={18} color={PRIMARY_COLOR} />
            </TouchableOpacity>
            {isActive && (
              <TouchableOpacity
                style={styles.deactivateButton}
                onPress={() => handleDeactivate(item.component_code)}
              >
                <Icon name="close-circle" size={18} color={ERROR_COLOR} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const filteredComponents = components.filter((c) =>
    c.component_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Components</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateComponent')}
          style={styles.addButton}
        >
          <Icon name="plus" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color={TEXT_SECONDARY} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search components..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={18} color={TEXT_SECONDARY} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.modeToggle, showManagement && styles.modeToggleActive]}
          onPress={() => setShowManagement(!showManagement)}
        >
          <Text style={[styles.modeToggleText, showManagement && styles.modeToggleTextActive]}>
            {showManagement ? 'Management' : 'View'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredComponents}
          keyExtractor={(item) => item.component_code}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching components' : 'No components found'}
              </Text>
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
    borderRadius: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 6,
    fontSize: 14,
    color: TEXT_PRIMARY,
    marginLeft: 6,
  },
  modeToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: BACKGROUND_COLOR,
  },
  modeToggleActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  modeToggleText: { fontSize: 13, color: TEXT_SECONDARY },
  modeToggleTextActive: { color: '#fff' },
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
  inactiveCard: { opacity: 0.6, borderColor: ERROR_COLOR + '40' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  inactiveText: { color: TEXT_SECONDARY },
  badgeContainer: { flexDirection: 'row', alignItems: 'center' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 4 },
  earningBadge: { backgroundColor: '#E8F5E9' },
  deductionBadge: { backgroundColor: '#FFEBEE' },
  statutoryBadge: { backgroundColor: '#E3F2FD' },
  typeText: { fontSize: 11, fontWeight: '600', color: TEXT_PRIMARY },
  inactiveBadge: {
    backgroundColor: ERROR_COLOR + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: { fontSize: 10, fontWeight: '600', color: ERROR_COLOR },
  description: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 4 },
  metaRow: { flexDirection: 'row', marginTop: 6 },
  metaText: { fontSize: 12, color: TEXT_SECONDARY, marginRight: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8, borderTopWidth: 1, borderTopColor: BORDER_COLOR, paddingTop: 8 },
  editButton: { padding: 4, marginRight: 12 },
  deactivateButton: { padding: 4 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});