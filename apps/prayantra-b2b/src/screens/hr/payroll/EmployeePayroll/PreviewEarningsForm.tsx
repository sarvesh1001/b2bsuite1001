import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { previewEarnings } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'PreviewEarnings'>;
type RouteProps = RouteProp<RootStackParamList, 'PreviewEarnings'>;

export default function PreviewEarningsForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { userId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const handlePreview = async () => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setLoading(true);
    try {
      const res = await previewEarnings(companyId, userId, deviceId, accessToken, {
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
      });
      setPreview(res.data);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Preview failed');
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
        <Text style={styles.headerTitle}>Preview Earnings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Period Start</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
            <Text>{startDate.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          <Text style={styles.label}>Period End</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
            <Text>{endDate.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.previewButton, loading && styles.disabledButton]}
            onPress={handlePreview}
            disabled={loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.buttonText}>Preview</Text>}
          </TouchableOpacity>
        </View>

        {preview && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Preview Result</Text>
            {Object.entries(preview).map(([key, value]) => (
              <View key={key} style={styles.row}>
                <Text style={styles.key}>{key.replace(/_/g, ' ').toUpperCase()}</Text>
                <Text style={styles.value}>
                  {typeof value === 'number' ? `₹${value.toLocaleString()}` : String(value)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <DateTimePickerModal
        isVisible={showStartPicker}
        mode="date"
        date={startDate}
        onConfirm={(date) => { setShowStartPicker(false); setStartDate(date); }}
        onCancel={() => setShowStartPicker(false)}
      />
      <DateTimePickerModal
        isVisible={showEndPicker}
        mode="date"
        date={endDate}
        onConfirm={(date) => { setShowEndPicker(false); setEndDate(date); }}
        onCancel={() => setShowEndPicker(false)}
      />
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
  formContainer: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  label: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 8, marginBottom: 4 },
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
  previewButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  key: { fontSize: 14, color: TEXT_SECONDARY, flex: 1 },
  value: { fontSize: 14, fontWeight: '500', color: TEXT_PRIMARY },
});