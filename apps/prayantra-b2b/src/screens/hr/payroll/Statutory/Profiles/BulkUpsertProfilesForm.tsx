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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { bulkUpsertProfiles } from '@b2b/api-client';
import { CreateProfilePayload } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'BulkUpsertProfiles'>;

export default function BulkUpsertProfilesForm() {
  const navigation = useNavigation<NavigationProps>();
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [userIds, setUserIds] = useState('');
  const [statutoryCode, setStatutoryCode] = useState('');
  const [optIn, setOptIn] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const ids = userIds.split(',').map(id => id.trim()).filter(id => id);
    if (ids.length === 0) {
      Alert.alert('Error', 'Enter at least one user ID (comma-separated)');
      return;
    }
    if (!statutoryCode.trim()) { Alert.alert('Error', 'Statutory Code is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    const profiles: CreateProfilePayload[] = ids.map(userId => ({
      user_id: userId,
      statutory_code: statutoryCode.trim(),
      opt_in: optIn,
      effective_from: effectiveFrom.toISOString(),
    }));

    setLoading(true);
    try {
      await bulkUpsertProfiles(companyId, deviceId, accessToken, { profiles });
      Alert.alert('Success', `Upserted ${profiles.length} profiles`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Upsert failed');
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
        <Text style={styles.headerTitle}>Bulk Upsert Profiles</Text>
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

          <Text style={styles.label}>Statutory Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., PF"
            value={statutoryCode}
            onChangeText={setStatutoryCode}
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Opt In</Text>
            <Switch
              value={optIn}
              onValueChange={setOptIn}
              trackColor={{ false: '#767577', true: PRIMARY_COLOR }}
            />
          </View>

          <Text style={styles.label}>Effective From</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
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
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Upsert Profiles</Text>}
        </TouchableOpacity>
      </ScrollView>

      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={effectiveFrom}
        onConfirm={(date) => { setShowDatePicker(false); setEffectiveFrom(date); }}
        onCancel={() => setShowDatePicker(false)}
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
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  label: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, marginTop: 12, marginBottom: 4 },
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
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