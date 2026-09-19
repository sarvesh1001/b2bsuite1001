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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { lockFinesForPayrollRun } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'LockFinesForPayroll'>;

export default function LockFinesForPayrollForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [periodStart, setPeriodStart] = useState(new Date());
  const [periodEnd, setPeriodEnd] = useState(new Date());
  const [payrollRunId, setPayrollRunId] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!payrollRunId.trim()) { Alert.alert('Error', 'Payroll Run ID is required'); return; }
    if (periodEnd < periodStart) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await lockFinesForPayrollRun(companyId, deviceId, accessToken, {
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        payroll_run_id: payrollRunId.trim(),
      });
      Alert.alert('Success', 'Fines locked for payroll run');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Locking failed');
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
        <Text style={styles.headerTitle}>Lock Fines for Payroll Run</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Period Start</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
            <Text>{periodStart.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          <Text style={styles.label}>Period End</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
            <Text>{periodEnd.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          <Text style={styles.label}>Payroll Run ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter payroll run ID"
            value={payrollRunId}
            onChangeText={setPayrollRunId}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Lock Fines</Text>}
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        date={periodStart}
        onConfirm={(date) => { setShowStartPicker(false); setPeriodStart(date); }}
        onCancel={() => setShowStartPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        date={periodEnd}
        onConfirm={(date) => { setShowEndPicker(false); setPeriodEnd(date); }}
        onCancel={() => setShowEndPicker(false)}
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