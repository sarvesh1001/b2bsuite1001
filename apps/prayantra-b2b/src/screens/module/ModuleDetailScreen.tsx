// apps/mobile/src/screens/modules/ModuleDetailScreen.tsx

import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

// 👇 Import shared colors & gradients
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../constants/colors';

// ---- Feature configuration ----
const FEATURES_CONFIG: Record<string, Array<{ key: string; label: string; icon: string; screen: string }>> = {
  administration: [
    { key: 'workCenters', label: 'Work Centers', icon: 'factory', screen: 'WorkCentersList' },
  ],
};

type ModuleDetailRouteProp = RouteProp<{ params: { moduleName: string } }, 'params'>;
type NavigationProp = StackNavigationProp<any>;

export default function ModuleDetailScreen() {
  const route = useRoute<ModuleDetailRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { moduleName } = route.params as { moduleName: string };

  const features = FEATURES_CONFIG[moduleName] || [];

  if (features.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Icon name="apps-box" size={64} color={TEXT_SECONDARY} />
          <Text variant="titleLarge" style={{ marginTop: 16, color: TEXT_PRIMARY }}>
            No Features Yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            This module does not have any available features at the moment.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderFeature = ({ item }: { item: typeof features[0] }) => (
    <TouchableOpacity
      style={styles.featureCard}
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.7}
    >
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Icon name={item.icon} size={32} color={PRIMARY_COLOR} />
          <Text variant="titleMedium" style={styles.featureLabel}>
            {item.label}
          </Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Gradient Header */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={[styles.header, { paddingTop: insets.top || 16 }]}
      >
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}
        </Text>
        <Text variant="bodyMedium" style={styles.headerSubtitle}>
          Select a feature to manage
        </Text>
      </LinearGradient>

      {/* 👇 Subtle divider – thin line with small gap */}
      <View style={styles.divider} />

      <FlatList
        data={features}
        keyExtractor={(item) => item.key}
        renderItem={renderFeature}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptySubtext: {
    color: TEXT_SECONDARY,
    textAlign: 'center',
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    // Soft shadow – gives depth without being harsh
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  // 👇 Elegant divider – thin line with small spacing
  divider: {
    height: 12, // small gap
    backgroundColor: BACKGROUND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add a thin line inside the divider (optional – can be removed)
  // We can also use a border on the list itself instead.
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    // 👇 A subtle top border on the list itself
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
  },
  featureCard: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    elevation: 2,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  featureLabel: {
    marginLeft: 16,
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
});