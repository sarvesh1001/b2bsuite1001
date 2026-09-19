import React, { useState, useEffect } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useUserAuthStore } from '../../../../../store/userAuthStore';
import { listProfiles, updateProfile } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../../constants/colors';
import { RootStackParamList } from '../../../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'EditProfile'>;
type RouteProps = RouteProp<RootStackParamList, 'EditProfile'>;

export default function EditProfileForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { profileId } = route.params;
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [userId, setUserId] = useState('');
  const [statutoryCode, setStatutoryCode] = useState('');
  const [optIn, setOptIn] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await listProfiles(companyId, deviceId, accessToken);
        const profile = res.data?.find((p: any) => p.id === profileId);
        if (!profile) { throw new Error('Profile not found'); }
        setUserId(profile.user_id);
        setStatutoryCode(profile.statutory_code);
        setOptIn(profile.opt_in);
        setEffectiveFrom(new Date(profile.effective_from));
      } catch (error) {
        Alert.alert('Error', 'Failed to load profile');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [profileId]);

  const handleSubmit = async () => {
    if (!userId.trim()) { Alert.alert('Error', 'User ID is required'); return; }
    if (!statutoryCode.trim()) { Alert.alert('Error', 'Statutory Code is required'); return; }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setSubmitting(true);
    try {
      await updateProfile(companyId, profileId, deviceId, accessToken, {
        opt_in: optIn,
        effective_from: effectiveFrom.toISOString(),
      });
      Alert.alert('Success', 'Profile updated');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>User ID</Text>
          <TextInput style={[styles.input, styles.disabledInput]} value={userId} editable={false} />

          <Text style={styles.label}>Statutory Code</Text>
          <TextInput style={[styles.input, styles.disabledInput]} value={statutoryCode} editable={false} />

          <View style={styles.switchRow}>
            <Text style={styles.label}>Opt In</Text>
            <Switch
              value={optIn}
              onValueChange={setOptIn}
              trackColor={{ false: '#767577', true: PRIMARY_COLOR }}
            />
          </View>

          <Text style={styles.label}>Effective From</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Text>{effectiveFrom.toLocaleDateString()}</Text>
            <Icon name="calendar" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitText}>Update Profile</Text>}
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
  disabledInput: { backgroundColor: '#f5f5f5', color: '#999' },
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