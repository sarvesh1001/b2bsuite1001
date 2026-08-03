import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation';
import { pairWebSession } from '../../services/auth';
import { useUserAuthStore } from '../../store/userAuthStore';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as Base64 from 'base-64'; // 👈 Import base64 encoder

type NavigationProp = StackNavigationProp<RootStackParamList, 'QRScanner'>;

export default function WebLoginQRScanner() {
  const navigation = useNavigation<NavigationProp>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { accessToken } = useUserAuthStore();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    if (!accessToken) {
      Alert.alert(
        'Not Logged In',
        'You need to be logged in to pair a web session.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [accessToken, navigation]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanning || processing || !accessToken) return;
    setScanning(true);

    // 🔍 LOG: Raw scanned data (should be raw JSON, not base64)
    console.log('📱 [QR] Raw scanned data:', data);
    console.log('📱 [QR] Data type:', typeof data);
    console.log('📱 [QR] Data length:', data.length);

    try {
      // The QR contains raw JSON (decoded from base64 by the web app)
      const qrPayload = JSON.parse(data);
      console.log('📱 [QR] Parsed payload:', JSON.stringify(qrPayload, null, 2));
      console.log('📱 [QR] Available keys:', Object.keys(qrPayload));

      // Extract session ID from "sid"
      const session_id = qrPayload.sid;
      if (!session_id) {
        console.warn('⚠️ Missing "sid" in QR payload');
        Alert.alert('Invalid QR', 'The scanned QR code is missing session ID.');
        setScanning(false);
        return;
      }

      // The backend expects the original base64‑encoded QR data.
      // We re‑encode the raw JSON string to base64.
      const signature = Base64.encode(data);
      console.log('📱 [QR] Re‑encoded base64 signature:', signature.substring(0, 50) + '...');
      console.log('📱 [QR] Signature length:', signature.length);

      setProcessing(true);

      // 🔍 LOG: Calling API
      console.log('📱 [QR] Pairing with session:', session_id);
      await pairWebSession(session_id, signature, accessToken);

      Alert.alert(
        'Success',
        'Web session paired successfully! You can now log in on the web.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('❌ [QR] Error processing QR:', error);
      const msg = error.response?.data?.message || error.message || 'Pairing failed';
      Alert.alert('Pairing Error', msg);
      setScanning(false);
    } finally {
      setProcessing(false);
      setScanning(false);
    }
  };

  // Permission handling
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>
          Camera permission is required to scan QR codes.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR for Web Login</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        >
          {processing && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color="#7B2FBE" />
              <Text style={styles.overlayText}>Pairing...</Text>
            </View>
          )}
          <View style={styles.overlayFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
        </CameraView>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionsText}>
          Point your camera at the QR code shown on the web login page.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  overlayFrame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: '70%',
    height: '40%',
    borderWidth: 0,
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7B2FBE',
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7B2FBE',
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#7B2FBE',
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#7B2FBE',
  },
  permissionText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
  },
  permissionButton: {
    backgroundColor: '#7B2FBE',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  instructions: {
    padding: 20,
    backgroundColor: '#fff',
  },
  instructionsText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});