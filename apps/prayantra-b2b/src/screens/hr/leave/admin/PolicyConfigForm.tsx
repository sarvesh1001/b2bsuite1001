// apps/prayantra-b2b/src/screens/leave/admin/PolicyConfigForm.tsx
import React, { useEffect, useState } from 'react';
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
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { createPolicyConfig, updatePolicyConfig, getPolicyConfig } from '@b2b/api-client';
import { CreatePolicyConfigPayload, UpdatePolicyConfigPayload } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type RouteProps = RouteProp<RootStackParamList, 'PolicyConfigForm'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'PolicyConfigForm'>;

export default function PolicyConfigForm() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { policyId } = route.params || {};
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!policyId);
  const [policyName, setPolicyName] = useState('');
  const [appliesToType, setAppliesToType] = useState('company');
  const [priority, setPriority] = useState('1');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [effectiveTo, setEffectiveTo] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);

  useEffect(() => {
    if (!policyId) {
      setFetching(false);
      return;
    }
    const fetchPolicy = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await getPolicyConfig(companyId, policyId, deviceId, accessToken);
        const data = res.data;
        setPolicyName(data.policy_name);
        setAppliesToType(data.applies_to_type);
        setPriority(String(data.priority));
        setEffectiveFrom(new Date(data.effective_from));
        if (data.effective_to) setEffectiveTo(new Date(data.effective_to));
      } catch (error) {
        Alert.alert('Error', 'Failed to load policy');
        navigation.goBack();
      } finally {
        setFetching(false);
      }
    };
    fetchPolicy();
  }, [policyId]);

  const handleSubmit = async () => {
    if (!policyName.trim()) {
      Alert.alert('Error', 'Policy name is required');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setLoading(true);
    try {
      const basePayload = {
        policy_name: policyName.trim(),
        applies_to_type: appliesToType,
        priority: parseInt(priority, 10),
        effective_from: effectiveFrom.toISOString(),
        effective_to: effectiveTo ? effectiveTo.toISOString() : null,
      };
      if (policyId) {
        const payload: UpdatePolicyConfigPayload = { policy_name: basePayload.policy_name, priority: basePayload.priority, effective_to: basePayload.effective_to };
        await updatePolicyConfig(companyId, policyId, deviceId, accessToken, payload);
        Alert.alert('Success', 'Policy updated');
      } else {
        const payload: CreatePolicyConfigPayload = basePayload;
        await createPolicyConfig(companyId, deviceId, accessToken, payload);
        Alert.alert('Success', 'Policy created');
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading policy...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{policyId ? 'Edit Policy' : 'New Policy'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Policy Name *</Text>
            <TextInput style={styles.input} value={policyName} onChangeText={setPolicyName} placeholder="e.g. Standard Annual Leave" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Applies To</Text>
            <View style={styles.pickerRow}>
              {['company', 'department', 'team', 'user'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.option, appliesToType === type && styles.optionActive]}
                  onPress={() => setAppliesToType(type)}
                >
                  <Text style={[styles.optionText, appliesToType === type && styles.optionTextActive]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Priority</Text>
            <TextInput style={styles.input} value={priority} onChangeText={setPriority} keyboardType="numeric" placeholder="1" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Effective From</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker('from')}>
              <Text>{effectiveFrom.toLocaleDateString()}</Text>
              <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Effective To (optional)</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker('to')}>
              <Text>{effectiveTo ? effectiveTo.toLocaleDateString() : 'No end date'}</Text>
              <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{policyId ? 'Update' : 'Create'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DateTimePickerModal
        isVisible={!!showDatePicker}
        mode="date"
        date={showDatePicker === 'from' ? effectiveFrom : (effectiveTo || new Date())}
        onConfirm={(date) => {
          if (showDatePicker === 'from') setEffectiveFrom(date);
          else setEffectiveTo(date);
          setShowDatePicker(null);
        }}
        onCancel={() => setShowDatePicker(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BACKGROUND_COLOR },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
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
  card: { backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: BORDER_COLOR },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT_PRIMARY, backgroundColor: '#fff' },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap' },
  option: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: BORDER_COLOR, marginRight: 8, marginBottom: 4, backgroundColor: '#fff' },
  optionActive: { backgroundColor: PRIMARY_COLOR + '20', borderColor: PRIMARY_COLOR },
  optionText: { fontSize: 13, color: TEXT_PRIMARY },
  optionTextActive: { color: PRIMARY_COLOR, fontWeight: '600' },
  dateButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 8, padding: 12, backgroundColor: '#fff' },
  submitButton: { backgroundColor: PRIMARY_COLOR, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});