// apps/prayantra-b2b/src/screens/module/administration/CreateWorkCenterScreen.tsx

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Switch } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { createWorkCenter } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';

// 👇 Import shared colors & gradients
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  ERROR_COLOR,
  SELECTED_ITEM_BG,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

// ----- Timezones list -----
const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
  'Asia/Singapore',
  'Asia/Dubai',
];

// ----- Zod Schema -----
const schema = z.object({
  work_center_code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;
type NavigationProp = StackNavigationProp<any>;

export default function CreateWorkCenterScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  // ----- Form -----
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      timezone: 'Asia/Kolkata',
      is_active: true,
    },
  });

  const selectedTimezone = watch('timezone');

  // ----- Modal state -----
  const [modalVisible, setModalVisible] = useState(false);

  // ----- Submit -----
  const onSubmit = async (data: FormData) => {
    if (!accessToken || !companyId) {
      Alert.alert('Error', 'Missing authentication details');
      return;
    }

    try {
      await createWorkCenter(companyId, deviceId!, data, accessToken);
      Alert.alert('Success', 'Work center created successfully');
      navigation.goBack();
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Creation failed';
      Alert.alert('Error', msg);
    }
  };

  // ----- Render -----
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
        {/* Code */}
        <Controller
          control={control}
          name="work_center_code"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Work Center Code *"
              mode="outlined"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              style={styles.input}
              error={!!errors.work_center_code}
              autoCapitalize="characters"
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />
        {errors.work_center_code && (
          <Text style={styles.error}>{errors.work_center_code.message}</Text>
        )}

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
              style={styles.input}
              error={!!errors.name}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />
        {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

        {/* Description */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Description"
              mode="outlined"
              value={value || ''}
              onChangeText={onChange}
              onBlur={onBlur}
              style={styles.input}
              multiline
              numberOfLines={3}
              theme={{ colors: { primary: PRIMARY_COLOR } }}
            />
          )}
        />

        {/* Timezone Dropdown */}
        <View style={styles.dropdownWrapper}>
          <Text style={styles.dropdownLabel}>Timezone *</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownText}>
              {selectedTimezone || 'Select timezone'}
            </Text>
            <Icon name="chevron-down" size={24} color={TEXT_SECONDARY} />
          </TouchableOpacity>
          {errors.timezone && (
            <Text style={styles.error}>{errors.timezone.message}</Text>
          )}
        </View>

        {/* Is Active Switch */}
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

        {/* ----- GRADIENT SUBMIT BUTTON ----- */}
        <View style={styles.buttonWrapper}>
          <TouchableOpacity
            onPress={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            activeOpacity={0.8}
            style={styles.gradientButton}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.gradient}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>Create Work Center</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Timezone Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Select Timezone
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={TEXT_SECONDARY} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TIMEZONES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedTimezone === item && styles.modalItemSelected,
                  ]}
                  onPress={() => {
                    setValue('timezone', item);
                    setModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedTimezone === item && styles.modalItemTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedTimezone === item && (
                    <Icon name="check" size={20} color={PRIMARY_COLOR} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  dropdownWrapper: {
    marginTop: 12,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  dropdownText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: CARD_BACKGROUND,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  modalTitle: {
    fontWeight: '600',
    color: TEXT_PRIMARY,
  },
  modalList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemSelected: {
    backgroundColor: SELECTED_ITEM_BG,
  },
  modalItemText: {
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  modalItemTextSelected: {
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
});