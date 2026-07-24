// screens/admin/AuditLogs/AuditLogsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getAuditLogs, AuditFilters } from '../../../services/admin';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export default function AuditLogsScreen() {
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [total, setTotal] = useState(0);

  const fetchLogs = async () => {
    try {
      const filters: AuditFilters = {};
      if (searchQuery) {
        // Simple filtering: we'll search across action and resource_type
        // In real app, you might use a proper search parameter
      }
      const result = await getAuditLogs(filters, 100);
      setLogs(result || []);
      setTotal(result?.length || 0);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLogs();
  };

  const renderItem = ({ item }: { item: AuditLog }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.action}>
            {item.action}
          </Text>
          <Chip style={styles.resourceChip}>{item.resource_type}</Chip>
        </View>
        <Text variant="bodySmall" style={styles.userId}>
          User: {item.user_id}
        </Text>
        {item.resource_id && (
          <Text variant="bodySmall" style={styles.resourceId}>
            Resource: {item.resource_id}
          </Text>
        )}
        {item.details && (
          <Text variant="bodySmall" style={styles.details}>
            Details: {JSON.stringify(item.details).substring(0, 100)}
          </Text>
        )}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.ip}>
            IP: {item.ip_address || 'N/A'}
          </Text>
          <Text variant="bodySmall" style={styles.timestamp}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
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
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Audit Logs
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} events
        </Text>
      </View>

      <Searchbar
        placeholder="Search logs..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#7B2FBE"
        theme={{ colors: { primary: '#7B2FBE' } }}
        onSubmitEditing={fetchLogs}
      />

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No audit logs found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  searchBar: { marginHorizontal: 24, marginVertical: 8, borderRadius: 12, elevation: 2 },
  searchInput: { fontSize: 16 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  action: { fontWeight: '600', color: '#1A1A1A', flex: 1 },
  resourceChip: { backgroundColor: '#E8E0F0', marginLeft: 8 },
  userId: { color: '#666', marginTop: 4 },
  resourceId: { color: '#666', marginTop: 2 },
  details: { color: '#888', marginTop: 4, fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  ip: { color: '#999', fontSize: 12 },
  timestamp: { color: '#999', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});