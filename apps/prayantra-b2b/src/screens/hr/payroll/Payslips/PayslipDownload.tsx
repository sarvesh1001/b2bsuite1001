import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { downloadPayslip } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'PayslipDownload'>;
type RouteProps = RouteProp<RootStackParamList, 'PayslipDownload'>;

export default function PayslipDownload() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { runId, userId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [payslipData, setPayslipData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayslip = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      setLoading(true);
      try {
        const res = await downloadPayslip(companyId, runId, userId, deviceId, accessToken);
        // Assuming response contains the payslip data and a download URL or base64 PDF
        setPayslipData(res.data);
        setPdfUrl(res.data?.download_url || null);
      } catch (error) {
        Alert.alert('Error', 'Failed to load payslip');
      } finally {
        setLoading(false);
      }
    };
    fetchPayslip();
  }, [runId, userId]);

  const handleShare = async () => {
    if (pdfUrl) {
      try {
        // For sharing, we might need to download the file or share the URL
        // For simplicity, we'll share the URL
        await Share.share({
          message: `Download your payslip: ${pdfUrl}`,
          title: 'Payslip',
        });
      } catch (error) {
        Alert.alert('Error', 'Failed to share');
      }
    } else {
      Alert.alert('Error', 'No payslip available to share');
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      // Open the URL in browser or trigger download (depends on implementation)
      // For React Native, we can use Linking or open the URL
      Alert.alert('Download', `Download URL: ${pdfUrl}`);
    } else {
      Alert.alert('Error', 'No payslip available to download');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!payslipData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="file-document-outline" size={64} color={TEXT_SECONDARY} />
          <Text style={styles.errorText}>Payslip not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payslip</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Payslip Summary</Text>
          {payslipData.employee_name && (
            <Text style={styles.employee}>Employee: {payslipData.employee_name}</Text>
          )}
          {payslipData.month && (
            <Text style={styles.month}>Period: {payslipData.month}</Text>
          )}
          {payslipData.net_pay !== undefined && (
            <Text style={styles.netPay}>Net Pay: ₹{payslipData.net_pay.toLocaleString()}</Text>
          )}
          {payslipData.gross_pay !== undefined && (
            <Text style={styles.grossPay}>Gross Pay: ₹{payslipData.gross_pay.toLocaleString()}</Text>
          )}
          {payslipData.deductions && (
            <View style={styles.deductions}>
              <Text style={styles.deductionTitle}>Deductions:</Text>
              {Object.entries(payslipData.deductions).map(([key, value]) => (
                <Text key={key} style={styles.deductionItem}>
                  {key}: ₹{(value as number).toLocaleString()}
                </Text>
              ))}
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          {pdfUrl && (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
                <Icon name="download" size={20} color="#fff" />
                <Text style={styles.actionText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShare}>
                <Icon name="share" size={20} color="#fff" />
                <Text style={styles.actionText}>Share</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            style={[styles.actionButton, styles.emailButton]}
            onPress={() =>
              navigation.navigate('SendPayslipEmail', { runId, userId })
            }
          >
            <Icon name="email" size={20} color="#fff" />
            <Text style={styles.actionText}>Email</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loader: { marginTop: 40 },
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
  content: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginBottom: 8 },
  employee: { fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 },
  month: { fontSize: 14, color: TEXT_PRIMARY, marginBottom: 2 },
  netPay: { fontSize: 16, fontWeight: '700', color: PRIMARY_COLOR, marginTop: 4 },
  grossPay: { fontSize: 14, color: TEXT_SECONDARY, marginTop: 2 },
  deductions: { marginTop: 8 },
  deductionTitle: { fontSize: 14, fontWeight: '600', color: TEXT_PRIMARY },
  deductionItem: { fontSize: 13, color: TEXT_SECONDARY, marginLeft: 8 },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-around' },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shareButton: { backgroundColor: '#4CAF50' },
  emailButton: { backgroundColor: '#2196F3' },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: TEXT_SECONDARY, marginTop: 16 },
});