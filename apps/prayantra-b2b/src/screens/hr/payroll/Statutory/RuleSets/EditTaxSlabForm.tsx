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
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { listTaxSlabs, updateTaxSlab } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EditTaxSlab'>;
type RouteProps = RouteProp<RootStackParamList, 'EditTaxSlab'>;

export default function EditTaxSlabForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { ruleSetId, slabId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [statutoryCode, setStatutoryCode] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [rate, setRate] = useState('');
  const [isPercentage, setIsPercentage] = useState(true);
  const [slabOrder, setSlabOrder] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSlab = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await listTaxSlabs(companyId, ruleSetId, deviceId, accessToken);
        const slab = res.data?.find((s: any) => s.id === slabId);
        if (!slab) { throw new Error('Slab not found'); }
        setStatutoryCode(slab.statutory_code);
        setMinAmount(String(slab.min_amount));
        setMaxAmount(String(slab.max_amount));
        setRate(String(slab.rate));
        setIsPercentage(slab.is_percentage);
        setSlabOrder(String(slab.slab_order));
        setEffectiveFrom(new Date(slab.effective_from));
      } catch (error) {
        Alert.alert('Error', 'Failed to load slab');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchSlab();
  }, [slabId, ruleSetId]);

  const handleSubmit = async () => {
    if (!statutoryCode.trim()) { Alert.alert('Error', 'Statutory Code is required'); return; }
    if (!minAmount || isNaN(Number(minAmount))) { Alert.alert('Error', 'Valid min amount is required'); return; }
    if (!maxAmount || isNaN(Number(maxAmount))) { Alert.alert('Error', 'Valid max amount is required'); return; }
    if (!rate || isNaN(Number(rate))) { Alert.alert('Error', 'Valid rate is required'); return; }
    if (!slabOrder || isNaN(Number(slabOrder))) { Alert.alert('Error', 'Valid slab order is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setSubmitting(true);
    try {
      await updateTaxSlab(companyId, ruleSetId, slabId, deviceId, accessToken, {
        min_amount: Number(minAmount),
        max_amount: Number(maxAmount),
        rate: Number(rate),
        is_percentage: isPercentage,
        slab_order: Number(slabOrder),
        effective_from: effectiveFrom.toISOString(),
      });
      Alert.alert('Success', 'Slab updated');
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
        <Text style={styles.headerTitle}>Edit Tax Slab</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Statutory Code</Text>
          <TextInput style={styles.input} value={statutoryCode} onChangeText={setStatutoryCode} />

          <Text style={styles.label}>Min Amount</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={minAmount}
            onChangeText={setMinAmount}
          />

          <Text style={styles.label}>Max Amount</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={maxAmount}
            onChangeText={setMaxAmount}
          />

          <Text style={styles.label}>Rate</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={rate}
            onChangeText={setRate}
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Is Percentage?</Text>
            <Switch value={isPercentage} onValueChange={setIsPercentage} trackColor={{ false: '#767577', true: PRIMARY_COLOR }} />
          </View>

          <Text style={styles.label}>Slab Order</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={slabOrder}
            onChangeText={setSlabOrder}
          />

          <Text style={styles.label}>Effective From</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text>{effectiveFrom.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Update Slab</Text>}
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
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