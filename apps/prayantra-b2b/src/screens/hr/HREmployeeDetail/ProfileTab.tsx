// apps/prayantra-b2b/src/screens/hr/HREmployeeDetail/ProfileTab.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HREmployeeProfile } from '@b2b/shared-types';
import { PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, CARD_BACKGROUND, BORDER_COLOR } from '../../../constants/colors';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../navigation';

type NavigationProps = StackNavigationProp<RootStackParamList, 'HREmployeeDetail'>;

interface Props {
  employee: HREmployeeProfile;
  onUpdate: () => void;
}

export default function ProfileTab({ employee, onUpdate }: Props) {
  const navigation = useNavigation<NavigationProps>();

  const handleEdit = () => {
    navigation.navigate('HREmployeeForm', { employeeId: employee.id });
  };

  const renderField = (label: string, value: any) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{String(value)}</Text>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {employee.email?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{employee.email || 'No email'}</Text>
            <Text style={styles.jobTitle}>{employee.job_title || 'No title'}</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Icon name="pencil" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {renderField('Employee ID', employee.id)}
        {renderField('User ID', employee.user_id)}
        {renderField('Date of Birth', employee.date_of_birth?.split('T')[0])}
        {renderField('Gender', employee.gender)}
        {renderField('Marital Status', employee.marital_status)}
        {renderField('Nationality', employee.nationality)}
        {renderField('Employment Type', employee.employment_type)}
        {renderField('Employment Status', employee.employment_status)}
        {renderField('Probation End', employee.probation_end_date?.split('T')[0])}
        {renderField('Confirmation Date', employee.confirmation_date?.split('T')[0])}
        {renderField('Grade', employee.grade)}
        {renderField('Cost Center', employee.cost_center)}
        {renderField('Tax ID', employee.tax_id)}
        {renderField('Social Security ID', employee.social_security_id)}
        {renderField('Department', employee.department_name)}
        {renderField('Role', employee.role_name)}
        {renderField('Created At', employee.created_at?.split('T')[0])}
        {renderField('Updated At', employee.updated_at?.split('T')[0])}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PRIMARY_COLOR + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
  },
  jobTitle: {
    fontSize: 14,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  editButton: {
    backgroundColor: PRIMARY_COLOR,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginVertical: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  fieldLabel: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    flex: 1,
  },
  fieldValue: {
    fontSize: 13,
    color: TEXT_PRIMARY,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
});