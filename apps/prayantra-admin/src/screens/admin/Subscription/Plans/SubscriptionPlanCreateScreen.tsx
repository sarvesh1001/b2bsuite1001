import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

import { createSubscriptionPlan } from '../../../../services/admin';

export default function SubscriptionPlanCreateScreen() {
  const navigation = useNavigation();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    plan_code: '',
    plan_name: '',
    description: '',
    duration_days: '30',
    price: '',
    currency: 'USD',
    gateway_plan_id: '',
  });

  const handleSubmit = async () => {
    if (!form.plan_code.trim()) {
      Alert.alert('Error', 'Plan code is required');
      return;
    }
    if (!form.plan_name.trim()) {
      Alert.alert('Error', 'Plan name is required');
      return;
    }
    const duration = parseInt(form.duration_days) || 0;
    if (duration <= 0) {
      Alert.alert('Error', 'Duration must be greater than 0');
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      Alert.alert('Error', 'Price must be 0 or greater');
      return;
    }

    setSaving(true);
    try {
      await createSubscriptionPlan({
        plan_code: form.plan_code.trim(),
        plan_name: form.plan_name.trim(),
        description: form.description.trim() || undefined,
        duration_days: duration,
        price,
        currency: form.currency.trim() || 'USD',
        gateway_plan_id: form.gateway_plan_id.trim() || undefined,
      });
      Alert.alert('Success', 'Plan created', [
        { text: 'OK', onPress: () => (navigation as any).goBack() },
      ]);
    } catch (e: any) {
      Alert.alert(
        'Error',
        e.response?.data?.message || e.message || 'Failed to create plan'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text variant="headlineMedium" style={styles.title}>
            Create Plan
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Define a new subscription plan
          </Text>

          <TextInput
            mode="outlined"
            label="Plan Code *"
            value={form.plan_code}
            onChangeText={(t) => setForm({ ...form, plan_code: t })}
            style={styles.input}
            placeholder="monthly_01"
            autoCapitalize="none"
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          <TextInput
            mode="outlined"
            label="Plan Name *"
            value={form.plan_name}
            onChangeText={(t) => setForm({ ...form, plan_name: t })}
            style={styles.input}
            placeholder="Monthly Subscription"
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          <TextInput
            mode="outlined"
            label="Description"
            value={form.description}
            onChangeText={(t) => setForm({ ...form, description: t })}
            multiline
            numberOfLines={3}
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <TextInput
                mode="outlined"
                label="Duration (days) *"
                value={form.duration_days}
                onChangeText={(t) => setForm({ ...form, duration_days: t })}
                keyboardType="number-pad"
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
            </View>
            <View style={styles.half}>
              <TextInput
                mode="outlined"
                label="Currency *"
                value={form.currency}
                onChangeText={(t) => setForm({ ...form, currency: t })}
                style={styles.input}
                autoCapitalize="characters"
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
            </View>
          </View>

          <TextInput
            mode="outlined"
            label="Price *"
            value={form.price}
            onChangeText={(t) => setForm({ ...form, price: t })}
            keyboardType="decimal-pad"
            style={styles.input}
            placeholder="99.99"
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          <TextInput
            mode="outlined"
            label="Gateway Plan ID (optional)"
            value={form.gateway_plan_id}
            onChangeText={(t) => setForm({ ...form, gateway_plan_id: t })}
            style={styles.input}
            placeholder="price_yearly_456"
            autoCapitalize="none"
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={saving}
            activeOpacity={0.8}
            style={styles.buttonWrapper}
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              style={[styles.buttonGradient, saving && { opacity: 0.6 }]}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Plan</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 24, paddingBottom: 40 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 26 },
  subtitle: { color: '#666', marginTop: 4, marginBottom: 16 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  half: { flex: 0.48 },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginTop: 12 },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});