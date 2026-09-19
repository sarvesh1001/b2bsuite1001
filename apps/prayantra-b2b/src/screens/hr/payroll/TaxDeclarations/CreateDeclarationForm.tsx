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
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { createDeclaration, listDeclarationTypes } from '@b2b/api-client';
import { DeclarationType } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CreateDeclaration'>;

export default function CreateDeclarationForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [userId, setUserId] = useState('');
  const [financialYear, setFinancialYear] = useState('');
  const [declarationType, setDeclarationType] = useState('');
  const [amount, setAmount] = useState('');
  const [supportingDocs, setSupportingDocs] = useState('');
  const [loading, setLoading] = useState(false);
  const [types, setTypes] = useState<DeclarationType[]>([]);
  const [showTypePicker, setShowTypePicker] = useState(false);

  useEffect(() => {
    const fetchTypes = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await listDeclarationTypes(companyId, deviceId, accessToken);
        setTypes(res.data || []);
      } catch (error) {
        console.error('Failed to fetch types');
      }
    };
    fetchTypes();
  }, []);

  const handleSubmit = async () => {
    if (!userId.trim()) { Alert.alert('Error', 'User ID is required'); return; }
    if (!financialYear.trim()) { Alert.alert('Error', 'Financial year is required'); return; }
    if (!declarationType) { Alert.alert('Error', 'Declaration type is required'); return; }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Error', 'Valid amount is required');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await createDeclaration(companyId, deviceId, accessToken, {
        user_id: userId.trim(),
        financial_year: financialYear.trim(),
        declaration_type: declarationType,
        amount: Number(amount),
        supporting_docs: supportingDocs.split(',').map(s => s.trim()).filter(s => s),
      });
      Alert.alert('Success', 'Declaration created');
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
        <Text style={styles.headerTitle}>Create Declaration</Text>
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

          <Text style={styles.label}>Financial Year</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2025-26"
            value={financialYear}
            onChangeText={setFinancialYear}
          />

          <Text style={styles.label}>Declaration Type</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowTypePicker(!showTypePicker)}
          >
            <Text style={styles.selectText}>
              {types.find(t => t.type_code === declarationType)?.description || 'Select type'}
            </Text>
            <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
          </TouchableOpacity>
          {showTypePicker && (
            <View style={styles.optionsContainer}>
              {types.map(type => (
                <TouchableOpacity
                  key={type.type_code}
                  style={styles.optionItem}
                  onPress={() => {
                    setDeclarationType(type.type_code);
                    setShowTypePicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{type.type_code} - {type.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Supporting Docs (comma-separated)</Text>
          <TextInput
            style={styles.input}
            placeholder="doc1.pdf, doc2.pdf"
            value={supportingDocs}
            onChangeText={setSupportingDocs}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Create Declaration</Text>}
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
  optionText: { fontSize: 14, color: TEXT_PRIMARY },
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