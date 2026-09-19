import React, { useState, useEffect } from 'react';
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
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { getAttendanceRules, updateAttendanceRuleVersion } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EditAttendanceRule'>;
type RouteProps = RouteProp<RootStackParamList, 'EditAttendanceRule'>;

export default function EditAttendanceRuleForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [ruleType, setRuleType] = useState('');
  const [calculationType, setCalculationType] = useState('');
  const [value, setValue] = useState('');
  const [basedOn, setBasedOn] = useState('');
  const [thresholdMinutes, setThresholdMinutes] = useState('');
  const [componentCode, setComponentCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchRule = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await getAttendanceRules(companyId, deviceId, accessToken);
        const rule = res.data?.find((r: any) => r.id === ruleId);
        if (!rule) { throw new Error('Rule not found'); }
        setRuleType(rule.rule_type);
        setCalculationType(rule.calculation_type);
        setValue(String(rule.value));
        setBasedOn(rule.based_on);
        setThresholdMinutes(rule.threshold_minutes !== undefined ? String(rule.threshold_minutes) : '');
        setComponentCode(rule.component_code);
      } catch (error) {
        Alert.alert('Error', 'Failed to load rule');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchRule();
  }, [ruleId]);

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

    setSubmitting(true);
    try {
      await updateAttendanceRuleVersion(companyId, ruleId, deviceId, accessToken, {
        rule_type: ruleType.trim(),
        calculation_type: calculationType.trim(),
        value: Number(value),
        based_on: basedOn.trim(),
        threshold_minutes: thresholdMinutes ? Number(thresholdMinutes) : undefined,
        component_code: componentCode.trim(),
      });
      Alert.alert('Success', 'Rule updated');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Update failed');
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Attendance Rule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Rule Type</Text>
          <TextInput
            style={styles.input}
            value={ruleType}
            onChangeText={setRuleType}
          />

          <Text style={styles.label}>Calculation Type</Text>
          <TextInput
            style={styles.input}
            value={calculationType}
            onChangeText={setCalculationType}
          />

          <Text style={styles.label}>Value</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={value}
            onChangeText={setValue}
          />

          <Text style={styles.label}>Based On</Text>
          <TextInput
            style={styles.input}
            value={basedOn}
            onChangeText={setBasedOn}
          />

          <Text style={styles.label}>Threshold Minutes</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="Optional"
            value={thresholdMinutes}
            onChangeText={setThresholdMinutes}
          />

          <Text style={styles.label}>Component Code</Text>
          <TextInput
            style={styles.input}
            value={componentCode}
            onChangeText={setComponentCode}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Update Rule</Text>}
        </TouchableOpacity>
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