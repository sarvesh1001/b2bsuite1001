import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native'; // <-- add these
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const navigation = useNavigation(); // <-- get navigation
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    // Reset the navigation stack to PhoneInput
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'PhoneInput' }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      {/* Use the correct field from your user object */}
      <Text>Name: {user?.full_name || user?.name || 'Admin'}</Text>
      <Text>Email: {user?.email || 'N/A'}</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
});