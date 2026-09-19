import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { initializeRun } from '@b2b/api-client';
import { PRIMARY_COLOR } from '../../../../constants/colors';

interface Props {
  runId: string;
  onSuccess: () => void;
  disabled?: boolean;
}

export default function InitializeRunButton({ runId, onSuccess, disabled }: Props) {
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);

  const handleInitialize = async () => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setLoading(true);
    try {
      await initializeRun(companyId, runId, deviceId, accessToken);
      Alert.alert('Success', 'Run initialized');
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Initialization failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.disabled]}
      onPress={handleInitialize}
      disabled={disabled || loading}
    >
      {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.text}>Initialize Run</Text>}
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