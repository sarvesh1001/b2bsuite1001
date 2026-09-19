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
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { createComponentManagement } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CreateComponent'>;

export default function CreateComponentForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [componentCode, setComponentCode] = useState('');
  const [componentType, setComponentType] = useState<'earning' | 'deduction' | 'statutory'>('earning');
  const [description, setDescription] = useState('');
  const [isTaxable, setIsTaxable] = useState(true);
  const [contributionSide, setContributionSide] = useState<'employee' | 'employer' | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!componentCode.trim()) { Alert.alert('Error', 'Component Code is required'); return; }
    if (!description.trim()) { Alert.alert('Error', 'Description is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await createComponentManagement(companyId, deviceId, accessToken, {
        component_code: componentCode.trim().toUpperCase(),
        component_type: componentType,
        description: description.trim(),
        is_taxable: isTaxable,
        contribution_side: contributionSide,
      });
      Alert.alert('Success', 'Component created successfully');
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
        <Text style={styles.headerTitle}>Create Component</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Component Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., BONUS"
            value={componentCode}
            onChangeText={setComponentCode}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Component Type</Text>
          <View style={styles.typeContainer}>
            {(['earning', 'deduction', 'statutory'] as const).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, componentType === type && styles.typeActive]}
                onPress={() => setComponentType(type)}
              >
                <Text style={[styles.typeText, componentType === type && styles.typeTextActive]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Component description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Is Taxable?</Text>
            <Switch
              value={isTaxable}
              onValueChange={setIsTaxable}
              trackColor={{ false: '#767577', true: PRIMARY_COLOR }}
            />
          </View>

          <Text style={styles.label}>Contribution Side (optional)</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, contributionSide === 'employee' && styles.typeActive]}
              onPress={() => setContributionSide('employee')}
            >
              <Text style={[styles.typeText, contributionSide === 'employee' && styles.typeTextActive]}>
                Employee
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, contributionSide === 'employer' && styles.typeActive]}
              onPress={() => setContributionSide('employer')}
            >
              <Text style={[styles.typeText, contributionSide === 'employer' && styles.typeTextActive]}>
                Employer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, contributionSide === undefined && styles.typeActive]}
              onPress={() => setContributionSide(undefined)}
            >
              <Text style={[styles.typeText, contributionSide === undefined && styles.typeTextActive]}>
                None
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Create Component</Text>}
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
  typeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  typeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginRight: 8,
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  typeActive: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  typeText: { fontSize: 13, color: TEXT_SECONDARY },
  typeTextActive: { color: '#fff' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
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