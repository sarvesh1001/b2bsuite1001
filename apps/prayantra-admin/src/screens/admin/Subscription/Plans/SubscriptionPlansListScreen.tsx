import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  ActivityIndicator,
  Card,
  Switch,
  FAB,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listSubscriptionPlans,
  SubscriptionPlan,
} from '../../../../services/admin';

export default function SubscriptionPlansListScreen() {
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [total, setTotal] = useState(0);

  /*
   * Responsive horizontal spacing.
   *
   * Small phone  -> 16
   * Normal phone -> 20
   * Tablet       -> 24
   */
  const horizontalPadding =
    width < 380 ? 16 : width < 600 ? 20 : 24;

  const fetchPlans = async () => {
    try {
      const res = await listSubscriptionPlans(
        1,
        50,
        includeInactive
      );

      setPlans(res.plans || []);
      setTotal(res.meta?.total || 0);
    } catch (e: any) {
      Alert.alert(
        'Error',
        e.message || 'Failed to load plans'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [includeInactive])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPlans();
  };

  /*
   * Responsive status badge.
   *
   * We intentionally don't use React Native Paper Chip here.
   * Chip has internal paddings/heights that can clip text on
   * smaller Android devices / different font scales.
   */
  const StatusBadge = ({
    active,
    children,
    deleted = false,
  }: {
    active?: boolean;
    children: string;
    deleted?: boolean;
  }) => {
    let backgroundColor = '#EEEEEE';
    let textColor = '#555555';

    if (!deleted) {
      backgroundColor = active
        ? '#E8F5E9'
        : '#FFEBEE';

      textColor = active
        ? '#2E7D32'
        : '#C62828';
    }

    return (
      <View
        style={[
          styles.statusBadge,
          { backgroundColor },
        ]}
      >
        <Text
          style={[
            styles.statusBadgeText,
            { color: textColor },
          ]}
        >
          {children}
        </Text>
      </View>
    );
  };

  const renderItem = ({
    item,
  }: {
    item: SubscriptionPlan;
  }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        (navigation as any).navigate(
          'SubscriptionPlanDetail',
          {
            planId: item.plan_id,
          }
        )
      }
    >
      <Card style={styles.card}>
        <Card.Content>
          {/* TOP SECTION */}
          <View style={styles.cardTop}>
            {/* PLAN INFORMATION */}
            <View style={styles.planInfo}>
              <Text
                variant="titleMedium"
                style={styles.planName}
                numberOfLines={2}
              >
                {item.plan_name}
              </Text>

              <Text
                variant="bodySmall"
                style={styles.planCode}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {item.plan_code}
              </Text>
            </View>

            {/* STATUS BADGES */}
            <View style={styles.badges}>
              <StatusBadge active={item.is_active}>
                {item.is_active
                  ? 'ACTIVE'
                  : 'INACTIVE'}
              </StatusBadge>

              {item.deleted_at ? (
                <StatusBadge deleted>
                  DELETED
                </StatusBadge>
              ) : null}
            </View>
          </View>

          {/* DESCRIPTION */}
          {item.description ? (
            <Text
              variant="bodySmall"
              style={styles.desc}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          ) : null}

          {/* PRICE */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>
              {item.currency}{' '}
              {item.price.toFixed(2)}
            </Text>

            <Text style={styles.duration}>
              / {item.duration_days} days
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['bottom']}
      >
        <View style={styles.centered}>
          <ActivityIndicator
            size="large"
            color="#7B2FBE"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['bottom']}
    >
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
      >
        {/* TITLE + LIFECYCLE */}
        <View style={styles.headerTop}>
          <View style={styles.titleContainer}>
            <Text
              variant="headlineMedium"
              style={styles.title}
            >
              Plans
            </Text>

            <Text
              variant="bodyMedium"
              style={styles.subtitle}
            >
              {total} plan
              {total === 1 ? '' : 's'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.lifecycleButton}
            onPress={() =>
              (navigation as any).navigate(
                'SubscriptionLifecycle'
              )
            }
            activeOpacity={0.7}
          >
            <Icon
              name="cog-sync-outline"
              size={20}
              color="#7B2FBE"
            />

            <Text style={styles.lifecycleText}>
              Lifecycle
            </Text>
          </TouchableOpacity>
        </View>

        {/* INCLUDE INACTIVE */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>
            Include inactive
          </Text>

          <Switch
            value={includeInactive}
            onValueChange={setIncludeInactive}
            color="#7B2FBE"
          />
        </View>

        {/* REMINDERS */}
        <TouchableOpacity
          style={styles.remindersLink}
          onPress={() =>
            (navigation as any).navigate(
              'PendingReminders'
            )
          }
          activeOpacity={0.7}
        >
          <Icon
            name="bell-outline"
            size={18}
            color="#00B4DB"
          />

          <Text style={styles.remindersText}>
            View Pending Reminders
          </Text>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={plans}
        renderItem={renderItem}
        keyExtractor={(item) => item.plan_id}
        style={styles.list}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7B2FBE']}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No plans found
            </Text>
          </View>
        }
      />

      {/* CREATE FAB */}
      <FAB
        style={[
          styles.fab,
          {
            right: horizontalPadding,
            bottom: 20,
          },
        ]}
        icon="plus"
        color="#FFFFFF"
        onPress={() =>
          (navigation as any).navigate(
            'SubscriptionPlanCreate'
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* =========================
     HEADER
  ========================= */

  header: {
    paddingTop: 16,
    paddingBottom: 8,
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },

  titleContainer: {
    flex: 1,
    minWidth: 120,
  },

  title: {
    fontWeight: '700',
    color: '#1A1A1A',
    fontSize: 28,
    lineHeight: 34,
  },

  subtitle: {
    color: '#666666',
    marginTop: 4,
  },

  lifecycleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    minHeight: 40,

    borderWidth: 1,
    borderColor: '#7B2FBE',
    borderRadius: 12,

    paddingHorizontal: 12,
    paddingVertical: 8,

    flexShrink: 0,
  },

  lifecycleText: {
    color: '#7B2FBE',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 5,
  },

  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    marginTop: 12,

    minHeight: 40,
  },

  toggleLabel: {
    color: '#1A1A1A',
    fontSize: 14,
    flex: 1,
  },

  remindersLink: {
    flexDirection: 'row',
    alignItems: 'center',

    minHeight: 40,

    paddingVertical: 8,
    marginTop: 4,
  },

  remindersText: {
    color: '#00B4DB',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
  },

  /* =========================
     LIST
  ========================= */

  list: {
    flex: 1,
  },

  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },

  /* =========================
     CARD
  ========================= */

  card: {
    marginBottom: 12,
    borderRadius: 12,

    elevation: 2,

    backgroundColor: '#FFFFFF',

    overflow: 'hidden',
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    width: '100%',
  },

  planInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  planName: {
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 21,
    flexShrink: 1,
  },

  planCode: {
    color: '#666666',
    marginTop: 3,
    fontSize: 12,
    fontFamily: 'monospace',
  },

  /* =========================
     STATUS BADGES
  ========================= */

  badges: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',

    flexWrap: 'wrap',

    maxWidth: '48%',

    gap: 6,
  },

  statusBadge: {
    minHeight: 30,

    paddingHorizontal: 10,
    paddingVertical: 6,

    borderRadius: 15,

    justifyContent: 'center',
    alignItems: 'center',

    flexShrink: 0,
  },

  statusBadgeText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',

    textAlign: 'center',

    /*
     * Prevent Android from visually clipping
     * the top/bottom of the text.
     */
    includeFontPadding: true,

    textAlignVertical: 'center',
  },

  /* =========================
     DESCRIPTION
  ========================= */

  desc: {
    color: '#666666',

    marginTop: 8,
    marginBottom: 8,

    lineHeight: 18,
  },

  /* =========================
     PRICE
  ========================= */

  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',

    flexWrap: 'wrap',

    marginTop: 4,
  },

  price: {
    color: '#7B2FBE',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '700',
  },

  duration: {
    color: '#888888',
    fontSize: 13,
    lineHeight: 18,

    marginLeft: 6,
  },

  /* =========================
     EMPTY
  ========================= */

  empty: {
    alignItems: 'center',
    paddingTop: 40,
  },

  emptyText: {
    color: '#999999',
  },

  /* =========================
     FAB
  ========================= */

  fab: {
    position: 'absolute',

    backgroundColor: '#7B2FBE',
  },
});
