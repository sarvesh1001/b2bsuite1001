// apps/prayantra-b2b/src/screens/modules/administration/EditWorkCenterScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, Switch } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';

// API & Store
import { getWorkCenterByCode, updateWorkCenter } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';

// 👇 Import shared colors & gradients
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// Zod schema for update (all fields optional)
const updateWorkCenterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  description: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof updateWorkCenterSchema>;

type EditWorkCenterRouteProp = RouteProp<RootStackParamList, 'EditWorkCenter'>;
type NavigationProp = StackNavigationProp<any>;

export default function EditWorkCenterScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditWorkCenterRouteProp>();
  const { code } = route.params;

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workCenterData, setWorkCenterData] = useState<any>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(updateWorkCenterSchema),
    defaultValues: {
      name: '',
      description: '',
      is_active: true,
    },
  });

  // Fetch existing data
  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken || !companyId || !deviceId) {
        Alert.alert('Error', 'Missing authentication.');
        navigation.goBack();
        return;
      }

      try {
        const response = await getWorkCenterByCode(companyId, deviceId, code, accessToken);
        if (response.success && response.data) {
          setWorkCenterData(response.data);
          reset({
            name: response.data.name,
            description: response.data.description || '',
            is_active: response.data.is_active,
          });
        } else {
          Alert.alert('Not Found', 'Work center not found.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to load work center.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code, accessToken, companyId, deviceId]);

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'You are not logged in.');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {};
      if (data.name !== undefined) payload.name = data.name.trim();
      if (data.description !== undefined) payload.description = data.description?.trim() || '';
      if (data.is_active !== undefined) payload.is_active = data.is_active;

      const response = await updateWorkCenter(
        companyId,
        deviceId,
        code,
        payload,
        accessToken
      );

      if (response.success) {
        Alert.alert('Success', 'Work center updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Update failed.');
      }
    } catch (error: any) {
      console.error('Update work center error:', error);
      const msg = error.response?.data?.error || error.message;
      Alert.alert('Error', msg || 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.form}>
            <Text variant="headlineSmall" style={styles.heading}>
              Edit Work Center
            </Text>

            {/* Read‑only code field */}
            <View style={styles.readonlyRow}>
              <Text variant="bodyMedium" style={styles.label}>Code</Text>
              <Text variant="bodyLarge" style={styles.value}>{code}</Text>
            </View>

            {/* Name */}
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Name *"
                  mode="outlined"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={!!errors.name}
                  style={styles.input}
                  maxLength={100}
                  theme={{ colors: { primary: PRIMARY_COLOR } }}
                />
              )}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name.message}</Text>}

            {/* Description */}
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  label="Description (optional)"
                  mode="outlined"
                  value={value || ''}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  style={styles.input}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  theme={{ colors: { primary: PRIMARY_COLOR } }}
                />
              )}
            />

            {/* Active switch */}
            <Controller
              control={control}
              name="is_active"
              render={({ field: { onChange, value } }) => (
                <View style={styles.switchRow}>
                  <Text variant="bodyMedium" style={styles.switchLabel}>
                    Active
                  </Text>
                  <Switch
                    value={value || false}
                    onValueChange={onChange}
                    trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
                    thumbColor={value ? PRIMARY_COLOR : '#f4f3f4'}
                  />
                </View>
              )}
            />

            {/* ----- GRADIENT UPDATE BUTTON ----- */}
            <View style={styles.buttonWrapper}>
              <TouchableOpacity
                onPress={handleSubmit(onSubmit)}
                disabled={saving}
                activeOpacity={0.8}
                style={styles.gradientButton}
              >
                <LinearGradient
                  colors={GRADIENT_COLORS}
                  start={GRADIENT_START}
                  end={GRADIENT_END}
                  style={styles.gradient}
                >
                  {saving ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={styles.buttonText}>Update Work Center</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  form: {
    width: '100%',
    backgroundColor: CARD_BACKGROUND,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
  },
  heading: {
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
    marginBottom: 24,
  },
  readonlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    marginBottom: 16,
  },
  label: {
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  value: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
    backgroundColor: CARD_BACKGROUND,
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingHorizontal: 4,
  },
  switchLabel: {
    color: TEXT_PRIMARY,
  },
  buttonWrapper: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    width: '100%',
  },
  gradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});