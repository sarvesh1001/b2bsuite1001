import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { addComponentToStructure } from '@b2b/api-client';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  BORDER_COLOR,
} from '../../../../constants/colors';
import { RootStackParamList } from '../../../../navigation';

// ✅ Correct screen name: 'AddComponentToStructure' (as defined in RootStackParamList)
type NavigationProps = StackNavigationProp<RootStackParamList, 'AddComponentToStructure'>;
type RouteProps = RouteProp<RootStackParamList, 'AddComponentToStructure'>;

export default function AddComponentForm() {
  const navigation = useNavigation<NavigationProps>();
  const route = useRoute<RouteProps>();
  const { structureId } = route.params; // ✅ now properly typed
  const { accessToken, companyId, deviceId } = useUserAuthStore();

  const [componentCode, setComponentCode] = useState('');
  const [calculationType, setCalculationType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!structureId) {
      Alert.alert('Error', 'Structure ID is missing');
      return;
    }
    if (!componentCode.trim()) {
      Alert.alert('Error', 'Component code is required');
      return;
    }
    if (!value || isNaN(Number(value))) {
      Alert.alert('Error', 'Valid value is required');
      return;
    }
    if (!accessToken || !companyId || !deviceId) {
      Alert.alert('Error', 'Missing authentication');
      return;
    }

    setLoading(true);
    try {
      await addComponentToStructure(companyId, structureId, deviceId, accessToken, {
        component_code: componentCode.trim(),
        calculation_type: calculationType,
        value: Number(value),
        sequence_order: sequenceOrder ? Number(sequenceOrder) : undefined,
      });
      Alert.alert('Success', 'Component added');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Add failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Component</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.card}>
          <Text style={styles.label}>Component Code</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., BASIC"
            value={componentCode}
            onChangeText={setComponentCode}
          />

          <Text style={styles.label}>Calculation Type</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                calculationType === 'percentage' && styles.typeActive,
              ]}
              onPress={() => setCalculationType('percentage')}
            >
              <Text style={styles.typeText}>Percentage</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                calculationType === 'fixed' && styles.typeActive,
              ]}
              onPress={() => setCalculationType('fixed')}
            >
              <Text style={styles.typeText}>Fixed</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Value</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 40 for 40% or 5000"
            keyboardType="numeric"
            value={value}
            onChangeText={setValue}
          />

          <Text style={styles.label}>Sequence Order (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 1"
            keyboardType="numeric"
            value={sequenceOrder}
            onChangeText={setSequenceOrder}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Add Component</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BACKGROUND_COLOR },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: CARD_BACKGROUND,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_PRIMARY,
    marginLeft: 10,
  },
  formContainer: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_PRIMARY,
    marginTop: 12,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: TEXT_PRIMARY,
    backgroundColor: '#fff',
  },
  typeContainer: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  typeActive: {
    backgroundColor: PRIMARY_COLOR + '20',
    borderColor: PRIMARY_COLOR,
  },
  typeText: { color: TEXT_PRIMARY },
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});