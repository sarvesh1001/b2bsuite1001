import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { verifyDeclaration, axiosInstance } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  SUCCESS_COLOR,
  ERROR_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'VerifyDeclaration'>;
type RouteProps = RouteProp<RootStackParamList, 'VerifyDeclaration'>;

export default function VerifyDeclarationForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { declarationId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [declaration, setDeclaration] = useState<any>(null);

  useEffect(() => {
    const fetchDeclaration = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const url = `/companies/${companyId}/payroll/tax-declarations/declarations/${declarationId}`;
        const headers = {
          'X-Company-ID': companyId,
          'X-Device-ID': deviceId,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
        const response = await axiosInstance.get(url, { headers });
        setDeclaration(response.data.data); // assuming ApiResponse structure
      } catch (error) {
        Alert.alert('Error', 'Failed to load declaration');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchDeclaration();
  }, [declarationId]);

  const handleVerify = async (status: 'verified' | 'rejected') => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setSubmitting(true);
    try {
      await verifyDeclaration(companyId, declarationId, deviceId, accessToken, { status });
      Alert.alert('Success', `Declaration ${status}`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!declaration) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Declaration</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.detailLabel}>User ID</Text>
          <Text style={styles.detailValue}>{declaration.user_id}</Text>

          <Text style={styles.detailLabel}>Type</Text>
          <Text style={styles.detailValue}>{declaration.declaration_type}</Text>

          <Text style={styles.detailLabel}>Financial Year</Text>
          <Text style={styles.detailValue}>{declaration.financial_year}</Text>

          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>{declaration.amount}</Text>

          <Text style={styles.detailLabel}>Status</Text>
          <Text style={[styles.detailValue, { color: declaration.status === 'verified' ? SUCCESS_COLOR : declaration.status === 'rejected' ? ERROR_COLOR : TEXT_PRIMARY }]}>
            {declaration.status.toUpperCase()}
          </Text>

          {declaration.supporting_docs && declaration.supporting_docs.length > 0 && (
            <>
              <Text style={styles.detailLabel}>Supporting Docs</Text>
              {declaration.supporting_docs.map((doc: string, i: number) => (
                <Text key={i} style={styles.detailValue}>• {doc}</Text>
              ))}
            </>
          )}
        </View>

        {declaration.status !== 'verified' && declaration.status !== 'rejected' && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.verifyButton, styles.approveButton]}
              onPress={() => handleVerify('verified')}
              disabled={submitting}
            >
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.verifyButton, styles.rejectButton]}
              onPress={() => handleVerify('rejected')}
              disabled={submitting}
            >
              <Icon name="close-circle" size={20} color="#fff" />
              <Text style={styles.buttonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
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
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  detailLabel: { fontSize: 13, fontWeight: '600', color: TEXT_SECONDARY, marginTop: 10 },
  detailValue: { fontSize: 14, color: TEXT_PRIMARY, marginTop: 2 },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  approveButton: { backgroundColor: SUCCESS_COLOR },
  rejectButton: { backgroundColor: ERROR_COLOR },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});