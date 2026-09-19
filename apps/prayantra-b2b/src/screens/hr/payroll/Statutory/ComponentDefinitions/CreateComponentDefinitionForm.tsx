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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { createComponentDefinition } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CreateComponentDefinition'>;

export default function CreateComponentDefinitionForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [statutoryCode, setStatutoryCode] = useState('');
  const [description, setDescription] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [calculationBasis, setCalculationBasis] = useState('');
  const [hasEmployee, setHasEmployee] = useState(true);
  const [hasEmployer, setHasEmployer] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!statutoryCode.trim()) { Alert.alert('Error', 'Statutory Code is required'); return; }
    if (!description.trim()) { Alert.alert('Error', 'Description is required'); return; }
    if (!countryCode.trim()) { Alert.alert('Error', 'Country Code is required'); return; }
    if (!calculationBasis.trim()) { Alert.alert('Error', 'Calculation Basis is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await createComponentDefinition(companyId, deviceId, accessToken, {
        statutory_code: statutoryCode.trim(),
        description: description.trim(),
        country_code: countryCode.trim(),
        calculation_basis: calculationBasis.trim(),
        has_employee: hasEmployee,
        has_employer: hasEmployer,
      });
      Alert.alert('Success', 'Component definition created');
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
        <Text style={styles.headerTitle}>Create Definition</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Statutory Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., PF, ESI"
            value={statutoryCode}
            onChangeText={setStatutoryCode}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Description"
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Country Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., IN, US"
            value={countryCode}
            onChangeText={setCountryCode}
          />

          <Text style={styles.label}>Calculation Basis</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., basic, gross"
            value={calculationBasis}
            onChangeText={setCalculationBasis}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Has Employee Component</Text>
            <Switch value={hasEmployee} onValueChange={setHasEmployee} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Has Employer Component</Text>
            <Switch value={hasEmployer} onValueChange={setHasEmployer} />
          </View>
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  switchLabel: { fontSize: 14, color: TEXT_PRIMARY },
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