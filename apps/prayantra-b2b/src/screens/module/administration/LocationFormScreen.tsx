// apps/prayantra-b2b/src/screens/module/administration/LocationFormScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Switch } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  createLocation,
  updateLocation,
  getLocation,
} from '@b2b/api-client';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

type Nav = StackNavigationProp<RootStackParamList, 'LocationForm'>;
type Rt = RouteProp<RootStackParamList, 'LocationForm'>;

const schema = z.object({
  location_code: z.string().min(2, 'Code is required'),
  location_name: z.string().min(2, 'Name is required'),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  pincode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function LocationFormScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const { locationId } = route.params ?? {};
  const isEdit = !!locationId;

  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);
  const [isActive, setIsActive] = useState(true);

  const {
    control, handleSubmit, setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      location_code: '', location_name: '',
      address_line1: '', address_line2: '',
      city: '', state: '', country: 'India', pincode: '',
    },
  });

  // =======================================================
  // LOAD EXISTING (edit mode)
  // =======================================================
  useEffect(() => {
    if (!isEdit || !companyId || !locationId) return;
    (async () => {
      try {
        setFetching(true);
        const loc = await getLocation(companyId, locationId);
        setValue('location_code', loc.location_code);
        setValue('location_name', loc.location_name);
        setValue('address_line1', loc.address_line1 ?? '');
        setValue('address_line2', loc.address_line2 ?? '');
        setValue('city', loc.city ?? '');
        setValue('state', loc.state ?? '');
        setValue('country', loc.country ?? 'India');
        setValue('pincode', loc.pincode ?? '');
        setIsActive(loc.is_active !== false);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Could not load location.');
        navigation.goBack();
      } finally {
        setFetching(false);
      }
    })();
  }, [isEdit, companyId, locationId, setValue, navigation]);

  // =======================================================
  // SUBMIT
  // =======================================================
  const onSubmit = async (data: FormData) => {
    if (!companyId) {
      Alert.alert('Session error', 'Missing company context.');
      return;
    }
    try {
      setLoading(true);
      const key = isEdit
        ? `loc-upd-${locationId}-${Date.now()}`
        : `loc-new-${Date.now()}`;

      if (isEdit && locationId) {
        await updateLocation(
          companyId,
          locationId,
          { ...data, is_active: isActive },
          key
        );
      } else {
        await createLocation(companyId, data, key);
      }

      Alert.alert(
        'Success',
        isEdit ? 'Location updated.' : 'Location created.',
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (e: any) {
      Alert.alert(
        'Unable to save',
        e?.response?.data?.message || e?.message || 'Try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingTitle}>Loading location</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={GRADIENT_COLORS}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerIcon}>
              <Icon
                name={isEdit ? 'map-marker-check-outline' : 'map-marker-plus-outline'}
                size={24}
                color="#FFFFFF"
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                {isEdit ? 'Edit Location' : 'New Location'}
              </Text>
              <Text style={styles.headerSubtitle}>Administration</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <SectionHeader
            icon="information-outline"
            title="Basic Information"
            subtitle="Code and display name"
          />

          <View style={styles.formCard}>
            <Controller
              control={control} name="location_code"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Location Code" required icon="pound"
                  value={value} onChangeText={onChange}
                  placeholder="e.g. DEL"
                  error={errors.location_code?.message}
                />
              )}
            />
            <Controller
              control={control} name="location_name"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Location Name" required icon="rename-box"
                  value={value} onChangeText={onChange}
                  placeholder="e.g. Delhi Head Office"
                  error={errors.location_name?.message}
                  isLast
                />
              )}
            />
          </View>

          <SectionHeader
            icon="map-marker-outline"
            title="Address"
            subtitle="Street, city and pincode"
          />

          <View style={styles.formCard}>
            <Controller
              control={control} name="address_line1"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Address Line 1" icon="home-outline"
                  value={value || ''} onChangeText={onChange}
                  placeholder="Street address"
                />
              )}
            />
            <Controller
              control={control} name="address_line2"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Address Line 2" icon="home-outline"
                  value={value || ''} onChangeText={onChange}
                  placeholder="Landmark (optional)"
                />
              )}
            />
            <Controller
              control={control} name="city"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="City" icon="city-variant-outline"
                  value={value || ''} onChangeText={onChange}
                  placeholder="e.g. Delhi"
                />
              )}
            />
            <Controller
              control={control} name="state"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="State" icon="map-outline"
                  value={value || ''} onChangeText={onChange}
                  placeholder="e.g. Delhi"
                />
              )}
            />
            <Controller
              control={control} name="country"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Country" icon="earth"
                  value={value || ''} onChangeText={onChange}
                  placeholder="e.g. India"
                />
              )}
            />
            <Controller
              control={control} name="pincode"
              render={({ field: { onChange, value } }) => (
                <FormInput
                  label="Pincode" icon="numeric"
                  value={value || ''} onChangeText={onChange}
                  placeholder="e.g. 110001"
                  keyboardType="number-pad"
                  isLast
                />
              )}
            />
          </View>

          {isEdit && (
            <View style={styles.activeCard}>
              <View style={styles.activeIcon}>
                <Icon
                  name={isActive ? 'check-circle-outline' : 'close-circle-outline'}
                  size={22}
                  color={isActive ? PRIMARY_COLOR : ERROR_COLOR}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 11 }}>
                <Text style={styles.activeTitle}>Active</Text>
                <Text style={styles.activeDesc}>
                  Inactive locations stay in history but can't be assigned.
                </Text>
              </View>
              <Switch value={isActive} onValueChange={setIsActive} color={PRIMARY_COLOR} />
            </View>
          )}

          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.85}
            style={styles.submitWrapper}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.submitButton}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name="content-save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.submitText}>
                    {isEdit ? 'Save Changes' : 'Create Location'}
                  </Text>
                  <Icon name="arrow-right" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------- helpers ----------
