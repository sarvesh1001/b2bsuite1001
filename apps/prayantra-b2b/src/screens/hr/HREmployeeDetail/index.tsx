// apps/prayantra-b2b/src/screens/hr/HREmployeeDetail/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { getEmployeeProfile } from '@b2b/api-client';
import { HREmployeeProfile } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';
import { RootStackParamList } from '../../../navigation';
import ProfileTab from './ProfileTab';
import DocumentsTab from './DocumentsTab';
import HistoryTab from './HistoryTab';
import ExitTab from './ExitTab';

type RouteProps = RouteProp<RootStackParamList, 'HREmployeeDetail'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'HREmployeeDetail'>;

export default function HREmployeeDetail() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { employeeId } = route.params;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [employee, setEmployee] = useState<HREmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = ['Profile', 'Documents', 'History', 'Exit'];

  const fetchEmployee = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      setLoading(false);
      return;
    }
    try {
      const res = await getEmployeeProfile(companyId, employeeId, deviceId, accessToken);
      setEmployee(res.data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load employee');
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, employeeId]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  const handleRefresh = () => {
    setLoading(true);
    fetchEmployee();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading employee...</Text>
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={60} color="#ef4444" />
          <Text style={styles.errorText}>Employee not found</Text>
          <TouchableOpacity style={styles.goBackButton} onPress={() => navigation.goBack()}>
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <ProfileTab employee={employee} onUpdate={handleRefresh} />;
      case 1:
        return <DocumentsTab employeeId={employee.id} />;
      case 2:
        return <HistoryTab employeeId={employee.id} />;
      case 3:
        return <ExitTab employeeId={employee.id} />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {employee.email || 'Employee'}
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Icon name="refresh" size={22} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
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

      {/* Content */}
      <View style={styles.tabContent}>{renderTabContent()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  goBackButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
  },
  goBackText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  refreshButton: {
    padding: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: TEXT_SECONDARY,
  },
  tabTextActive: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
});