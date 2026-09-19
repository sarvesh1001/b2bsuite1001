import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useDevice } from '../hooks/useDevice';
import { useSync } from '../hooks/useSync';
import { resetToCamera } from '../navigation/navigationService';

export default function SettingsScreen() {
  const {
    deviceToken,
    companyId,
    serverUrl,
    isConfigured,
    setCredentials,
    clearCredentials,
  } = useDevice();

  const { performSync, isSyncing } = useSync();

  const [token, setToken] = useState(deviceToken || '');
  const [company, setCompany] = useState(companyId || '');
  const [url, setUrl] = useState(serverUrl || 'http://localhost:8080');

  const handleSave = async () => {
    if (!token.trim() || !company.trim()) {
      Alert.alert('Error', 'Device Token and Company ID are required');
      return;
    }
    setCredentials(token.trim(), company.trim(), url.trim());
    Alert.alert('Saved', 'Device configured successfully');
    // Navigate to camera after a short delay
    setTimeout(resetToCamera, 500);
  };

  const handleReset = () => {
    Alert.alert('Reset Device', 'This will clear all credentials. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          clearCredentials();
          // The navigator will automatically show this screen again
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandLogo}
          >
            <Text style={styles.brandLogoText}>P</Text>
          </LinearGradient>
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Prayantra Biometrics</Text>
            <Text style={styles.brandSubtitle}>Offline Attendance</Text>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Device Configuration</Text>
          <Text style={styles.pageSubtitle}>
            Enter the credentials provided by your administrator to activate this device.
          </Text>
        </View>

        {/* Input fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Device Token</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. dev_abc123"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Company ID</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 94fc3281-1908-403f-8fad..."
              value={company}
              onChangeText={setCompany}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Server URL</Text>
            <TextInput
              style={styles.input}
              placeholder="http://localhost:8080"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSyncing}
        >
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.saveGradient}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>Save & Continue</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {isConfigured && (
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetText}>Reset Device</Text>
          </TouchableOpacity>
        )}

        {/* Security notice */}
        <View style={styles.securityBar}>
          <Icon name="shield-check-outline" size={17} color="#64748B" />
          <Text style={styles.securityText}>All data is stored securely on this device</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  container: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  brandHeader: { flexDirection: 'row', alignItems: 'center' },
  brandLogo: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B2FBE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  brandLogoText: { color: '#fff', fontSize: 19, fontWeight: '800' },
  brandText: { marginLeft: 10 },
  brandName: { color: '#172033', fontSize: 17, fontWeight: '700' },
  brandSubtitle: { color: '#94A3B8', fontSize: 9, fontWeight: '500' },
  titleSection: { marginTop: 28 },
  pageTitle: { fontSize: 27, fontWeight: '700', color: '#172033', letterSpacing: -0.5 },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 7,
    lineHeight: 18,
    maxWidth: 330,
    fontWeight: '500',
  },
  form: { marginTop: 24 },
  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5EAF1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  saveButton: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetButton: { marginTop: 16, alignItems: 'center' },
  resetText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  securityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1,
    borderColor: '#E5EAF1',
  },
  securityText: { marginLeft: 7, fontSize: 9, color: '#64748B', fontWeight: '500' },
});