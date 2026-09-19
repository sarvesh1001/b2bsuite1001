// apps/prayantra-b2b/src/screens/hr/org-unit/OrgUnitDetail/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getOrgUnit } from '@b2b/api-client';
import { OrgUnit } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';
import MembersTab from './MembersTab';
import RolesTab from './RolesTab';

type RouteProps = RouteProp<RootStackParamList, 'OrgUnitDetail'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'OrgUnitDetail'>;

export default function OrgUnitDetail() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { orgUnitId } = route.params;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [orgUnit, setOrgUnit] = useState<OrgUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = ['Members', 'Roles'];

  const fetchOrgUnit = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await getOrgUnit(companyId, orgUnitId, deviceId, accessToken, true);
      setOrgUnit(res.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load org unit');
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, orgUnitId]);

  useEffect(() => {
    fetchOrgUnit();
  }, [fetchOrgUnit]);

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  if (!orgUnit) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#ef4444" />
          <Text style={styles.errorText}>Org Unit not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <MembersTab orgUnitId={orgUnit.id} />;
      case 1:
        return <RolesTab orgUnitId={orgUnit.id} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {orgUnit.name}
        </Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('OrgUnitForm', { orgUnitId: orgUnit.id })}
        >
          <Icon name="pencil" size={22} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Type:</Text>
        <Text style={styles.infoValue}>{orgUnit.org_unit_type}</Text>
        <View style={{ flex: 1 }} />
        <Text style={[styles.statusText, { color: orgUnit.is_active ? '#10b981' : '#ef4444' }]}>
          {orgUnit.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>
      {orgUnit.description && (
        <Text style={styles.description}>{orgUnit.description}</Text>
      )}

      <View style={styles.tabBar}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === index && styles.tabItemActive]}
            onPress={() => setActiveTab(index)}
          >
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabContent}>{renderTabContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BACKGROUND_COLOR },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginTop: 12, fontSize: 16, color: TEXT_PRIMARY },
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
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: CARD_BACKGROUND, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  infoLabel: { fontSize: 13, color: TEXT_SECONDARY, marginRight: 4 },
  infoValue: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '500' },
  statusText: { fontSize: 12, fontWeight: '600' },
  description: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 13, color: TEXT_SECONDARY, backgroundColor: CARD_BACKGROUND, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  tabBar: { flexDirection: 'row', backgroundColor: CARD_BACKGROUND, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: PRIMARY_COLOR },
  tabText: { fontSize: 13, fontWeight: '500', color: TEXT_SECONDARY },
  tabTextActive: { color: PRIMARY_COLOR, fontWeight: '600' },
  tabContent: { flex: 1, padding: 16 },
});