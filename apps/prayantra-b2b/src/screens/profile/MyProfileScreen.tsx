// apps/prayantra-b2b/src/screens/profile/MyProfileScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';   // 👈 ADD
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

import { useQueryClient } from '@tanstack/react-query';      // 👈 ADD

import {
  updateMyProfile,
  getEmployeeDetailsByIDs,
} from '@b2b/api-client';
import type { UpdateMyProfileRequest } from '@b2b/shared-types';

import { useUserAuthStore } from '../../store/userAuthStore';
import { UserAvatar } from '../../components/UserAvatar';
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
import { RootStackParamList } from '../../navigation';

type Nav = StackNavigationProp<RootStackParamList, 'MyProfile'>;

const TAG = '[MyProfile]';
const log = (...a: any[]) => console.log(TAG, ...a);
const logErr = (...a: any[]) => console.error(TAG, ...a);

export default function MyProfileScreen() {
  const navigation = useNavigation<Nav>();

  const { accessToken, deviceId, companyId, user } = useUserAuthStore() as any;

  const userId   = user?.user_id ?? null;
  const username = user?.username ?? '';
  const fullName = user?.full_name ?? '';
  const phone    = user?.phone ?? user?.phone_number ?? '';

  const [usernameDraft, setUsernameDraft] = useState(username);
  const [fullNameDraft, setFullNameDraft] = useState(fullName);
  const [saving, setSaving] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const queryClient = useQueryClient();   // 👈 ADD

  // -----------------------------------------------------
  // Refresh avatar cache every time the screen gains focus.
  // Ensures the hero avatar reflects the latest primary
  // avatar after the user comes back from AvatarManagement.
  // -----------------------------------------------------
  useFocusEffect(                          // 👈 ADD
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['avatar'] });
    }, [queryClient]),
  );

  // -----------------------------------------------------
  // Shared fetch + patch. Called by:
  //   • the auto-hydrate effect on mount (when fields are missing)
  //   • handleRefresh (pull-to-refresh — always re-fetch)
  // -----------------------------------------------------
  const fetchAndPatchProfile = useCallback(async (): Promise<boolean> => {
    if (!user?.user_id) return false;
    if (!accessToken || !companyId || !deviceId) return false;

    try {
      log('fetching profile from backend', { userId: user.user_id });
      const res = await getEmployeeDetailsByIDs(
        companyId,
        deviceId,
        accessToken,
        { user_ids: [user.user_id] },
      );
      const row = (res as any)?.data?.[0];
      log('fetch response row', row);
      if (!row) return false;

      useUserAuthStore.setState((s: any) => ({
        user: s.user
          ? {
              ...s.user,
              username:  row.username  || s.user.username  || '',
              full_name: row.full_name || s.user.full_name || '',
            }
          : s.user,
      }));
      return true;
    } catch (err) {
      logErr('fetch profile failed', err);
      return false;
    }
  }, [user?.user_id, accessToken, companyId, deviceId]);

  // -----------------------------------------------------
  // Auto-hydrate only when the store is missing display fields.
  // -----------------------------------------------------
  useEffect(() => {
    const missing = !user?.username && !user?.full_name;
    if (!user?.user_id) return;
    if (!missing) return;
    if (!accessToken || !companyId || !deviceId) return;

    let cancelled = false;
    setHydrating(true);

    (async () => {
      if (!cancelled) await fetchAndPatchProfile();
      if (!cancelled) setHydrating(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id, user?.username, user?.full_name, accessToken, companyId, deviceId, fetchAndPatchProfile]);

  // -----------------------------------------------------
  // Pull-to-refresh handler. Always re-fetches, even when
  // the store already has username/full_name, so the user
  // can force a fresh read at any time. Also refreshes the
  // avatar cache so the hero image updates.
  // -----------------------------------------------------
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await Promise.all([                       // 👈 updated
        fetchAndPatchProfile(),
        queryClient.invalidateQueries({ queryKey: ['avatar'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, fetchAndPatchProfile, queryClient]);   // 👈 added queryClient

  // -----------------------------------------------------
  // Sync drafts whenever the store's user changes.
  // -----------------------------------------------------
  useEffect(() => {
    if (!user) return;
    setUsernameDraft(user.username ?? '');
    setFullNameDraft(user.full_name ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id, user?.username, user?.full_name]);

  useEffect(() => {
    log('mounted', { userId, hasToken: !!accessToken, hydrating });
  }, [userId, accessToken]);

  const isDirty = usernameDraft !== username || fullNameDraft !== fullName;
  const canSave = isDirty && !saving && !!accessToken && !!deviceId;

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    const payload: UpdateMyProfileRequest = {};
    if (usernameDraft.trim() && usernameDraft.trim() !== username) {
      payload.username = usernameDraft.trim();
    }
    if (fullNameDraft.trim() && fullNameDraft.trim() !== fullName) {
      payload.full_name = fullNameDraft.trim();
    }
    if (!payload.username && !payload.full_name) {
      Alert.alert('Nothing to update', 'Change at least one field.');
      return;
    }

    setSaving(true);
    log('submitting', payload);
    try {
      const res = await updateMyProfile(payload, deviceId, accessToken);
      log('success', res);

      useUserAuthStore.setState((s: any) => ({
        user: s.user
          ? {
              ...s.user,
              username:  res.username  ?? s.user.username,
              full_name: res.full_name ?? s.user.full_name,
            }
          : s.user,
      }));

      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (err: any) {
      logErr('failed', err?.response?.data ?? err?.message);
      Alert.alert(
        'Unable to Save',
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          'Something went wrong.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    canSave,
    usernameDraft,
    fullNameDraft,
    username,
    fullName,
    accessToken,
    deviceId,
  ]);

  // -----------------------------------------------------
  // Auth gate
  // -----------------------------------------------------
  if (!accessToken || !deviceId) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.stateIcon}>
          <Icon name="lock-outline" size={30} color={PRIMARY_COLOR} />
        </View>
        <Text style={styles.stateTitle}>Sign in required</Text>
        <Text style={styles.stateText}>
          Please sign in again to view and edit your profile.
        </Text>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------
  // User object gate
  // -----------------------------------------------------
  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.stateIcon}>
          <Icon name="account-circle-outline" size={30} color={PRIMARY_COLOR} />
        </View>
        <ActivityIndicator size="small" color={PRIMARY_COLOR} style={{ marginTop: 18 }} />
        <Text style={styles.stateTitle}>Loading your profile</Text>
        <Text style={styles.stateText}>Fetching your account details…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={PRIMARY_COLOR}
              colors={[PRIMARY_COLOR]}
              progressBackgroundColor="#FFFFFF"
              title="Refreshing…"
              titleColor={TEXT_SECONDARY}
            />
          }
        >
          {/* =====================================================
              HERO
          ===================================================== */}
          <LinearGradient
            colors={GRADIENT_COLORS}
            start={GRADIENT_START}
            end={GRADIENT_END}
            style={styles.hero}
          >
            <TouchableOpacity
              style={styles.heroBack}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Icon name="arrow-left" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.heroAvatarWrap}>
              <View style={styles.heroAvatarRing}>
                <View style={styles.heroAvatarClip}>
                  <UserAvatar
                    userId={userId}
                    username={username}
                    fullName={fullName}
                    size={88}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.heroAvatarEdit}
                onPress={() => navigation.navigate('AvatarManagement')}
                activeOpacity={0.85}
              >
                <Icon name="camera-outline" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.heroName} numberOfLines={1}>
              {fullName || username || (hydrating ? 'Loading…' : 'Your profile')}
            </Text>
            <Text style={styles.heroHandle} numberOfLines={1}>
              @{username || (hydrating ? '…' : '—')}
            </Text>

            {!!phone && (
              <View style={styles.heroPhonePill}>
                <Icon name="phone-outline" size={12} color="#FFFFFF" />
                <Text style={styles.heroPhoneText}>{phone}</Text>
              </View>
            )}
          </LinearGradient>

          {/* =====================================================
              QUICK LINKS
          ===================================================== */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('AvatarManagement')}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#7B2FBE15' }]}>
                <Icon name="image-multiple-outline" size={20} color="#7B2FBE" />
              </View>
              <Text style={styles.quickLabel}>My Avatars</Text>
              <Text style={styles.quickSub}>Manage photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigation.navigate('Main')}
              activeOpacity={0.85}
            >
              <View style={[styles.quickIcon, { backgroundColor: `${PRIMARY_COLOR}15` }]}>
                <Icon name="view-grid-outline" size={20} color={PRIMARY_COLOR} />
              </View>
              <Text style={styles.quickLabel}>Modules</Text>
              <Text style={styles.quickSub}>Back to home</Text>
            </TouchableOpacity>
          </View>

          {/* =====================================================
              EDITABLE FIELDS
          ===================================================== */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>ACCOUNT</Text>
            {(hydrating || refreshing) && (
              <View style={styles.hydratingPill}>
                <ActivityIndicator size="small" color={PRIMARY_COLOR} />
                <Text style={styles.hydratingText}>
                  {refreshing ? 'Refreshing…' : 'Loading…'}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            {/* Full Name */}
            <View style={styles.field}>
              <View style={styles.fieldIcon}>
                <Icon name="account-outline" size={19} color={PRIMARY_COLOR} />
              </View>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <RNTextInput
                  value={fullNameDraft}
                  onChangeText={setFullNameDraft}
                  placeholder={hydrating ? 'Loading…' : 'Enter your full name'}
                  placeholderTextColor="#A0A8B5"
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Username */}
            <View style={[styles.field, styles.fieldDivider]}>
              <View style={styles.fieldIcon}>
                <Icon name="at" size={19} color={PRIMARY_COLOR} />
              </View>
              <View style={styles.fieldBody}>
                <Text style={styles.fieldLabel}>Username</Text>
                <RNTextInput
                  value={usernameDraft}
                  onChangeText={setUsernameDraft}
                  placeholder={hydrating ? 'Loading…' : 'Alphanumeric, 3–100'}
                  placeholderTextColor="#A0A8B5"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  returnKeyType="done"
                />
              </View>
            </View>

            {/* Phone — read-only here */}
            {!!phone && (
              <View style={[styles.field, styles.fieldDivider]}>
                <View style={styles.fieldIcon}>
                  <Icon name="phone-outline" size={19} color={PRIMARY_COLOR} />
                </View>
                <View style={styles.fieldBody}>
                  <Text style={styles.fieldLabel}>Phone</Text>
                  <Text style={styles.readonlyValue}>{phone}</Text>
                  <Text style={styles.readonlyHint}>
                    Contact support to change your phone
                  </Text>
                </View>
              </View>
            )}
          </View>

          <Text style={styles.hint}>
            Other details (email, date of birth, tax ID, etc.) are managed by your
            HR team.
          </Text>

          {/* =====================================================
              SAVE
          ===================================================== */}
          <TouchableOpacity
            disabled={!canSave}
            onPress={handleSave}
            activeOpacity={0.85}
            style={[styles.saveWrap, !canSave && styles.saveDisabled]}
          >
            <LinearGradient
              colors={GRADIENT_COLORS}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.saveBtn}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Icon name="content-save-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.saveText}>
                    {isDirty ? 'Save Changes' : 'No Changes'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========================================================
// STYLES — unchanged
// =========================================================

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BACKGROUND_COLOR },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: BACKGROUND_COLOR,
  },
  stateIcon: {
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: `${PRIMARY_COLOR}12`,
  },
  stateTitle: {
    marginTop: 16,
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateText: {
    marginTop: 7,
    maxWidth: 300,
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },

  scroll: { paddingBottom: 40 },

  hero: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  heroBack: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },

  heroAvatarWrap: {
    position: 'relative',
    marginTop: 14,
  },
  heroAvatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarClip: {
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  heroAvatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: PRIMARY_COLOR,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },

  heroName: {
    marginTop: 14,
    maxWidth: '90%',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroHandle: {
    marginTop: 3,
    maxWidth: '90%',
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  heroPhonePill: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  heroPhoneText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  quickRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 22,
    gap: 12,
  },
  quickCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  quickIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  quickLabel: {
    marginTop: 10,
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '700',
  },
  quickSub: { marginTop: 2, color: TEXT_SECONDARY, fontSize: 10 },

  sectionHeaderRow: {
    marginTop: 28,
    marginHorizontal: 20,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: TEXT_SECONDARY,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hydratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: `${PRIMARY_COLOR}10`,
  },
  hydratingText: {
    color: PRIMARY_COLOR,
    fontSize: 9,
    fontWeight: '700',
  },

  card: {
    marginHorizontal: 20,
    borderRadius: 14,
    backgroundColor: CARD_BACKGROUND,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    overflow: 'hidden',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fieldDivider: { borderTopWidth: 1, borderTopColor: '#EDF0F4' },
  fieldIcon: {
    width: 37,
    height: 37,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: `${PRIMARY_COLOR}0D`,
  },
  fieldBody: { flex: 1, marginLeft: 12 },
  fieldLabel: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  input: {
    minHeight: 34,
    marginTop: 2,
    paddingHorizontal: 0,
    paddingVertical: 0,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
  },
  readonlyValue: {
    marginTop: 4,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
  },
  readonlyHint: {
    marginTop: 2,
    color: TEXT_SECONDARY,
    fontSize: 9,
    fontWeight: '500',
  },

  hint: {
    marginTop: 12,
    marginHorizontal: 20,
    color: TEXT_SECONDARY,
    fontSize: 10,
    lineHeight: 15,
  },

  saveWrap: {
    marginTop: 22,
    marginHorizontal: 20,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  saveDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveBtn: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});