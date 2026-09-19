import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { generateBankFile } from '@b2b/api-client';
import { RootStackParamList } from '../../../../navigation';
import { PRIMARY_COLOR } from '../../../../constants/colors';

type GenerateBankFileRouteProp = RouteProp<
  RootStackParamList,
  'GenerateBankFile'
>;

export default function GenerateBankFileForm() {
  const route = useRoute<GenerateBankFileRouteProp>();
  const { runId } = route.params;

  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'csv' | 'txt'>('csv');

  const handleGenerate = async () => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setLoading(true);
    try {
      const res = await generateBankFile(companyId, runId, deviceId, accessToken, { format });
      Alert.alert('Success', 'Bank file generated. Check console for data.');
      console.log('Bank file:', res.data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formatContainer}>
        <TouchableOpacity
          style={[styles.formatButton, format === 'csv' && styles.activeFormat]}
          onPress={() => setFormat('csv')}
        >
          <Text style={[styles.formatText, format === 'csv' && styles.activeFormatText]}>CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.formatButton, format === 'txt' && styles.activeFormat]}
          onPress={() => setFormat('txt')}
        >
          <Text style={[styles.formatText, format === 'txt' && styles.activeFormatText]}>TXT</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={handleGenerate} disabled={loading}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.text}>Generate Bank File</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8, alignItems: 'center' },
  formatContainer: { flexDirection: 'row', marginBottom: 8 },
  formatButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    marginHorizontal: 4,
    borderRadius: 4,
  },
  activeFormat: { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR },
  formatText: { color: '#333' },
  activeFormatText: { color: '#fff' },
  button: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: { color: '#fff', fontWeight: '600' },
});