// apps/prayantra-b2b/src/screens/hr/HREmployeeDetail/ExitTab.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { getEmployeeExit, createEmployeeExit, rehireEmployee } from '@b2b/api-client';
import { EmployeeExit, CreateExitPayload } from '@b2b/shared-types';
import {
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  CARD_BACKGROUND,
  BORDER_COLOR,
} from '../../../constants/colors';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

interface Props {
  employeeId: string;
}

export default function ExitTab({ employeeId }: Props) {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [exit, setExit] = useState<EmployeeExit | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // For create exit form
  const [showForm, setShowForm] = useState(false);
  const [exitDate, setExitDate] = useState(new Date());
  const [exitReason, setExitReason] = useState('');
  const [eligibleForRehire, setEligibleForRehire] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchExit = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const res = await getEmployeeExit(companyId, employeeId, deviceId, accessToken);
      setExit(res.data);
    } catch (error) {
      setExit(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, employeeId]);

  useFocusEffect(
    useCallback(() => {
      fetchExit();
    }, [fetchExit])
  );

  const handleCreateExit = async () => {
    // ✅ Guard against missing authentication
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication information');
      return;
    }
    if (!exitDate) {
      Alert.alert('Error', 'Exit date is required');
      return;
    }
    if (!exitReason.trim()) {
      Alert.alert('Error', 'Exit reason is required');
      return;
    }
    setActionLoading(true);
    try {
      const payload: CreateExitPayload = {
        exit_date: exitDate.toISOString(),
        exit_reason: exitReason.trim(),
        eligible_for_rehire: eligibleForRehire,
      };
      const res = await createEmployeeExit(companyId, employeeId, deviceId, accessToken, payload);
      setExit(res.data);
      setShowForm(false);
      Alert.alert('Success', 'Exit record created');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create exit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRehire = async () => {
    // ✅ Guard against missing authentication
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication information');
      return;
    }
    Alert.alert(
      'Rehire Employee',
      'Are you sure you want to rehire this employee?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Rehire',
          onPress: async () => {
            setActionLoading(true);
            try {
              await rehireEmployee(companyId, employeeId, deviceId, accessToken);
              setExit(null);
              Alert.alert('Success', 'Employee rehired');
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Rehire failed');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  if (exit) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Exit Date</Text>
            <Text style={styles.value}>{exit.exit_date?.split('T')[0]}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Exit Reason</Text>
            <Text style={styles.value}>{exit.exit_reason}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Eligible for Rehire</Text>
            <Text style={[styles.value, { color: exit.eligible_for_rehire ? '#10b981' : '#ef4444' }]}>
              {exit.eligible_for_rehire ? 'Yes' : 'No'}
            </Text>
          </View>
          <TouchableOpacity style={styles.rehireButton} onPress={handleRehire} disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="refresh" size={20} color="#fff" />
                <Text style={styles.rehireText}>Rehire Employee</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.formTitle}>Create Exit Record</Text>
          <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
            <Text>Exit Date: {exitDate.toISOString().split('T')[0]}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            date={exitDate}
            onConfirm={(date: Date) => {   // ✅ Explicit type
              setShowDatePicker(false);
              setExitDate(date);
            }}
            onCancel={() => setShowDatePicker(false)}
          />
          <TextInput
            style={styles.input}
            placeholder="Exit Reason (e.g., resignation)"
            value={exitReason}
            onChangeText={setExitReason}
          />
          <View style={styles.rehireToggle}>
            <Text style={styles.label}>Eligible for Rehire</Text>
            <TouchableOpacity onPress={() => setEligibleForRehire(!eligibleForRehire)}>
              <Icon name={eligibleForRehire ? 'toggle-switch' : 'toggle-switch-off'} size={30} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>
          <View style={styles.formActions}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => setShowForm(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleCreateExit}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.emptyContainer}>
        <Icon name="exit-run" size={48} color={TEXT_SECONDARY} />
        <Text style={styles.emptyText}>No exit record</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setShowForm(true)}>
          <Text style={styles.createButtonText}>Create Exit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  label: {
    fontSize: 14,
    color: TEXT_SECONDARY,
  },
  value: {
    fontSize: 14,
    color: TEXT_PRIMARY,
    fontWeight: '500',
  },
  rehireButton: {
    backgroundColor: PRIMARY_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  rehireText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 8,
  },
  createButton: {
    marginTop: 20,
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginBottom: 16,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  rehireToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
  },
  cancelText: {
    color: TEXT_SECONDARY,
  },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
  },
  submitText: {
    color: '#fff',
    fontWeight: '600',
  },
});