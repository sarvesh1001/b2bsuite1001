import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { previewEMI } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'PreviewEMI'>;

export default function PreviewEMIForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [userId, setUserId] = useState('');
  const [principal, setPrincipal] = useState('');
  const [totalEmis, setTotalEmis] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [interestType, setInterestType] = useState<'fixed' | 'floating'>('fixed');
  const [maxCtcPercent, setMaxCtcPercent] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePreview = async () => {
    if (!userId.trim()) { Alert.alert('Error', 'User ID is required'); return; }
    if (!principal || isNaN(Number(principal)) || Number(principal) <= 0) {
      Alert.alert('Error', 'Valid principal amount is required');
      return;
    }
    if (!totalEmis || isNaN(Number(totalEmis)) || Number(totalEmis) <= 0) {
      Alert.alert('Error', 'Valid total EMIs is required');
      return;
    }
    if (!interestRate || isNaN(Number(interestRate)) || Number(interestRate) < 0) {
      Alert.alert('Error', 'Valid interest rate is required');
      return;
    }
    if (!maxCtcPercent || isNaN(Number(maxCtcPercent)) || Number(maxCtcPercent) <= 0) {
      Alert.alert('Error', 'Valid max CTC percent is required');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      const res = await previewEMI(companyId, deviceId, accessToken, {
        user_id: userId.trim(),
        principal: Number(principal),
        total_emis: Number(totalEmis),
        interest_rate: Number(interestRate),
        interest_type: interestType,
        max_ctc_percent: Number(maxCtcPercent),
      });
      setResult(res.data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview EMI</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>User ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter user ID"
            value={userId}
            onChangeText={setUserId}
          />

          <Text style={styles.label}>Principal Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="500000"
            keyboardType="numeric"
            value={principal}
            onChangeText={setPrincipal}
          />

          <Text style={styles.label}>Total EMIs</Text>
          <TextInput
            style={styles.input}
            placeholder="36"
            keyboardType="numeric"
            value={totalEmis}
            onChangeText={setTotalEmis}
          />

          <Text style={styles.label}>Interest Rate</Text>
          <TextInput
            style={styles.input}
            placeholder="8.5"
            keyboardType="numeric"
            value={interestRate}
            onChangeText={setInterestRate}
          />

          <Text style={styles.label}>Interest Type</Text>
          <View style={styles.switchContainer}>
            <TouchableOpacity
              style={[styles.sideButton, interestType === 'fixed' && styles.sideActive]}
              onPress={() => setInterestType('fixed')}
            >
              <Text style={[styles.sideText, interestType === 'fixed' && styles.sideTextActive]}>Fixed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sideButton, interestType === 'floating' && styles.sideActive]}
              onPress={() => setInterestType('floating')}
            >
              <Text style={[styles.sideText, interestType === 'floating' && styles.sideTextActive]}>Floating</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Max CTC Percent</Text>
          <TextInput
            style={styles.input}
            placeholder="20"
            keyboardType="numeric"
            value={maxCtcPercent}
            onChangeText={setMaxCtcPercent}
          />

          <TouchableOpacity
            style={[styles.previewButton, loading && styles.disabledButton]}
            onPress={handlePreview}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.previewText}>Preview</Text>}
          </TouchableOpacity>

          {result && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Preview Result</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>EMI Amount:</Text>
                <Text style={styles.resultValue}>₹{result.emi_amount?.toFixed(2)}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total Interest:</Text>
                <Text style={styles.resultValue}>₹{result.total_interest?.toFixed(2)}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total Payment:</Text>
                <Text style={styles.resultValue}>₹{result.total_payment?.toFixed(2)}</Text>
              </View>
              {result.schedule && (
                <Text style={styles.resultNote}>EMI schedule available in console</Text>
              )}
            </View>
          )}
        </View>
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
  formContainer: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  label: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: '#fff',
  },
  switchContainer: { flexDirection: 'row', marginTop: 4 },
  sideButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginRight: 8,
    borderRadius: 6,
  },
  sideActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  sideText: { color: TEXT_SECONDARY },
  sideTextActive: { color: '#fff' },
  previewButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  previewText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.6 },
  resultContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  resultTitle: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 6 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  resultLabel: { fontSize: 13, color: TEXT_SECONDARY },
  resultValue: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY },
  resultNote: { fontSize: 12, color: TEXT_SECONDARY, marginTop: 6, fontStyle: 'italic' },
});