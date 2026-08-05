// apps/prayantra-b2b/src/screens/module/administration/EditDepartmentScreen.tsx
import React, { useEffect, useState } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LinearGradient } from 'expo-linear-gradient';

import { getRootDepartments, updateDepartment } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  ERROR_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

type EditDepartmentRouteProp = RouteProp<RootStackParamList, 'EditDepartment'>;

const schema = z.object({
  department_name: z.string().min(1, 'Department name is required').optional(),
  module_code: z.string().optional().nullable(),
  is_active: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditDepartmentScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<EditDepartmentRouteProp>();
  const { departmentId } = route.params;

  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const fetchDepartment = async () => {
      if (!accessToken || !companyId) {
        Alert.alert('Error', 'Missing authentication');
        navigation.goBack();
        return;
      }
      try {
        const res = await getRootDepartments(companyId, deviceId!, accessToken);
        const dept = res.data?.find((d) => d.department_id === departmentId);
        if (dept) {
          reset({
            department_name: dept.department_name,
            module_code: dept.module_code,
            is_active: dept.is_active,
          });
        } else {
          Alert.alert('Not Found', 'Department not found');
          navigation.goBack();
        }
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to load department');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchDepartment();
  }, [departmentId, accessToken, companyId, deviceId]);

  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }
    setSaving(true);
    try {
      // Convert null to undefined for module_code
      const payload = {
        ...data,
        module_code: data.module_code ?? undefined,
      };
      await updateDepartment(companyId, deviceId!, departmentId, payload, accessToken);
      Alert.alert('Success', 'Department updated successfully');
      navigation.goBack();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Update failed';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

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
              value={value || ''}
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

        {/* Module Code */}
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
                value={value ?? true}
                onValueChange={onChange}
                trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
                thumbColor={value ? PRIMARY_COLOR : '#f4f3f4'}
              />
            </View>
          )}
        />

        {/* Update Button */}
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
                <Text style={styles.buttonText}>Update Department</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
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