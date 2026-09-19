// screens/admin/SystemSettings/PermissionsScreen.tsx
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
import { Text, ActivityIndicator, Card, Searchbar, Chip } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute } from '@react-navigation/native';

import { getAllPermissions, getPermissionsByModule, Permission } from '../../../services/admin';

export default function PermissionsScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { moduleCode } = (route.params as { moduleCode?: string }) || {};

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [filtered, setFiltered] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>(moduleCode || '');
  const [modules, setModules] = useState<string[]>([]);

  const fetchPermissions = async () => {
    try {
      let data: Permission[];
      if (selectedModule) {
        data = await getPermissionsByModule(selectedModule);
      } else {
        data = await getAllPermissions();
      }
      setPermissions(data);
      setFiltered(data);
      // Extract unique modules
      const uniqueModules = Array.from(new Set(data.map((p) => p.module))).sort();
      setModules(uniqueModules);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [selectedModule]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFiltered(permissions);
    } else {
      const q = searchQuery.toLowerCase();
      setFiltered(
        permissions.filter(
          (p) =>
            p.permission_name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, permissions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPermissions();
  };

  const renderItem = (item: Permission) => (
    <Card key={item.permission_id} style={styles.card}>
      <Card.Content>
        <View style={styles.permissionRow}>
          <Text variant="titleSmall" style={styles.permissionName}>
            {item.permission_name}
          </Text>
          <Chip style={styles.categoryChip} textStyle={{ fontSize: 11 }}>
            {item.category}
          </Chip>
        </View>
        <Text variant="bodySmall" style={styles.permissionDesc}>
          {item.description}
        </Text>
        <View style={styles.metaRow}>
          <Text variant="bodySmall" style={styles.metaText}>
            Module: {item.module}
          </Text>
          <Text variant="bodySmall" style={styles.metaText}>
            Bit: {item.bit_index}
          </Text>
          <Text variant="bodySmall" style={styles.metaText}>
            Tier: {item.requires_tier}
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
          Permissions
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {permissions.length} permissions
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          <Chip
            selected={!selectedModule}
            onPress={() => setSelectedModule('')}
            style={[styles.filterChip, !selectedModule && styles.activeChip]}
            textStyle={!selectedModule ? styles.activeChipText : {}}
          >
            All
          </Chip>
          {modules.map((mod) => (
            <Chip
              key={mod}
              selected={selectedModule === mod}
              onPress={() => setSelectedModule(mod)}
              style={[styles.filterChip, selectedModule === mod && styles.activeChip]}
              textStyle={selectedModule === mod ? styles.activeChipText : {}}
            >
              {mod}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <Searchbar
        placeholder="Search permissions..."
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
              No permissions found
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
  filterContainer: { paddingHorizontal: 24, marginVertical: 8 },
  chipScroll: { flexDirection: 'row' },
  filterChip: { marginRight: 8, backgroundColor: '#f0f0f0' },
  activeChip: { backgroundColor: '#7B2FBE' },
  activeChipText: { color: 'white' },
  searchBar: { marginHorizontal: 24, marginVertical: 8, borderRadius: 12, elevation: 2 },
  searchInput: { fontSize: 16 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  permissionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  permissionName: { fontWeight: '600', color: '#1A1A1A', flex: 1, marginRight: 8 },
  categoryChip: { height: 24, backgroundColor: '#E8E0F0' },
  permissionDesc: { color: '#555', marginTop: 4 },
  metaRow: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  metaText: { color: '#888', fontSize: 12, marginRight: 12 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  emptyText: { color: '#999' },
});