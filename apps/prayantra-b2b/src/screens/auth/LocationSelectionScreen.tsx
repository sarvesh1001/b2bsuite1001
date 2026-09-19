// apps/prayantra-b2b/src/screens/auth/LocationSelectionScreen.tsx
import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
  } from 'react';
  import {
    View,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
  } from 'react-native';
  
  import { SafeAreaView } from 'react-native-safe-area-context';
  
  import { Text } from 'react-native-paper';
  
  import {
    useNavigation,
    useRoute,
    useFocusEffect,
    CommonActions,
    RouteProp,
  } from '@react-navigation/native';
  
  import { StackNavigationProp } from '@react-navigation/stack';
  
  import { LinearGradient } from 'expo-linear-gradient';
  
  import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
  
  import { ALL_LOCATIONS_ID } from '@b2b/api-client';   // 🆕
  
  import { useUserAuthStore } from '../../store/userAuthStore';
  
  import { RootStackParamList } from '../../navigation';
  
  import type {
    AccessibleLocation,
    LocationAccessScope,
  } from '@b2b/shared-types';
  
  // =========================================================
  // TYPES
  // =========================================================
  
  type LocationSelectionNavigationProp = StackNavigationProp<
    RootStackParamList,
    'LocationSelection'
  >;
  
  type LocationSelectionRouteProp = RouteProp<
    RootStackParamList,
    'LocationSelection'
  >;
  
  // =========================================================
  // SCOPE COPY
  // =========================================================
  
  const SCOPE_LABEL: Record<LocationAccessScope, string> = {
    PRIMARY: 'Primary location',
    SELECTED: 'Selected locations',
    ALL: 'All locations',
  };
  
  // =========================================================
  // SYNTHETIC "ALL LOCATIONS" ENTRY
  // =========================================================
  
  const ALL_LOCATIONS_ENTRY: AccessibleLocation = {
    location_id: ALL_LOCATIONS_ID as any,   // sentinel string 'ALL'
    location_code: 'ALL',
    location_name: 'All Locations (Consolidated)',
    city: undefined,
    state: undefined,
    country: undefined,
    access_level: 'MANAGE' as any,
    is_active: true,
  } as any;
  
  // Stale threshold: auto-refresh silently if older than 2 minutes
  const STALE_MS = 2 * 60 * 1000;
  
  // =========================================================
  // SCREEN
  // =========================================================
  
  export default function LocationSelectionScreen() {
    const navigation = useNavigation<LocationSelectionNavigationProp>();
    const route = useRoute<LocationSelectionRouteProp>();
  
    const nextRoute = (route.params?.nextRoute as string) || 'Main';
  
    // =======================================================
    // STORE
    // =======================================================
  
    const {
      accessibleLocations,
      primaryLocationId,
      locationScope,
      locationId,
      setLocationId,
      bootstrapLocations,
      refreshLocations,
      locationsRefreshing,
      lastLocationsRefreshedAt,
      companyId,
    } = useUserAuthStore();
  
    // =======================================================
    // LOCAL STATE
    // =======================================================
  
    const [selectedId, setSelectedId] = useState<string | null>(
      locationId ?? primaryLocationId ?? null
    );
  
    // Local flag used only for the very first-load spinner, so the
    // pull-to-refresh control doesn't flash on cold open.
    const [initialLoading, setInitialLoading] = useState(false);
  
    // =======================================================
    // AUTO-REFRESH ON FOCUS (stale-aware)
    // =======================================================
  
    useFocusEffect(
      useCallback(() => {
        if (!companyId) return;
  
        // First open with empty list → hard bootstrap
        if (accessibleLocations.length === 0) {
          (async () => {
            try {
              setInitialLoading(true);
              await bootstrapLocations(companyId);
            } catch (e) {
              console.warn('⚠️ [LocationSelection] bootstrap failed:', e);
            } finally {
              setInitialLoading(false);
            }
          })();
          return;
        }
  
        // Otherwise, silently refresh if stale
        const isStale =
          !lastLocationsRefreshedAt ||
          Date.now() - lastLocationsRefreshedAt > STALE_MS;
  
        if (isStale) {
          // fire-and-forget — the store reconciles everything
          refreshLocations().catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [companyId, accessibleLocations.length, lastLocationsRefreshedAt])
    );
  
    // =======================================================
    // KEEP SELECTION IN SYNC
    // =======================================================
  
    useEffect(() => {
      if (!selectedId && (locationId || primaryLocationId)) {
        setSelectedId(locationId ?? primaryLocationId);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locationId, primaryLocationId]);
  
    // =======================================================
    // BUILD LIST — prepend "All Locations" when scope is ALL
    // =======================================================
  
    const sortedLocations = useMemo<AccessibleLocation[]>(() => {
      const copy = [...accessibleLocations];
  
      // Primary first
      if (primaryLocationId) {
        copy.sort((a, b) => {
          if (a.location_id === primaryLocationId) return -1;
          if (b.location_id === primaryLocationId) return 1;
          return 0;
        });
      }
  
      // 🆕 Prepend consolidated "All Locations" for scope=ALL
      if (locationScope === 'ALL' && copy.length > 0) {
        return [ALL_LOCATIONS_ENTRY, ...copy];
      }
  
      return copy;
    }, [accessibleLocations, primaryLocationId, locationScope]);
  
    // =======================================================
    // HANDLERS
    // =======================================================
  
    const handleConfirm = () => {
      if (!selectedId) {
        Alert.alert('Select a location', 'Please choose a location to continue.');
        return;
      }
  
      // Persist to store + axios header (works for 'ALL' as well)
      setLocationId(selectedId);
  
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: nextRoute }],
        })
      );
    };
  
    // Unified retry / manual refresh handler
    const handleRefresh = useCallback(async () => {
      if (!companyId) return;
  
      // If we have no data yet, use the heavier bootstrap (populates scope too).
      // Otherwise use the lighter refresh that just reconciles.
      if (accessibleLocations.length === 0) {
        try {
          setInitialLoading(true);
          await bootstrapLocations(companyId);
        } catch (e) {
          console.warn('⚠️ [LocationSelection] retry bootstrap failed:', e);
        } finally {
          setInitialLoading(false);
        }
        return;
      }
  
      const res = await refreshLocations();
      if (!res.ok && res.error && res.error !== 'no-session') {
        // Silent failure — pull-to-refresh UI already showed the spinner.
        // Only surface a toast-ish alert if it's a real error.
        Alert.alert('Refresh failed', res.error);
      }
    }, [
      companyId,
      accessibleLocations.length,
      bootstrapLocations,
      refreshLocations,
    ]);
  
    // =======================================================
    // RENDER ITEM
    // =======================================================
  
    const renderLocation = ({
      item,
      index,
    }: {
      item: AccessibleLocation;
      index: number;
    }) => {
      const isAll = item.location_id === ALL_LOCATIONS_ID;
      const isSelected = item.location_id === selectedId;
      const isPrimary = !isAll && item.location_id === primaryLocationId;
  
      // Real locations are numbered 01, 02 …; the synthetic ALL card uses ★
      const displayNumber = isAll
        ? '★'
        : String(
            // index already includes the ALL entry when present; adjust
            index - (locationScope === 'ALL' ? 1 : 0)
          ).padStart(2, '0');
  
      return (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setSelectedId(item.location_id)}
          style={[
            styles.card,
            isSelected && styles.cardSelected,
            isAll && styles.cardAll,
          ]}
        >
          {/* Accent */}
          <View
            style={[
              styles.cardAccent,
              isSelected && styles.cardAccentSelected,
              isAll && styles.cardAccentAll,
            ]}
          />
  
          {/* Number */}
          <Text style={styles.cardNumber}>{displayNumber}</Text>
  
          {/* Icon */}
          <View
            style={[
              styles.cardIcon,
              isSelected && styles.cardIconSelected,
              isAll && styles.cardIconAll,
            ]}
          >
            <Icon
              name={isAll ? 'earth' : 'map-marker-outline'}
              size={26}
              color={isAll ? '#0369A1' : '#7B2FBE'}
            />
          </View>
  
          {/* Info */}
          <View style={styles.cardInfo}>
            <Text numberOfLines={2} style={styles.cardTitle}>
              {item.location_name}
            </Text>
  
            <Text numberOfLines={1} style={styles.cardSub}>
              {isAll
                ? `Consolidated view across all ${accessibleLocations.length} locations`
                : `${
                    [item.city, item.state].filter(Boolean).join(', ') || '—'
                  } • ${item.location_code}`}
            </Text>
  
            <View style={styles.badgesRow}>
              {isAll && (
                <View style={styles.consolidatedPill}>
                  <Icon name="chart-line" size={10} color="#0369A1" />
                  <Text style={styles.consolidatedPillText}>CONSOLIDATED</Text>
                </View>
              )}
  
              {isPrimary && (
                <View style={styles.primaryPill}>
                  <Icon name="star" size={10} color="#7B2FBE" />
                  <Text style={styles.primaryPillText}>PRIMARY</Text>
                </View>
              )}
  
              {item.access_level && !isAll && (
                <View style={styles.accessPill}>
                  <Text style={styles.accessPillText}>{item.access_level}</Text>
                </View>
              )}
            </View>
          </View>
  
          {/* Radio */}
          <View style={[styles.radio, isSelected && styles.radioOn]}>
            {isSelected && <View style={styles.radioDot} />}
          </View>
        </TouchableOpacity>
      );
    };
  
    // =======================================================
    // LOADING / EMPTY
    // =======================================================
  
    const isEmpty = accessibleLocations.length === 0;
    const showInitialLoader = isEmpty && (initialLoading || locationsRefreshing);
  
    // =======================================================
    // HEADER (brand + title + section header) — reused in list header
    // =======================================================
  
    const ListHeader = (
      <>
        {/* BRAND */}
        <View style={styles.brandHeader}>
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.brandLogo}
          >
            <Text style={styles.brandLogoText}>P</Text>
          </LinearGradient>
  
          <View style={styles.brandText}>
            <Text style={styles.brandName}>Prayantra</Text>
            <Text style={styles.brandSubtitle}>Business Management</Text>
          </View>
        </View>
  
        {/* TITLE */}
        <View style={styles.titleSection}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>STEP 2 OF 2</Text>
          </View>
  
          <Text style={styles.pageTitle}>Select your location</Text>
  
          <Text style={styles.pageSubtitle}>
            Choose the location you want to work from. You can switch
            anytime from the header.
          </Text>
  
          {locationScope && (
            <View style={styles.scopePill}>
              <Icon
                name="shield-check-outline"
                size={12}
                color="#7B2FBE"
              />
              <Text style={styles.scopePillText}>
                Access scope: {SCOPE_LABEL[locationScope]}
              </Text>
            </View>
          )}
        </View>
  
        {/* SECTION HEADER with refresh button */}
        {!showInitialLoader && (
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Your locations</Text>
              <Text style={styles.sectionSubtitle}>
                {sortedLocations.length}{' '}
                {sortedLocations.length === 1 ? 'option' : 'options'}{' '}
                available
              </Text>
            </View>
  
            <View style={styles.sectionActions}>
              {/* 🆕 Refresh button */}
              <TouchableOpacity
                onPress={handleRefresh}
                disabled={locationsRefreshing || initialLoading}
                activeOpacity={0.8}
                style={[
                  styles.refreshBtn,
                  (locationsRefreshing || initialLoading) &&
                    styles.refreshBtnDisabled,
                ]}
              >
                {locationsRefreshing || initialLoading ? (
                  <ActivityIndicator size="small" color="#7B2FBE" />
                ) : (
                  <Icon name="refresh" size={16} color="#7B2FBE" />
                )}
              </TouchableOpacity>
  
              <View style={styles.countBadge}>
                <Icon
                  name="map-marker-multiple-outline"
                  size={15}
                  color="#7B2FBE"
                />
                <Text style={styles.countBadgeText}>
                  {sortedLocations.length}
                </Text>
              </View>
            </View>
          </View>
        )}
      </>
    );
  
    // =======================================================
    // MAIN RENDER
    // =======================================================
  
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <FlatList
          data={sortedLocations}
          keyExtractor={(l) => l.location_id}
          renderItem={renderLocation}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          // 🆕 Pull-to-refresh
          refreshControl={
            <RefreshControl
              refreshing={
                // Only show the pull-to-refresh spinner when we already have
                // data — otherwise the initial loader takes over.
                !isEmpty && (locationsRefreshing || initialLoading)
              }
              onRefresh={handleRefresh}
              tintColor="#7B2FBE"
              colors={['#7B2FBE']}
            />
          }
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            showInitialLoader ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#7B2FBE" />
                <Text style={styles.loadingText}>Loading your locations...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIcon}>
                  <Icon
                    name="map-marker-off-outline"
                    size={31}
                    color="#7B2FBE"
                  />
                </View>
  
                <Text style={styles.emptyTitle}>No locations found</Text>
  
                <Text style={styles.emptyDescription}>
                  We couldn't find any locations assigned to you. If you
                  think this is a mistake, ask your administrator for
                  access — or tap below to try again.
                </Text>
  
                <TouchableOpacity
                  onPress={handleRefresh}
                  disabled={locationsRefreshing || initialLoading}
                  activeOpacity={0.85}
                  style={styles.retryButton}
                >
                  {locationsRefreshing || initialLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name="refresh" size={16} color="#FFFFFF" />
                      <Text style={styles.retryText}>Try again</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )
          }
        />
  
        {/* STICKY FOOTER */}
        {!isEmpty && (
          <View style={styles.footer}>
            {/* Consolidated hint */}
            {selectedId === ALL_LOCATIONS_ID && (
              <View style={styles.consolidatedHint}>
                <Icon
                  name="information-outline"
                  size={14}
                  color="#0369A1"
                />
                <Text style={styles.consolidatedHintText}>
                  You'll see data across all locations. Creating or editing
                  records requires picking a specific location.
                </Text>
              </View>
            )}
  
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!selectedId}
              activeOpacity={0.88}
              style={styles.footerButtonWrapper}
            >
              <LinearGradient
                colors={['#00B4DB', '#7B2FBE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.footerButton,
                  !selectedId && styles.footerButtonDisabled,
                ]}
              >
                <Text style={styles.footerButtonText}>Continue</Text>
                <Icon name="arrow-right" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
  
            <View style={styles.securityBar}>
              <Icon
                name="shield-check-outline"
                size={14}
                color="#64748B"
              />
              <Text style={styles.securityText}>
                Your location scopes your data securely
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }
  
  // =========================================================
  // STYLES
  // =========================================================
  
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#F7F9FC',
    },
  
    listContent: {
      paddingBottom: 220,
    },
  
    // =======================================================
    // BRAND
    // =======================================================
  
    brandHeader: {
      paddingHorizontal: 20,
      paddingTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
  
    brandLogo: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 11,
      shadowColor: '#7B2FBE',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 8,
      elevation: 3,
    },
  
    brandLogoText: {
      color: '#FFFFFF',
      fontSize: 19,
      fontWeight: '800',
    },
  
    brandText: { marginLeft: 10 },
  
    brandName: {
      color: '#172033',
      fontSize: 17,
      fontWeight: '700',
    },
  
    brandSubtitle: {
      marginTop: 2,
      color: '#94A3B8',
      fontSize: 9,
      fontWeight: '500',
    },
  
    // =======================================================
    // TITLE
    // =======================================================
  
    titleSection: {
      paddingHorizontal: 20,
      paddingTop: 30,
    },
  
    stepBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 6,
      backgroundColor: '#F1EAFE',
    },
  
    stepBadgeText: {
      color: '#7B2FBE',
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.6,
    },
  
    pageTitle: {
      marginTop: 12,
      color: '#172033',
      fontSize: 27,
      lineHeight: 33,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
  
    pageSubtitle: {
      maxWidth: 340,
      marginTop: 7,
      color: '#64748B',
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '500',
    },
  
    scopePill: {
      alignSelf: 'flex-start',
      marginTop: 12,
      paddingHorizontal: 10,
      paddingVertical: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5EAF1',
    },
  
    scopePillText: {
      color: '#475569',
      fontSize: 10,
      fontWeight: '600',
    },
  
    // =======================================================
    // SECTION HEADER
    // =======================================================
  
    sectionHeader: {
      marginHorizontal: 20,
      marginTop: 26,
      marginBottom: 13,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
  
    sectionTitle: {
      color: '#1E293B',
      fontSize: 16,
      fontWeight: '700',
    },
  
    sectionSubtitle: {
      marginTop: 3,
      color: '#94A3B8',
      fontSize: 9,
      fontWeight: '500',
    },
  
    // 🆕 Actions cluster (refresh + count)
    sectionActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  
    // 🆕 Refresh button
    refreshBtn: {
      width: 34,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5EAF1',
    },
  
    refreshBtnDisabled: {
      opacity: 0.6,
    },
  
    countBadge: {
      minWidth: 34,
      height: 28,
      paddingHorizontal: 7,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 8,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5EAF1',
    },
  
    countBadgeText: {
      color: '#475569',
      fontSize: 10,
      fontWeight: '700',
    },
  
    // =======================================================
    // CARD
    // =======================================================
  
    card: {
      minHeight: 106,
      marginHorizontal: 20,
      marginBottom: 11,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 15,
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#E5EAF1',
      position: 'relative',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
  
    cardSelected: {
      borderColor: '#D9C6ED',
      backgroundColor: '#FCFAFF',
    },
  
    cardAll: {
      borderColor: '#B8E0F5',
      backgroundColor: '#F5FBFF',
    },
  
    cardAccent: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 3,
      backgroundColor: '#7B2FBE',
    },
  
    cardAccentSelected: { width: 4 },
  
    cardAccentAll: {
      backgroundColor: '#0369A1',
    },
  
    cardNumber: {
      position: 'absolute',
      right: 15,
      top: 13,
      color: '#CBD5E1',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
  
    cardIcon: {
      width: 51,
      height: 51,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: '#F1EAFE',
    },
  
    cardIconSelected: { backgroundColor: '#EDE1F8' },
  
    cardIconAll: {
      backgroundColor: '#E0F2FE',
    },
  
    cardInfo: {
      flex: 1,
      marginLeft: 13,
      paddingRight: 40,
    },
  
    cardTitle: {
      color: '#1E293B',
      fontSize: 14,
      lineHeight: 19,
      fontWeight: '700',
    },
  
    cardSub: {
      marginTop: 5,
      color: '#94A3B8',
      fontSize: 9,
      fontWeight: '500',
    },
  
    badgesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginTop: 7,
    },
  
    primaryPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 5,
      backgroundColor: '#F1EAFE',
    },
  
    primaryPillText: {
      color: '#7B2FBE',
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
  
    accessPill: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 5,
      backgroundColor: '#E0F2FE',
    },
  
    accessPillText: {
      color: '#0369A1',
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
  
    consolidatedPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 5,
      backgroundColor: '#E0F2FE',
    },
  
    consolidatedPillText: {
      color: '#0369A1',
      fontSize: 8,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
  
    // =======================================================
    // RADIO
    // =======================================================
  
    radio: {
      width: 22,
      height: 22,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 11,
      borderWidth: 2,
      borderColor: '#CBD5E1',
    },
  
    radioOn: { borderColor: '#7B2FBE' },
  
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#7B2FBE',
    },
  
    // =======================================================
    // FOOTER
    // =======================================================
  
    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 13,
      backgroundColor: 'rgba(247,249,252,0.98)',
      borderTopWidth: 1,
      borderTopColor: '#E5EAF1',
    },
  
    consolidatedHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: '#E0F2FE',
    },
  
    consolidatedHintText: {
      color: '#0369A1',
      fontSize: 11,
      fontWeight: '500',
      flex: 1,
    },
  
    footerButtonWrapper: {
      borderRadius: 13,
      overflow: 'hidden',
      shadowColor: '#7B2FBE',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 5,
    },
  
    footerButton: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },
  
    footerButtonDisabled: { opacity: 0.5 },
  
    footerButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
  
    securityBar: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
  
    securityText: {
      color: '#64748B',
      fontSize: 9,
      fontWeight: '500',
    },
  
    // =======================================================
    // LOADING
    // =======================================================
  
    loadingContainer: {
      paddingVertical: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
  
    loadingText: {
      marginTop: 12,
      color: '#64748B',
      fontSize: 11,
      fontWeight: '500',
    },
  
    // =======================================================
    // EMPTY
    // =======================================================
  
    emptyContainer: {
      paddingHorizontal: 30,
      paddingVertical: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
  
    emptyIcon: {
      width: 70,
      height: 70,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 20,
      backgroundColor: '#F1EAFE',
    },
  
    emptyTitle: {
      marginTop: 19,
      color: '#1E293B',
      fontSize: 20,
      fontWeight: '700',
    },
  
    emptyDescription: {
      maxWidth: 320,
      marginTop: 8,
      color: '#64748B',
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
    },
  
    retryButton: {
      marginTop: 20,
      minHeight: 42,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 10,
      backgroundColor: '#7B2FBE',
    },
  
    retryText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
  });