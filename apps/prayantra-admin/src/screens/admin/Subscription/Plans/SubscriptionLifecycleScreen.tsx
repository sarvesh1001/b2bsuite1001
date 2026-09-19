import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Divider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  expireLapsedSubscriptions,
  expireExpiredTrials,
} from '../../../../services/admin';

type ActionKey = 'lapsed' | 'trials';

export default function SubscriptionLifecycleScreen() {
  const [busy, setBusy] = useState<ActionKey | null>(null);

  const runAction = (
    key: ActionKey,
    title: string,
    description: string,
    fn: () => Promise<any>
  ) => {
    Alert.alert(title, description, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Run',
        onPress: async () => {
          setBusy(key);
          try {
            const result = await fn();
            const count =
              result?.count ??
              result?.expired ??
              result?.processed ??
              result?.total ??
              null;
            Alert.alert(
              'Success',
              count != null
                ? `${title} — ${count} record(s) processed`
                : `${title} completed`
            );
          } catch (e: any) {
            Alert.alert(
              'Error',
              e.response?.data?.message || e.message || 'Action failed'
            );
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const renderAction = (
    key: ActionKey,
    icon: string,
    title: string,
    description: string,
    colors: [string, string],
    onPress: () => void
  ) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: colors[0] + '20' }]}>
            <Icon name={icon} size={26} color={colors[0]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {title}
            </Text>
            <Text variant="bodySmall" style={styles.cardDesc}>
              {description}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onPress}
          disabled={busy !== null}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.buttonGradient, busy && { opacity: 0.6 }]}
          >
            {busy === key ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="play" size={18} color="#fff" />
                <Text style={styles.buttonText}>Run Now</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Subscription Lifecycle
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Manually trigger scheduled jobs. These operations normally run on a
            backend cron — use with care.
          </Text>
        </View>

        <View style={styles.warningBox}>
          <Icon name="alert-outline" size={20} color="#E65100" />
          <Text style={styles.warningText}>
            Actions here modify real subscription data.
          </Text>
        </View>

        {renderAction(
          'lapsed',
          'calendar-remove-outline',
          'Expire Lapsed Subscriptions',
          'Marks subscriptions past their grace period as expired and downgrades access.',
          ['#FF6B6B', '#EE5A24'],
          () =>
            runAction(
              'lapsed',
              'Expire Lapsed Subscriptions',
              'This will expire all subscriptions that are past their grace period. Continue?',
              expireLapsedSubscriptions
            )
        )}

        <Divider style={{ marginVertical: 4, opacity: 0 }} />

        {renderAction(
          'trials',
          'timer-sand',
          'Expire Expired Trials',
          'Ends trial periods that have passed their trial_end_date without a paid conversion.',
          ['#6C5CE7', '#A29BFE'],
          () =>
            runAction(
              'trials',
              'Expire Expired Trials',
              'This will expire all trials that have passed their trial_end_date. Continue?',
              expireExpiredTrials
            )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 26 },
  subtitle: { color: '#666', marginTop: 6, lineHeight: 20 },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    color: '#E65100',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: { fontWeight: '700', color: '#1A1A1A' },
  cardDesc: { color: '#666', marginTop: 4, lineHeight: 18 },
  buttonWrapper: { borderRadius: 10, overflow: 'hidden' },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
});