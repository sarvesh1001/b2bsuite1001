import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { bulkAssignStructureToEmployees } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'BulkAssignStructure'>;
type RouteProps = RouteProp<RootStackParamList, 'BulkAssignStructure'>;

export default function BulkAssignStructure() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { structureId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [userIds, setUserIds] = useState('');
  const [monthlyCtc, setMonthlyCtc] = useState('');
  const [payType, setPayType] = useState('monthly');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const ids = userIds.split(',').map(id => id.trim()).filter(id => id);
    if (ids.length === 0) {
      Alert.alert('Error', 'Enter at least one user ID (comma-separated)');
      return;
    }
    if (!monthlyCtc || isNaN(Number(monthlyCtc))) { Alert.alert('Error', 'Valid CTC is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await bulkAssignStructureToEmployees(companyId, deviceId, accessToken, {
        user_ids: ids,
        structure_id: structureId,
        monthly_ctc: Number(monthlyCtc),
        pay_type: payType,
        effective_from: effectiveFrom.toISOString(),
      });
      Alert.alert('Success', `Structure assigned to ${ids.length} employees`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Assignment failed');
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
        <Text style={styles.headerTitle}>Bulk Assign Structure</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>User IDs (comma-separated)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="user1, user2, user3"
            value={userIds}
            onChangeText={setUserIds}
            multiline
          />

          <Text style={styles.label}>Monthly CTC</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 100000"
            keyboardType="numeric"
            value={monthlyCtc}
            onChangeText={setMonthlyCtc}
          />

          <Text style={styles.label}>Pay Type</Text>
          <View style={styles.payTypeContainer}>
            {['monthly', 'weekly', 'daily'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.payTypeButton,
                  payType === type && styles.payTypeActive,
                ]}
                onPress={() => setPayType(type)}
              >
                <Text style={styles.payTypeText}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Effective From</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
          >
            <Text>{effectiveFrom.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Bulk Assign</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={showPicker}
        mode="date"
        date={effectiveFrom}
        onConfirm={(date) => {
          setShowPicker(false);
          setEffectiveFrom(date);
        }}
        onCancel={() => setShowPicker(false)}
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  formContainer: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  payTypeContainer: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  payTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  payTypeActive: {
    backgroundColor: PRIMARY_COLOR + '20',
    borderColor: PRIMARY_COLOR,
  },
  payTypeText: { color: TEXT_PRIMARY },
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
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});