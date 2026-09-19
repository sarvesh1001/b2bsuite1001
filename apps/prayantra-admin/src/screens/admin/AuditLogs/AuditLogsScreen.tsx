// apps/prayantra-admin/src/screens/admin/AuditLogs/AuditLogsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip, Searchbar } from 'react-native-paper';
import { useRoute } from '@react-navigation/native';
import { getCompanyAuditLogs, AuditFilters, AuditLog } from '../../../services/admin';

export default function AuditLogsScreen() {
  const route = useRoute();
  const { companyId } = route.params as { companyId: string };
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLogs = async (reset = true) => {
    try {
      const currentPage = reset ? 1 : page;
      const filters: AuditFilters = {};
      if (searchQuery) {
        // Simple search – we'll search by actor_id or action; for better results, you can add a proper search parameter
        // The backend supports filtering by action, actor_id, etc.
        // We'll use action as a simple search field.
        filters.action = searchQuery;
        // Alternatively, you can use actor_id if the query looks like a UUID
        // For now, just search by action.
      }
      const result = await getCompanyAuditLogs(companyId, filters, currentPage, 50);
      setLogs(reset ? result.logs : [...logs, ...result.logs]);
      setTotal(result.pagination.total);
      setPage(result.pagination.page);
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

  // When search query changes, reset to page 1
  useEffect(() => {
    setPage(1);
    fetchLogs(true);
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchLogs(true);
  };

  const loadMore = () => {
    if (!loading && logs.length < total) {
      setPage(page + 1);
      fetchLogs(false);
    }
  };

  const renderItem = ({ item }: { item: AuditLog }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.action}>
            {item.action}
          </Text>
          <Chip style={styles.resourceChip}>{item.entity_type}</Chip>
        </View>
        <Text variant="bodySmall" style={styles.actorId}>
          Actor: {item.actor_id || item.actor_type || 'system'}
        </Text>
        {item.entity_id && (
          <Text variant="bodySmall" style={styles.resourceId}>
            Resource: {item.entity_id}
          </Text>
        )}
        {item.metadata && (
          <Text variant="bodySmall" style={styles.details}>
            Details: {JSON.stringify(item.metadata).substring(0, 100)}
          </Text>
        )}
        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.module}>
            Module: {item.module}
          </Text>
          <Text variant="bodySmall" style={styles.timestamp}>
            {new Date(item.created_at).toLocaleString()}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && page === 1) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Audit Logs
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} events
        </Text>
      </View>

      <Searchbar
        placeholder="Search by action or actor..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#7B2FBE"
        theme={{ colors: { primary: '#7B2FBE' } }}
      />

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item) => item.audit_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No audit logs found
            </Text>
          </View>
        }
        ListFooterComponent={
          logs.length < total ? <ActivityIndicator size="small" color="#7B2FBE" /> : null
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
  actorId: { color: '#666', marginTop: 4 },
  resourceId: { color: '#666', marginTop: 2 },
  details: { color: '#888', marginTop: 4, fontSize: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  module: { color: '#999', fontSize: 12 },
  timestamp: { color: '#999', fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});