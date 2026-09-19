import React from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAttendance } from '../hooks/useAttendance';

export default function HistoryScreen() {
  const { history, refreshHistory } = useAttendance();

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.iconContainer}>
          <Icon name="account-check" size={22} color="#7B2FBE" />
        </View>
        <View style={styles.info}>
          <Text style={styles.employeeId}>{item.employee_id}</Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
        </View>
      </View>
      <View style={styles.statusBadge}>
        <Icon
          name={item.sync_status === 0 ? 'clock-outline' : 'check-circle'}
          size={16}
          color={item.sync_status === 0 ? '#F59E0B' : '#16A34A'}
        />
        <Text
          style={[
            styles.statusText,
            item.sync_status === 0 ? styles.pending : styles.synced,
          ]}
        >
          {item.sync_status === 0 ? 'Pending' : 'Synced'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refreshHistory} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="history" size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>No attendance records yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5EAF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1EAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  employeeId: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  timestamp: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: '600', marginLeft: 4 },
  pending: { color: '#F59E0B' },
  synced: { color: '#16A34A' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#94A3B8', marginTop: 12 },
});