// apps/prayantra-b2b/src/screens/hr/payroll/BankDetailsList.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../store/userAuthStore';
import {
  listBankDetails,
  activateBankDetails,
  deactivateBankDetails,
} from '@b2b/api-client';
import { BankDetail } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';
import { RootStackParamList } from '../../../navigation';

type RouteProps = RouteProp<RootStackParamList, 'BankDetailsList'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'BankDetailsList'>;

export default function BankDetailsList() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { userId, userName } = route.params || {};

  const { accessToken, deviceId, companyId, user } = useUserAuthStore();
  // ✅ Safely get target user ID
  const targetUserId = userId || (user && typeof user === 'object' && 'id' in user ? (user as any).id : undefined);

  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchBankDetails = useCallback(async (showRefresh = false) => {
    if (!accessToken || !companyId || !deviceId || !targetUserId) {
      setLoading(false);
      return;
    }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await listBankDetails(companyId, targetUserId, deviceId, accessToken);
      setBankDetails(res.data || []);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to load bank details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, companyId, deviceId, targetUserId]);

  useFocusEffect(
    useCallback(() => {
      fetchBankDetails();
    }, [fetchBankDetails])
  );

  const handleToggleActive = (detail: BankDetail) => {
    const action = detail.is_active ? 'Deactivate' : 'Activate';
    Alert.alert(
      `${action} Bank Account`,
      `Are you sure you want to ${action.toLowerCase()} this bank account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: detail.is_active ? 'destructive' : 'default',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) return;
            setActionLoadingId(detail.id);
            try {
              if (detail.is_active) {
                await deactivateBankDetails(companyId, detail.id, deviceId, accessToken);
              } else {
                await activateBankDetails(companyId, detail.id, deviceId, accessToken);
              }
              setBankDetails((prev) =>
                prev.map((item) =>
                  item.id === detail.id ? { ...item, is_active: !item.is_active } : item
                )
              );
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Action failed');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: BankDetail }) => {
    const isActioning = actionLoadingId === item.id;
    const statusColor = item.is_active ? '#10b981' : '#ef4444';
    const statusLabel = item.is_active ? 'Active' : 'Inactive';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Icon name="bank" size={22} color={PRIMARY_COLOR} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.bankName} numberOfLines={1}>
              {item.bank_name}
            </Text>
            <Text style={styles.accountHolder}>{item.account_holder_name}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Account No.</Text>
            <Text style={styles.detailValue}>****{item.account_number.slice(-4)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>IFSC</Text>
            <Text style={styles.detailValue}>{item.ifsc_code}</Text>
          </View>
          {item.bank_branch && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Branch</Text>
              <Text style={styles.detailValue}>{item.bank_branch}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Effective From</Text>
            <Text style={styles.detailValue}>{item.effective_from?.split('T')[0]}</Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              // ✅ Use correct screen name and pass required userId
              navigation.navigate('BankDetailsForm', {
                bankDetailId: item.id,
                userId: targetUserId,
              })
            }
          >
            <Icon name="pencil" size={18} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, { backgroundColor: item.is_active ? '#fef2f2' : '#ecfdf5' }]}
            onPress={() => handleToggleActive(item)}
            disabled={isActioning}
          >
            {isActioning ? (
              <ActivityIndicator size="small" color={item.is_active ? '#ef4444' : '#10b981'} />
            ) : (
              <Text style={[styles.toggleText, { color: item.is_active ? '#ef4444' : '#10b981' }]}>
                {item.is_active ? 'Deactivate' : 'Activate'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading bank details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {userName ? `${userName} - Bank Details` : 'Bank Details'}
        </Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            // ✅ Correct screen name and required params
            navigation.navigate('BankDetailsForm', {
              userId: targetUserId,
            })
          }
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={bankDetails}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchBankDetails(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bank-outline" size={60} color={TEXT_SECONDARY} />
            <Text style={styles.emptyTitle}>No Bank Details</Text>
            <Text style={styles.emptySubtitle}>
              Add your bank account information to get started.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
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
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { padding: 16 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PRIMARY_COLOR + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  bankName: { fontSize: 15, fontWeight: '600', color: TEXT_PRIMARY },
  accountHolder: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 9, fontWeight: '700' },
  detailsGrid: { marginTop: 10 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  detailLabel: { fontSize: 12, color: TEXT_SECONDARY },
  detailValue: { fontSize: 12, color: TEXT_PRIMARY, fontWeight: '500' },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    paddingTop: 10,
  },
  editButton: { padding: 6, marginRight: 10 },
  toggleButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  toggleText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12 },
  emptySubtitle: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 4, textAlign: 'center' },
});