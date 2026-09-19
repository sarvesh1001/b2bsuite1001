import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getComponent } from '@b2b/api-client';
import { PayrollComponent } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'ComponentDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'ComponentDetail'>;

// Helper to get the correct badge style for component type
const getTypeBadgeStyle = (type: string) => {
  switch (type) {
    case 'earning':
      return styles.earning;
    case 'deduction':
      return styles.deduction;
    case 'statutory':
      return styles.statutory;
    default:
      return styles.earning;
  }
};

export default function ComponentDetail() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { componentCode } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [component, setComponent] = useState<PayrollComponent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComponent = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await getComponent(companyId, componentCode, deviceId, accessToken);
        setComponent(res.data);
      } catch (error) {
        Alert.alert('Error', 'Failed to load component');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchComponent();
  }, [componentCode]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!component) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Component Detail</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Component not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = component.is_active !== false;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Component Detail</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('EditComponent', { componentCode: component.component_code })}
          style={styles.editButton}
        >
          <Icon name="pencil" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.codeRow}>
            <Text style={styles.code}>{component.component_code}</Text>
            <View style={[styles.statusBadge, isActive ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={[styles.statusText, isActive ? styles.activeText : styles.inactiveText]}>
                {isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Type</Text>
            <View style={[styles.typeBadge, getTypeBadgeStyle(component.component_type)]}>
              <Text style={styles.typeText}>
                {component.component_type.charAt(0).toUpperCase() + component.component_type.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Description</Text>
            <Text style={styles.detailValue}>{component.description || 'N/A'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Taxable</Text>
            <Text style={styles.detailValue}>{component.is_taxable ? 'Yes' : 'No'}</Text>
          </View>

          {component.contribution_side && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Contribution Side</Text>
              <Text style={styles.detailValue}>
                {component.contribution_side.charAt(0).toUpperCase() + component.contribution_side.slice(1)}
              </Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>
              {new Date(component.created_at).toLocaleString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Updated</Text>
            <Text style={styles.detailValue}>
              {new Date(component.updated_at).toLocaleString()}
            </Text>
          </View>
        </View>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  editButton: { padding: 4 },
  content: { padding: 16, paddingBottom: 40 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: TEXT_SECONDARY },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  code: { fontSize: 20, fontWeight: '700', color: TEXT_PRIMARY },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  activeBadge: { backgroundColor: '#E8F5E9' },
  inactiveBadge: { backgroundColor: '#FFEBEE' },
  statusText: { fontSize: 12, fontWeight: '600' },
  activeText: { color: '#2E7D32' },
  inactiveText: { color: '#C62828' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  detailLabel: { fontSize: 14, fontWeight: '500', color: TEXT_SECONDARY },
  detailValue: { fontSize: 14, color: TEXT_PRIMARY, textAlign: 'right', flex: 1, marginLeft: 16 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  earning: { backgroundColor: '#E8F5E9' },
  deduction: { backgroundColor: '#FFEBEE' },
  statutory: { backgroundColor: '#E3F2FD' },
  typeText: { fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY },
});