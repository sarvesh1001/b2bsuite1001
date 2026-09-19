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
import { createAdjustment } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CreateAdjustment'>;

export default function CreateAdjustmentForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [userId, setUserId] = useState('');
  const [componentCode, setComponentCode] = useState('');
  const [amount, setAmount] = useState('');
  const [adjustmentType, setAdjustmentType] = useState('');
  const [reason, setReason] = useState('');
  const [applicableMonth, setApplicableMonth] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!userId.trim()) { Alert.alert('Error', 'User ID is required'); return; }
    if (!componentCode.trim()) { Alert.alert('Error', 'Component Code is required'); return; }
    if (!amount || isNaN(Number(amount))) { Alert.alert('Error', 'Valid amount is required'); return; }
    if (!adjustmentType.trim()) { Alert.alert('Error', 'Adjustment type is required'); return; }
    if (!applicableMonth.trim() || !/^\d{4}-\d{2}$/.test(applicableMonth)) {
      Alert.alert('Error', 'Applicable month must be in YYYY-MM format');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await createAdjustment(companyId, deviceId, accessToken, {
        user_id: userId.trim(),
        component_code: componentCode.trim(),
        amount: Number(amount),
        adjustment_type: adjustmentType.trim(),
        reason: reason.trim() || undefined,
        applicable_month: applicableMonth.trim(),
      });
      Alert.alert('Success', 'Adjustment created successfully');
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
        <Text style={styles.headerTitle}>Create Adjustment</Text>
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

          <Text style={styles.label}>Component Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., BONUS"
            value={componentCode}
            onChangeText={setComponentCode}
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Adjustment Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., bonus, deduction"
            value={adjustmentType}
            onChangeText={setAdjustmentType}
          />

          <Text style={styles.label}>Reason (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Reason for adjustment"
            value={reason}
            onChangeText={setReason}
            multiline
          />

          <Text style={styles.label}>Applicable Month (YYYY-MM)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2026-02"
            value={applicableMonth}
            onChangeText={setApplicableMonth}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Adjustment</Text>
          )}
        </TouchableOpacity>
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  formContainer: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 4,
  },
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