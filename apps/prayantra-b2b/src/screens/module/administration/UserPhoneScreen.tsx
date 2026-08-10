// apps/prayantra-b2b/src/screens/module/administration/UserPhoneScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  TextInput as RNTextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button } from 'react-native-paper';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { getUserPhone, findEmployeeByUsername } from '@b2b/api-client';
import { RootStackParamList } from '../../../navigation';
import { UserAvatar } from '../../../components/UserAvatar';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';

type UserPhoneRouteProp = RouteProp<RootStackParamList, 'UserPhone'>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function UserPhoneScreen() {
  const route = useRoute<UserPhoneRouteProp>();
  const navigation = useNavigation<NavigationProp>();

  // Params may be undefined when accessed from module grid
  const { userId: initialUserId, userName: initialUserName } = route.params || {};

  const { accessToken, deviceId, companyId } = useUserAuthStore();

  // State for manual search
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // State for the selected user
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(initialUserId);
  const [selectedUserName, setSelectedUserName] = useState<string | undefined>(initialUserName);

  // Phone number state
  const [phone, setPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch phone when we have a valid userId
  useEffect(() => {
    const fetchPhone = async () => {
      if (!selectedUserId || !accessToken || !companyId || !deviceId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const phoneNumber = await getUserPhone(companyId, selectedUserId, deviceId, accessToken);
        setPhone(phoneNumber || 'No phone number found');
      } catch (error) {
        console.error('Failed to fetch phone', error);
        Alert.alert('Error', 'Could not retrieve phone number.');
        setPhone('Error');
      } finally {
        setLoading(false);
      }
    };

    fetchPhone();
  }, [selectedUserId, accessToken, companyId, deviceId]);

  // Handle search by username
  const handleSearch = async () => {
    if (!searchTerm.trim() || !accessToken || !companyId || !deviceId) return;

    setIsSearching(true);
    try {
      const res = await findEmployeeByUsername(
        companyId,
        deviceId,
        searchTerm.trim(),
        accessToken
      );
      const employee = (res.data as any)?.employee || null;
      if (employee) {
        setSelectedUserId(employee.user_id);
        setSelectedUserName(employee.full_name || employee.username);
        setSearchTerm('');
      } else {
        Alert.alert('Not Found', 'No employee found with that username.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not search for employee.');
    } finally {
      setIsSearching(false);
    }
  };

  // Reset phone when user changes
  const handleClearSelection = () => {
    setSelectedUserId(undefined);
    setSelectedUserName(undefined);
    setPhone(null);
  };

  // ---- Render when no user selected ----
  if (!selectedUserId) {
    return (
      <SafeAreaView style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.placeholderTitle}>
              Search for an Employee
            </Text>
            <Text variant="bodyMedium" style={styles.placeholderSub}>
              Enter the exact username to view their phone number.
            </Text>
            <View style={styles.searchContainer}>
              <RNTextInput
                style={styles.searchInput}
                placeholder="Username"
                placeholderTextColor={TEXT_SECONDARY}
                value={searchTerm}
                onChangeText={setSearchTerm}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
                disabled={isSearching}
              >
                {isSearching ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name="magnify" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      </SafeAreaView>
    );
  }

  // ---- Render user phone details ----
  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <UserAvatar
            userId={selectedUserId}
            username={selectedUserName}
            fullName={selectedUserName}
            size={72}
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.userName}>
            {selectedUserName || 'User'}
          </Text>
          <TouchableOpacity onPress={handleClearSelection} style={styles.changeUserButton}>
            <Text style={styles.changeUserText}>Change User</Text>
          </TouchableOpacity>

          <View style={styles.phoneContainer}>
            <Icon name="phone" size={28} color={PRIMARY_COLOR} style={styles.phoneIcon} />
            <Text variant="displaySmall" style={styles.phoneNumber}>
              {phone}
            </Text>
          </View>

          <View style={styles.actionRow}>
            <Button
              mode="contained"
              icon="phone"
              onPress={() => {
                if (phone && phone !== 'No phone number found' && phone !== 'Error') {
                  Linking.openURL(`tel:${phone}`);
                }
              }}
              style={styles.actionButton}
              disabled={!phone || phone === 'No phone number found' || phone === 'Error'}
            >
              Call
            </Button>
            <Button
              mode="outlined"
              icon="message"
              onPress={() => {
                if (phone && phone !== 'No phone number found' && phone !== 'Error') {
                  Linking.openURL(`sms:${phone}`);
                }
              }}
              style={styles.actionButton}
              disabled={!phone || phone === 'No phone number found' || phone === 'Error'}
            >
              Message
            </Button>
          </View>
        </Card.Content>
      </Card>
    </SafeAreaView>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  card: {
    borderRadius: 16,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    elevation: 4,
    marginTop: 20,
    padding: 16,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatar: {
    marginBottom: 12,
  },
  userName: {
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  changeUserButton: {
    marginBottom: 16,
  },
  changeUserText: {
    color: PRIMARY_COLOR,
    fontWeight: '500',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  phoneIcon: {
    marginRight: 12,
  },
  phoneNumber: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: 28,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 12,
  },
  actionButton: {
    minWidth: 120,
  },
  placeholderTitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: TEXT_PRIMARY,
  },
  placeholderSub: {
    textAlign: 'center',
    color: TEXT_SECONDARY,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: TEXT_PRIMARY,
  },
  searchButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 8,
    padding: 10,
    marginLeft: 8,
  },
});