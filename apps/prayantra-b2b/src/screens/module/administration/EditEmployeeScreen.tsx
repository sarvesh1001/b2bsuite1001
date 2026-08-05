// apps/prayantra-b2b/src/screens/module/administration/EditEmployeeScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Switch } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';

import { getCompanyEmployees } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';
import { CompanyEmployee } from '@b2b/shared-types';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

type EditEmployeeRouteProp = RouteProp<RootStackParamList, 'EditEmployee'>;
type NavigationProp = StackNavigationProp<RootStackParamList, 'EditEmployee'>;

export default function EditEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<EditEmployeeRouteProp>();
  const { userId } = route.params;
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<CompanyEmployee | null>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const fetchEmployee = async () => {
      if (!accessToken || !companyId) return;
      try {
        const res = await getCompanyEmployees(companyId, deviceId!, accessToken);
        const found = res.data?.employees?.find(e => e.user_id === userId);
        if (found) {
          setEmployee(found);
          setIsActive(found.is_active);
        } else {
          Alert.alert('Not Found', 'Employee not found');
          navigation.goBack();
        }
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [userId]);

  // Placeholder update – we don't have an update endpoint yet
  const handleUpdate = () => {
    Alert.alert('Info', 'Update functionality not yet implemented. Please use the backend API directly.');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={{ color: TEXT_SECONDARY }}>Employee not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>User ID</Text>
            <Text style={styles.value}>{employee.user_id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Employee ID</Text>
            <Text style={styles.value}>{employee.employee_id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Role ID</Text>
            <Text style={styles.value}>{employee.role_id}</Text>
          </View>
          {employee.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{employee.phone}</Text>
            </View>
          )}
          {employee.full_name && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Full Name</Text>
              <Text style={styles.value}>{employee.full_name}</Text>
            </View>
          )}
          {employee.username && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Username</Text>
              <Text style={styles.value}>{employee.username}</Text>
            </View>
          )}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#ccc', true: PRIMARY_COLOR }}
              thumbColor={isActive ? PRIMARY_COLOR : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.buttonWrapper}>
          <TouchableOpacity onPress={handleUpdate} activeOpacity={0.8}>
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.gradientButton}
            >
              <Text style={styles.buttonText}>Update Employee (Placeholder)</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: CARD_BACKGROUND,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  label: {
    color: TEXT_SECONDARY,
    fontWeight: '500',
  },
  value: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 4,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  buttonWrapper: {
    marginTop: 32,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});