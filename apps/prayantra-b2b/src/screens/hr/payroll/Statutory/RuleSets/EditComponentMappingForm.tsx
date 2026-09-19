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
import { listComponentMappings, updateComponentMapping } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EditComponentMapping'>;
type RouteProps = RouteProp<RootStackParamList, 'EditComponentMapping'>;

export default function EditComponentMappingForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId, mappingId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [statutoryCode, setStatutoryCode] = useState('');
  const [componentCode, setComponentCode] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [version, setVersion] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchMapping = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await listComponentMappings(companyId, ruleSetId, deviceId, accessToken);
        const mapping = res.data?.find((m: any) => m.id === mappingId);
        if (!mapping) { throw new Error('Mapping not found'); }
        setStatutoryCode(mapping.statutory_code);
        setComponentCode(mapping.component_code);
        setEffectiveFrom(new Date(mapping.effective_from));
        setVersion(mapping.version ? String(mapping.version) : '');
      } catch (error) {
        Alert.alert('Error', 'Failed to load mapping');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchMapping();
  }, [mappingId, ruleSetId]);

  const handleSubmit = async () => {
    if (!statutoryCode.trim()) { Alert.alert('Error', 'Statutory Code is required'); return; }
    if (!componentCode.trim()) { Alert.alert('Error', 'Component Code is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setSubmitting(true);
    try {
      await updateComponentMapping(companyId, ruleSetId, mappingId, deviceId, accessToken, {
        component_code: componentCode.trim(),
        effective_from: effectiveFrom.toISOString(),
        version: version ? Number(version) : undefined,
      });
      Alert.alert('Success', 'Mapping updated');
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
        <Text style={styles.headerTitle}>Edit Component Mapping</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Statutory Code</Text>
          <TextInput style={styles.input} value={statutoryCode} onChangeText={setStatutoryCode} />

          <Text style={styles.label}>Component Code</Text>
          <TextInput
            style={styles.input}
            value={componentCode}
            onChangeText={setComponentCode}
          />

          <Text style={styles.label}>Effective From</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text>{effectiveFrom.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          <Text style={styles.label}>Version (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2"
            keyboardType="numeric"
            value={version}
            onChangeText={setVersion}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Update Mapping</Text>}
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={effectiveFrom}
        onConfirm={(date) => { setShowDatePicker(false); setEffectiveFrom(date); }}
        onCancel={() => setShowDatePicker(false)}
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