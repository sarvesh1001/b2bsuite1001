// apps/prayantra-b2b/src/screens/hr/HREmployeeDetail/HistoryTab.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { getDepartmentHistory, getRoleHistory } from '@b2b/api-client';
import { DepartmentHistoryEntry, RoleHistoryEntry } from '@b2b/shared-types';
import { PRIMARY_COLOR, TEXT_PRIMARY, TEXT_SECONDARY, CARD_BACKGROUND, BORDER_COLOR } from '../../../constants/colors';
import { useFocusEffect } from '@react-navigation/native';

interface Props {
  employeeId: string;
}

export default function HistoryTab({ employeeId }: Props) {
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const [departmentHistory, setDepartmentHistory] = useState<DepartmentHistoryEntry[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!accessToken || !companyId || !deviceId) return;
    try {
      const [deptRes, roleRes] = await Promise.all([
        getDepartmentHistory(companyId, employeeId, deviceId, accessToken),
        getRoleHistory(companyId, employeeId, deviceId, accessToken),
      ]);
      setDepartmentHistory(deptRes.data || []);
      setRoleHistory(roleRes.data || []);
    } catch (error) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [accessToken, companyId, deviceId, employeeId]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  const renderDepartmentItem = ({ item }: { item: DepartmentHistoryEntry }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyTitle}>{item.department_name}</Text>
      <Text style={styles.historyDate}>
        {item.start_date?.split('T')[0]} {item.end_date ? `- ${item.end_date.split('T')[0]}` : '- Present'}
      </Text>
      {item.is_current && <View style={styles.currentBadge}><Text style={styles.currentText}>Current</Text></View>}
    </View>
  );

  const renderRoleItem = ({ item }: { item: RoleHistoryEntry }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyTitle}>{item.role_name}</Text>
      <Text style={styles.historyDate}>
        {item.start_date?.split('T')[0]} {item.end_date ? `- ${item.end_date.split('T')[0]}` : '- Present'}
      </Text>
      {item.is_current && <View style={styles.currentBadge}><Text style={styles.currentText}>Current</Text></View>}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Department History</Text>
      {departmentHistory.length === 0 ? (
        <Text style={styles.emptyText}>No department history</Text>
      ) : (
        <FlatList
          data={departmentHistory}
          keyExtractor={(item, index) => `${item.department_id}-${index}`}
          renderItem={renderDepartmentItem}
          scrollEnabled={false}
        />
      )}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Role History</Text>
      {roleHistory.length === 0 ? (
        <Text style={styles.emptyText}>No role history</Text>
      ) : (
        <FlatList
          data={roleHistory}
          keyExtractor={(item, index) => `${item.role_id}-${index}`}
          renderItem={renderRoleItem}
          scrollEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginVertical: 10,
  },
  historyItem: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  historyDate: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  currentBadge: {
    backgroundColor: PRIMARY_COLOR + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  currentText: {
    fontSize: 10,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  emptyText: {
    fontSize: 13,
    color: TEXT_SECONDARY,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
});