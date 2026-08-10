import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  Card,
  Button,
  IconButton,
  FAB,
  Dialog,
  Portal,
  Provider as PaperProvider,
  Avatar as PaperAvatar,
  SegmentedButtons,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  listMyAvatars,
  listInactiveAvatars,
  generateAvatarUploadUrl,
  uploadAvatarFile,
  confirmAvatarUpload,
  setAvatarPrimary,
  deleteAvatar,
  reactivateAvatar,
  getAvatarUrl,
} from '@b2b/api-client';
import { useUserAuthStore } from '../../../store/userAuthStore';
import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  BORDER_COLOR,
} from '../../../constants/colors';

type ViewMode = 'active' | 'deleted';

export default function AvatarManagementScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken, deviceId, companyId } = useUserAuthStore();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('active');

  if (!accessToken || !deviceId || !companyId) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={{ color: TEXT_SECONDARY }}>Authentication required</Text>
      </View>
    );
  }

  // ---- Fetch active avatars ----
  const {
    data: activeAvatars = [],
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['myAvatars', 'active'],
    queryFn: async () => {
      console.log('🔄 [AvatarManagement] Fetching active avatars...');
      const result = await listMyAvatars(deviceId, accessToken, companyId);
      console.log('📦 [AvatarManagement] Active avatars received:', result.length);
      return result;
    },
    enabled: !!accessToken && !!deviceId && !!companyId,
  });

  // ---- Fetch inactive (deleted) avatars ----
  const {
    data: inactiveAvatars = [],
    isLoading: inactiveLoading,
    refetch: refetchInactive,
  } = useQuery({
    queryKey: ['myAvatars', 'inactive'],
    queryFn: async () => {
      console.log('🔄 [AvatarManagement] Fetching inactive avatars...');
      const result = await listInactiveAvatars(deviceId, accessToken, companyId);
      console.log('📦 [AvatarManagement] Inactive avatars received:', result.length);
      return result;
    },
    enabled: !!accessToken && !!deviceId && !!companyId,
  });

  const isLoading = viewMode === 'active' ? activeLoading : inactiveLoading;
  const avatars = viewMode === 'active' ? activeAvatars : inactiveAvatars;
  const refetch = viewMode === 'active' ? refetchActive : refetchInactive;

  // ---- Mutations ----
  const setPrimaryMutation = useMutation({
    mutationFn: ({ avatarId, idempotencyKey }: { avatarId: string; idempotencyKey: string }) =>
      setAvatarPrimary(avatarId, deviceId, accessToken, idempotencyKey, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvatars'] });
      Alert.alert('Success', 'Primary avatar updated');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to set primary avatar');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ avatarId, idempotencyKey }: { avatarId: string; idempotencyKey: string }) =>
      deleteAvatar(avatarId, deviceId, accessToken, idempotencyKey, companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvatars'] });
      setDialogVisible(false);
      Alert.alert('Success', 'Avatar deleted');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to delete avatar');
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: ({ avatarId, idempotencyKey, setPrimary }: { avatarId: string; idempotencyKey: string; setPrimary: boolean }) =>
      reactivateAvatar(avatarId, deviceId, accessToken, idempotencyKey, companyId, setPrimary),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAvatars'] });
      Alert.alert('Success', 'Avatar restored');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to restore avatar');
    },
  });

  // ---- Upload flow ----
  const handleUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploading(true);

      // 1. Generate upload URL
      const { uploadUrl, fileKey } = await generateAvatarUploadUrl(
        asset.mimeType || 'image/jpeg',
        deviceId,
        accessToken,
        companyId
      );

      // 2. Upload the file
      await uploadAvatarFile(
        uploadUrl,
        fileKey,
        asset.uri,
        asset.fileName || 'avatar.jpg',
        asset.mimeType || 'image/jpeg',
        accessToken,
        companyId
      );

      // 3. Confirm upload
      const idempotencyKey = `confirm-${Date.now()}`;
      await confirmAvatarUpload(
        fileKey,
        asset.mimeType || 'image/jpeg',
        true,
        deviceId,
        accessToken,
        idempotencyKey,
        companyId
      );

      // 4. Refresh list
      await queryClient.invalidateQueries({ queryKey: ['myAvatars'] });
      Alert.alert('Success', 'Avatar uploaded and set as primary.');
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Something went wrong.');
    } finally {
      setUploading(false);
    }
  };

  // ---- Handlers ----
  const handleSetPrimary = (avatarId: string) => {
    const idempotencyKey = `set-primary-${Date.now()}`;
    setPrimaryMutation.mutate({ avatarId, idempotencyKey });
  };

  const handleDelete = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    setDialogVisible(true);
  };

  const confirmDelete = () => {
    if (selectedAvatarId) {
      const idempotencyKey = `delete-${Date.now()}`;
      deleteMutation.mutate({ avatarId: selectedAvatarId, idempotencyKey });
    }
  };

  const handleReactivate = (avatarId: string, setPrimary: boolean = false) => {
    const idempotencyKey = `reactivate-${Date.now()}`;
    reactivateMutation.mutate({ avatarId, idempotencyKey, setPrimary });
  };

  // ---- Render item ----
  const renderItem = ({ item }: { item: any }) => {
    const fullUrl = getAvatarUrl(item, 'medium');
    const isPrimary = item.isPrimary;
    const isActive = item.isActive;

    return (
      <Card style={styles.card}>
        <View style={styles.cardContent}>
          {fullUrl ? (
            <PaperAvatar.Image
              size={60}
              source={{ uri: fullUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <PaperAvatar.Icon
              size={60}
              icon="account"
              style={styles.avatarPlaceholder}
            />
          )}
          <View style={styles.info}>
            <Text variant="titleMedium" style={styles.type}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
            <Text variant="bodySmall" style={styles.date}>
              Uploaded: {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            {isActive && isPrimary && (
              <View style={styles.primaryBadge}>
                <Icon name="star" size={16} color="#FFC107" />
                <Text variant="labelSmall" style={styles.primaryLabel}>
                  Primary
                </Text>
              </View>
            )}
            {!isActive && (
              <View style={styles.deletedBadge}>
                <Text variant="labelSmall" style={styles.deletedLabel}>
                  Deleted
                </Text>
              </View>
            )}
          </View>
          <View style={styles.actions}>
            {isActive ? (
              <>
                {!isPrimary && (
                  <IconButton
                    icon="star-outline"
                    size={24}
                    onPress={() => handleSetPrimary(item.id)}
                    disabled={setPrimaryMutation.isPending}
                    style={styles.actionButton}
                  />
                )}
                <IconButton
                  icon="delete-outline"
                  size={24}
                  onPress={() => handleDelete(item.id)}
                  disabled={deleteMutation.isPending}
                  style={styles.actionButton}
                />
              </>
            ) : (
              <>
                <IconButton
                  icon="restore"
                  size={24}
                  onPress={() => handleReactivate(item.id, false)}
                  disabled={reactivateMutation.isPending}
                  style={styles.actionButton}
                />
                <IconButton
                  icon="restore"
                  size={24}
                  onPress={() => handleReactivate(item.id, true)}
                  disabled={reactivateMutation.isPending}
                  style={[styles.actionButton, styles.restorePrimaryButton]}
                />
              </>
            )}
          </View>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={PRIMARY_COLOR} />
      </View>
    );
  }

  return (
    <PaperProvider>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.header}>
          <SegmentedButtons
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
            buttons={[
              { value: 'active', label: 'Active' },
              { value: 'deleted', label: 'Deleted' },
            ]}
            style={styles.segmented}
          />
        </View>

        <FlatList
          data={avatars}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 16 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon
                name={viewMode === 'active' ? 'account-circle' : 'delete-empty'}
                size={64}
                color={TEXT_SECONDARY}
              />
              <Text variant="titleMedium" style={styles.emptyText}>
                {viewMode === 'active' ? 'No avatars yet' : 'No deleted avatars'}
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                {viewMode === 'active'
                  ? 'Upload your first avatar using the + button below.'
                  : 'Deleted avatars will appear here.'}
              </Text>
            </View>
          }
          refreshing={isLoading}
          onRefresh={refetch}
        />

        {viewMode === 'active' && (
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={handleUpload}
            loading={uploading}
            disabled={uploading}
          />
        )}

        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>Delete Avatar</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">
                Are you sure you want to delete this avatar?
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
              <Button onPress={confirmDelete} textColor={ERROR_COLOR}>
                Delete
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </SafeAreaView>
    </PaperProvider>
  );
}

// ---- Styles ----
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BACKGROUND_COLOR,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  segmented: {
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 12,
    backgroundColor: CARD_BACKGROUND,
    borderRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarImage: {
    marginRight: 12,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    marginRight: 12,
    backgroundColor: '#e0e0e0',
  },
  info: {
    flex: 1,
  },
  type: {
    fontWeight: '500',
    color: TEXT_PRIMARY,
  },
  date: {
    color: TEXT_SECONDARY,
    marginTop: 2,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryLabel: {
    marginLeft: 4,
    color: '#FFC107',
    fontWeight: 'bold',
  },
  deletedBadge: {
    marginTop: 4,
  },
  deletedLabel: {
    color: ERROR_COLOR,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    margin: 0,
  },
  restorePrimaryButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 20,
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: PRIMARY_COLOR,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    color: TEXT_PRIMARY,
  },
  emptySubtext: {
    marginTop: 8,
    color: TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});