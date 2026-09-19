import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSync } from '../hooks/useSync';

export default function SyncStatusScreen() {
  const { isSyncing, lastSyncTime, pendingCount, error, syncProgress, performSync } = useSync();

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Icon
            name={isSyncing ? 'sync' : pendingCount > 0 ? 'cloud-alert' : 'cloud-check'}
            size={48}
            color={isSyncing ? '#7B2FBE' : pendingCount > 0 ? '#F59E0B' : '#16A34A'}
          />
          <Text style={styles.title}>Sync Status</Text>
          {isSyncing && (
            <>
              <ActivityIndicator size="large" color="#7B2FBE" style={{ marginVertical: 12 }} />
              <Text style={styles.progress}>Syncing... {syncProgress}%</Text>
            </>
          )}
          {lastSyncTime && (
            <Text style={styles.detail}>
              Last sync: {new Date(lastSyncTime).toLocaleString()}
            </Text>
          )}
          <Text style={styles.detail}>Pending records: {pendingCount}</Text>
          {error && <Text style={styles.error}>Error: {error}</Text>}
          <TouchableOpacity
            style={styles.syncButton}
            onPress={performSync}
            disabled={isSyncing}
          >
            <Text style={styles.syncText}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5EAF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 12 },
  progress: { fontSize: 14, color: '#475569', marginTop: 4 },
  detail: { fontSize: 14, color: '#64748B', marginTop: 8 },
  error: { fontSize: 14, color: '#EF4444', marginTop: 8 },
  syncButton: {
    marginTop: 20,
    backgroundColor: '#7B2FBE',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  syncText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});