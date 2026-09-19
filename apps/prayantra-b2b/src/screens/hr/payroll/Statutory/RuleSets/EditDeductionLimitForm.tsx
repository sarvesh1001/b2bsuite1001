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
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { listDeductionLimits, updateDeductionLimit } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EditDeductionLimit'>;
type RouteProps = RouteProp<RootStackParamList, 'EditDeductionLimit'>;

export default function EditDeductionLimitForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId, limitId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [limitCode, setLimitCode] = useState('');
  const [limitValue, setLimitValue] = useState('');
  const [metadata, setMetadata] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchLimit = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await listDeductionLimits(companyId, ruleSetId, deviceId, accessToken);
        const limit = res.data?.find((l: any) => l.id === limitId);
        if (!limit) { throw new Error('Limit not found'); }
        setLimitCode(limit.limit_code);
        setLimitValue(String(limit.limit_value));
        setMetadata(limit.metadata ? JSON.stringify(limit.metadata, null, 2) : '');
      } catch (error) {
        Alert.alert('Error', 'Failed to load limit');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchLimit();
  }, [limitId, ruleSetId]);

  const handleSubmit = async () => {
    if (!limitCode.trim()) { Alert.alert('Error', 'Limit Code is required'); return; }
    if (!limitValue || isNaN(Number(limitValue)) || Number(limitValue) <= 0) {
      Alert.alert('Error', 'Valid limit value is required');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setSubmitting(true);
    try {
      let parsedMetadata = undefined;
      if (metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (e) {
          Alert.alert('Error', 'Invalid JSON in metadata');
          setSubmitting(false);
          return;
        }
      }
      await updateDeductionLimit(companyId, ruleSetId, limitId, deviceId, accessToken, {
        limit_value: Number(limitValue),
        metadata: parsedMetadata,
      });
      Alert.alert('Success', 'Limit updated');
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
        <Text style={styles.headerTitle}>Edit Deduction Limit</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Limit Code</Text>
          <TextInput style={styles.input} value={limitCode} onChangeText={setLimitCode} />

          <Text style={styles.label}>Limit Value</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={limitValue}
            onChangeText={setLimitValue}
          />

          <Text style={styles.label}>Metadata (JSON, optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={metadata}
            onChangeText={setMetadata}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Update Limit</Text>}
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
  textArea: { minHeight: 60, textAlignVertical: 'top' },
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