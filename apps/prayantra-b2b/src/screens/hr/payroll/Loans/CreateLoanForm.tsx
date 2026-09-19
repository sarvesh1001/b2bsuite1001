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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { createLoan, previewEMI } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CreateLoan'>;
type RouteProps = RouteProp<RootStackParamList, 'CreateLoan'>;

export default function CreateLoanForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { userId: preFilledUserId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [userId, setUserId] = useState(preFilledUserId || '');
  const [loanType, setLoanType] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [emiAmount, setEmiAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [interestType, setInterestType] = useState<'fixed' | 'floating'>('fixed');
  const [totalEmis, setTotalEmis] = useState('');
  const [disbursedAt, setDisbursedAt] = useState(new Date());
  const [firstEmiDate, setFirstEmiDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [componentCode, setComponentCode] = useState('LOAN');
  const [maxCtcPercent, setMaxCtcPercent] = useState('');
  const [showDisbursedPicker, setShowDisbursedPicker] = useState(false);
  const [showFirstEmiPicker, setShowFirstEmiPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<any>(null);

  const handlePreview = async () => {
    if (!userId.trim()) { Alert.alert('Error', 'User ID is required'); return; }
    if (!principalAmount || isNaN(Number(principalAmount)) || Number(principalAmount) <= 0) {
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
    if (!maxCtcPercent || isNaN(Number(maxCtcPercent))) {
      Alert.alert('Error', 'Valid max CTC percent is required');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setPreviewing(true);
    try {
      const res = await previewEMI(companyId, deviceId, accessToken, {
        user_id: userId.trim(),
        principal: Number(principalAmount),
        total_emis: Number(totalEmis),
        interest_rate: Number(interestRate),
        interest_type: interestType,
        max_ctc_percent: Number(maxCtcPercent),
      });
      setPreviewResult(res.data);
      Alert.alert('Preview', `EMI Amount: ₹${res.data.emi_amount?.toFixed(2) || 'N/A'}`);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId.trim()) { Alert.alert('Error', 'User ID is required'); return; }
    if (!loanType.trim()) { Alert.alert('Error', 'Loan type is required'); return; }
    if (!principalAmount || isNaN(Number(principalAmount)) || Number(principalAmount) <= 0) {
      Alert.alert('Error', 'Valid principal amount is required');
      return;
    }
    if (!emiAmount || isNaN(Number(emiAmount)) || Number(emiAmount) <= 0) {
      Alert.alert('Error', 'Valid EMI amount is required');
      return;
    }
    if (!interestRate || isNaN(Number(interestRate)) || Number(interestRate) < 0) {
      Alert.alert('Error', 'Valid interest rate is required');
      return;
    }
    if (!totalEmis || isNaN(Number(totalEmis)) || Number(totalEmis) <= 0) {
      Alert.alert('Error', 'Valid total EMIs is required');
      return;
    }
    if (!componentCode.trim()) { Alert.alert('Error', 'Component code is required'); return; }
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
      await createLoan(companyId, deviceId, accessToken, {
        user_id: userId.trim(),
        loan_type: loanType.trim(),
        principal_amount: Number(principalAmount),
        emi_amount: Number(emiAmount),
        interest_rate: Number(interestRate),
        interest_type: interestType,
        total_emis: Number(totalEmis),
        disbursed_at: disbursedAt.toISOString(),
        first_emi_date: firstEmiDate.toISOString(),
        component_code: componentCode.trim(),
        max_ctc_percent: Number(maxCtcPercent),
      });
      Alert.alert('Success', 'Loan created');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Creation failed');
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
        <Text style={styles.headerTitle}>Create Loan</Text>
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
            editable={!preFilledUserId}
          />

          <Text style={styles.label}>Loan Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., vehicle, personal"
            value={loanType}
            onChangeText={setLoanType}
          />

          <Text style={styles.label}>Principal Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="500000"
            keyboardType="numeric"
            value={principalAmount}
            onChangeText={setPrincipalAmount}
          />

          <Text style={styles.label}>EMI Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="15000"
            keyboardType="numeric"
            value={emiAmount}
            onChangeText={setEmiAmount}
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

          <Text style={styles.label}>Total EMIs</Text>
          <TextInput
            style={styles.input}
            placeholder="36"
            keyboardType="numeric"
            value={totalEmis}
            onChangeText={setTotalEmis}
          />

          <Text style={styles.label}>Disbursed At</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDisbursedPicker(true)}
          >
            <Text>{disbursedAt.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          <Text style={styles.label}>First EMI Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowFirstEmiPicker(true)}
          >
            <Text>{firstEmiDate.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          <Text style={styles.label}>Component Code</Text>
          <TextInput
            style={styles.input}
            placeholder="LOAN"
            value={componentCode}
            onChangeText={setComponentCode}
          />

          <Text style={styles.label}>Max CTC Percent</Text>
          <TextInput
            style={styles.input}
            placeholder="20"
            keyboardType="numeric"
            value={maxCtcPercent}
            onChangeText={setMaxCtcPercent}
          />

          <TouchableOpacity
            style={[styles.previewButton, previewing && styles.disabledButton]}
            onPress={handlePreview}
            disabled={previewing}
          >
            {previewing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.previewText}>Preview EMI</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Create Loan</Text>}
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={showDisbursedPicker}
        mode="date"
        date={disbursedAt}
        onConfirm={(date) => { setShowDisbursedPicker(false); setDisbursedAt(date); }}
        onCancel={() => setShowDisbursedPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showFirstEmiPicker}
        mode="date"
        date={firstEmiDate}
        onConfirm={(date) => { setShowFirstEmiPicker(false); setFirstEmiDate(date); }}
        onCancel={() => setShowFirstEmiPicker(false)}
      />
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
  dateButton: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  previewButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  previewText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});