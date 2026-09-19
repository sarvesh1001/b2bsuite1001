import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserAuthStore } from '../../../../store/userAuthStore';
import { clearComponentCache } from '@b2b/api-client';
import {
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
} from '../../../../constants/colors';

export default function ClearCacheButton() {
  const { accessToken, companyId, deviceId } = useUserAuthStore();
  const [loading, setLoading] = useState(false);

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Component Cache',
      'Are you sure you want to clear the component cache? This may affect performance temporarily.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            if (!accessToken || !companyId || !deviceId) {
              Alert.alert('Error', 'Missing authentication');
              return;
            }
            setLoading(true);
            try {
              await clearComponentCache(companyId, deviceId, accessToken);
              Alert.alert('Success', 'Component cache cleared successfully');
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to clear cache');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleClearCache}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Icon name="database-remove" size={20} color="#fff" />
            <Text style={styles.buttonText}>Clear Component Cache</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '600', marginLeft: 8 },
});