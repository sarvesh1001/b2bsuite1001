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
import { createContributionRule, listComponentDefinitions } from '@b2b/api-client';
import { ComponentDefinition } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CreateContributionRule'>;
type RouteProps = RouteProp<RootStackParamList, 'CreateContributionRule'>;

export default function CreateContributionRuleForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [statutoryCode, setStatutoryCode] = useState('');
  const [contributionSide, setContributionSide] = useState<'employee' | 'employer'>('employee');
  const [calculationType, setCalculationType] = useState<'percentage' | 'fixed'>('percentage');
  const [rateValue, setRateValue] = useState('');
  const [wageCeiling, setWageCeiling] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [definitions, setDefinitions] = useState<ComponentDefinition[]>([]);
  const [showCodePicker, setShowCodePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDefs = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await listComponentDefinitions(companyId, deviceId, accessToken);
        setDefinitions(res.data || []);
      } catch (error) {
        console.error('Failed to load definitions');
      }
    };
    fetchDefs();
  }, []);

  const handleSubmit = async () => {
    if (!statutoryCode) { Alert.alert('Error', 'Statutory Code is required'); return; }
    if (!rateValue || isNaN(Number(rateValue))) { Alert.alert('Error', 'Valid rate value is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await createContributionRule(companyId, ruleSetId, deviceId, accessToken, {
        statutory_code: statutoryCode,
        contribution_side: contributionSide,
        calculation_type: calculationType,
        rate_value: Number(rateValue),
        wage_ceiling: wageCeiling ? Number(wageCeiling) : undefined,
        effective_from: effectiveFrom.toISOString(),
      });
      Alert.alert('Success', 'Contribution rule created');
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
        <Text style={styles.headerTitle}>Create Contribution Rule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Statutory Code</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowCodePicker(!showCodePicker)}
          >
            <Text style={styles.selectText}>
              {definitions.find(d => d.statutory_code === statutoryCode)?.statutory_code || 'Select code'}
            </Text>
            <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
          </TouchableOpacity>
          {showCodePicker && (
            <View style={styles.optionsContainer}>
              {definitions.map(def => (
                <TouchableOpacity
                  key={def.statutory_code}
                  style={styles.optionItem}
                  onPress={() => {
                    setStatutoryCode(def.statutory_code);
                    setShowCodePicker(false);
                  }}
                >
                  <Text>{def.statutory_code} - {def.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

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
            placeholder="e.g., 12.0"
            keyboardType="numeric"
            value={rateValue}
            onChangeText={setRateValue}
          />

          <Text style={styles.label}>Wage Ceiling (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 15000"
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
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create</Text>
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
  selectButton: {
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
  selectText: { fontSize: 14, color: TEXT_PRIMARY },
  optionsContainer: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    backgroundColor: '#fff',
    maxHeight: 150,
  },
  optionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
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