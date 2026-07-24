// screens/admin/CompanyManagement/CompanyDetailScreen.tsx
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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

  if (loading || !company) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.companyName}>
            {company.company_name}
          </Text>
          <View style={styles.statusRow}>
            <Chip
              style={[
                styles.statusChip,
                { backgroundColor: company.is_active ? '#E8F5E9' : '#FFEBEE' },
              ]}
              textStyle={{ color: company.is_active ? '#2E7D32' : '#C62828' }}
            >
              {company.is_active ? 'Active' : 'Inactive'}
            </Chip>
            <Chip style={styles.tierChip}>{company.subscription_tier}</Chip>
          </View>
        </View>

        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Owner ID:</Text>
              <Text style={styles.value}>{company.owner_user_id}</Text>
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

        {stats && (
          <Card style={styles.statsCard}>
            <Card.Content>
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
  statusRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  statusChip: { marginRight: 8 },
  tierChip: { backgroundColor: '#E8E0F0' },
  infoCard: { marginVertical: 8, borderRadius: 12, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#1A1A1A', fontSize: 14, fontWeight: '500' },
  statsCard: { marginVertical: 8, borderRadius: 12, elevation: 2 },
  statsTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#7B2FBE' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  actionButton: { flex: 1, marginHorizontal: 4, borderRadius: 12, overflow: 'hidden' },
  halfButton: { flex: 0.48 },
  gradientButton: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  divider: { marginVertical: 16 },
  quickLinks: { marginTop: 8 },
  quickLinksTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  linkItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  linkText: { fontSize: 16, color: '#7B2FBE' },
});