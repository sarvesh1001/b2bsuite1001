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
import { useUserAuthStore } from '../../../../store/userAuthStore';
import {
  getRunExecutionStatus,
  initializeRun,
  executeRun,
  approveRun,
  cancelRun,
} from '@b2b/api-client';
import { PayrollRun } from '@b2b/shared-types';
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

// ✅ Import child components (ensure each exports `default`)
import RunEmployeesList from './RunEmployeesList';
import RunStatutorySummary from './RunStatutorySummary';
import RunLedgerSummary from './RunLedgerSummary';
import ExportRunCSV from './ExportRunCSV';
import GenerateBankFileForm from './GenerateBankFileForm';
import ReprocessEmployeeForm from './ReprocessEmployeeForm';
import InitializeRunButton from './InitializeRunButton';
import ExecuteRunButton from './ExecuteRunButton';

type NavigationProps = StackNavigationProp<RootStackParamList, 'PayrollRunDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'PayrollRunDetail'>;

type Tab = 'overview' | 'employees' | 'statutory' | 'ledger';

export default function PayrollRunDetail() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { runId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const fetchRun = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getRunExecutionStatus(companyId, runId, deviceId, accessToken);
      setRun(res.data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch run details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRun();
  }, [runId]);

  const renderTabContent = () => {
    if (!run) return null;
    switch (activeTab) {
      case 'overview':
        return <RunOverview run={run} onRefresh={fetchRun} />;
      case 'employees':
        return <RunEmployeesList runId={runId} />;
      case 'statutory':
        return <RunStatutorySummary runId={runId} />;
      case 'ledger':
        return <RunLedgerSummary runId={runId} />;
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

  if (!run) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Run {run.id.slice(0, 8)}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['overview', 'employees', 'statutory', 'ledger'] as Tab[]).map((tab) => (
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

      <ScrollView contentContainerStyle={styles.tabContent}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================================
// OVERVIEW COMPONENT (inline)
// ============================================================
function RunOverview({ run, onRefresh }: { run: PayrollRun; onRefresh: () => void }) {
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [actionLoading, setActionLoading] = useState(false);

  const handleAction = async (
    action: () => Promise<any>,
    successMsg: string,
    confirmMsg?: string
  ) => {
    if (confirmMsg) {
      Alert.alert('Confirm', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            setActionLoading(true);
            try {
              await action();
              Alert.alert('Success', successMsg);
              onRefresh();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Action failed');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]);
    } else {
      setActionLoading(true);
      try {
        await action();
        Alert.alert('Success', successMsg);
        onRefresh();
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Action failed');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const canInitialize = run.status === 'initialized';
  const canExecute = run.status === 'initialized' || run.status === 'running';
  const canApprove = run.status === 'completed';
  const canCancel = !['paid', 'cancelled'].includes(run.status);

  return (
    <View style={styles.overview}>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Status</Text>
        <Text style={[styles.infoValue, { color: run.status === 'completed' ? '#4CAF50' : '#FF9800' }]}>
          {run.status}
        </Text>
        <Text style={styles.infoLabel}>Period</Text>
        <Text style={styles.infoValue}>
          {new Date(run.period_start).toLocaleDateString()} - {new Date(run.period_end).toLocaleDateString()}
        </Text>
        <Text style={styles.infoLabel}>Created</Text>
        <Text style={styles.infoValue}>{new Date(run.created_at).toLocaleString()}</Text>
      </View>

      <View style={styles.actionsContainer}>
        {canInitialize && (
          <InitializeRunButton
            runId={run.id}
            onSuccess={onRefresh}
            disabled={actionLoading}
          />
        )}
        {canExecute && (
          <ExecuteRunButton
            runId={run.id}
            onSuccess={onRefresh}
            disabled={actionLoading}
          />
        )}
        {canApprove && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              handleAction(
                () => approveRun(companyId!, run.id, deviceId!, accessToken!),
                'Run approved',
                'Approve this payroll run?'
              )
            }
            disabled={actionLoading}
          >
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
        )}
        {canCancel && (
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() =>
              handleAction(
                () => cancelRun(companyId!, run.id, deviceId!, accessToken!),
                'Run cancelled',
                'Cancel this payroll run? This cannot be undone.'
              )
            }
            disabled={actionLoading}
          >
            <Text style={[styles.actionText, styles.cancelText]}>Cancel</Text>
          </TouchableOpacity>
        )}
        <ExportRunCSV runId={run.id} />
        <GenerateBankFileForm runId={run.id} />
        <ReprocessEmployeeForm runId={run.id} />
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: { fontSize: 14, color: TEXT_SECONDARY },
  activeTabText: { color: PRIMARY_COLOR, fontWeight: '600' },
  tabContent: { padding: 16, paddingBottom: 40 },
  overview: { flex: 1 },
  infoCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
  },
  infoLabel: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 6 },
  infoValue: { fontSize: 14, color: TEXT_PRIMARY, fontWeight: '500' },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: ERROR_COLOR },
  actionText: { color: '#fff', fontWeight: '600' },
  cancelText: { color: '#fff' },
});