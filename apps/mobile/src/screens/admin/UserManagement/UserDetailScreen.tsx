// apps/mobile/src/screens/admin/UserManagement/UserDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, TextInput, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';

import {
  updateUser,
  updateUserKyc,
  banUser,
  unbanUser,
  advancedUserSearch,
  User,
} from '../../../services/admin';

export default function UserDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { userId } = route.params as { userId: string };

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    email: '',
    data_region: '',
  });
  const [kycStatus, setKycStatus] = useState('');
  const [kycLevel, setKycLevel] = useState('');

  const loadUser = async () => {
    setLoading(true);
    try {
      const result = await advancedUserSearch({ user_id: userId });
      const users = result.users || [];
      if (users.length === 0) {
        Alert.alert('Error', 'User not found');
        navigation.goBack();
        return;
      }
      const foundUser = users[0];
      setUser(foundUser);
      setForm({
        username: foundUser.username || '',
        full_name: foundUser.full_name || '',
        email: foundUser.email || '',
        data_region: foundUser.data_region || '',
      });
      setKycStatus(foundUser.kyc_status || 'pending');
      setKycLevel(foundUser.kyc_level || 'basic');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  const handleUpdateUser = async () => {
    setUpdating(true);
    try {
      await updateUser(userId, form);
      Alert.alert('Success', 'User updated');
      setEditMode(false);
      loadUser();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateKyc = async () => {
    setUpdating(true);
    try {
      await updateUserKyc(userId, { status: kycStatus, level: kycLevel });
      Alert.alert('Success', 'KYC updated');
      loadUser();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'KYC update failed');
    } finally {
      setUpdating(false);
    }
  };

  const handleBanToggle = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      if (user.is_active) {
        await banUser(userId, 'Admin action');
      } else {
        await unbanUser(userId, 'Admin action');
      }
      Alert.alert('Success', user.is_active ? 'User banned' : 'User unbanned');
      loadUser();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Action failed');
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !user) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            User Details
          </Text>
          <View style={styles.statusRow}>
            <Chip
              style={[
                styles.statusChip,
                { backgroundColor: user.is_active ? '#E8F5E9' : '#FFEBEE' },
              ]}
              textStyle={{ color: user.is_active ? '#2E7D32' : '#C62828' }}
            >
              {user.is_active ? 'Active' : 'Banned'}
            </Chip>
            {user.role && <Chip style={styles.roleChip}>{user.role}</Chip>}
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Text style={styles.label}>User ID:</Text>
              <Text style={styles.value}>{user.user_id}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Username:</Text>
              <Text style={styles.value}>{user.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Full Name:</Text>
              <Text style={styles.value}>{user.full_name}</Text>
            </View>
            {user.email && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{user.email}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.label}>KYC:</Text>
              <Text style={styles.value}>{user.kyc_status} ({user.kyc_level})</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Data Region:</Text>
              <Text style={styles.value}>{user.data_region}</Text>
            </View>
            {user.created_at && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Joined:</Text>
                <Text style={styles.value}>{new Date(user.created_at).toLocaleString()}</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {editMode ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Edit User
              </Text>
              <TextInput
                mode="outlined"
                label="Username"
                value={form.username}
                onChangeText={(text) => setForm({ ...form, username: text })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
              <TextInput
                mode="outlined"
                label="Full Name"
                value={form.full_name}
                onChangeText={(text) => setForm({ ...form, full_name: text })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
              <TextInput
                mode="outlined"
                label="Email"
                value={form.email}
                onChangeText={(text) => setForm({ ...form, email: text })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
              <TextInput
                mode="outlined"
                label="Data Region"
                value={form.data_region}
                onChangeText={(text) => setForm({ ...form, data_region: text })}
                style={styles.input}
                theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
              />
              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={() => setEditMode(false)}
                  style={styles.cancelButton}
                  labelStyle={{ color: '#666' }}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleUpdateUser}
                  loading={updating}
                  disabled={updating}
                  style={styles.saveButton}
                  theme={{ colors: { primary: '#7B2FBE' } }}
                >
                  Save
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <TouchableOpacity
            onPress={() => setEditMode(true)}
            style={styles.actionButton}
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Edit User</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Update KYC
            </Text>
            <TextInput
              mode="outlined"
              label="KYC Status"
              value={kycStatus}
              onChangeText={setKycStatus}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TextInput
              mode="outlined"
              label="KYC Level"
              value={kycLevel}
              onChangeText={setKycLevel}
              style={styles.input}
              theme={{ roundness: 12, colors: { primary: '#7B2FBE' } }}
            />
            <TouchableOpacity
              onPress={handleUpdateKyc}
              disabled={updating}
              activeOpacity={0.8}
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={['#6C5CE7', '#A29BFE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.gradientButton, updating && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {updating ? 'Updating...' : 'Update KYC'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        <TouchableOpacity
          onPress={handleBanToggle}
          disabled={updating}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={user.is_active ? ['#FF6B6B', '#EE5A24'] : ['#00B894', '#00A86B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradientButton, updating && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {updating ? 'Processing...' : user.is_active ? 'Ban User' : 'Unban User'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  header: { paddingTop: 16, paddingBottom: 12 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  statusRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  statusChip: { marginRight: 8 },
  roleChip: { backgroundColor: '#E8E0F0' },
  card: { marginVertical: 8, borderRadius: 12, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#1A1A1A', fontSize: 14, fontWeight: '500' },
  sectionTitle: { fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  cancelButton: { marginRight: 8, borderColor: '#ccc' },
  saveButton: { backgroundColor: '#7B2FBE' },
  actionButton: { borderRadius: 12, overflow: 'hidden', marginVertical: 8 },
  buttonWrapper: { borderRadius: 12, overflow: 'hidden', marginVertical: 8 },
  gradientButton: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', minHeight: 50 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
});