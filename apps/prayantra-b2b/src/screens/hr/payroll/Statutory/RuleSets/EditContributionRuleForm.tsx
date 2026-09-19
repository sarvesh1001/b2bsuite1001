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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { listContributionRules, updateContributionRule } from '@b2b/api-client';
import { ContributionRule } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EditContributionRule'>;
type RouteProps = RouteProp<RootStackParamList, 'EditContributionRule'>;

export default function EditContributionRuleForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId, ruleId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [rule, setRule] = useState<ContributionRule | null>(null);
  const [statutoryCode, setStatutoryCode] = useState('');
  const [contributionSide, setContributionSide] = useState<'employee' | 'employer'>('employee');
  const [calculationType, setCalculationType] = useState<'percentage' | 'fixed'>('percentage');
  const [rateValue, setRateValue] = useState('');
  const [wageCeiling, setWageCeiling] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchRule = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        // Fetch all contribution rules for this rule set
        const res = await listContributionRules(companyId, ruleSetId, deviceId, accessToken);
        const rules = res.data || [];
        // Find the rule with matching ID
        const found = rules.find(r => r.id === ruleId);
        if (!found) {
          Alert.alert('Error', 'Rule not found');
          navigation.goBack();
          return;
        }
        setRule(found);
        // Populate form fields
        setStatutoryCode(found.statutory_code || '');
        setContributionSide(found.contribution_side || 'employee');
        setCalculationType(found.calculation_type || 'percentage');
        setRateValue(String(found.rate_value ?? ''));
        setWageCeiling(found.wage_ceiling ? String(found.wage_ceiling) : '');
        if (found.effective_from) {
          setEffectiveFrom(new Date(found.effective_from));
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load contribution rule');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchRule();
  }, [ruleSetId, ruleId]);

  const handleSubmit = async () => {
    if (!rule) return;
    if (!rateValue || isNaN(Number(rateValue))) {
      Alert.alert('Error', 'Valid rate value is required');
      return;
    }

    setSubmitting(true);
    try {
      await updateContributionRule(
        companyId!,
        ruleSetId,
        ruleId,
        deviceId!,
        accessToken!,
        {
          contribution_side: contributionSide,
          calculation_type: calculationType,
          rate_value: Number(rateValue),
          wage_ceiling: wageCeiling ? Number(wageCeiling) : undefined,
          effective_from: effectiveFrom.toISOString().split('T')[0],
        }
      );
      Alert.alert('Success', 'Contribution rule updated');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update rule');
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
        <Text style={styles.headerTitle}>Edit Contribution Rule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Statutory Code</Text>
          <TextInput style={styles.input} value={statutoryCode} editable={false} />

          <Text style={styles.label}>Contribution Side</Text>
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.optionButton, contributionSide === 'employee' && styles.selectedOption]}
              onPress={() => setContributionSide('employee')}
            >
              <Text style={styles.optionButtonText}>Employee</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, contributionSide === 'employer' && styles.selectedOption]}
              onPress={() => setContributionSide('employer')}
            >
              <Text style={styles.optionButtonText}>Employer</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Calculation Type</Text>
          <View style={styles.rowButtons}>
            <TouchableOpacity
              style={[styles.optionButton, calculationType === 'percentage' && styles.selectedOption]}
              onPress={() => setCalculationType('percentage')}
            >
              <Text style={styles.optionButtonText}>Percentage</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, calculationType === 'fixed' && styles.selectedOption]}
              onPress={() => setCalculationType('fixed')}
            >
              <Text style={styles.optionButtonText}>Fixed</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Rate Value</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={rateValue}
            onChangeText={setRateValue}
          />

          <Text style={styles.label}>Wage Ceiling (optional)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={wageCeiling}
            onChangeText={setWageCeiling}
          />

          <Text style={styles.label}>Effective From</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
          >
            <Text>{effectiveFrom.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Update</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={showPicker}
        mode="date"
        date={effectiveFrom}
        onConfirm={(date) => {
          setShowPicker(false);
          setEffectiveFrom(date);
        }}
        onCancel={() => setShowPicker(false)}
      />
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
  rowButtons: {
    flexDirection: 'row',
    marginTop: 4,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 6,
    marginRight: 8,
  },
  selectedOption: {
    backgroundColor: PRIMARY_COLOR + '20',
    borderColor: PRIMARY_COLOR,
  },
  optionButtonText: { fontSize: 14, color: TEXT_PRIMARY },
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