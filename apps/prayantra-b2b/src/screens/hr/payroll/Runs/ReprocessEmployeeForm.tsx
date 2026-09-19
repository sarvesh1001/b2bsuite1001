import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { reprocessEmployeeInRun } from '@b2b/api-client';
import { RootStackParamList } from '../../../../navigation';
import { PRIMARY_COLOR } from '../../../../constants/colors';

type ReprocessEmployeeRouteProp = RouteProp<
  RootStackParamList,
  'ReprocessEmployee'
>;

export default function ReprocessEmployeeForm() {
  const route = useRoute<ReprocessEmployeeRouteProp>();
  const { runId } = route.params;

  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [userId, setUserId] = useState('');
  const [reflectAdjustments, setReflectAdjustments] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleReprocess = async () => {
    if (!userId.trim()) {
      Alert.alert('Error', 'User ID is required');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setLoading(true);
    try {
      await reprocessEmployeeInRun(
        companyId,
        runId,
        userId.trim(),
        deviceId,
        accessToken,
        { reflect_latest_adjustments: reflectAdjustments }
      );
      Alert.alert('Success', 'Employee reprocessed');
      setUserId('');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Reprocessing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>User ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter user ID"
        value={userId}
        onChangeText={setUserId}
      />
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>Reflect latest adjustments</Text>
        <Switch value={reflectAdjustments} onValueChange={setReflectAdjustments} />
      </View>
      <TouchableOpacity style={styles.button} onPress={handleReprocess} disabled={loading}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.text}>Reprocess Employee</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8, paddingHorizontal: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 4,
    backgroundColor: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  switchLabel: { fontSize: 14, color: '#333' },
  button: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: { color: '#fff', fontWeight: '600' },
});