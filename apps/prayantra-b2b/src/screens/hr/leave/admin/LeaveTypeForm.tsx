// apps/prayantra-b2b/src/screens/leave/admin/LeaveTypeForm.tsx
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
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { createLeaveType, updateLeaveType, getLeaveType } from '@b2b/api-client';
import { CreateLeaveTypePayload, UpdateLeaveTypePayload } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type RouteProps = RouteProp<RootStackParamList, 'LeaveTypeForm'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'LeaveTypeForm'>;

export default function LeaveTypeForm() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { leaveTypeId } = route.params || {};
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!leaveTypeId);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isPaid, setIsPaid] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [accrualMethod, setAccrualMethod] = useState('monthly');
  const [carryForwardLimit, setCarryForwardLimit] = useState('');

  useEffect(() => {
    if (!leaveTypeId) { setFetching(false); return; }
    const fetchType = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await getLeaveType(companyId, leaveTypeId, deviceId, accessToken);
        const data = res.data;
        setCode(data.code);
        setName(data.name);
        setIsPaid(data.is_paid);
        setRequiresApproval(data.requires_approval);
        setAccrualMethod(data.accrual_method);
        setCarryForwardLimit(data.carry_forward_limit?.toString() || '');
      } catch (error) {
        Alert.alert('Error', 'Failed to load leave type');
        navigation.goBack();
      } finally { setFetching(false); }
    };
    fetchType();
  }, [leaveTypeId]);

  const handleSubmit = async () => {
    if (!code.trim() || !name.trim()) {
      Alert.alert('Error', 'Code and Name are required');
      return;
    }
    if (!accessToken || !companyId || !deviceId) return;
    setLoading(true);
    try {
      const base = {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        is_paid: isPaid,
        requires_approval: requiresApproval,
        accrual_method: accrualMethod,
        carry_forward_limit: carryForwardLimit ? parseInt(carryForwardLimit, 10) : undefined,
      };
      if (leaveTypeId) {
        const payload: UpdateLeaveTypePayload = { name: base.name, is_paid: base.is_paid, requires_approval: base.requires_approval, accrual_method: base.accrual_method, carry_forward_limit: base.carry_forward_limit };
        await updateLeaveType(companyId, leaveTypeId, deviceId, accessToken, payload);
        Alert.alert('Success', 'Leave type updated');
      } else {
        await createLeaveType(companyId, deviceId, accessToken, base as CreateLeaveTypePayload);
        Alert.alert('Success', 'Leave type created');
      }
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Operation failed');
    } finally { setLoading(false); }
  };

  if (fetching) return (
    <SafeAreaView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      <Text style={styles.loadingText}>Loading...</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{leaveTypeId ? 'Edit Leave Type' : 'New Leave Type'}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Code *</Text>
            <TextInput style={styles.input} value={code} onChangeText={setCode} placeholder="e.g. AL" autoCapitalize="characters" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Name *</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Annual Leave" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Paid</Text>
            <Switch value={isPaid} onValueChange={setIsPaid} trackColor={{ false: '#ccc', true: PRIMARY_COLOR }} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Requires Approval</Text>
            <Switch value={requiresApproval} onValueChange={setRequiresApproval} trackColor={{ false: '#ccc', true: PRIMARY_COLOR }} />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Accrual Method</Text>
            <View style={styles.pickerRow}>
              {['monthly', 'yearly', 'per_request'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[styles.option, accrualMethod === method && styles.optionActive]}
                  onPress={() => setAccrualMethod(method)}
                >
                  <Text style={[styles.optionText, accrualMethod === method && styles.optionTextActive]}>{method.replace('_', ' ').toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Carry Forward Limit</Text>
            <TextInput style={styles.input} value={carryForwardLimit} onChangeText={setCarryForwardLimit} keyboardType="numeric" placeholder="e.g. 10" />
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{leaveTypeId ? 'Update' : 'Create'}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BACKGROUND_COLOR },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: CARD_BACKGROUND, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
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
  submitButton: { backgroundColor: PRIMARY_COLOR, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});