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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { updateComponentDefinition, axiosInstance } from '@b2b/api-client';
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

type NavigationProps = StackNavigationProp<RootStackParamList, 'EditComponentDefinition'>;
type RouteProps = RouteProp<RootStackParamList, 'EditComponentDefinition'>;

export default function EditComponentDefinitionForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { statutoryCode } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [definition, setDefinition] = useState<ComponentDefinition | null>(null);
  const [description, setDescription] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [calculationBasis, setCalculationBasis] = useState('');
  const [hasEmployee, setHasEmployee] = useState(true);
  const [hasEmployer, setHasEmployer] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        // Use direct axios call to fetch the component definition
        const url = `/companies/${companyId}/payroll/statutory-profiles/components/${statutoryCode}`;
        const headers = {
          'X-Company-ID': companyId,
          'X-Device-ID': deviceId,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        };
        const response = await axiosInstance.get(url, { headers });
        // Assuming response.data is the ComponentDefinition object (not wrapped in ApiResponse? 
        // The pattern from the client uses ApiResponse, so we might need response.data.data)
        // We'll handle both possibilities.
        let data = response.data;
        // If the response has a 'data' field (ApiResponse), unwrap it.
        if (data && typeof data === 'object' && 'data' in data) {
          data = data.data;
        }
        setDefinition(data);
        setDescription(data.description || '');
        setCountryCode(data.country_code || '');
        setCalculationBasis(data.calculation_basis || '');
        setHasEmployee(data.has_employee ?? true);
        setHasEmployer(data.has_employer ?? true);
      } catch (error) {
        Alert.alert('Error', 'Failed to load definition');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [statutoryCode]);

  const handleSubmit = async () => {
    if (!description.trim()) { Alert.alert('Error', 'Description is required'); return; }
    if (!countryCode.trim()) { Alert.alert('Error', 'Country Code is required'); return; }
    if (!calculationBasis.trim()) { Alert.alert('Error', 'Calculation Basis is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setSubmitting(true);
    try {
      await updateComponentDefinition(companyId, statutoryCode, deviceId, accessToken, {
        description: description.trim(),
        country_code: countryCode.trim(),
        calculation_basis: calculationBasis.trim(),
        has_employee: hasEmployee,
        has_employer: hasEmployer,
      });
      Alert.alert('Success', 'Definition updated');
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
        <Text style={styles.headerTitle}>Edit {statutoryCode}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Description"
          />

          <Text style={styles.label}>Country Code</Text>
          <TextInput
            style={styles.input}
            value={countryCode}
            onChangeText={setCountryCode}
            placeholder="e.g., IN"
          />

          <Text style={styles.label}>Calculation Basis</Text>
          <TextInput
            style={styles.input}
            value={calculationBasis}
            onChangeText={setCalculationBasis}
            placeholder="e.g., percentage, fixed"
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