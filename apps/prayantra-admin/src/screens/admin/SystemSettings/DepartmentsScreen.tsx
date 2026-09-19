// screens/admin/SystemSettings/DepartmentsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Card, Searchbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { getSystemDepartments, SystemDepartment } from '../../../services/admin';

export default function DepartmentsScreen() {
  const insets = useSafeAreaInsets();
  const [departments, setDepartments] = useState<SystemDepartment[]>([]);
  const [filtered, setFiltered] = useState<SystemDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDepartments = async () => {
    try {
      const data = await getSystemDepartments();
      setDepartments(data);
      setFiltered(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load departments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFiltered(departments);
    } else {
      const q = searchQuery.toLowerCase();
      setFiltered(
        departments.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            d.module_code.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, departments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDepartments();
  };

  const renderItem = (item: SystemDepartment) => (
    <Card key={item.system_department_id} style={styles.card}>
      <Card.Content>
        <Text variant="titleMedium" style={styles.cardTitle}>
          {item.name}
        </Text>
        <Text variant="bodyMedium" style={styles.cardSubtitle}>
          Module: {item.module_code}
        </Text>
        <Text variant="bodySmall" style={styles.cardDesc}>
          {item.description}
        </Text>
        <Text variant="bodySmall" style={styles.cardBitmask}>
          Bitmask: {item.bitmask}
        </Text>
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
          System Departments
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {departments.length} departments available
        </Text>
      </View>

      <Searchbar
        placeholder="Search departments..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#7B2FBE"
        theme={{ colors: { primary: '#7B2FBE' } }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7B2FBE']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No departments found
            </Text>
          </View>
        ) : (
          filtered.map(renderItem)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontWeight: 'bold', color: '#1A1A1A', fontSize: 28 },
  subtitle: { color: '#666', marginTop: 4 },
  searchBar: { marginHorizontal: 24, marginVertical: 12, borderRadius: 12, elevation: 2 },
  searchInput: { fontSize: 16 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  cardTitle: { fontWeight: '600', color: '#1A1A1A' },
  cardSubtitle: { color: '#7B2FBE', marginTop: 2 },
  cardDesc: { color: '#555', marginTop: 4 },
  cardBitmask: { color: '#999', marginTop: 2, fontSize: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});