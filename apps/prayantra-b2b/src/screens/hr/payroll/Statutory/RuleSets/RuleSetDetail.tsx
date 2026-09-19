import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { axiosInstance } from '@b2b/api-client';
import { RuleSet } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'RuleSetDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'RuleSetDetail'>;

type TabType = 'contributions' | 'slabs' | 'limits' | 'mappings';

export default function RuleSetDetail() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [ruleSet, setRuleSet] = useState<RuleSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('contributions');

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const url = `/companies/${companyId}/payroll/statutory-profiles/rule-sets/${ruleSetId}`;
        const headers = {
          'X-Company-ID': companyId,
          'X-Device-ID': deviceId,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
        const response = await axiosInstance.get(url, { headers });
        setRuleSet(response.data.data); // assuming ApiResponse structure
      } catch (error) {
        Alert.alert('Error', 'Failed to load rule set');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ruleSetId]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'contributions':
        return (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Contribution Rules</Text>
              <TouchableOpacity
                style={styles.addButtonSmall}
                onPress={() => navigation.navigate('CreateContributionRule', { ruleSetId })}
              >
                <Icon name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.placeholder}>List of contribution rules (to be implemented)</Text>
          </View>
        );
      case 'slabs':
        return (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Tax Slabs</Text>
              <TouchableOpacity
                style={styles.addButtonSmall}
                onPress={() => navigation.navigate('CreateTaxSlab', { ruleSetId })}
              >
                <Icon name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.placeholder}>List of tax slabs (to be implemented)</Text>
          </View>
        );
      case 'limits':
        return (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Deduction Limits</Text>
              <TouchableOpacity
                style={styles.addButtonSmall}
                onPress={() => navigation.navigate('CreateDeductionLimit', { ruleSetId })}
              >
                <Icon name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.placeholder}>List of deduction limits (to be implemented)</Text>
          </View>
        );
      case 'mappings':
        return (
          <View style={styles.tabContent}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Component Mappings</Text>
              <TouchableOpacity
                style={styles.addButtonSmall}
                onPress={() => navigation.navigate('CreateComponentMapping', { ruleSetId })}
              >
                <Icon name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.placeholder}>List of component mappings (to be implemented)</Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {ruleSet?.version_label || 'Rule Set'}
        </Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditRuleSet', { ruleSetId })}
        >
          <Icon name="pencil" size={20} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Country: {ruleSet?.country_code}</Text>
        <Text style={styles.infoText}>
          Effective: {ruleSet?.effective_from ? new Date(ruleSet.effective_from).toLocaleDateString() : 'N/A'}
        </Text>
        <View style={[styles.statusBadge, ruleSet?.is_active ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={styles.statusText}>{ruleSet?.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['contributions', 'slabs', 'limits', 'mappings'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {renderTabContent()}
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
  editButton: { padding: 4 },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    flexWrap: 'wrap',
  },
  infoText: { fontSize: 13, color: TEXT_SECONDARY, marginRight: 12 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadge: { backgroundColor: '#4CAF5020' },
  inactiveBadge: { backgroundColor: '#F4433620' },
  statusText: { fontSize: 12, fontWeight: '600' },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: { borderBottomColor: PRIMARY_COLOR },
  tabText: { fontSize: 14, color: TEXT_SECONDARY },
  activeTabText: { color: PRIMARY_COLOR, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 40 },
  tabContent: { flex: 1 },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY },
  addButtonSmall: {
    backgroundColor: PRIMARY_COLOR,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: { color: TEXT_SECONDARY, fontSize: 14, textAlign: 'center', marginTop: 20 },
});