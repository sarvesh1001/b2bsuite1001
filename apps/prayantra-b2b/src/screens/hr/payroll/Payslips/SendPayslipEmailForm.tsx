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
import { sendPayslipEmail } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'SendPayslipEmail'>;
type RouteProps = RouteProp<RootStackParamList, 'SendPayslipEmail'>;

export default function SendPayslipEmailForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { runId, userId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setSending(true);
    try {
      await sendPayslipEmail(companyId, runId, userId, deviceId, accessToken);
      Alert.alert('Success', 'Payslip email sent');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Payslip Email</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Icon name="email" size={48} color={PRIMARY_COLOR} style={styles.icon} />
          <Text style={styles.title}>Send Payslip via Email</Text>
          <Text style={styles.description}>
            This will send the payslip as a PDF attachment to the employee's registered email.
          </Text>
          <Text style={styles.detail}>Run ID: {runId}</Text>
          <Text style={styles.detail}>User ID: {userId}</Text>
        </View>

        <TouchableOpacity
          style={[styles.sendButton, sending && styles.disabledButton]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sendText}>Send Email</Text>
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
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
  },
  sendText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  disabledButton: { opacity: 0.6 },
});