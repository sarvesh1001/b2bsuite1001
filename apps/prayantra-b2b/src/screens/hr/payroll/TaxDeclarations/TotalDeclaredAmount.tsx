import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getTotalDeclaredAmount } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'TotalDeclaredAmount'>;

export default function TotalDeclaredAmount() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [financialYear, setFinancialYear] = useState(
    `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(2)}`
  );
  const [onlyVerified, setOnlyVerified] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTotal = async () => {
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const res = await getTotalDeclaredAmount(companyId, deviceId, accessToken, {
        financial_year: financialYear,
        only_verified: onlyVerified,
      });
      setTotal(res.data?.total || 0);
    } catch (error) {
      console.error('Failed to fetch total declared amount:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTotal();
    }, [financialYear, onlyVerified])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTotal();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Total Declared Amount</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          <Text style={styles.label}>Financial Year</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2025-26"
            value={financialYear}
            onChangeText={setFinancialYear}
          />

          <View style={styles.switchContainer}>
            <Text style={styles.label}>Only Verified</Text>
            <TouchableOpacity
              style={[styles.toggleButton, onlyVerified && styles.toggleActive]}
              onPress={() => setOnlyVerified(!onlyVerified)}
            >
              <Text style={[styles.toggleText, onlyVerified && styles.toggleTextActive]}>
                {onlyVerified ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
        ) : (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Declared Amount</Text>
            <Text style={styles.totalValue}>₹{total?.toLocaleString() || '0'}</Text>
            <Text style={styles.yearText}>Financial Year: {financialYear}</Text>
            {onlyVerified && <Text style={styles.verifiedText}>Verified declarations only</Text>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
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
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  label: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#fff',
  },
  toggleActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  toggleText: { fontSize: 14, fontWeight: '600', color: TEXT_SECONDARY },
  toggleTextActive: { color: '#fff' },
  loader: { marginTop: 40 },
  totalCard: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    alignItems: 'center',
  },
  totalLabel: { fontSize: 14, color: TEXT_SECONDARY },
  totalValue: { fontSize: 32, fontWeight: '700', color: PRIMARY_COLOR, marginTop: 8 },
  yearText: { fontSize: 13, color: TEXT_SECONDARY, marginTop: 8 },
  verifiedText: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 2 },
});