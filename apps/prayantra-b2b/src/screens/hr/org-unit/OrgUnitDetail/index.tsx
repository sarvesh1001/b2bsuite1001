import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getOrgUnit } from '@b2b/api-client';
import { OrgUnitWithDetails } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR, CARD_BACKGROUND, PRIMARY_COLOR,
  TEXT_PRIMARY, TEXT_SECONDARY, BORDER_COLOR,
} from '../../../../constants/colors';
import {
  ORG_UNIT_STATUS,
  getOrgUnitTypeLabel, getOrgUnitTypeIcon, getOrgUnitTypeColor,
} from '../../../../constants/orgUnit';
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

  const [orgUnit, setOrgUnit] = useState<OrgUnitWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = ['Members', 'Roles'];

  const fetchOrgUnit = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await getOrgUnit(companyId, orgUnitId, deviceId, accessToken, true);
      setOrgUnit(res.data as OrgUnitWithDetails);
    } catch {
      Alert.alert('Error', 'Failed to load org unit');
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, orgUnitId]);

  useEffect(() => { fetchOrgUnit(); }, [fetchOrgUnit]);

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

  const status = orgUnit.is_active ? ORG_UNIT_STATUS.active : ORG_UNIT_STATUS.inactive;
  const typeColor = getOrgUnitTypeColor(orgUnit.org_unit_type);

  const memberCount = orgUnit.active_members?.length ?? orgUnit.member_count ?? 0;

  // Bound locations — what the admin configured.
  const boundLocations = orgUnit.home_locations ?? [];
  const boundCount = orgUnit.home_location_ids?.length ?? boundLocations.length;
  const isUniversal = boundCount === 0;

  // Footprint — where active members actually sit.
  const footprint = orgUnit.locations ?? [];
  const footprintCount = footprint.length;

  const renderTabContent = () => {
    switch (activeTab) {
      case 0: return <MembersTab orgUnitId={orgUnit.org_unit_id} />;
      case 1: return <RolesTab orgUnitId={orgUnit.org_unit_id} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>{orgUnit.name}</Text>
          <Text style={styles.headerSubtitle}>
            {memberCount} member{memberCount === 1 ? '' : 's'}
            {!isUniversal && ` · ${boundCount} bound location${boundCount === 1 ? '' : 's'}`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('OrgUnitForm', { orgUnitId: orgUnit.org_unit_id })}
        >
          <Icon name="pencil" size={22} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {/* Info row */}
      <View style={styles.infoRow}>
        <Icon name={getOrgUnitTypeIcon(orgUnit.org_unit_type)}
          size={16} color={typeColor} style={{ marginRight: 6 }} />
        <Text style={styles.infoValue}>{getOrgUnitTypeLabel(orgUnit.org_unit_type)}</Text>

        {/* Universal / bound badge */}
        <View style={[styles.scopeBadge,
          { backgroundColor: isUniversal ? '#10b98120' : PRIMARY_COLOR + '20' }]}>
          <Icon
            name={isUniversal ? 'earth' : boundCount === 1 ? 'map-marker' : 'map-marker-multiple'}
            size={11}
            color={isUniversal ? '#10b981' : PRIMARY_COLOR}
          />
          <Text style={[styles.scopeBadgeText,
            { color: isUniversal ? '#10b981' : PRIMARY_COLOR }]}>
            {isUniversal ? 'Universal' : `${boundCount} location${boundCount === 1 ? '' : 's'}`}
          </Text>
        </View>

        <View style={{ flex: 1 }} />
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>

      {orgUnit.description ? (
        <Text style={styles.description}>{orgUnit.description}</Text>
      ) : null}

      {/* Bound locations */}
      <View style={styles.footprintPanel}>
        <View style={styles.footprintHeader}>
          <Icon
            name={isUniversal ? 'earth' : 'map-marker-multiple'}
            size={16}
            color={isUniversal ? '#10b981' : PRIMARY_COLOR}
          />
          <Text style={styles.footprintTitle}>
            {isUniversal ? 'Bound to: Universal' : `Bound to · ${boundCount} location${boundCount === 1 ? '' : 's'}`}
          </Text>
        </View>

        {isUniversal ? (
          <Text style={styles.universalNote}>
            Anyone authorized at any location in this company can be added as a member or assigned a role.
          </Text>
        ) : (
          <View style={styles.boundChips}>
            {boundLocations.map((loc) => (
              <View key={loc.location_id} style={styles.boundChip}>
                <Icon name="map-marker-outline" size={11} color={PRIMARY_COLOR} />
                <Text style={styles.boundChipText} numberOfLines={1}>
                  {loc.location_name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Member footprint — only when non-empty */}
      {footprintCount > 0 && (
        <View style={styles.footprintPanel}>
          <View style={styles.footprintHeader}>
            <Icon name="account-group-outline" size={16} color={TEXT_SECONDARY} />
            <Text style={styles.footprintTitle}>
              Member footprint · {footprintCount} location
              {footprintCount === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.footprintList}>
            {footprint.map((loc) => {
              const max = footprint[0]?.member_count || 1;
              const ratio = Math.max(0.15, (loc.member_count ?? 0) / max);
              return (
                <View key={loc.location_id} style={styles.footprintRow}>
                  <Text style={styles.footprintLocName} numberOfLines={1}>
                    {loc.location_name}
                  </Text>
                  <View style={styles.footprintBarWrap}>
                    <View style={[styles.footprintBar, { width: `${ratio * 100}%` }]} />
                  </View>
                  <Text style={styles.footprintCount}>{loc.member_count}</Text>
                </View>
              );
            })}
          </View>
        </View>
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
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginTop: 12, fontSize: 16, color: TEXT_PRIMARY },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  backButton: { padding: 4 },
  headerTitleWrap: { flex: 1, marginLeft: 10 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  headerSubtitle: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 2 },
  editButton: { padding: 4 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  infoValue: { fontSize: 13, color: TEXT_PRIMARY, fontWeight: '500', marginRight: 8 },
  scopeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 8,
  },
  scopeBadgeText: { fontSize: 10, fontWeight: '700' },
  statusText: { fontSize: 12, fontWeight: '600' },
  description: {
    paddingHorizontal: 16, paddingVertical: 8, fontSize: 13,
    color: TEXT_SECONDARY, backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  footprintPanel: {
    backgroundColor: CARD_BACKGROUND,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  footprintHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  footprintTitle: { fontSize: 12, fontWeight: '600', color: TEXT_PRIMARY },

  // Universal explanation
  universalNote: { fontSize: 12, color: TEXT_SECONDARY, fontStyle: 'italic' },

  // Bound chips
  boundChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  boundChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    backgroundColor: PRIMARY_COLOR + '12',
    borderWidth: 1, borderColor: PRIMARY_COLOR + '30',
    maxWidth: '100%',
  },
  boundChipText: {
    fontSize: 11, fontWeight: '600', color: PRIMARY_COLOR,
    flexShrink: 1,
  },

  // Footprint bars
  footprintList: { gap: 6 },
  footprintRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footprintLocName: { width: 90, fontSize: 12, color: TEXT_SECONDARY },
  footprintBarWrap: {
    flex: 1, height: 8, backgroundColor: BORDER_COLOR,
    borderRadius: 4, overflow: 'hidden',
  },
  footprintBar: { height: '100%', backgroundColor: PRIMARY_COLOR, borderRadius: 4 },
  footprintCount: { width: 20, fontSize: 11, fontWeight: '600', color: TEXT_PRIMARY, textAlign: 'right' },

  tabBar: {
    flexDirection: 'row', backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: PRIMARY_COLOR },
  tabText: { fontSize: 13, fontWeight: '500', color: TEXT_SECONDARY },
  tabTextActive: { color: PRIMARY_COLOR, fontWeight: '600' },
  tabContent: { flex: 1, padding: 16 },
});