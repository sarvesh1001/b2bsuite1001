import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { generatePayslipsForRun } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'GeneratePayslipsForRun'>;
type RouteProps = RouteProp<RootStackParamList, 'GeneratePayslipsForRun'>;

export default function GeneratePayslipsForRunButton() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { runId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setGenerating(true);
    try {
      await generatePayslipsForRun(companyId, runId, deviceId, accessToken);
      Alert.alert('Success', 'Payslips generated successfully');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to generate payslips');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Generate Payslips</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Icon name="file-pdf-box" size={48} color={PRIMARY_COLOR} style={styles.icon} />
          <Text style={styles.title}>Generate Payslips for Run</Text>
          <Text style={styles.description}>
            This will generate payslips for all employees in the payroll run.
          </Text>
          <Text style={styles.detail}>Run ID: {runId}</Text>
          <Text style={styles.warning}>
            ⚠️ This action may take a moment. Existing payslips will be overwritten.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.generateButton, generating && styles.disabledButton]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="file-pdf-box" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.generateText}>Generate Payslips</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
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
  content: { flex: 1, justifyContent: 'center', padding: 16 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 8 },
  description: { fontSize: 14, color: TEXT_SECONDARY, textAlign: 'center', marginBottom: 16 },
  detail: { fontSize: 13, color: TEXT_PRIMARY, marginTop: 4 },
  warning: { fontSize: 13, color: '#FF9800', textAlign: 'center', marginTop: 12 },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
  },
  generateText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  disabledButton: { opacity: 0.6 },
});