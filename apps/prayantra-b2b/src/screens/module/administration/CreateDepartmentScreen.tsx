// apps/prayantra-b2b/src/screens/module/administration/CreateDepartmentScreen.tsx

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';

import { createDepartment } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  ERROR_COLOR,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// ---- Zod schema (no .default on any field) ----
const schema = z.object({
  department_name: z.string().min(1, 'Department name is required'),
  module_code: z.string().optional(),
  is_active: z.boolean(), // now required
});

type FormData = z.infer<typeof schema>;

// ---- Navigation type ----
type NavigationProp = StackNavigationProp<RootStackParamList, 'CreateDepartment'>;

export default function CreateDepartmentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);

  // ---- Form with all default values (including is_active) ----
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      department_name: '',
      module_code: '',
      is_active: true, // default provided here
    },
  });

  // ---- Submit handler ----
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) {
      Alert.alert('Error', 'Missing authentication details');
      return;
    }
    setLoading(true);
    try {
      if (!deviceId) {
        Alert.alert('Error', 'Device ID missing');
        return;
      }
      await createDepartment(companyId, deviceId, data, accessToken);
      Alert.alert('Success', 'Department created successfully');
      navigation.goBack();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Creation failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // ---- Render ----
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top || 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Department Name */}
        <Controller
          control={control}
          name="department_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Department Name *"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              style={styles.input}
              error={!!errors.department_name}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />
        {errors.department_name && (
          <Text style={styles.error}>{errors.department_name.message}</Text>
        )}

        {/* Module Code (optional) */}
        <Controller
          control={control}
          name="module_code"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Module Code (optional)"
              mode="outlined"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              style={styles.input}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />

        {/* Active Switch */}
        <Controller
          control={control}
          name="is_active"
          render={({ field: { onChange, value } }) => (
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Active</Text>
              <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
                thumbColor={value ? PRIMARY_COLOR : '#f4f3f4'}
              />
            </View>
          )}
        />

        {/* Submit Button */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
            style={styles.gradientButton}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.gradient}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>Create Department</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  input: {
    marginTop: 12,
    backgroundColor: CARD_BACKGROUND,
  },
  error: {
    color: ERROR_COLOR,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  buttonWrapper: {
    marginTop: 32,
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