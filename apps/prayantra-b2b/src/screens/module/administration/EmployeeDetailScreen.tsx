import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card } from 'react-native-paper';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getEmployeeDetails } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { UserAvatar } from '../../../components/UserAvatar';
import { useAvatar } from '../../../hooks/useAvatar';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../constants/colors';
import { RootStackParamList } from '../../../navigation';

type EmployeeDetailRouteProp = RouteProp<RootStackParamList, 'EmployeeDetail'>;

// ✅ Move DetailRow here, before the component
const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || '-'}</Text>
  </View>
);

export default function EmployeeDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<EmployeeDetailRouteProp>();
  const userId = route.params?.userId;
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  if (!userId) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={{ color: TEXT_SECONDARY }}>Invalid employee ID</Text>
      </SafeAreaView>
    );
  }

  const {
    data: employee,
    isLoading: employeeLoading,
    error,
  } = useQuery({
    queryKey: ['employee', userId],
    queryFn: () => getEmployeeDetails(companyId!, userId, deviceId!, accessToken!),
    enabled: !!userId && !!accessToken && !!companyId && !!deviceId,
  });

  const { avatarUrl, isLoading: avatarLoading } = useAvatar(userId);

  if (employeeLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </SafeAreaView>
    );
  }

  if (error || !employee) {
    Alert.alert('Error', 'Failed to load employee details');
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={{ color: TEXT_SECONDARY }}>Could not load employee data</Text>
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <UserAvatar
            userId={userId}
            username={employee.username}
            fullName={employee.full_name}
            avatarUrl={avatarUrl}
            loading={avatarLoading}
            size={80}
          />
          <Text variant="headlineSmall" style={styles.fullName}>
            {employee.full_name || 'Unnamed'}
          </Text>
          {employee.username && (
            <Text variant="bodyMedium" style={styles.username}>
              @{employee.username}
            </Text>
          )}
          <View style={styles.statusBadge}>
            <Text style={[styles.statusText, employee.is_active ? styles.active : styles.inactive]}>
              {employee.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <DetailRow label="Employee ID" value={employee.employee_id} />
            <DetailRow label="Role" value={employee.role_name} />
            <DetailRow label="Position" value={employee.position_title} />
            <DetailRow label="Department" value={employee.department_name} />
            <DetailRow label="Work Center" value={employee.work_center_code} />
            <DetailRow
              label="Hire Date"
              value={employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
            />
            <DetailRow label="Company" value={employee.company_id} />
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  fullName: {
    fontWeight: 'bold',
    color: TEXT_PRIMARY,
    marginTop: 8,
  },
  username: {
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  statusText: {
    fontWeight: '500',
  },
  active: {
    color: 'green',
  },
  inactive: {
    color: 'red',
  },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  value: {
    fontSize: 16,
    color: TEXT_SECONDARY,
  },
});