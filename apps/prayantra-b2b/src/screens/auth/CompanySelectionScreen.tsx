import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
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
  const { setCompanyId, setSavedUserId, setPendingMpinLogin } = useUserAuthStore();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await getCompanyByEmployeePhone(phone);
      // data is an array of { company_id, company_name }
      setCompanies(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCompany = (companyId: string) => {
    setCompanyId(companyId);
    // Save pending user info (this will be used later)
    setPendingMpinLogin(userId, phone, hasMpin);
    setSavedUserId(userId, phone, hasMpin);

    // Navigate based on 'from' param
    if (from === 'setup') {
      navigation.navigate('MPINSetup', { userId, phone, companyId });
    } else {
      navigation.navigate('MPINVerification', { phone, userId, companyId });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7B2FBE" />
          <Text style={styles.loadingText}>Loading companies...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (companies.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text variant="headlineSmall" style={styles.title}>No Companies Found</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            You are not associated with any company. Please contact support.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Select Company</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Choose the company you want to access
        </Text>
      </View>

      <FlatList
        data={companies}
        keyExtractor={(item) => item.company_id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelectCompany(item.company_id)}
            activeOpacity={0.7}
          >
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.companyName}>
                  {item.company_name}
                </Text>
                <Text variant="bodySmall" style={styles.companyId}>
                  ID: {item.company_id}
                </Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, color: '#666' },
  header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
  title: { fontWeight: 'bold', color: '#1A1A1A' },
  subtitle: { color: '#666', marginTop: 4 },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  companyName: { fontWeight: '600', color: '#1A1A1A' },
  companyId: { color: '#888', marginTop: 2 },
});