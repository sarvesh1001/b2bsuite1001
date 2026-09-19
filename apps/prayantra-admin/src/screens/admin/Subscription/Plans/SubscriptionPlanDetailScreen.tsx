import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Text,
  ActivityIndicator,
  Card,
  Chip,
  Divider,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import {
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';

import {
  getSubscriptionPlanById,
  deleteSubscriptionPlan,
  SubscriptionPlan,
} from '../../../../services/admin';

export default function SubscriptionPlanDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { width } = useWindowDimensions();

  const { planId } = route.params as { planId: string };

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const horizontalPadding = width < 380 ? 16 : width < 600 ? 20 : 24;

  const load = async () => {
    try {
      setLoading(true);

      const data = await getSubscriptionPlanById(planId);
      setPlan(data);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [planId])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Plan',
      'This will soft-delete the plan. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);

            try {
              await deleteSubscriptionPlan(planId);

              Alert.alert('Success', 'Plan deleted', [
                {
                  text: 'OK',
                  onPress: () => (navigation as any).goBack(),
                },
              ]);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Delete failed');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
        </View>
      </SafeAreaView>
    );
  }

  if (!plan) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centered}>
          <Text>Plan not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const row = (
    label: string,
    value: string,
    mono = false
  ) => (
    <View style={styles.infoRow}>
      <Text style={styles.label}>
        {label}
      </Text>

      <Text
        style={[
          styles.value,
          mono && styles.monoValue,
        ]}
      >
        {value}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: horizontalPadding,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text
            variant="headlineSmall"
            style={styles.planName}
            numberOfLines={0}
          >
            {plan.plan_name}
          </Text>

          {/* BADGES */}
          <View style={styles.badgesRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: plan.is_active
                    ? '#E8F5E9'
                    : '#FFEBEE',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: plan.is_active
                      ? '#2E7D32'
                      : '#C62828',
                  },
                ]}
              >
                {plan.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>

            {plan.deleted_at ? (
              <View style={styles.deletedBadge}>
                <Text style={styles.deletedText}>
                  DELETED
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* DETAILS CARD */}
        <Card style={styles.card}>
          <Card.Content>
            {/* PRICE */}
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                {plan.currency} {plan.price.toFixed(2)}
              </Text>

              <Text style={styles.durationText}>
                / {plan.duration_days} days
              </Text>
            </View>

            <Divider style={styles.divider} />

            {row('Plan ID', plan.plan_id, true)}

            {row('Code', plan.plan_code, true)}

            {plan.description
              ? row('Description', plan.description)
              : null}

            {plan.gateway_plan_id
              ? row(
                  'Gateway Plan ID',
                  plan.gateway_plan_id,
                  true
                )
              : null}

            {row(
              'Created',
              new Date(plan.created_at).toLocaleString()
            )}

            {row(
              'Updated',
              new Date(plan.updated_at).toLocaleString()
            )}

            {plan.deleted_at
              ? row(
                  'Deleted',
                  new Date(plan.deleted_at).toLocaleString()
                )
              : null}
          </Card.Content>
        </Card>

        {/* EDIT BUTTON */}
        <TouchableOpacity
          onPress={() =>
            (navigation as any).navigate(
              'SubscriptionPlanEdit',
              {
                planId: plan.plan_id,
              }
            )
          }
          disabled={busy}
          activeOpacity={0.8}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            style={styles.buttonGradient}
          >
            <Text style={styles.buttonText}>
              Edit Plan
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* DELETE BUTTON */}
        <TouchableOpacity
          onPress={handleDelete}
          disabled={busy || !!plan.deleted_at}
          activeOpacity={0.8}
          style={[
            styles.buttonWrapper,
            styles.deleteButtonWrapper,
          ]}
        >
          <LinearGradient
            colors={['#FF6B6B', '#EE5A24']}
            style={[
              styles.buttonGradient,
              (busy || !!plan.deleted_at) &&
                styles.disabledButton,
            ]}
          >
            <Text style={styles.buttonText}>
              Delete Plan
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  flex: {
    flex: 1,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  scroll: {
    paddingTop: 20,
    paddingBottom: 32,
  },

  /* HEADER */

  header: {
    marginBottom: 16,
  },

  planName: {
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
    flexShrink: 1,
  },

  /* BADGES */

  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },

  statusBadge: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    includeFontPadding: true,
    textAlignVertical: 'center',
  },

  deletedBadge: {
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EEEEEE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  deletedText: {
    color: '#555555',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    includeFontPadding: true,
  },

  /* CARD */

  card: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },

  price: {
    color: '#7B2FBE',
    fontSize: 20,
    fontWeight: '700',
  },

  durationText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '400',
    marginLeft: 6,
  },

  divider: {
    marginVertical: 12,
  },

  /* INFORMATION ROW */

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    minHeight: 38,
  },

  label: {
    color: '#666666',
    fontSize: 13,
    lineHeight: 18,
    width: '34%',
    paddingRight: 10,
    flexShrink: 0,
  },

  value: {
    color: '#1A1A1A',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    flexShrink: 1,
  },

  monoValue: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },

  /* BUTTONS */

  buttonWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },

  deleteButtonWrapper: {
    marginTop: 10,
  },

  buttonGradient: {
    width: '100%',
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },

  disabledButton: {
    opacity: 0.5,
  },
});
