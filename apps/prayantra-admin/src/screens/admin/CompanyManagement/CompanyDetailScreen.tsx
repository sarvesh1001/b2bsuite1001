// apps/prayantra-admin/src/screens/admin/CompanyManagement/CompanyDetailScreen.tsx
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
import { Text, ActivityIndicator, Card, Divider } from 'react-native-paper';
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
  getActiveDepartmentCount,
  getSubscriptionPlanById,
  CompanyDetail,
} from '../../../services/admin';

export default function CompanyDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { companyId } = route.params as { companyId: string };

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [departmentCount, setDepartmentCount] = useState(0);
  const [activeDepartmentCount, setActiveDepartmentCount] = useState(0);
  const [roleCount, setRoleCount] = useState(0);

  // Plan resolution from subscription_plan_id
  const [planName, setPlanName] = useState<string>('');
  const [planCode, setPlanCode] = useState<string>('');
  const [planLoading, setPlanLoading] = useState(false);

  const loadData = async () => {
    try {
      const [
        companyData,
        statsData,
        employeesData,
        departmentsData,
        rolesData,
        activeDeptCount,
      ] = await Promise.all([
        getCompanyById(companyId),
        getCompanyStats(companyId),
        getCompanyEmployees(companyId, 1),
        getCompanyDepartments(companyId, 1),
        getCompanyRoles(companyId, 1),
        getActiveDepartmentCount(companyId),
      ]);

      console.log('📦 getCompanyById RAW:', JSON.stringify(companyData, null, 2));

      setCompany(companyData);
      setStats(statsData);
      setEmployeeCount(employeesData.meta?.total || 0);
      setDepartmentCount(departmentsData.meta?.total || 0);
      setRoleCount(rolesData.meta?.total || 0);
      setActiveDepartmentCount(activeDeptCount.active_departments || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  // Fetch the plan whenever the company's plan id becomes available
  useEffect(() => {
    const planId = company?.subscription_plan_id;
    if (!planId) {
      setPlanName('');
      setPlanCode('');
      return;
    }

    let cancelled = false;
    (async () => {
      setPlanLoading(true);
      try {
        const plan = await getSubscriptionPlanById(planId);
        if (!cancelled) {
          setPlanName(plan?.plan_name || '');
          setPlanCode(plan?.plan_code || '');
        }
      } catch (e: any) {
        console.warn('⚠️ Failed to fetch plan details:', e?.message);
        if (!cancelled) {
          setPlanName('');
          setPlanCode('');
        }
      } finally {
        if (!cancelled) setPlanLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [company?.subscription_plan_id]);

  const handleToggleActive = async () => {
    if (!company) return;
    try {
      setActionLoading(true);
      if (company.is_active) {
        await deactivateCompany(companyId, 'Admin action');
      } else {
        await reactivateCompany(companyId);
      }
      Alert.alert(
        'Success',
        company.is_active ? 'Company deactivated' : 'Company reactivated'
      );
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
      const planDisplay =
        planName || planCode || company.subscription_plan_id || 'N/A';
      await Share.share({
        message:
          `Company: ${company.company_name}\n` +
          `ID: ${company.company_id}\n` +
          `Status: ${company.is_active ? 'Active' : 'Inactive'}\n` +
          `Tier: ${company.subscription_tier}\n` +
          `Plan: ${planDisplay}`,
        title: company.company_name,
      });
    } catch (error) {}
  };

  const formatTier = (tier: string) =>
    tier.charAt(0).toUpperCase() + tier.slice(1);

  const formatExpiry = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const isWithinDays = (dateStr: string, days: number) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return diff > 0 && diff <= days * 24 * 60 * 60 * 1000;
  };

  const totalEmployees = stats?.total_employees || 0;
  const maxEmployees = company?.max_employees || 0;
  const utilization =
    maxEmployees > 0 ? (totalEmployees / maxEmployees) * 100 : 0;

  if (loading || !company) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  // Plan display: name → code → id → N/A
  const planDisplay =
    planName || planCode || company.subscription_plan_id || 'N/A';
  const hasPlan = planDisplay !== 'N/A';

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ----- Header ----- */}
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
              <Text style={styles.tierText}>
                {formatTier(company.subscription_tier)}
              </Text>
            </View>
            {hasPlan ? (
              <View style={[styles.badgeBase, styles.planBadge]}>
                {planLoading ? (
                  <ActivityIndicator size="small" color="#00695C" />
                ) : (
                  <Text style={styles.planText} numberOfLines={1}>
                    {planDisplay}
                  </Text>
                )}
              </View>
            ) : null}
          </View>
        </View>

        {/* ----- Trial warning ----- */}
        {company.trial_end_date && isWithinDays(company.trial_end_date, 3) && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Trial expires on{' '}
              {new Date(company.trial_end_date).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* ----- Company Info ----- */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Company Information
            </Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Owner ID:</Text>
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="tail">
                {company.owner_user_id}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Data Region:</Text>
              <Text style={styles.value}>{company.data_region}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Financial Year Start:</Text>
              <Text style={styles.value}>
                Month{' '}
                {company.financial_year_start_month ??
                  company.FinancialYearStartMonth ??
                  'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Created:</Text>
              <Text style={styles.value}>
                {new Date(company.created_at).toLocaleString()}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* ----- Statistics ----- */}
        {stats && (
          <Card style={styles.statsCard}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Statistics
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Total Employees:</Text>
                <Text style={styles.value}>{stats.total_employees || 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Active Employees:</Text>
                <Text style={styles.value}>{stats.active_employees || 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Active Departments:</Text>
                <Text style={styles.value}>{activeDepartmentCount}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Roles:</Text>
                <Text style={styles.value}>{roleCount}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Utilization:</Text>
                <Text style={styles.value}>{Math.round(utilization)}%</Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* ----- Subscription ----- */}
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Subscription
            </Text>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Tier:</Text>
              <Text style={styles.value}>
                {formatTier(company.subscription_tier)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Plan:</Text>
              <Text style={styles.value}>
                {planLoading ? 'Loading…' : planName || planCode || 'N/A'}
              </Text>
            </View>

            {planCode ? (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Plan Code:</Text>
                <Text style={styles.value}>{planCode}</Text>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.label}>Plan ID:</Text>
              <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
                {company.subscription_plan_id}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{company.subscription_status}</Text>
            </View>

            {company.subscription_amount != null ? (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Amount:</Text>
                <Text style={styles.value}>{company.subscription_amount}</Text>
              </View>
            ) : null}

            <View style={styles.infoRow}>
              <Text style={styles.label}>Max Employees:</Text>
              <Text style={styles.value}>{company.max_employees}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Max Locations:</Text>
              <Text style={styles.value}>{company.max_locations ?? 'N/A'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Grace Period:</Text>
              <Text style={styles.value}>
                {company.grace_period_days != null
                  ? `${company.grace_period_days} days`
                  : 'N/A'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Start:</Text>
              <Text style={styles.value}>
                {formatExpiry(company.subscription_start_date)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Expires:</Text>
              <Text style={styles.value}>
                {formatExpiry(company.subscription_end_date)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Trial Ends:</Text>
              <Text style={styles.value}>{formatExpiry(company.trial_end_date)}</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.halfButton, { marginRight: 4 }]}
                onPress={() =>
                  (navigation as any).navigate('SubscriptionManagement', {
                    companyId,
                    company,
                  })
                }
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
                onPress={() =>
                  (navigation as any).navigate('ExtendSubscription', { companyId })
                }
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

            <TouchableOpacity
              style={styles.fullButton}
              onPress={() =>
                (navigation as any).navigate('CompanyUpdateDetails', {
                  companyId,
                  company,
                })
              }
            >
              <LinearGradient
                colors={['#7B2FBE', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.buttonText}>Update Details</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* ----- Work Center ----- */}
        {company.work_center && (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Work Center
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Code:</Text>
                <Text style={styles.value}>{company.work_center.code}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{company.work_center.name}</Text>
              </View>
              {company.work_center.description ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Description:</Text>
                  <Text style={styles.value}>
                    {company.work_center.description}
                  </Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={styles.label}>Timezone:</Text>
                <Text style={styles.value}>
                  {company.work_center.timezone ?? 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Active:</Text>
                <Text style={styles.value}>
                  {company.work_center.is_active ? 'Yes' : 'No'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* ----- Location ----- */}
        {company.location && (
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Location
              </Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Code / Name:</Text>
                <Text style={styles.value}>
                  {company.location.code} — {company.location.name}
                </Text>
              </View>
              {company.location.address_line1 ? (
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Address:</Text>
                  <Text style={styles.value}>
                    {[
                      company.location.address_line1,
                      company.location.address_line2,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              ) : null}
              <View style={styles.infoRow}>
                <Text style={styles.label}>City / State:</Text>
                <Text style={styles.value}>
                  {[company.location.city, company.location.state]
                    .filter(Boolean)
                    .join(', ') || 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Country / PIN:</Text>
                <Text style={styles.value}>
                  {[company.location.country, company.location.pincode]
                    .filter(Boolean)
                    .join(' - ') || 'N/A'}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Departments Limit card removed — no longer needed */}

        {/* ----- Employees & Departments ----- */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              (navigation as any).navigate('CompanyEmployees', { companyId })
            }
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
            onPress={() =>
              (navigation as any).navigate('CompanyDepartments', { companyId })
            }
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>
                Departments ({departmentCount})
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ----- Payments & Invoices ----- */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              (navigation as any).navigate('CompanyPayments', { companyId })
            }
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Payments</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              (navigation as any).navigate('CompanyInvoices', { companyId })
            }
          >
            <LinearGradient
              colors={['#6C5CE7', '#A29BFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Invoices</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ----- Deactivate / Share ----- */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.halfButton]}
            onPress={handleToggleActive}
            disabled={actionLoading}
          >
            <LinearGradient
              colors={
                company.is_active
                  ? ['#FF6B6B', '#EE5A24']
                  : ['#00B894', '#00A86B']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>
                {actionLoading
                  ? 'Processing...'
                  : company.is_active
                  ? 'Deactivate'
                  : 'Reactivate'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.halfButton]}
            onPress={handleShare}
          >
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

        {/* ----- Quick Links ----- */}
        <View style={styles.quickLinks}>
          <Text variant="titleMedium" style={styles.quickLinksTitle}>
            Quick Links
          </Text>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() =>
              (navigation as any).navigate('CompanyPayments', { companyId })
            }
          >
            <Text style={styles.linkText}>Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() =>
              (navigation as any).navigate('CompanyInvoices', { companyId })
            }
          >
            <Text style={styles.linkText}>Invoices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() =>
              (navigation as any).navigate('CompanyUpdateDetails', {
                companyId,
                company,
              })
            }
          >
            <Text style={styles.linkText}>Update Company Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => (navigation as any).navigate('UserSearch')}
          >
            <Text style={styles.linkText}>View All Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => (navigation as any).navigate('AuditLogs', { companyId })}
          >
            <Text style={styles.linkText}>Audit Logs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => (navigation as any).navigate('KYCUpload')}
          >
            <Text style={styles.linkText}>Upload KYC Document</Text>
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
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  tierBadge: { backgroundColor: '#E8E0F0' },
  tierText: { fontSize: 12, fontWeight: '600', color: '#333' },
  planBadge: { backgroundColor: '#E0F7FA', maxWidth: 180 },
  planText: { fontSize: 12, fontWeight: '600', color: '#00695C' },
  warningBanner: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  warningText: { color: '#8D6E00', fontSize: 13, fontWeight: '500' },
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
  cardContent: { backgroundColor: '#FFFFFF' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: { color: '#666', fontSize: 14, marginRight: 8, flexShrink: 0 },
  value: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexShrink: 1,
  },
  statsTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  halfButton: { flex: 0.48, borderRadius: 12, overflow: 'hidden' },
  fullButton: { borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonRow: { flexDirection: 'row', marginTop: 8 },
  divider: { marginVertical: 16 },
  quickLinks: { marginTop: 8 },
  quickLinksTitle: {
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  linkItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkText: { fontSize: 16, color: '#7B2FBE' },
  sectionTitle: {
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
});