function SectionHeader({
  icon, title, subtitle,
}: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderIcon}>
        <Icon name={icon} size={19} color={PRIMARY_COLOR} />
      </View>
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionHeaderTitle}>{title}</Text>
        <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function FormInput({
  label, icon, value, onChangeText, placeholder, error, required, isLast, keyboardType,
}: {
  label: string; icon: string; value: string;
  onChangeText: (t: string) => void; placeholder?: string;
  error?: string; required?: boolean; isLast?: boolean; keyboardType?: any;
}) {
  return (
    <View style={[styles.inputWrapper, !isLast && styles.inputDivider]}>
      <View style={styles.inputIcon}>
        <Icon name={icon} size={20} color={PRIMARY_COLOR} />
      </View>
      <View style={styles.inputContent}>
        <Text style={styles.fieldLabel}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <RNTextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A0A8B5"
          keyboardType={keyboardType}
          style={[styles.nativeInput, error && styles.inputError]}
        />
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </View>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  header: {
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 5,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  headerIcon: {
    width: 40, height: 40, marginLeft: 10, alignItems: 'center',
    justifyContent: 'center', borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerText: { marginLeft: 11, flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { marginTop: 2, color: 'rgba(255,255,255,0.65)', fontSize: 9 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 45 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 25, marginBottom: 11,
  },
  sectionHeaderIcon: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: `${PRIMARY_COLOR}10`,
  },
  sectionHeaderText: { marginLeft: 10, flex: 1 },
  sectionHeaderTitle: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '700' },
  sectionHeaderSubtitle: { marginTop: 2, color: TEXT_SECONDARY, fontSize: 9 },

  formCard: {
    paddingHorizontal: 14, borderRadius: 15, backgroundColor: CARD_BACKGROUND,
    borderWidth: 1, borderColor: '#E5EAF0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 7, elevation: 1,
  },
  inputWrapper: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 13 },
  inputDivider: { borderBottomWidth: 1, borderBottomColor: '#EDF0F4' },
  inputIcon: {
    width: 37, height: 37, alignItems: 'center', justifyContent: 'center',
    marginTop: 3, borderRadius: 10, backgroundColor: `${PRIMARY_COLOR}0D`,
  },
  inputContent: { flex: 1, marginLeft: 11 },
  fieldLabel: { color: TEXT_PRIMARY, fontSize: 10, fontWeight: '600' },
  required: { color: ERROR_COLOR },
  nativeInput: {
    minHeight: 38, marginTop: 2, paddingHorizontal: 0, paddingVertical: 0,
    color: TEXT_PRIMARY, fontSize: 14, fontWeight: '500',
  },
  inputError: { color: ERROR_COLOR },
  errorText: { marginTop: 2, color: ERROR_COLOR, fontSize: 9, lineHeight: 13 },

  activeCard: {
    flexDirection: 'row', alignItems: 'center', marginTop: 20,
    padding: 13, borderRadius: 14, backgroundColor: `${PRIMARY_COLOR}08`,
    borderWidth: 1, borderColor: `${PRIMARY_COLOR}18`,
  },
  activeIcon: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 11, backgroundColor: `${PRIMARY_COLOR}12`,
  },
  activeTitle: { color: TEXT_PRIMARY, fontSize: 12, fontWeight: '700' },
  activeDesc: { marginTop: 2, color: TEXT_SECONDARY, fontSize: 9, lineHeight: 13 },

  submitWrapper: {
    marginTop: 22, borderRadius: 14, overflow: 'hidden',
    shadowColor: PRIMARY_COLOR, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  submitButton: {
    minHeight: 54, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 9,
  },
  submitText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { marginTop: 13, color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
});