// apps/mobile/src/screens/admin/Department/UpdateMaxDepartmentsScreen.tsx
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';

import { updateMaxDepartments } from '../../../services/admin';

export default function UpdateMaxDepartmentsScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { companyId, currentMax } = route.params as {
    companyId: string;
    currentMax: number;
  };

  const [maxDepartments, setMaxDepartments] = useState(
    String(currentMax || 0)
  );
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    const newMax = parseInt(maxDepartments, 10);
    if (isNaN(newMax) || newMax < 1) {
      Alert.alert('Invalid Input', 'Max departments must be at least 1.');
      return;
    }

    setLoading(true);
    try {
      await updateMaxDepartments(companyId, newMax);
      Alert.alert('Success', 'Max departments limit updated successfully.', [
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Update Departments Limit
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Set the maximum number of departments allowed for this company.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Max Departments</Text>
          <TextInput
            mode="outlined"
            value={maxDepartments}
            onChangeText={setMaxDepartments}
            keyboardType="number-pad"
            style={styles.input}
            theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
          />
          <Text style={styles.hint}>Current value: {currentMax}</Text>
        </View>

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
              <Text style={styles.buttonText}>Update Limit</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    flex: 1,
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
  hint: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
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