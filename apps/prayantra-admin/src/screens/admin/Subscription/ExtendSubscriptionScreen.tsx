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

import { extendSubscription } from '../../../services/admin';

export default function ExtendSubscriptionScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { companyId } = route.params as { companyId: string };

  const [months, setMonths] = useState('');
  const [days, setDays] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExtend = async () => {
    const additionalMonths = parseInt(months, 10) || 0;
    const additionalDays = parseInt(days, 10) || 0;

    if (additionalMonths === 0 && additionalDays === 0) {
      Alert.alert('Invalid Input', 'Please add at least one month or day.');
      return;
    }

    setLoading(true);
    try {
      await extendSubscription(companyId, {
        additional_months: additionalMonths,
        additional_days: additionalDays,
      });
      Alert.alert('Success', 'Subscription extended successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const msg =
        error.response?.data?.message || error.message || 'Extension failed.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Extend Subscription
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Add extra months or days to the current subscription period.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Additional Months</Text>
          <TextInput
            mode="outlined"
            value={months}
            onChangeText={setMonths}
            keyboardType="number-pad"
            placeholder="0"
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Additional Days</Text>
          <TextInput
            mode="outlined"
            value={days}
            onChangeText={setDays}
            keyboardType="number-pad"
            placeholder="0"
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />
        </View>

        <TouchableOpacity
          onPress={handleExtend}
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
              <Text style={styles.buttonText}>Extend Subscription</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

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
  inputContainer: {
    marginBottom: 20,
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
    marginTop: 8,
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
    marginTop: 12,
  },
  cancelText: {
    color: '#7B2FBE',
    fontSize: 16,
    fontWeight: '500',
  },
});