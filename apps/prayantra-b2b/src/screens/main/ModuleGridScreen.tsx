import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, ActivityIndicator } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useUserAuthStore } from '../../store/userAuthStore';
import { useModuleAccess } from '../../utils/permissions';

// 👇 Import shared colors
import {
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '../../constants/colors';

// ---- Module icon & label mapping ----
// Use PRIMARY_COLOR as the default color; keep others as is (or import if needed)
const MODULE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  administration: { icon: 'account-cog', label: 'Administration', color: PRIMARY_COLOR },
  hr: { icon: 'account-group', label: 'HR', color: SECONDARY_COLOR },
  attendance: { icon: 'calendar-clock', label: 'Attendance', color: '#F59E0B' },
  inventory: { icon: 'package-variant', label: 'Inventory', color: '#10B981' },
  payroll: { icon: 'cash-multiple', label: 'Payroll', color: '#EF4444' },
  sales: { icon: 'sale', label: 'Sales', color: '#8B5CF6' },
  procurement: { icon: 'truck-delivery', label: 'Procurement', color: '#F97316' },
  production: { icon: 'factory', label: 'Production', color: '#14B8A6' },
  logistics: { icon: 'map-marker-path', label: 'Logistics', color: '#3B82F6' },
  accounting: { icon: 'calculator', label: 'Accounting', color: '#6366F1' },
  finance: { icon: 'bank', label: 'Finance', color: '#8B5CF6' },
  it: { icon: 'laptop', label: 'IT', color: '#6B7280' },
  academics: { icon: 'school', label: 'Academics', color: '#EC4899' },
  marketing: { icon: 'bullhorn', label: 'Marketing', color: '#F59E0B' },
  transport: { icon: 'bus', label: 'Transport', color: '#14B8A6' },
  operations: { icon: 'clipboard-list', label: 'Operations', color: '#0EA5E9' },
};

type RootStackParamList = {
  ModuleDetail: { moduleName: string };
  // ... other screens
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'ModuleDetail'>;

const screenWidth = Dimensions.get('window').width;
const numColumns = 2;
const cardWidth = (screenWidth - 48) / numColumns;

export default function ModuleGridScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { accessibleModules } = useModuleAccess();
  const { user, isAuthenticated } = useUserAuthStore();

  // Show loading if authentication status is not yet determined
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
          <Text style={{ marginTop: 12, color: TEXT_SECONDARY }}>Loading modules...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No modules available
  if (!accessibleModules || accessibleModules.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <View style={styles.centered}>
          <Icon name="alert-circle-outline" size={64} color="#999" />
          <Text variant="titleLarge" style={{ marginTop: 16, color: TEXT_PRIMARY }}>
            No Modules Available
          </Text>
          <Text variant="bodyMedium" style={[styles.emptySubtext, { color: TEXT_SECONDARY }]}>
            You don't have access to any modules. Contact your administrator.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderModuleItem = ({ item }: { item: string }) => {
    const config = MODULE_CONFIG[item] || {
      icon: 'apps',
      label: item.charAt(0).toUpperCase() + item.slice(1),
      color: PRIMARY_COLOR,
    };

    return (
      <TouchableOpacity
        style={styles.cardWrapper}
        onPress={() => navigation.navigate('ModuleDetail', { moduleName: item })}
        activeOpacity={0.7}
      >
        <Card
          style={[
            styles.card,
            {
              borderTopColor: config.color,
              width: cardWidth,
              backgroundColor: CARD_BACKGROUND,
            },
          ]}
        >
          <Card.Content style={styles.cardContent}>
            <Icon name={config.icon} size={48} color={config.color} />
            <Text variant="titleMedium" style={[styles.moduleLabel, { color: TEXT_PRIMARY }]}>
              {config.label}
            </Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={[styles.welcome, { color: TEXT_PRIMARY }]}>
          Welcome, {user?.full_name || user?.phone || 'User'}
        </Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: TEXT_SECONDARY }]}>
          Select a module to get started
        </Text>
      </View>

      <FlatList
        data={accessibleModules}
        keyExtractor={(item) => item}
        numColumns={numColumns}
        contentContainerStyle={styles.grid}
        renderItem={renderModuleItem}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  welcome: {
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 4,
  },
  grid: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    elevation: 2,
    borderTopWidth: 4,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  moduleLabel: {
    marginTop: 12,
    fontWeight: '600',
  },
});