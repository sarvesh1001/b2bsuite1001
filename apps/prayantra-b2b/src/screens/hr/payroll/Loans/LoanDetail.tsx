import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getLoan, getPendingEMIsForLoan } from '@b2b/api-client';
import { Loan, EMI } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'LoanDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'LoanDetail'>;

export default function LoanDetail() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { loanId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [pendingEmis, setPendingEmis] = useState<EMI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const [loanRes, emiRes] = await Promise.all([
        getLoan(companyId, loanId, deviceId, accessToken),
        getPendingEMIsForLoan(companyId, loanId, deviceId, accessToken),
      ]);
      setLoan(loanRes.data);
      setPendingEmis(emiRes.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load loan details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [loanId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'closed': return '#9E9E9E';
      case 'defaulted': return '#F44336';
      default: return TEXT_SECONDARY;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!loan) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Loan not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loan Detail</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('LoanPaymentsList', { loanId })}
          style={styles.actionButton}
        >
          <Icon name="cash" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.type}>{loan.loan_type.toUpperCase()}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(loan.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(loan.status) }]}>
                {loan.status}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.label}>Principal:</Text>
            <Text style={styles.value}>₹{loan.principal_amount.toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>EMI:</Text>
            <Text style={styles.value}>₹{loan.emi_amount.toLocaleString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Interest Rate:</Text>
            <Text style={styles.value}>{loan.interest_rate}% ({loan.interest_type})</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Total EMIs:</Text>
            <Text style={styles.value}>{loan.total_emis}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Disbursed:</Text>
            <Text style={styles.value}>{new Date(loan.disbursed_at).toLocaleDateString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>First EMI:</Text>
            <Text style={styles.value}>{new Date(loan.first_emi_date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Max CTC %:</Text>
            <Text style={styles.value}>{loan.max_ctc_percent}%</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Component:</Text>
            <Text style={styles.value}>{loan.component_code}</Text>
          </View>
          {loan.closed_at && (
            <View style={styles.detailRow}>
              <Text style={styles.label}>Closed At:</Text>
              <Text style={styles.value}>{new Date(loan.closed_at).toLocaleDateString()}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Pending EMIs</Text>
        {pendingEmis.length === 0 ? (
          <Text style={styles.emptyText}>No pending EMIs</Text>
        ) : (
          pendingEmis.map((emi) => (
            <View key={emi.id} style={styles.emiCard}>
              <Text style={styles.emiNumber}>EMI #{emi.emi_number}</Text>
              <View style={styles.emiDetailRow}>
                <Text style={styles.emiLabel}>Due:</Text>
                <Text style={styles.emiValue}>{new Date(emi.due_date).toLocaleDateString()}</Text>
              </View>
              <View style={styles.emiDetailRow}>
                <Text style={styles.emiLabel}>Amount:</Text>
                <Text style={styles.emiValue}>₹{emi.amount.toLocaleString()}</Text>
              </View>
            </View>
          ))
        )}

        <View style={styles.actionContainer}>
          {loan.status === 'active' && (
            <>
              <TouchableOpacity
                style={[styles.actionButtonLarge, styles.closeButton]}
                onPress={() => navigation.navigate('CloseLoan', { loanId })}
              >
                <Icon name="close" size={20} color="#fff" />
                <Text style={styles.actionText}>Close Loan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButtonLarge, styles.paymentButton]}
                onPress={() => navigation.navigate('ManualPayment', { loanId })}
              >
                <Icon name="cash-plus" size={20} color="#fff" />
                <Text style={styles.actionText}>Manual Payment</Text>
              </TouchableOpacity>
            </>
          )}
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
  actionButton: { padding: 4 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  type: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '600' },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: { fontSize: 14, color: TEXT_SECONDARY },
  value: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12, marginBottom: 8 },
  emiCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  emiNumber: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 2 },
  emiDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 1,
  },
  emiLabel: { fontSize: 13, color: TEXT_SECONDARY },
  emiValue: { fontSize: 13, fontWeight: '500', color: TEXT_PRIMARY },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  actionButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    flex: 0.45,
  },
  closeButton: { backgroundColor: '#F44336' },
  paymentButton: { backgroundColor: '#4CAF50' },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 16, color: TEXT_SECONDARY },
});