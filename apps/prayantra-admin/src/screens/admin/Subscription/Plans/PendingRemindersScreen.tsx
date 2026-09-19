import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listPendingReminders,
  processReminders,
  Reminder,
} from '../../../../services/admin';

export default function PendingRemindersScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    try {
      const res = await listPendingReminders(100, 0);
      setReminders(res.reminders || []);
      setTotal(res.meta?.total || 0);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleProcess = () => {
    Alert.alert(
      'Process Reminders',
      'Run the reminder processing job now?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          onPress: async () => {
            setProcessing(true);
            try {
              await processReminders();
              Alert.alert('Success', 'Reminder processing triggered');
              fetchData();
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Processing failed');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Reminder }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.reminderType}>
            {item.reminder_type}
          </Text>
          <Chip
            style={[
              styles.chip,
              {
                backgroundColor:
                  item.status === 'sent'
                    ? '#E8F5E9'
                    : item.status === 'failed'
                    ? '#FFEBEE'
                    : '#FFF8E1',
              },
            ]}
            textStyle={{
              color:
                item.status === 'sent'
                  ? '#2E7D32'
                  : item.status === 'failed'
                  ? '#C62828'
                  : '#F57C00',
              fontSize: 11,
            }}
          >
            {item.status.toUpperCase()}
          </Chip>
        </View>
        <Text style={styles.meta}>
          Company: <Text style={styles.mono}>{item.company_id}</Text>
        </Text>
        {item.subscription_id ? (
          <Text style={styles.meta}>
            Subscription: <Text style={styles.mono}>{item.subscription_id}</Text>
          </Text>
        ) : null}
        <Text style={styles.meta}>
          Scheduled for: {new Date(item.scheduled_for).toLocaleString()}
        </Text>
        {item.sent_at ? (
          <Text style={styles.meta}>
            Sent at: {new Date(item.sent_at).toLocaleString()}
          </Text>
        ) : null}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Pending Reminders
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {total} reminder{total === 1 ? '' : 's'} in queue
        </Text>

        <TouchableOpacity
          onPress={handleProcess}
          disabled={processing}
          activeOpacity={0.8}
          style={styles.processButtonWrapper}
        >
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            style={[styles.processButton, processing && { opacity: 0.6 }]}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="play-circle-outline" size={20} color="white" />
                <Text style={styles.processButtonText}>Process Now</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reminders}
        renderItem={renderItem}
        keyExtractor={(i) => i.reminder_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7B2FBE']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="bell-check-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No pending reminders</Text>
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
  processButtonWrapper: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  processButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  listContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  reminderType: { fontWeight: '600', color: '#1A1A1A', flex: 1, marginRight: 8 },
  chip: { height: 26 },
  meta: { color: '#666', fontSize: 12, marginTop: 2 },
  mono: { fontFamily: 'monospace', color: '#1A1A1A', fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999', marginTop: 8 },
});