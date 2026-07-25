import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

import { updateSubscription } from '../../../services/admin';

// Tier options
const TIERS = [
  { label: 'Basic', value: 'basic' },
  { label: 'Premium', value: 'premium' },
  { label: 'Enterprise', value: 'enterprise' },
];

// Status options
const STATUSES = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Expired', value: 'expired' },
];

export default function SubscriptionManagementScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  // Expect companyId and company object from navigation params
  const { companyId, company } = route.params as {
    companyId: string;
    company: any;
  };

  // Local state
  const [tier, setTier] = useState(company.subscription_tier || 'basic');
  const [status, setStatus] = useState(company.subscription_status || 'active');
  const [maxEmployees, setMaxEmployees] = useState(
    String(company.max_employees || 100)
  );
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    const maxEmpNum = parseInt(maxEmployees, 10);
    if (isNaN(maxEmpNum) || maxEmpNum < 1) {
      Alert.alert('Invalid Input', 'Max employees must be a positive number.');
      return;
    }

    setLoading(true);
    try {
      await updateSubscription(companyId, {
        tier,
        status,
        max_employees: maxEmpNum,
      });
      Alert.alert('Success', 'Subscription updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const msg =
        error.response?.data?.message || error.message || 'Update failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  // Helper: render chip selector
  const renderChipSelector = (
    options: { label: string; value: string }[],
    selectedValue: string,
    onSelect: (value: string) => void,
    label: string
  ) => (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              selectedValue === opt.value && styles.chipSelected,
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text
              style={[
                styles.chipText,
                selectedValue === opt.value && styles.chipTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Manage Subscription
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Update tier, status, or employee limit for {company.company_name}
          </Text>
        </View>

        {/* Tier Selector */}
        {renderChipSelector(TIERS, tier, setTier, 'Subscription Tier')}

        {/* Status Selector */}
        {renderChipSelector(STATUSES, status, setStatus, 'Status')}

        {/* Max Employees Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Max Employees</Text>
          <TextInput
            mode="outlined"
            value={maxEmployees}
            onChangeText={setMaxEmployees}
            keyboardType="number-pad"
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />
        </View>

        {/* Update Button */}
        <TouchableOpacity
          onPress={handleUpdate}
          disabled={loading}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.buttonGradient, loading && styles.buttonDisabled]}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={styles.buttonText}>Update Subscription</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Cancel / Go Back */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    color: '#1A1A1A',
    fontSize: 28,
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  selectorContainer: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  chipSelected: {
    backgroundColor: '#7B2FBE',
    borderColor: '#7B2FBE',
  },
  chipText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: 'white',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
  },
  buttonWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelText: {
    color: '#7B2FBE',
    fontSize: 16,
    fontWeight: '500',
  },
});