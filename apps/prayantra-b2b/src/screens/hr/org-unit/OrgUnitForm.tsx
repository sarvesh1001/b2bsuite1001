import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { createOrgUnit, updateOrgUnit, getOrgUnit } from '@b2b/api-client';
import type {
  CreateOrgUnitPayload, UpdateOrgUnitPayload, OrgUnitType,
} from '@b2b/shared-types';
import {
  BACKGROUND_COLOR, CARD_BACKGROUND, PRIMARY_COLOR,
  TEXT_PRIMARY, TEXT_SECONDARY, BORDER_COLOR,
} from '../../../constants/colors';
import {
  ORG_UNIT_TYPES, getOrgUnitTypeLabel, getOrgUnitTypeIcon, getOrgUnitTypeColor,
} from '../../../constants/orgUnit';
import { RootStackParamList } from '../../../navigation';
import LocationMultiChipPicker from '../../../components/LocationMultiChipPicker';
import { useLocations } from '../../../hooks/useLocations';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  org_unit_type: z.enum(ORG_UNIT_TYPES, {
    errorMap: () => ({ message: 'Please pick a type' }),
  }),
  description: z.string().optional(),
  home_location_ids: z.array(z.string()),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

type RouteProps = RouteProp<RootStackParamList, 'OrgUnitForm'>;
type NavigationProps = StackNavigationProp<RootStackParamList, 'OrgUnitForm'>;

export default function OrgUnitForm() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProps>();
  const { orgUnitId } = route.params || {};
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const { locations, loading: locationsLoading } = useLocations();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!orgUnitId);

  const {
    control, handleSubmit, setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      org_unit_type: 'team' as OrgUnitType,
      description: '',
      home_location_ids: [],
      is_active: true,
    },
  });

  useEffect(() => {
    if (!orgUnitId) { setFetching(false); return; }
    const fetch = async () => {
      if (!accessToken || !companyId || !deviceId) return;
      try {
        const res = await getOrgUnit(companyId, orgUnitId, deviceId, accessToken, false);
        const data = res.data;
        setValue('name', data.name);
        setValue('org_unit_type', data.org_unit_type);
        setValue('description', data.description ?? '');
        // NEW: array, defaults to [] if missing
        setValue('home_location_ids', data.home_location_ids ?? []);
        setValue('is_active', data.is_active);
      } catch {
        Alert.alert('Error', 'Failed to load org unit');
        navigation.goBack();
      } finally {
        setFetching(false);
      }
    };
    fetch();
  }, [orgUnitId, accessToken, companyId, deviceId, setValue]);

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setLoading(true);
    try {
      if (orgUnitId) {
        // Replace semantics:
        //   undefined → no change
        //   []        → make universal
        //   [...]     → bind to exactly these
        // We only include the field if the user actually touched the picker.
        const payload: UpdateOrgUnitPayload = {
          name: data.name,
          description: data.description,
          is_active: data.is_active,
        };
        if (dirtyFields.home_location_ids) {
          payload.home_location_ids = data.home_location_ids;
        }
        await updateOrgUnit(companyId, orgUnitId, deviceId, accessToken, payload);
        Alert.alert('Success', 'Org unit updated');
      } else {
        const payload: CreateOrgUnitPayload = {
          name: data.name,
          org_unit_type: data.org_unit_type as OrgUnitType,
          description: data.description,
          home_location_ids: data.home_location_ids,
          is_active: data.is_active,
        };
        await createOrgUnit(companyId, deviceId, accessToken, payload);
        Alert.alert('Success', 'Org unit created');
      }
      navigation.goBack();
    } catch (error: any) {
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        'Operation failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{orgUnitId ? 'Edit Org Unit' : 'New Org Unit'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          {/* Name */}
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Name *</Text>
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  placeholder="Enter name"
                  placeholderTextColor={TEXT_SECONDARY}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
                {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}
              </View>
            )}
          />

          {/* Type */}
          <Controller
            control={control}
            name="org_unit_type"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Type *</Text>
                <View style={styles.typeGrid}>
                  {ORG_UNIT_TYPES.map((t) => {
                    const selected = value === t;
                    const color = getOrgUnitTypeColor(t);
                    const disabled = !!orgUnitId;
                    return (
                      <TouchableOpacity
                        key={t}
                        disabled={disabled}
                        style={[
                          styles.typeChip,
                          { borderColor: color },
                          selected && { backgroundColor: color },
                          disabled && !selected && styles.typeChipDisabled,
                        ]}
                        onPress={() => onChange(t as OrgUnitType)}
                        activeOpacity={0.7}
                      >
                        <Icon name={getOrgUnitTypeIcon(t)} size={18}
                          color={selected ? '#fff' : color} />
                        <Text style={[styles.typeChipText, { color: selected ? '#fff' : color }]}>
                          {getOrgUnitTypeLabel(t)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {orgUnitId && (
                  <Text style={styles.hintText}>Type cannot be changed after creation.</Text>
                )}
                {errors.org_unit_type && (
                  <Text style={styles.errorText}>{errors.org_unit_type.message}</Text>
                )}
              </View>
            )}
          />

          {/* Home Locations — multi-select */}
          <Controller
            control={control}
            name="home_location_ids"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Home Locations</Text>
                <Text style={styles.hintText}>
                  Leave empty for universal access — anyone from any location can
                  be added. Pick one or more locations to restrict membership to
                  users authorized for at least one of them.
                </Text>
                <View style={{ marginTop: 8 }}>
                  <LocationMultiChipPicker
                    locations={locations}
                    value={value ?? []}
                    onChange={onChange}
                    loading={locationsLoading}
                    emptyHint="Universal — any location is allowed."
                  />
                </View>
              </View>
            )}
          />

          {/* Description */}
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description (optional)"
                  placeholderTextColor={TEXT_SECONDARY}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  multiline numberOfLines={3} textAlignVertical="top"
                />
              </View>
            )}
          />

          {/* Active */}
          <Controller
            control={control}
            name="is_active"
            render={({ field: { onChange, value } }) => (
              <View style={styles.switchContainer}>
                <Text style={styles.fieldLabel}>Active</Text>
                <Switch value={value} onValueChange={onChange}
                  trackColor={{ false: '#ccc', true: PRIMARY_COLOR }} />
              </View>
            )}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (isSubmitting || loading) && styles.disabledButton]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>{orgUnitId ? 'Update' : 'Create'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BACKGROUND_COLOR },
  loadingText: { marginTop: 12, color: TEXT_SECONDARY, fontSize: 14 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1, borderBottomColor: BORDER_COLOR,
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: TEXT_PRIMARY, marginLeft: 10 },
  formContainer: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: BORDER_COLOR,
  },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: TEXT_PRIMARY, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: BORDER_COLOR, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: TEXT_PRIMARY, backgroundColor: '#fff',
  },
  inputError: { borderColor: '#ef4444' },
  textArea: { minHeight: 80, paddingTop: 10 },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  hintText: { fontSize: 11, color: TEXT_SECONDARY, marginTop: 4, fontStyle: 'italic' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, backgroundColor: '#fff',
  },
  typeChipDisabled: { opacity: 0.4 },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  switchContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 8,
  },
  submitButton: {
    backgroundColor: PRIMARY_COLOR, paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginTop: 20,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});