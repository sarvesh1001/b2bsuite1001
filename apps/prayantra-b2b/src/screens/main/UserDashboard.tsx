// src/screens/main/UserDashboard.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useUserAuthStore } from '../../store/userAuthStore';
import { resetToAuthScreen } from '../../navigation/navigationService';
import { RootStackParamList } from '../../navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

export default function UserDashboard() {
  const { user, logout, clearSession } = useUserAuthStore();
  const navigation = useNavigation<NavigationProp>();

  const handleClearSession = () => {
    clearSession();
    resetToAuthScreen(); // goes to MPINVerification if saved credentials exist
  };

  const handleFullLogout = async () => {
    await logout();
    resetToAuthScreen(); // goes to PhoneInput because saved credentials are cleared
  };

  const handleScanQR = () => {
    navigation.navigate('QRScanner');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text variant="headlineMedium">Welcome, {user?.full_name || user?.phone || 'User'}!</Text>
        <Text variant="bodyMedium" style={styles.subtext}>
          Logged in as {user?.role || 'user'}
        </Text>

        <Button
          mode="contained"
          onPress={handleScanQR}
          style={styles.button}
          icon="qrcode-scan"
        >
          Scan QR for Web Login
        </Button>

        <Button mode="contained" onPress={handleClearSession} style={styles.button}>
          Clear Session
        </Button>

        <Button mode="contained" onPress={handleFullLogout} style={styles.button}>
          Full Logout
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  subtext: { marginTop: 8, color: '#666' },
  button: { marginTop: 20, width: '80%' },
});