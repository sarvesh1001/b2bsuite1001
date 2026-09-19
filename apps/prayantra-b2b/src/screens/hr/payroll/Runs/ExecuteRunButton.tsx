import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { executeRun } from '@b2b/api-client';
import { PRIMARY_COLOR } from '../../../../constants/colors';

interface Props {
  runId: string;
  onSuccess: () => void;
  disabled?: boolean;
}

export default function ExecuteRunButton({ runId, onSuccess, disabled }: Props) {
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);

  const handleExecute = async () => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setLoading(true);
    try {
      await executeRun(companyId, runId, deviceId, accessToken);
      Alert.alert('Success', 'Run executed');
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Execution failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.disabled]}
      onPress={handleExecute}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.text}>Execute Run</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  disabled: { opacity: 0.6 },
  text: { color: '#fff', fontWeight: '600' },
});