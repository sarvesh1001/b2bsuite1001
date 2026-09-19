// apps/prayantra-b2b/src/screens/hr/payroll/BankDetailsForm.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../store/userAuthStore';
import {
  createBankDetails,
  updateBankDetails,
  getActiveBankDetails,
} from '@b2b/api-client';
import { BankDetail } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';
import { RootStackParamList } from '../../../navigation';

type RouteProps = RouteProp<RootStackParamList, 'BankDetailsForm'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'BankDetailsForm'>;

export default function BankDetailsForm() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { bankDetailId, userId } = route.params || {};

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!bankDetailId);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form state
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());

  // Load existing bank details for edit
  useEffect(() => {
    if (!bankDetailId) {
      setFetching(false);
      return;
    }

    const fetchBankDetail = async () => {
      if (!accessToken || !companyId || !deviceId || !userId) {
        setFetching(false);
        Alert.alert('Error', 'Missing authentication information');
        navigation.goBack();
        return;
      }
      try {
        const res = await getActiveBankDetails(companyId, userId, deviceId, accessToken);
        const data = res.data;
        if (data && data.id === bankDetailId) {
          setBankName(data.bank_name || '');
          setAccountHolderName(data.account_holder_name || '');
          setAccountNumber(data.account_number || '');
          setIfscCode(data.ifsc_code || '');
          setBankBranch(data.bank_branch || '');
          setIsActive(data.is_active ?? true);
          if (data.effective_from) {
            setEffectiveFrom(new Date(data.effective_from));
          }
        } else {
          Alert.alert('Error', 'Bank detail not found');
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load bank details');
        navigation.goBack();
      } finally {
        setFetching(false);
      }
    };

    fetchBankDetail();
  }, [bankDetailId, accessToken, companyId, deviceId, userId]);

  const handleSubmit = async () => {
    // Validation
    if (!bankName.trim()) {
      Alert.alert('Error', 'Bank name is required');
      return;
    }
    if (!accountHolderName.trim()) {
      Alert.alert('Error', 'Account holder name is required');
      return;
    }
    if (!accountNumber.trim()) {
      Alert.alert('Error', 'Account number is required');
      return;
    }
    if (!ifscCode.trim()) {
      Alert.alert('Error', 'IFSC code is required');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'User ID is missing');
      return;
    }
    if (!companyId) {
      Alert.alert('Error', 'Company ID is missing. Please log in again.');
      return;
    }
    if (!accessToken || !deviceId) {
      Alert.alert('Error', 'Missing authentication. Please log in again.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        bank_name: bankName.trim(),
        account_holder_name: accountHolderName.trim(),
        account_number: accountNumber.trim(),
        ifsc_code: ifscCode.trim().toUpperCase(),
        bank_branch: bankBranch.trim() || undefined,
        is_active: isActive,
        effective_from: effectiveFrom.toISOString(),
      };

      if (bankDetailId) {
        // Update existing
        await updateBankDetails(
          companyId,
          bankDetailId,
          deviceId,
          accessToken,
          {
            bank_name: payload.bank_name,
            account_holder_name: payload.account_holder_name,
            account_number: payload.account_number,
            ifsc_code: payload.ifsc_code,
            bank_branch: payload.bank_branch,
            is_active: payload.is_active,
          }
        );
        Alert.alert('Success', 'Bank details updated');
      } else {
        // Create new
        await createBankDetails(
          companyId,
          userId,
          deviceId,
          accessToken,
          payload
        );
        Alert.alert('Success', 'Bank details created');
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
        <Text style={styles.loadingText}>Loading bank details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {bankDetailId ? 'Edit Bank Details' : 'Add Bank Details'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Bank Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Bank Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., State Bank of India"
              placeholderTextColor={TEXT_SECONDARY}
              value={bankName}
              onChangeText={setBankName}
            />
          </View>

          {/* Account Holder Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Account Holder Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name as on bank account"
              placeholderTextColor={TEXT_SECONDARY}
              value={accountHolderName}
              onChangeText={setAccountHolderName}
            />
          </View>

          {/* Account Number */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Account Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter account number"
              placeholderTextColor={TEXT_SECONDARY}
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
              secureTextEntry
            />
          </View>

          {/* IFSC Code */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>IFSC Code *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., SBIN0001234"
              placeholderTextColor={TEXT_SECONDARY}
              value={ifscCode}
              onChangeText={(text) => setIfscCode(text.toUpperCase())}
              autoCapitalize="characters"
            />
          </View>

          {/* Bank Branch */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Branch (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Branch name or location"
              placeholderTextColor={TEXT_SECONDARY}
              value={bankBranch}
              onChangeText={setBankBranch}
            />
          </View>

          {/* Effective From */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Effective From *</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>
                {effectiveFrom.toLocaleDateString()}
              </Text>
              <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>

          {/* Active Switch */}
          <View style={styles.switchContainer}>
            <Text style={styles.fieldLabel}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#e2e8f0', true: PRIMARY_COLOR }}
            />
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
            <Text style={styles.submitText}>
              {bankDetailId ? 'Update' : 'Create'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={effectiveFrom}
        onConfirm={(date) => {
          setShowDatePicker(false);
          setEffectiveFrom(date);
        }}
        onCancel={() => setShowDatePicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingText: {
    marginTop: 12,
    color: TEXT_SECONDARY,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginBottom: 6,
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
  dateInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: TEXT_PRIMARY,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});