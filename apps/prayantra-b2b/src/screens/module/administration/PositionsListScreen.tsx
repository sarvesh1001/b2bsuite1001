// apps/prayantra-b2b/src/screens/module/administration/PositionsListScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Alert,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Card, ActivityIndicator, FAB } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { listPositions, deletePosition } from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import { Position } from '@b2b/shared-types';
import { RootStackParamList } from '../../../navigation';
import {
  PRIMARY_COLOR,
  ERROR_COLOR,
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  BORDER_COLOR,
  SUCCESS_COLOR,
} from '../../../constants/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'PositionsList'>;

export default function PositionsListScreen() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const fetchPositions = async () => {
    if (!accessToken || !companyId) return;
    setLoading(true);
    try {
      const res = await listPositions(
        companyId,
        deviceId!,
        { limit: 100, offset: 0 },
        accessToken
      );
      setPositions(res.data?.positions || []);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load positions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPositions();
    }, [accessToken, companyId])
  );

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Position',
      'Are you sure you want to delete this position?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePosition(companyId!, deviceId!, id, accessToken!);
              fetchPositions();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Position }) => (
    <Card style={[styles.card, { backgroundColor: CARD_BACKGROUND }]}>
      <Card.Content>
        <View style={styles.row}>
          <View style={styles.info}>
            <Text variant="titleMedium" style={[styles.name, { color: TEXT_PRIMARY }]}>
              {item.title}
            </Text>
            <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
              Department: {item.department_id}
            </Text>
            {item.work_center_code && (
              <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
                Work Center: {item.work_center_code}
              </Text>
            )}
            <View style={styles.badgeRow}>
              <Text style={[styles.badge, item.is_open ? styles.open : styles.closed]}>
                {item.is_open ? 'Open' : 'Closed'}
              </Text>
              <Text style={[styles.badge, item.is_schedulable ? styles.active : styles.inactive]}>
                {item.is_schedulable ? 'Schedulable' : 'Not Schedulable'}
              </Text>
              <Text style={[styles.badge, item.attendance_required ? styles.active : styles.inactive]}>
                {item.attendance_required ? 'Attend. Req.' : 'No Attend.'}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('EditPosition', { positionId: item.position_id })
              }
              style={styles.actionButton}
            >
              <Icon name="pencil" size={24} color={PRIMARY_COLOR} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.position_id)}
              style={styles.actionButton}
            >
              <Icon name="delete" size={24} color={ERROR_COLOR} />
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_COLOR} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: BACKGROUND_COLOR }]}>
      <FlatList
        data={positions}
        keyExtractor={(item) => item.position_id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: 80 + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchPositions} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="badge-account-off" size={64} color="#ccc" />
            <Text variant="bodyLarge" style={{ marginTop: 8, color: TEXT_PRIMARY }}>
              No positions found
            </Text>
            <Text variant="bodySmall" style={{ color: TEXT_SECONDARY }}>
              Tap + to create one
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB
        style={[styles.fab, { bottom: 16 + insets.bottom }]}
        icon="plus"
        onPress={() => navigation.navigate('CreatePosition')}
        color="white"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 1,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 6,
  },
  badge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  open: {
    color: SUCCESS_COLOR,
    backgroundColor: '#D1FAE5',
  },
  closed: {
    color: ERROR_COLOR,
    backgroundColor: '#FEE2E2',
  },
  active: {
    color: SUCCESS_COLOR,
    backgroundColor: '#D1FAE5',
  },
  inactive: {
    color: TEXT_SECONDARY,
    backgroundColor: '#F3F4F6',
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 6,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  fab: {
    position: 'absolute',
    right: 16,
    backgroundColor: PRIMARY_COLOR,
  },
});