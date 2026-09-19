import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { exportRunToCSV } from '@b2b/api-client';
import { RootStackParamList } from '../../../../navigation';
import { PRIMARY_COLOR, ERROR_COLOR } from '../../../../constants/colors';

type ExportRunCSVRouteProp = RouteProp<RootStackParamList, 'ExportRunCSV'>;

export default function ExportRunCSV() {
  const route = useRoute<ExportRunCSVRouteProp>();
  const { runId } = route.params;

  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setLoading(true);
    try {
      const res = await exportRunToCSV(companyId, runId, deviceId, accessToken);
      // In real app, you would handle file download or display data
      Alert.alert('Success', 'CSV exported. Check console for data.');
      console.log('CSV Data:', res.data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleExport} disabled={loading}>
      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={styles.text}>Export CSV</Text>
      )}
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
  text: { color: '#fff', fontWeight: '600' },
});