import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LINKS = [
  { title: 'Subscription Plans', desc: 'Create, edit, delete plans', route: 'SubscriptionPlansList', icon: 'card-text-outline', color: '#7B2FBE' },
  { title: 'Pending Reminders', desc: 'View + trigger reminders', route: 'PendingReminders', icon: 'bell-outline', color: '#00B4DB' },
  { title: 'Lifecycle Jobs', desc: 'Expire lapsed & trials', route: 'SubscriptionLifecycle', icon: 'cog-sync-outline', color: '#FF6B6B' },
];

export default function SubscriptionHomeScreen() {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text variant="headlineMedium" style={styles.title}>Subscription</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>Plans, reminders, and lifecycle</Text>

        {LINKS.map((l) => (
          <TouchableOpacity key={l.route} activeOpacity={0.7}
            onPress={() => (navigation as any).navigate(l.route)}>
            <Card style={styles.card}>
              <Card.Content style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: l.color + '20' }]}>
                  <Icon name={l.icon} size={24} color={l.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium" style={styles.cardTitle}>{l.title}</Text>
                  <Text variant="bodySmall" style={styles.cardDesc}>{l.desc}</Text>
                </View>
                <Icon name="chevron-right" size={22} color="#ccc" />
              </Card.Content>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { padding: 24 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4, marginBottom: 16 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2, backgroundColor: '#FFF' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardTitle: { fontWeight: '600', color: '#1A1A1A' },
  cardDesc: { color: '#666', marginTop: 2 },
});