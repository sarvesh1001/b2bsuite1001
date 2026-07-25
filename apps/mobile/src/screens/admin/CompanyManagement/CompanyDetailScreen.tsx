// apps/mobile/src/screens/admin/CompanyManagement/CompanyDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';

import {
  getCompanyById,
  getCompanyStats,
  deactivateCompany,
  reactivateCompany,
  getCompanyEmployees,
  getCompanyDepartments,
  getCompanyRoles,
  Company,
} from '../../../services/admin';

export default function CompanyDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { companyId } = route.params as { companyId: string };

  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [roleCount, setRoleCount] = useState(0);

  const loadData = async () => {
    try {
      const [companyData, statsData, employeesData, departmentsData, rolesData] = await Promise.all([
        getCompanyById(companyId),
        getCompanyStats(companyId),
        getCompanyEmployees(companyId, 1),
        getCompanyDepartments(companyId, 1),
        getCompanyRoles(companyId, 1),
      ]);
      setCompany(companyData);
      setStats(statsData);
      setEmployeeCount(employeesData.meta?.total || 0);
      setDepartmentCount(departmentsData.meta?.total || 0);
      setRoleCount(rolesData.meta?.total || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const handleToggleActive = async () => {
    if (!company) return;
    try {
      setActionLoading(true);
      if (company.is_active) {
        await deactivateCompany(companyId, 'Admin action');
      } else {
        await reactivateCompany(companyId);
      }
      Alert.alert('Success', company.is_active ? 'Company deactivated' : 'Company reactivated');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    if (!company) return;
    try {
      await Share.share({
        message: `Company: ${company.company_name}\nID: ${company.company_id}\nStatus: ${company.is_active ? 'Active' : 'Inactive'}\nTier: ${company.subscription_tier}`,
        title: company.company_name,
      });
    } catch (error) {}
  };

  const formatTier = (tier: string) => {
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  const formatExpiry = (expiry: string | undefined) => {
    if (!expiry) return 'N/A';
    return new Date(expiry).toLocaleDateString();
  };

  if (loading || !company) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.companyName}>
            {company.company_name}
          </Text>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.badgeBase,
                { backgroundColor: company.is_active ? '#E8F5E9' : '#FFEBEE' },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: company.is_active ? '#2E7D32' : '#C62828' },
                ]}
              >
                {company.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View style={[styles.badgeBase, styles.tierBadge]}>
              <Text style={styles.tierText}>{formatTier(company.subscription_tier)}</Text>
            </View>
          </View>
        </View>

        {/* Basic Info Card */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.cardContent}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Owner ID:</Text>
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
                {company.owner_user_id}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Subscription:</Text>
              <Text style={styles.value}>{company.subscription_status}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Max Employees:</Text>
              <Text style={styles.value}>{company.max_employees}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Data Region:</Text>
              <Text style={styles.value}>{company.data_region}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Created:</Text>
              <Text style={styles.value}>{new Date(company.created_at).toLocaleString()}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Statistics Card */}
        {stats && (
          <Card style={styles.statsCard}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Statistics
              </Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.total_employees || 0}</Text>
                  <Text style={styles.statLabel}>Total Employees</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.active_employees || 0}</Text>
                  <Text style={styles.statLabel}>Active</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.department_count || 0}</Text>
                  <Text style={styles.statLabel}>Departments</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>
                    {Math.round((stats.employee_utilization || 0) * 100)}%
                  </Text>
                  <Text style={styles.statLabel}>Utilization</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Subscription Management Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Tier:</Text>
              <Text style={styles.value}>{formatTier(company.subscription_tier)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{company.subscription_status}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Max Employees:</Text>
              <Text style={styles.value}>{company.max_employees}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Expires:</Text>
              <Text style={styles.value}>{formatExpiry((company as any).subscription_expires_at)}</Text>
            </View>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.halfButton, { marginRight: 4 }]}
                onPress={() => (navigation as any).navigate('SubscriptionManagement', { companyId, company })}
              >
                <LinearGradient
                  colors={['#00B4DB', '#7B2FBE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>Manage</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.halfButton, { marginLeft: 4 }]}
                onPress={() => (navigation as any).navigate('ExtendSubscription', { companyId })}
              >
                <LinearGradient
                  colors={['#6C5CE7', '#A29BFE']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.buttonText}>Extend</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Max Departments Card */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Departments Limit</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Current Max:</Text>
              <Text style={styles.value}>{company.max_departments || 0}</Text>
            </View>
            <TouchableOpacity
              style={styles.fullButton}
              onPress={() => (navigation as any).navigate('UpdateMaxDepartments', { companyId, currentMax: company.max_departments })}
            >
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Update Limit</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Quick action rows */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate('CompanyEmployees', { companyId })}
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Employees ({employeeCount})</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate('CompanyDepartments', { companyId })}
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Departments ({departmentCount})</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.halfButton]}
            onPress={handleToggleActive}
            disabled={actionLoading}
          >
            <LinearGradient
              colors={company.is_active ? ['#FF6B6B', '#EE5A24'] : ['#00B894', '#00A86B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>
                {actionLoading ? 'Processing...' : company.is_active ? 'Deactivate' : 'Reactivate'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.halfButton]} onPress={handleShare}>
            <LinearGradient
              colors={['#6C5CE7', '#A29BFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Share</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.quickLinks}>
          <Text variant="titleMedium" style={styles.quickLinksTitle}>
            Quick Links
          </Text>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => (navigation as any).navigate('UserSearch')}
          >
            <Text style={styles.linkText}>View All Users</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => {}}
          >
            <Text style={styles.linkText}>Manage Roles</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => {}}
          >
            <Text style={styles.linkText}>Audit Logs</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 12 },
  companyName: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 26 },
  statusRow: {
    flexDirection: 'row',
    marginTop: 8,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  badgeBase: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tierBadge: {
    backgroundColor: '#E8E0F0',
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  infoCard: {
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  statsCard: {
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    flex: 1,
  },
  label: {
    color: '#666',
    fontSize: 14,
    marginRight: 8,
    flexShrink: 0,
  },
  value: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexShrink: 1,
  },
  statsTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#7B2FBE' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  actionButton: { flex: 1, marginHorizontal: 4, borderRadius: 12, overflow: 'hidden' },
  halfButton: { flex: 0.48, borderRadius: 12, overflow: 'hidden' },
  fullButton: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  gradientButton: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  buttonRow: { flexDirection: 'row', marginTop: 8 },
  divider: { marginVertical: 16 },
  quickLinks: { marginTop: 8 },
  quickLinksTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  linkItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  linkText: { fontSize: 16, color: '#7B2FBE' },
  sectionTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
});