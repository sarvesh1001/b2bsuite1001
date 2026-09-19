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
import { createAttendanceRule } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CreateAttendanceRule'>;

export default function CreateAttendanceRuleForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [ruleType, setRuleType] = useState('');
  const [calculationType, setCalculationType] = useState('');
  const [value, setValue] = useState('');
  const [basedOn, setBasedOn] = useState('');
  const [thresholdMinutes, setThresholdMinutes] = useState('');
  const [componentCode, setComponentCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!ruleType.trim()) { Alert.alert('Error', 'Rule type is required'); return; }
    if (!calculationType.trim()) { Alert.alert('Error', 'Calculation type is required'); return; }
    if (!value || isNaN(Number(value)) || Number(value) <= 0) {
      Alert.alert('Error', 'Valid value is required');
      return;
    }
    if (!basedOn.trim()) { Alert.alert('Error', 'Based on is required'); return; }
    if (!componentCode.trim()) { Alert.alert('Error', 'Component code is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await createAttendanceRule(companyId, deviceId, accessToken, {
        rule_type: ruleType.trim(),
        calculation_type: calculationType.trim(),
        value: Number(value),
        based_on: basedOn.trim(),
        threshold_minutes: thresholdMinutes ? Number(thresholdMinutes) : undefined,
        component_code: componentCode.trim(),
      });
      Alert.alert('Success', 'Attendance rule created');
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
        <Text style={styles.headerTitle}>Create Attendance Rule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Rule Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., overtime, late, half_day"
            value={ruleType}
            onChangeText={setRuleType}
          />

          <Text style={styles.label}>Calculation Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., multiplier, fixed, percentage"
            value={calculationType}
            onChangeText={setCalculationType}
          />

          <Text style={styles.label}>Value</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1.5"
            keyboardType="numeric"
            value={value}
            onChangeText={setValue}
          />

          <Text style={styles.label}>Based On</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., hourly, daily, monthly"
            value={basedOn}
            onChangeText={setBasedOn}
          />

          <Text style={styles.label}>Threshold Minutes (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 15"
            keyboardType="numeric"
            value={thresholdMinutes}
            onChangeText={setThresholdMinutes}
          />

          <Text style={styles.label}>Component Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., OVERTIME"
            value={componentCode}
            onChangeText={setComponentCode}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Create Rule</Text>}
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