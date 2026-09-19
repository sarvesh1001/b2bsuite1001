import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useFaceEngine } from '../hooks/useFaceEngine';
import { useAttendance } from '../hooks/useAttendance';
import { useDevice } from '../hooks/useDevice';
import { FaceCameraView } from '../components/FaceCameraView';
import { navigateTo } from '../navigation/navigationService';

export default function CameraScreen() {
  const { isReady, error, reload } = useFaceEngine();
  const { log } = useAttendance();
  const { isConfigured } = useDevice();
  const [lastLogged, setLastLogged] = useState<string | null>(null);
  const [detections, setDetections] = useState<any[]>([]);

  // Handle face detection events from native view
  const onFaceDetected = (event: any) => {
    const dets = event.nativeEvent.detections || [];
    setDetections(dets);

    // Find first recognized face
    const recognized = dets.find((d: any) => d.recognized);
    if (recognized && recognized.employeeId) {
      // Avoid duplicate logging within a short time
      if (lastLogged !== recognized.employeeId) {
        log(recognized.employeeId);
        setLastLogged(recognized.employeeId);
        setTimeout(() => setLastLogged(null), 3000);
        // Optional: show a toast or haptic feedback
      }
    }
  };

  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Device not configured. Go to Settings.</Text>
      </SafeAreaView>
    );
  }

  if (!isReady) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#7B2FBE" />
        <Text style={styles.loadingText}>Loading face engine...</Text>
        {error && (
          <>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={reload} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.cameraContainer}>
        <FaceCameraView style={styles.camera} onFaceDetected={onFaceDetected} />
        {/* Overlay info */}
        <View style={styles.overlayTop}>
          <LinearGradient
            colors={['rgba(0,0,0,0.5)', 'transparent']}
            style={styles.gradientTop}
          >
            <Text style={styles.headerTitle}>Live Recognition</Text>
            <Text style={styles.headerSub}>
              {detections.length} face{detections.length !== 1 ? 's' : ''} detected
            </Text>
          </LinearGradient>
        </View>
        {/* Bottom controls */}
        <View style={styles.overlayBottom}>
          <TouchableOpacity
            style={styles.syncButton}
            onPress={() => navigateTo('SyncStatus')}
          >
            <Icon name="sync" size={20} color="#7B2FBE" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.enrollButton}
            onPress={() => navigateTo('Enrollment')}
          >
            <Icon name="account-plus" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000' },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlayTop: { position: 'absolute', top: 0, left: 0, right: 0 },
  gradientTop: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 24 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub: { color: '#ddd', fontSize: 14, marginTop: 4 },
  overlayBottom: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    padding: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 4,
  },
  enrollButton: {
    backgroundColor: '#7B2FBE',
    padding: 14,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 4,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#475569' },
  errorText: { marginTop: 12, fontSize: 14, color: '#EF4444', textAlign: 'center' },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#7B2FBE', borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
});