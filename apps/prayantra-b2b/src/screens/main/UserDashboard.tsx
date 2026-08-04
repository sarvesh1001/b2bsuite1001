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

// 👇 Import shared colors
import { BACKGROUND_COLOR, CARD_BACKGROUND, PRIMARY_COLOR, TEXT_SECONDARY } from '../../constants/colors';

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
        <Text variant="headlineMedium" style={{ color: '#1A1A1A' }}>
          Welcome, {user?.full_name || user?.phone || 'User'}!
        </Text>
        <Text variant="bodyMedium" style={styles.subtext}>
          Logged in as {user?.role || 'user'}
        </Text>

        {/* Buttons now use the primary color (purple) – consistent with gradient */}
        <Button
          mode="contained"
          onPress={handleScanQR}
          style={styles.button}
          icon="qrcode-scan"
          buttonColor={PRIMARY_COLOR}
        >
          Scan QR for Web Login
        </Button>

        <Button
          mode="contained"
          onPress={handleClearSession}
          style={styles.button}
          buttonColor={PRIMARY_COLOR}
        >
          Clear Session
        </Button>

        <Button
          mode="contained"
          onPress={handleFullLogout}
          style={styles.button}
          buttonColor={PRIMARY_COLOR}
        >
          Full Logout
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR, // light gray background
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: CARD_BACKGROUND, // white card background
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
  },
  subtext: {
    marginTop: 8,
    color: TEXT_SECONDARY, // consistent gray
  },
  button: {
    marginTop: 20,
    width: '80%',
    borderRadius: 8,
  },
});