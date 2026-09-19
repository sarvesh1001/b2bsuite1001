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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { createEntitlement, listLeaveTypes } from '@b2b/api-client';
import { LeaveType } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'CreateEntitlement'>;

export default function CreateEntitlementScreen() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  // Form fields
  const [userId, setUserId] = useState('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [totalDays, setTotalDays] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [effectiveTo, setEffectiveTo] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);

  // Load leave types on focus
  React.useEffect(() => {
    const fetchLeaveTypes = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      setLoadingTypes(true);
      try {
        const res = await listLeaveTypes(companyId, deviceId, accessToken);
        setLeaveTypes(res.data || []);
      } catch (error) {
        Alert.alert('Error', 'Failed to load leave types');
      } finally {
        setLoadingTypes(false);
      }
    };
    fetchLeaveTypes();
  }, [accessToken, companyId, deviceId]);

  const handleSubmit = async () => {
    if (!userId.trim()) { Alert.alert('Error', 'User ID is required'); return; }
    if (!leaveTypeId) { Alert.alert('Error', 'Leave type is required'); return; }
    if (!totalDays || isNaN(Number(totalDays)) || Number(totalDays) <= 0) {
      Alert.alert('Error', 'Total days must be a positive number');
      return;
    }

    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await createEntitlement(companyId, deviceId, accessToken, {
        user_id: userId.trim(),
        leave_type_id: leaveTypeId,
        total_days: Number(totalDays),
        effective_from: effectiveFrom.toISOString(),
        effective_to: effectiveTo ? effectiveTo.toISOString() : null,
      });
      Alert.alert('Success', 'Entitlement created successfully');
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
        <Text style={styles.headerTitle}>Create Entitlement</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          {/* User ID */}
          <Text style={styles.label}>User ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter user ID"
            value={userId}
            onChangeText={setUserId}
          />

          {/* Leave Type */}
          <Text style={styles.label}>Leave Type</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowTypePicker(!showTypePicker)}
          >
            <Text style={styles.selectText}>
              {leaveTypes.find(t => t.id === leaveTypeId)?.name || 'Select leave type'}
            </Text>
            <Icon name="chevron-down" size={20} color={TEXT_SECONDARY} />
          </TouchableOpacity>
          {showTypePicker && (
            <View style={styles.optionsContainer}>
              {leaveTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.optionItem}
                  onPress={() => {
                    setLeaveTypeId(type.id);
                    setShowTypePicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{type.name} ({type.code})</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Total Days */}
          <Text style={styles.label}>Total Days</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 20"
            keyboardType="numeric"
            value={totalDays}
            onChangeText={setTotalDays}
          />

          {/* Effective From */}
          <Text style={styles.label}>Effective From</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowFromPicker(true)}
          >
            <Text>{effectiveFrom.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          {/* Effective To (optional) */}
          <Text style={styles.label}>Effective To (optional)</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowToPicker(true)}
          >
            <Text>{effectiveTo ? effectiveTo.toLocaleDateString() : 'No end date'}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          {effectiveTo && (
            <TouchableOpacity onPress={() => setEffectiveTo(null)} style={styles.clearDate}>
              <Text style={styles.clearDateText}>Clear end date</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Entitlement</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={showFromPicker}
        mode="date"
        date={effectiveFrom}
        onConfirm={(date) => {
          setShowFromPicker(false);
          setEffectiveFrom(date);
        }}
        onCancel={() => setShowFromPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showToPicker}
        mode="date"
        date={effectiveTo || new Date()}
        onConfirm={(date) => {
          setShowToPicker(false);
          setEffectiveTo(date);
        }}
        onCancel={() => setShowToPicker(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
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
  backButton: { padding: 4 },
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
  clearDate: { marginTop: 4, alignSelf: 'flex-start' },
  clearDateText: { fontSize: 12, color: PRIMARY_COLOR },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: { opacity: 0.6 },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});