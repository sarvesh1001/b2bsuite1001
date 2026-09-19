// apps/prayantra-b2b/src/screens/module/administration/LocationListScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listLocations,
  deleteLocation,
} from '@b2b/api-client';
import type { AccessibleLocation } from '@b2b/shared-types';

import { useUserAuthStore } from '../../../store/userAuthStore';
import { RootStackParamList } from '../../../navigation';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../../constants/colors';

type Nav = StackNavigationProp<RootStackParamList, 'LocationList'>;

export default function LocationListScreen() {
  const navigation = useNavigation<Nav>();
  const { accessToken, deviceId, companyId } = useUserAuthStore();

  const [locations, setLocations] = useState<AccessibleLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // =======================================================
  // FETCH
  // =======================================================
  const fetchLocations = useCallback(async () => {
    if (!accessToken || !companyId) {
      setLoading(false);
      return;
    }
    try {
      const res = await listLocations(companyId, 1, 100);
      const list: AccessibleLocation[] =
        res?.locations ?? res?.data?.locations ?? [];
      setLocations(list);
    } catch (e: any) {
      console.error('Failed to load locations:', e);
      Alert.alert(
        'Unable to load locations',
        e?.response?.data?.message || e?.message || 'Please try again.'
      );
    }
  }, [accessToken, companyId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchLocations();
      setLoading(false);
    })();
  }, [fetchLocations]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLocations();
    setRefreshing(false);
  };

  // =======================================================
  // DEACTIVATE
  // =======================================================
  const handleDeactivate = (loc: AccessibleLocation) => {
    Alert.alert(
      'Deactivate location',
      `Are you sure you want to deactivate "${loc.location_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            if (!companyId) return;
            try {
              const key = `loc-del-${loc.location_id}-${Date.now()}`;
              await deleteLocation(companyId, loc.location_id, key);
              setLocations(prev =>
                prev.map(l =>
                  l.location_id === loc.location_id
                    ? { ...l, is_active: false }
                    : l
                )
              );
            } catch (e: any) {
              Alert.alert(
                'Failed',
                e?.response?.data?.message || e?.message || 'Try again.'
              );
            }
          },
        },
      ]
    );
  };

  // =======================================================
  // RENDER
  // =======================================================
  const renderItem = ({ item, index }: { item: AccessibleLocation; index: number }) => {
    const inactive = item.is_active === false;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.card, inactive && styles.cardInactive]}
        onPress={() =>
          navigation.navigate('LocationForm', { locationId: item.location_id })
        }
      >
        <View style={styles.cardAccent} />
        <Text style={styles.cardNumber}>
          {String(index + 1).padStart(2, '0')}
        </Text>

        <View style={styles.cardIcon}>
          <Icon name="map-marker-outline" size={26} color={PRIMARY_COLOR} />
        </View>

        <View style={styles.cardInfo}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {item.location_name}
          </Text>
          <Text numberOfLines={1} style={styles.cardSub}>
            {[item.city, item.state].filter(Boolean).join(', ') || '—'} •{' '}
            {item.location_code}
          </Text>

          {!item.is_active && (
            <View style={styles.badgeInactive}>
              <Text style={styles.badgeInactiveText}>INACTIVE</Text>
            </View>
          )}
          {item.access_level && (
            <Text style={styles.cardAccess}>Access: {item.access_level}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => handleDeactivate(item)}
          disabled={inactive}
        >
          <Icon
            name={inactive ? 'minus-circle-outline' : 'close-circle-outline'}
            size={20}
            color={inactive ? '#B4BCC8' : ERROR_COLOR}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const Header = () => (
    <>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Your locations</Text>
          <Text style={styles.sectionSubtitle}>
            {locations.length}{' '}
            {locations.length === 1 ? 'location' : 'locations'} configured
          </Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('LocationForm', {})}
        >
          <Icon name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerIcon}>
            <Icon name="map-marker-multiple-outline" size={24} color="#FFFFFF" />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Locations</Text>
            <Text style={styles.headerSubtitle}>Administration</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="small" color={PRIMARY_COLOR} />
          <Text style={styles.loadingTitle}>Loading locations</Text>
        </View>
      ) : (
        <FlatList
          data={locations}
          keyExtractor={l => l.location_id}
          renderItem={renderItem}
          ListHeaderComponent={<Header />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon
                  name="map-marker-off-outline"
                  size={30}
                  color={PRIMARY_COLOR}
                />
              </View>
              <Text style={styles.emptyTitle}>No locations yet</Text>
              <Text style={styles.emptyText}>
                Add your first location to start scoping employees.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  headerIcon: {
    width: 40, height: 40, marginLeft: 10, alignItems: 'center',
    justifyContent: 'center', borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerText: { marginLeft: 11, flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  headerSubtitle: {
    marginTop: 2, color: 'rgba(255,255,255,0.65)',
    fontSize: 9, fontWeight: '500',
  },

  listContent: { paddingHorizontal: 20, paddingBottom: 45, paddingTop: 18 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginBottom: 14, marginTop: 4,
  },
  sectionTitle: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  sectionSubtitle: {
    marginTop: 3, color: TEXT_SECONDARY, fontSize: 9, fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: PRIMARY_COLOR, gap: 4,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  card: {
    minHeight: 96, marginBottom: 11, padding: 15,
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 15, backgroundColor: CARD_BACKGROUND,
    borderWidth: 1, borderColor: '#E5EAF1',
    position: 'relative', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  cardInactive: { opacity: 0.55 },
  cardAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: PRIMARY_COLOR,
  },
  cardNumber: {
    position: 'absolute', right: 15, top: 13,
    color: '#CBD5E1', fontSize: 9, fontWeight: '800', letterSpacing: 0.5,
  },
  cardIcon: {
    width: 51, height: 51, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: `${PRIMARY_COLOR}14`,
  },
  cardInfo: { flex: 1, marginLeft: 13, paddingRight: 30 },
  cardTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '700' },
  cardSub: { marginTop: 4, color: TEXT_SECONDARY, fontSize: 10, fontWeight: '500' },
  cardAccess: { marginTop: 5, color: PRIMARY_COLOR, fontSize: 9, fontWeight: '700' },
  badgeInactive: {
    marginTop: 6, alignSelf: 'flex-start',
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5,
    backgroundColor: '#FEE2E2',
  },
  badgeInactiveText: { color: ERROR_COLOR, fontSize: 8, fontWeight: '800' },
  moreBtn: {
    position: 'absolute', right: 12, bottom: 12,
    width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
    borderRadius: 9, backgroundColor: '#F5EFFB',
  },

  loadingScreen: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 30,
  },
  loadingTitle: {
    marginTop: 13, color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700',
  },

  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 30, paddingVertical: 60,
  },
  emptyIcon: {
    width: 70, height: 70, alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, backgroundColor: `${PRIMARY_COLOR}12`,
  },
  emptyTitle: { marginTop: 18, color: TEXT_PRIMARY, fontSize: 16, fontWeight: '700' },
  emptyText: {
    marginTop: 6, maxWidth: 300, color: TEXT_SECONDARY,
    fontSize: 11, lineHeight: 17, textAlign: 'center',
  },
});