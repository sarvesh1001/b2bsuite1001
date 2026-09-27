// apps/prayantra-b2b/src/screens/auth/CompanySelectionScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, FlatList, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, ActivityIndicator } from 'react-native-paper';
import {
  useNavigation, useRoute, RouteProp,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { getCompanyByEmployeePhone } from '../../services/auth';
import { useUserAuthStore } from '../../store/userAuthStore';
import { RootStackParamList } from '../../navigation';

type CompanySelectionRouteProp = RouteProp<RootStackParamList, 'CompanySelection'>;
type CompanySelectionNavigationProp = StackNavigationProp<RootStackParamList, 'CompanySelection'>;

interface Company {
  company_id: string;
  company_name: string;
}

export default function CompanySelectionScreen() {
  const navigation = useNavigation<CompanySelectionNavigationProp>();
  const route = useRoute<CompanySelectionRouteProp>();

  const { userId, phone, hasMpin, from } = route.params;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const {
    setCompanyId,
    setSavedUserId,
    setPendingMpinLogin,
  } = useUserAuthStore();

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await getCompanyByEmployeePhone(phone);
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Failed to load companies:', error);
      Alert.alert(
        'Unable to load companies',
        error?.message || 'Something went wrong while loading your companies.',
        [{ text: 'Try Again', onPress: fetchCompanies }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (company: Company) => {
    if (selectedCompanyId) return;

    setSelectedCompanyId(company.company_id);

    const companyId = company.company_id;

    // Persist to store — MPINVerification reads this on focus
    setCompanyId(companyId);
    setPendingMpinLogin(userId, phone, hasMpin);
    setSavedUserId(userId, phone, hasMpin);

    setTimeout(() => {
      // ---------- SETUP FLOW ----------
      if (from === 'setup') {
        navigation.navigate('MPINSetup', { userId, phone, companyId });
        return;
      }

      // ---------- VERIFY FLOW ----------
      // Two possible origins:
      //   A) PhoneInput → CompanySelection  (MPIN NOT in stack yet)
      //   B) MPINVerification → Switch company → CompanySelection (MPIN IS in stack)
      //
      // For (A): we need to REPLACE, else pressing Back from MPIN
      //          would land the user back on PhoneInput.
      // For (B): we want to GO BACK so the existing MPIN screen resumes
      //          with the new company id from the store.

      const state = (navigation as any).getState?.();
      const routes: any[] = state?.routes ?? [];
      const hasMpinInStack = routes.some(
        (r) => r.name === 'MPINVerification'
      );

      if (hasMpinInStack) {
        navigation.goBack();
      } else {
        navigation.replace('MPINVerification', {
          phone,
          userId,
          companyId,
          // NOTE: no `companies` param — MPIN shouldn't render a picker
        });
      }
    }, 180);
  };

  if (loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.loadingScreen}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logo}
            >
              <Text style={styles.logoText}>P</Text>
            </LinearGradient>
          </View>
          <ActivityIndicator size="small" color="#7B2FBE" style={styles.loadingIndicator} />
          <Text style={styles.loadingTitle}>Finding your companies</Text>
          <Text style={styles.loadingSubtitle}>Please wait a moment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (companies.length === 0) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.emptyScreen}>
          <LinearGradient
            colors={['#00B4DB', '#7B2FBE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.emptyLogo}
          >
            <Text style={styles.logoText}>P</Text>
          </LinearGradient>
          <View style={styles.emptyIcon}>
            <Icon name="office-building-outline" size={31} color="#7B2FBE" />
          </View>
          <Text style={styles.emptyTitle}>No Companies Found</Text>
          <Text style={styles.emptyDescription}>
            We couldn't find any companies associated with this account.
          </Text>
          <Text style={styles.emptyHint}>
            If you believe this is a mistake, please contact your administrator.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = () => (
    <>
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

      <View style={styles.titleSection}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>STEP 1 OF 2</Text>
        </View>
        <Text style={styles.pageTitle}>Select your company</Text>
        <Text style={styles.pageSubtitle}>
          Choose the company you want to access with this account.
        </Text>
      </View>

      <View style={styles.accountCard}>
        <View style={styles.accountIcon}>
          <Icon name="account-outline" size={20} color="#7B2FBE" />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountLabel}>Signed in as</Text>
          <Text style={styles.accountPhone}>{phone}</Text>
        </View>
        <View style={styles.verifiedBadge}>
          <Icon name="check-circle" size={13} color="#16A34A" />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Your companies</Text>
          <Text style={styles.sectionSubtitle}>
            {companies.length} {companies.length === 1 ? 'company' : 'companies'} available
          </Text>
        </View>
        <View style={styles.companyCount}>
          <Icon name="office-building-outline" size={15} color="#7B2FBE" />
          <Text style={styles.companyCountText}>{companies.length}</Text>
        </View>
      </View>
    </>
  );

  const renderCompany = ({ item, index }: { item: Company; index: number }) => {
    const isSelected = selectedCompanyId === item.company_id;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        disabled={selectedCompanyId !== null}
        onPress={() => handleSelectCompany(item)}
        style={[styles.companyCard, isSelected && styles.companyCardSelected]}
      >
        <View style={[styles.companyAccent, isSelected && styles.companyAccentSelected]} />
        <Text style={styles.cardNumber}>{String(index + 1).padStart(2, '0')}</Text>

        <View style={[styles.companyIcon, isSelected && styles.companyIconSelected]}>
          {isSelected ? (
            <ActivityIndicator size="small" color="#7B2FBE" />
          ) : (
            <Icon name="office-building-outline" size={26} color="#7B2FBE" />
          )}
        </View>

        <View style={styles.companyInfo}>
          <Text numberOfLines={2} style={styles.companyName}>{item.company_name}</Text>
          <Text numberOfLines={1} style={styles.companyId}>ID: {item.company_id}</Text>
        </View>

        <View style={[styles.companyArrow, isSelected && styles.companyArrowSelected]}>
          {isSelected ? (
            <Icon name="loading" size={17} color="#7B2FBE" />
          ) : (
            <Icon name="arrow-right" size={17} color="#7B2FBE" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <FlatList
        data={companies}
        keyExtractor={(item) => item.company_id}
        renderItem={renderCompany}
        ListHeaderComponent={<ListHeader />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.securityBar}>
        <Icon name="shield-check-outline" size={17} color="#64748B" />
        <Text style={styles.securityText}>
          Your account information is securely protected
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F9FC' },
  listContent: { paddingBottom: 100 },

  brandHeader: { paddingHorizontal: 20, paddingTop: 12, flexDirection: 'row', alignItems: 'center' },
  brandLogo: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: 11, shadowColor: '#7B2FBE',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 3,
  },
  brandLogoText: { color: '#FFFFFF', fontSize: 19, fontWeight: '800' },
  brandText: { marginLeft: 10 },
  brandName: { color: '#172033', fontSize: 17, fontWeight: '700' },
  brandSubtitle: { marginTop: 2, color: '#94A3B8', fontSize: 9, fontWeight: '500' },

  titleSection: { paddingHorizontal: 20, paddingTop: 30 },
  stepBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 6, backgroundColor: '#F1EAFE',
  },
  stepBadgeText: { color: '#7B2FBE', fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  pageTitle: {
    marginTop: 12, color: '#172033', fontSize: 27, lineHeight: 33,
    fontWeight: '700', letterSpacing: -0.5,
  },
  pageSubtitle: {
    maxWidth: 330, marginTop: 7, color: '#64748B',
    fontSize: 12, lineHeight: 18, fontWeight: '500',
  },

  accountCard: {
    marginHorizontal: 20, marginTop: 22, padding: 12,
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 13, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5EAF1',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  accountIcon: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: '#F1EAFE',
  },
  accountInfo: { flex: 1, marginLeft: 10 },
  accountLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '600' },
  accountPhone: { marginTop: 3, color: '#334155', fontSize: 12, fontWeight: '600' },
  verifiedBadge: {
    paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row',
    alignItems: 'center', borderRadius: 8, backgroundColor: '#F0FDF4',
  },
  verifiedText: { marginLeft: 4, color: '#16A34A', fontSize: 8, fontWeight: '700' },

  sectionHeader: {
    marginHorizontal: 20, marginTop: 28, marginBottom: 13,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
  },
  sectionTitle: { color: '#1E293B', fontSize: 16, fontWeight: '700' },
  sectionSubtitle: { marginTop: 3, color: '#94A3B8', fontSize: 9, fontWeight: '500' },
  companyCount: {
    minWidth: 34, height: 28, paddingHorizontal: 7,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: 8, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5EAF1',
  },
  companyCountText: { color: '#475569', fontSize: 10, fontWeight: '700' },

  companyCard: {
    minHeight: 106, marginHorizontal: 20, marginBottom: 11, padding: 15,
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 15, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5EAF1',
    position: 'relative', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  companyCardSelected: { borderColor: '#D9C6ED', backgroundColor: '#FCFAFF' },
  companyAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#7B2FBE' },
  companyAccentSelected: { width: 4 },
  cardNumber: {
    position: 'absolute', right: 15, top: 13, color: '#CBD5E1',
    fontSize: 9, fontWeight: '800', letterSpacing: 0.5,
  },
  companyIcon: {
    width: 51, height: 51, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: '#F1EAFE',
  },
  companyIconSelected: { backgroundColor: '#EDE1F8' },
  companyInfo: { flex: 1, marginLeft: 13, paddingRight: 30 },
  companyName: { color: '#1E293B', fontSize: 14, lineHeight: 19, fontWeight: '700' },
  companyId: { marginTop: 5, color: '#94A3B8', fontSize: 9, fontWeight: '500' },
  companyArrow: {
    position: 'absolute', right: 14, bottom: 14, width: 29, height: 29,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, backgroundColor: '#F5EFFB',
  },
  companyArrowSelected: { backgroundColor: '#EDE1F8' },

  securityBar: {
    position: 'absolute', left: 20, right: 20, bottom: 13, minHeight: 40,
    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: 1, borderColor: '#E5EAF1',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 3,
  },
  securityText: { marginLeft: 7, color: '#64748B', fontSize: 9, fontWeight: '500' },

  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  logoContainer: { alignItems: 'center', justifyContent: 'center' },
  logo: {
    width: 68, height: 68, alignItems: 'center', justifyContent: 'center',
    borderRadius: 19, shadowColor: '#7B2FBE',
    shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 5,
  },
  logoText: { color: '#FFFFFF', fontSize: 29, fontWeight: '800' },
  loadingIndicator: { marginTop: 23 },
  loadingTitle: { marginTop: 13, color: '#1E293B', fontSize: 17, fontWeight: '700' },
  loadingSubtitle: { marginTop: 5, color: '#94A3B8', fontSize: 10, fontWeight: '500' },

  emptyScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  emptyLogo: {
    width: 58, height: 58, alignItems: 'center', justifyContent: 'center',
    borderRadius: 17, marginBottom: 25,
  },
  emptyIcon: {
    width: 70, height: 70, alignItems: 'center', justifyContent: 'center',
    borderRadius: 20, backgroundColor: '#F1EAFE',
  },
  emptyTitle: { marginTop: 19, color: '#1E293B', fontSize: 20, fontWeight: '700' },
  emptyDescription: {
    maxWidth: 320, marginTop: 8, color: '#64748B',
    fontSize: 12, lineHeight: 18, textAlign: 'center',
  },
  emptyHint: {
    maxWidth: 300, marginTop: 7, color: '#94A3B8',
    fontSize: 10, lineHeight: 16, textAlign: 'center',
  },
});