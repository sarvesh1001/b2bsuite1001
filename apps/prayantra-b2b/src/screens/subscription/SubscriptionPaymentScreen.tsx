// apps/prayantra-b2b/src/screens/subscription/SubscriptionPaymentScreen.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useSubscriptionBlockerStore } from '../../store/subscriptionBlockerStore';
import { useUserAuthStore } from '../../store/userAuthStore';

export default function SubscriptionPaymentScreen() {
  const navigation = useNavigation();
  const blocker = useSubscriptionBlockerStore((s) => s.blocker);
  const title = useSubscriptionBlockerStore((s) => s.title);
  const subtitle = useSubscriptionBlockerStore((s) => s.subtitle);
  const clearBlocker = useSubscriptionBlockerStore((s) => s.clearBlocker);

  const companyId = useUserAuthStore((s) => s.companyId);
  const companyName = useUserAuthStore((s) => s.user?.company_name);

  // Icon + accent colour depends on the block reason.
  const iconName =
    blocker?.code === 'subscription_required'
      ? 'rocket-launch-outline'
      : blocker?.code === 'subscription_past_due'
      ? 'clock-alert-outline'
      : blocker?.code === 'subscription_cancelled'
      ? 'cancel'
      : 'alert-circle-outline';

  const accent =
    blocker?.code === 'subscription_required'
      ? '#7B2FBE'
      : blocker?.code === 'subscription_past_due'
      ? '#F57C00'
      : '#D32F2F';

  const handleSubscribe = () => {
    // TODO: wire this to the real payment flow:
    //   navigation.navigate('SubscriptionPlans', { companyId })
    //   navigation.navigate('Checkout', { planCode })
    console.log('👉 [SubscriptionPayment] onSubscribe tapped — to be wired');
  };

  const handleGoBack = () => {
    clearBlocker();
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.iconCircle, { borderColor: accent }]}>
          <Icon name={iconName} size={64} color={accent} />
        </View>

        <Text variant="headlineSmall" style={styles.title}>
          {title()}
        </Text>

        <Text variant="bodyLarge" style={styles.subtitle}>
          {subtitle()}
        </Text>

        {/* Show the exact server message so support can triage quickly. */}
        {blocker?.message ? (
          <View style={[styles.infoBox, { borderColor: accent }]}>
            <Text style={styles.infoLabel}>Server message</Text>
            <Text style={styles.infoText}>{blocker.message}</Text>
          </View>
        ) : null}

        {/* Company context */}
        {(companyName || companyId) && (
          <View style={styles.metaBox}>
            <Icon name="office-building" size={16} color="#666" />
            <Text style={styles.metaText}>
              {companyName ? `${companyName} · ` : ''}
              {companyId ? companyId.slice(0, 8) + '…' : ''}
            </Text>
          </View>
        )}

        {/* Primary CTA */}
        <TouchableOpacity
          onPress={handleSubscribe}
          activeOpacity={0.85}
          style={styles.buttonWrapper}
        >
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Icon
              name="credit-card-outline"
              size={20}
              color="#fff"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.buttonText}>
              {blocker?.code === 'subscription_required'
                ? 'Choose a plan'
                : 'Renew now'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary CTA */}
        <Button
          mode="outlined"
          onPress={handleGoBack}
          style={styles.secondaryButton}
          labelStyle={styles.secondaryLabel}
        >
          Go back
        </Button>

        {/* Debug footer — shows the exact code/path so you can verify the block. */}
        {blocker ? (
          <Text style={styles.debug}>
            code: {blocker.code}
            {blocker.path ? `\npath: ${blocker.path}` : ''}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FAF7FD',
  },
  title: {
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  infoBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  infoLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoText: { fontSize: 13, color: '#1A1A1A', lineHeight: 18 },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  metaText: { fontSize: 12, color: '#666', marginLeft: 6 },
  buttonWrapper: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  secondaryButton: {
    marginTop: 12,
    width: '100%',
    borderRadius: 12,
    borderColor: '#ccc',
  },
  secondaryLabel: { color: '#1A1A1A', fontSize: 15 },
  debug: {
    marginTop: 32,
    fontSize: 10,
    color: '#aaa',
    textAlign: 'center',
  },
});