import React, { useState } from 'react';

import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  Text,
  Button,
  Dialog,
  Portal,
} from 'react-native-paper';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import * as ImagePicker from 'expo-image-picker';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

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

import {
  useUserAuthStore,
} from '../../../store/userAuthStore';

import {
  BACKGROUND_COLOR,
  CARD_BACKGROUND,
  PRIMARY_COLOR,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
  ERROR_COLOR,
  BORDER_COLOR,
} from '../../../constants/colors';


// =========================================================
// TYPES
// =========================================================

type ViewMode = 'active' | 'deleted';


// =========================================================
// SCREEN
// =========================================================

export default function AvatarManagementScreen() {

  const {
    accessToken,
    deviceId,
    companyId,
  } = useUserAuthStore();

  const queryClient = useQueryClient();

  const [uploading, setUploading] =
    useState(false);

  const [dialogVisible, setDialogVisible] =
    useState(false);

  const [selectedAvatarId, setSelectedAvatarId] =
    useState<string | null>(null);

  const [viewMode, setViewMode] =
    useState<ViewMode>('active');


  // =======================================================
  // AUTH CHECK
  // =======================================================

  if (
    !accessToken ||
    !deviceId ||
    !companyId
  ) {
    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.safeArea}
      >
        <View style={styles.stateScreen}>

          <View
            style={[
              styles.stateIcon,
              styles.authIcon,
            ]}
          >
            <Icon
              name="lock-outline"
              size={32}
              color={PRIMARY_COLOR}
            />
          </View>

          <Text style={styles.stateTitle}>
            Authentication Required
          </Text>

          <Text style={styles.stateDescription}>
            Please sign in again to manage your avatars.
          </Text>

        </View>
      </SafeAreaView>
    );
  }


  // =======================================================
  // ACTIVE AVATARS
  // =======================================================

  const {
    data: activeAvatars = [],
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useQuery({

    queryKey: [
      'myAvatars',
      'active',
    ],

    queryFn: async () => {

      const result =
        await listMyAvatars(
          deviceId,
          accessToken,
          companyId
        );

      return result;
    },

    enabled:
      !!accessToken &&
      !!deviceId &&
      !!companyId,
  });


  // =======================================================
  // INACTIVE AVATARS
  // =======================================================

  const {
    data: inactiveAvatars = [],
    isLoading: inactiveLoading,
    refetch: refetchInactive,
  } = useQuery({

    queryKey: [
      'myAvatars',
      'inactive',
    ],

    queryFn: async () => {

      const result =
        await listInactiveAvatars(
          deviceId,
          accessToken,
          companyId
        );

      return result;
    },

    enabled:
      !!accessToken &&
      !!deviceId &&
      !!companyId,
  });


  // =======================================================
  // CURRENT VIEW
  // =======================================================

  const isLoading =
    viewMode === 'active'
      ? activeLoading
      : inactiveLoading;

  const avatars =
    viewMode === 'active'
      ? activeAvatars
      : inactiveAvatars;

  const refetch =
    viewMode === 'active'
      ? refetchActive
      : refetchInactive;


  // =======================================================
  // SET PRIMARY
  // =======================================================

  const setPrimaryMutation =
    useMutation({

      mutationFn: ({
        avatarId,
        idempotencyKey,
      }: {
        avatarId: string;
        idempotencyKey: string;
      }) =>
        setAvatarPrimary(
          avatarId,
          deviceId,
          accessToken,
          idempotencyKey,
          companyId
        ),

      onSuccess: () => {

        queryClient.invalidateQueries({
          queryKey: ['myAvatars'],
        });

        Alert.alert(
          'Avatar Updated',
          'This avatar is now your primary avatar.'
        );
      },

      onError: (error: any) => {

        Alert.alert(
          'Unable to Update',
          error?.message ||
            'Failed to set primary avatar.'
        );
      },
    });


  // =======================================================
  // DELETE
  // =======================================================

  const deleteMutation =
    useMutation({

      mutationFn: ({
        avatarId,
        idempotencyKey,
      }: {
        avatarId: string;
        idempotencyKey: string;
      }) =>
        deleteAvatar(
          avatarId,
          deviceId,
          accessToken,
          idempotencyKey,
          companyId
        ),

      onSuccess: () => {

        queryClient.invalidateQueries({
          queryKey: ['myAvatars'],
        });

        setDialogVisible(false);

        setSelectedAvatarId(null);

        Alert.alert(
          'Avatar Deleted',
          'The avatar has been moved to deleted avatars.'
        );
      },

      onError: (error: any) => {

        Alert.alert(
          'Unable to Delete',
          error?.message ||
            'Failed to delete avatar.'
        );
      },
    });


  // =======================================================
  // REACTIVATE
  // =======================================================

  const reactivateMutation =
    useMutation({

      mutationFn: ({
        avatarId,
        idempotencyKey,
        setPrimary,
      }: {
        avatarId: string;
        idempotencyKey: string;
        setPrimary: boolean;
      }) =>
        reactivateAvatar(
          avatarId,
          deviceId,
          accessToken,
          idempotencyKey,
          companyId,
          setPrimary
        ),

      onSuccess: (_, variables) => {

        queryClient.invalidateQueries({
          queryKey: ['myAvatars'],
        });

        Alert.alert(
          'Avatar Restored',
          variables.setPrimary
            ? 'Avatar restored and set as primary.'
            : 'Avatar restored successfully.'
        );
      },

      onError: (error: any) => {

        Alert.alert(
          'Unable to Restore',
          error?.message ||
            'Failed to restore avatar.'
        );
      },
    });


  // =======================================================
  // UPLOAD
  // =======================================================

  const handleUpload = async () => {

    if (uploading) {
      return;
    }

    try {

      const permission =
        await ImagePicker
          .requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {

        Alert.alert(
          'Photo Access Required',
          'Please allow access to your photo library so you can choose an avatar.'
        );

        return;
      }


      const result =
        await ImagePicker.launchImageLibraryAsync({

          mediaTypes:
            ImagePicker
              .MediaTypeOptions
              .Images,

          allowsEditing: true,

          aspect: [1, 1],

          quality: 0.85,
        });


      if (
        result.canceled ||
        !result.assets ||
        result.assets.length === 0
      ) {
        return;
      }


      const asset =
        result.assets[0];

      setUploading(true);


      // ---------------------------------------------------
      // STEP 1
      // ---------------------------------------------------

      const mimeType =
        asset.mimeType ||
        'image/jpeg';

      const {
        uploadUrl,
        fileKey,
      } =
        await generateAvatarUploadUrl(
          mimeType,
          deviceId,
          accessToken,
          companyId
        );


      // ---------------------------------------------------
      // STEP 2
      // ---------------------------------------------------

      await uploadAvatarFile(
        uploadUrl,
        fileKey,
        asset.uri,
        asset.fileName ||
          'avatar.jpg',
        mimeType,
        accessToken,
        companyId
      );


      // ---------------------------------------------------
      // STEP 3
      // ---------------------------------------------------

      const idempotencyKey =
        `confirm-${Date.now()}`;

      await confirmAvatarUpload(
        fileKey,
        mimeType,
        true,
        deviceId,
        accessToken,
        idempotencyKey,
        companyId
      );


      // ---------------------------------------------------
      // STEP 4
      // ---------------------------------------------------

      await queryClient.invalidateQueries({
        queryKey: ['myAvatars'],
      });


      Alert.alert(
        'Avatar Added',
        'Your new avatar has been uploaded and set as primary.'
      );

    } catch (error: any) {

      Alert.alert(
        'Upload Failed',
        error?.message ||
          'Something went wrong while uploading your avatar.'
      );

    } finally {

      setUploading(false);
    }
  };


  // =======================================================
  // SET PRIMARY
  // =======================================================

  const handleSetPrimary =
    (avatarId: string) => {

      const idempotencyKey =
        `set-primary-${Date.now()}`;

      setPrimaryMutation.mutate({
        avatarId,
        idempotencyKey,
      });
    };


  // =======================================================
  // DELETE
  // =======================================================

  const handleDelete =
    (avatarId: string) => {

      setSelectedAvatarId(
        avatarId
      );

      setDialogVisible(true);
    };


  // =======================================================
  // CONFIRM DELETE
  // =======================================================

  const confirmDelete = () => {

    if (!selectedAvatarId) {
      return;
    }

    const idempotencyKey =
      `delete-${Date.now()}`;

    deleteMutation.mutate({
      avatarId:
        selectedAvatarId,
      idempotencyKey,
    });
  };


  // =======================================================
  // RESTORE
  // =======================================================

  const handleReactivate = (
    avatarId: string,
    setPrimary = false
  ) => {

    const idempotencyKey =
      `reactivate-${Date.now()}`;

    reactivateMutation.mutate({
      avatarId,
      idempotencyKey,
      setPrimary,
    });
  };


  // =======================================================
  // AVATAR CARD
  // =======================================================

  const renderItem = ({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => {

    const fullUrl =
      getAvatarUrl(
        item,
        'medium'
      );

    const isPrimary =
      item.isPrimary;

    const isActive =
      item.isActive;


    const avatarType =
      item.type
        ? item.type
            .charAt(0)
            .toUpperCase() +
          item.type.slice(1)
        : 'Avatar';


    const formattedDate =
      item.createdAt
        ? new Date(
            item.createdAt
          ).toLocaleDateString(
            undefined,
            {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            }
          )
        : 'Unknown date';


    return (
      <View style={styles.card}>

        {/* Accent */}

        <View
          style={[
            styles.cardAccent,
            {
              backgroundColor:
                isActive
                  ? PRIMARY_COLOR
                  : ERROR_COLOR,
            },
          ]}
        />


        <View style={styles.cardInner}>

          {/* Avatar */}

          <View style={styles.avatarContainer}>

            {fullUrl ? (

              <View
                style={[
                  styles.avatarRing,
                  isPrimary &&
                    styles.primaryAvatarRing,
                ]}
              >

                <View style={styles.avatarClip}>

                  <View
                    style={[
                      styles.avatarPlaceholder,
                    ]}
                  >

                    <Icon
                      name="account"
                      size={30}
                      color="#94A3B8"
                    />

                  </View>

                </View>

              </View>

            ) : (

              <View
                style={[
                  styles.avatarPlaceholder,
                  styles.avatarPlaceholderLarge,
                ]}
              >
                <Icon
                  name="account"
                  size={30}
                  color="#94A3B8"
                />
              </View>

            )}


            {/* Primary star */}

            {isPrimary && (
              <View
                style={styles.primaryStar}
              >
                <Icon
                  name="star"
                  size={12}
                  color="#FFFFFF"
                />
              </View>
            )}

          </View>


          {/* Information */}

          <View style={styles.info}>

            <View
              style={styles.titleRow}
            >

              <Text
                numberOfLines={1}
                style={styles.avatarType}
              >
                {avatarType}
              </Text>

              <Text
                style={styles.avatarNumber}
              >
                {String(index + 1).padStart(
                  2,
                  '0'
                )}
              </Text>

            </View>


            <View
              style={styles.dateRow}
            >

              <Icon
                name="calendar-outline"
                size={13}
                color={
                  TEXT_SECONDARY
                }
              />

              <Text
                style={styles.dateText}
              >
                Added {formattedDate}
              </Text>

            </View>


            {/* Status */}

            <View
              style={styles.statusRow}
            >

              {isActive && isPrimary && (

                <View
                  style={
                    styles.primaryBadge
                  }
                >

                  <Icon
                    name="star"
                    size={11}
                    color="#D97706"
                  />

                  <Text
                    style={
                      styles.primaryLabel
                    }
                  >
                    Primary
                  </Text>

                </View>

              )}


              {!isActive && (

                <View
                  style={
                    styles.deletedBadge
                  }
                >

                  <Icon
                    name="delete-outline"
                    size={12}
                    color="#DC2626"
                  />

                  <Text
                    style={
                      styles.deletedLabel
                    }
                  >
                    Deleted
                  </Text>

                </View>

              )}

            </View>

          </View>


          {/* Actions */}

          <View style={styles.actions}>

            {isActive ? (

              <>

                {!isPrimary && (

                  <TouchableOpacity
                    style={
                      styles.smallAction
                    }
                    onPress={() =>
                      handleSetPrimary(
                        item.id
                      )
                    }
                    disabled={
                      setPrimaryMutation
                        .isPending
                    }
                    activeOpacity={0.8}
                  >

                    {setPrimaryMutation.isPending ? (

                      <ActivityIndicator
                        size="small"
                        color={
                          PRIMARY_COLOR
                        }
                      />

                    ) : (

                      <Icon
                        name="star-outline"
                        size={19}
                        color={
                          PRIMARY_COLOR
                        }
                      />

                    )}

                  </TouchableOpacity>

                )}


                <TouchableOpacity
                  style={[
                    styles.smallAction,
                    styles.deleteAction,
                  ]}
                  onPress={() =>
                    handleDelete(
                      item.id
                    )
                  }
                  disabled={
                    deleteMutation
                      .isPending
                  }
                  activeOpacity={0.8}
                >

                  <Icon
                    name="delete-outline"
                    size={19}
                    color={ERROR_COLOR}
                  />

                </TouchableOpacity>

              </>

            ) : (

              <>

                <TouchableOpacity
                  style={
                    styles.restoreAction
                  }
                  onPress={() =>
                    handleReactivate(
                      item.id,
                      false
                    )
                  }
                  disabled={
                    reactivateMutation
                      .isPending
                  }
                  activeOpacity={0.8}
                >

                  <Icon
                    name="restore"
                    size={18}
                    color={
                      PRIMARY_COLOR
                    }
                  />

                  <Text
                    style={
                      styles.restoreText
                    }
                  >
                    Restore
                  </Text>

                </TouchableOpacity>


                <TouchableOpacity
                  style={
                    styles.restorePrimaryAction
                  }
                  onPress={() =>
                    handleReactivate(
                      item.id,
                      true
                    )
                  }
                  disabled={
                    reactivateMutation
                      .isPending
                  }
                  activeOpacity={0.8}
                >

                  <Icon
                    name="star-check-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                </TouchableOpacity>

              </>

            )}

          </View>

        </View>

      </View>
    );
  };


  // =======================================================
  // HEADER
  // =======================================================

  const ListHeader = () => {

    const count =
      avatars.length;

    return (
      <>

        {/* =================================================
            HEADER
        ================================================= */}

        <LinearGradient
          colors={[
            '#00B4DB',
            '#7B2FBE',
          ]}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={styles.hero}
        >

          <View
            style={styles.heroTop}
          >

            <View>

              <Text
                style={
                  styles.heroEyebrow
                }
              >
                PROFILE
              </Text>

              <Text
                style={styles.heroTitle}
              >
                My Avatars
              </Text>

              <Text
                style={
                  styles.heroSubtitle
                }
              >
                Manage your profile pictures
              </Text>

            </View>


            <View
              style={styles.heroIcon}
            >
              <Icon
                name="account-circle-outline"
                size={30}
                color="#FFFFFF"
              />
            </View>

          </View>


          {/* Stats */}

          <View
            style={styles.heroStats}
          >

            <View
              style={styles.heroStat}
            >

              <Text
                style={
                  styles.heroStatNumber
                }
              >
                {count}
              </Text>

              <Text
                style={
                  styles.heroStatLabel
                }
              >
                {viewMode === 'active'
                  ? 'Active'
                  : 'Deleted'}
              </Text>

            </View>


            <View
              style={styles.heroDivider}
            />


            <View
              style={styles.heroStat}
            >

              <View
                style={
                  styles.heroStatusDot
                }
              />

              <Text
                style={
                  styles.heroStatLabel
                }
              >
                Secure
              </Text>

            </View>

          </View>

        </LinearGradient>


        {/* =================================================
            TABS
        ================================================= */}

        <View
          style={styles.tabsContainer}
        >

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              setViewMode('active')
            }
            style={[
              styles.tab,
              viewMode === 'active' &&
                styles.activeTab,
            ]}
          >

            <Icon
              name="account-multiple-outline"
              size={17}
              color={
                viewMode === 'active'
                  ? PRIMARY_COLOR
                  : TEXT_SECONDARY
              }
            />

            <Text
              style={[
                styles.tabText,
                viewMode === 'active' &&
                  styles.activeTabText,
              ]}
            >
              Active
            </Text>

          </TouchableOpacity>


          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              setViewMode('deleted')
            }
            style={[
              styles.tab,
              viewMode === 'deleted' &&
                styles.activeTab,
            ]}
          >

            <Icon
              name="delete-outline"
              size={17}
              color={
                viewMode === 'deleted'
                  ? PRIMARY_COLOR
                  : TEXT_SECONDARY
              }
            />

            <Text
              style={[
                styles.tabText,
                viewMode === 'deleted' &&
                  styles.activeTabText,
              ]}
            >
              Deleted
            </Text>

          </TouchableOpacity>

        </View>


        {/* =================================================
            SECTION
        ================================================= */}

        <View
          style={styles.sectionHeader}
        >

          <View>

            <Text
              style={
                styles.sectionTitle
              }
            >
              {viewMode === 'active'
                ? 'Your Avatars'
                : 'Deleted Avatars'}
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              {viewMode === 'active'
                ? 'Choose your primary profile picture'
                : 'Restore an avatar whenever you need it'}
            </Text>

          </View>


          <View
            style={
              styles.countBadge
            }
          >

            <Text
              style={
                styles.countBadgeText
              }
            >
              {count}
            </Text>

          </View>

        </View>

      </>
    );
  };


  // =======================================================
  // LOADING
  // =======================================================

  if (isLoading) {

    return (
      <SafeAreaView
        edges={['top', 'bottom']}
        style={styles.safeArea}
      >

        <View
          style={
            styles.loadingScreen
          }
        >

          <View
            style={
              styles.loadingIcon
            }
          >
            <Icon
              name="account-circle-outline"
              size={30}
              color={PRIMARY_COLOR}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={PRIMARY_COLOR}
            style={{
              marginTop: 18,
            }}
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading avatars
          </Text>

          <Text
            style={
              styles.loadingSubtitle
            }
          >
            Preparing your profile pictures...
          </Text>

        </View>

      </SafeAreaView>
    );
  }


  // =======================================================
  // MAIN
  // =======================================================

  return (

    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >

      <FlatList

        data={avatars}

        keyExtractor={(item) =>
          item.id
        }

        renderItem={
          renderItem
        }

        ListHeaderComponent={
          <ListHeader />
        }

        contentContainerStyle={
          styles.listContent
        }

        showsVerticalScrollIndicator={
          false
        }

        refreshing={
          isLoading
        }

        onRefresh={
          refetch
        }

        ListEmptyComponent={

          <View
            style={
              styles.emptyContainer
            }
          >

            <View
              style={
                styles.emptyIcon
              }
            >

              <Icon
                name={
                  viewMode === 'active'
                    ? 'account-plus-outline'
                    : 'delete-empty-outline'
                }
                size={32}
                color={
                  PRIMARY_COLOR
                }
              />

            </View>


            <Text
              style={
                styles.emptyTitle
              }
            >
              {viewMode === 'active'
                ? 'No avatars yet'
                : 'No deleted avatars'}
            </Text>


            <Text
              style={
                styles.emptyDescription
              }
            >
              {viewMode === 'active'
                ? 'Upload your first profile picture using the button below.'
                : 'Deleted avatars will appear here when you remove one.'}
            </Text>


            {viewMode === 'active' && (

              <TouchableOpacity
                style={
                  styles.emptyUploadButton
                }
                onPress={
                  handleUpload
                }
                activeOpacity={0.85}
              >

                <Icon
                  name="camera-plus-outline"
                  size={18}
                  color="#FFFFFF"
                />

                <Text
                  style={
                    styles.emptyUploadText
                  }
                >
                  Upload Avatar
                </Text>

              </TouchableOpacity>

            )}

          </View>

        }

      />


      {/* =================================================
          UPLOAD BUTTON
      ================================================= */}

      {viewMode === 'active' && (

        <TouchableOpacity
          activeOpacity={0.9}
          disabled={uploading}
          onPress={
            handleUpload
          }
          style={
            styles.uploadButton
          }
        >

          <LinearGradient
            colors={[
              '#7B2FBE',
              '#6230A5',
            ]}
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 1,
            }}
            style={
              styles.uploadGradient
            }
          >

            {uploading ? (

              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

            ) : (

              <Icon
                name="camera-plus-outline"
                size={22}
                color="#FFFFFF"
              />

            )}

            <Text
              style={
                styles.uploadText
              }
            >
              {uploading
                ? 'Uploading...'
                : 'Add Avatar'}
            </Text>

          </LinearGradient>

        </TouchableOpacity>

      )}


      {/* =================================================
          DELETE DIALOG
      ================================================= */}

      <Portal>

        <Dialog
          visible={
            dialogVisible
          }
          onDismiss={() =>
            setDialogVisible(false)
          }
          style={
            styles.dialog
          }
        >

          <Dialog.Icon
            icon="delete-outline"
            color={ERROR_COLOR}
          />

          <Dialog.Title
            style={
              styles.dialogTitle
            }
          >
            Delete Avatar?
          </Dialog.Title>

          <Dialog.Content>

            <Text
              style={
                styles.dialogText
              }
            >
              This avatar will be moved to your
              deleted avatars. You can restore it
              later.
            </Text>

          </Dialog.Content>

          <Dialog.Actions>

            <Button
              onPress={() =>
                setDialogVisible(false)
              }
              textColor={
                TEXT_SECONDARY
              }
            >
              Cancel
            </Button>

            <Button
              onPress={
                confirmDelete
              }
              textColor={
                ERROR_COLOR
              }
              loading={
                deleteMutation.isPending
              }
            >
              Delete
            </Button>

          </Dialog.Actions>

        </Dialog>

      </Portal>

    </SafeAreaView>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  // =======================================================
  // PAGE
  // =======================================================

  safeArea: {
    flex: 1,
    backgroundColor:
      BACKGROUND_COLOR,
  },

  listContent: {
    paddingBottom: 105,
  },

  // =======================================================
  // HERO
  // =======================================================

  hero: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,

    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.12,

    shadowRadius: 12,

    elevation: 5,
  },

  heroTop: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  heroEyebrow: {
    color:
      'rgba(255,255,255,0.62)',

    fontSize: 9,

    fontWeight: '700',

    letterSpacing: 1.1,
  },

  heroTitle: {
    marginTop: 3,

    color: '#FFFFFF',

    fontSize: 26,

    fontWeight: '700',

    letterSpacing: -0.5,
  },

  heroSubtitle: {
    marginTop: 4,

    color:
      'rgba(255,255,255,0.70)',

    fontSize: 10,

    fontWeight: '500',
  },

  heroIcon: {
    width: 54,
    height: 54,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 16,

    backgroundColor:
      'rgba(255,255,255,0.13)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.18)',
  },

  heroStats: {
    marginTop: 18,

    flexDirection: 'row',

    alignItems: 'center',

    paddingVertical: 10,
    paddingHorizontal: 13,

    borderRadius: 13,

    backgroundColor:
      'rgba(255,255,255,0.11)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.13)',
  },

  heroStat: {
    flexDirection: 'row',

    alignItems: 'center',

    flex: 1,
  },

  heroStatNumber: {
    color: '#FFFFFF',

    fontSize: 18,

    fontWeight: '700',
  },

  heroStatLabel: {
    marginLeft: 7,

    color:
      'rgba(255,255,255,0.72)',

    fontSize: 10,

    fontWeight: '600',
  },

  heroDivider: {
    width: 1,
    height: 24,

    backgroundColor:
      'rgba(255,255,255,0.18)',

    marginHorizontal: 12,
  },

  heroStatusDot: {
    width: 8,
    height: 8,

    borderRadius: 4,

    backgroundColor: '#86EFAC',

    shadowColor: '#86EFAC',

    shadowOpacity: 0.5,

    shadowRadius: 4,
  },

  // =======================================================
  // TABS
  // =======================================================

  tabsContainer: {
    marginHorizontal: 20,

    marginTop: 18,

    padding: 4,

    flexDirection: 'row',

    borderRadius: 12,

    backgroundColor: '#EEF1F5',

    borderWidth: 1,

    borderColor: '#E2E7ED',
  },

  tab: {
    flex: 1,

    minHeight: 40,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 6,

    borderRadius: 9,
  },

  activeTab: {
    backgroundColor:
      CARD_BACKGROUND,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.05,

    shadowRadius: 5,

    elevation: 1,
  },

  tabText: {
    color:
      TEXT_SECONDARY,

    fontSize: 11,

    fontWeight: '600',
  },

  activeTabText: {
    color:
      PRIMARY_COLOR,

    fontWeight: '700',
  },

  // =======================================================
  // SECTION
  // =======================================================

  sectionHeader: {
    marginHorizontal: 20,

    marginTop: 23,

    marginBottom: 13,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  sectionTitle: {
    color:
      TEXT_PRIMARY,

    fontSize: 17,

    fontWeight: '700',
  },

  sectionSubtitle: {
    marginTop: 3,

    color:
      TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  countBadge: {
    minWidth: 29,
    height: 29,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 7,

    borderRadius: 9,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  countBadgeText: {
    color:
      PRIMARY_COLOR,

    fontSize: 11,

    fontWeight: '700',
  },

  // =======================================================
  // CARD
  // =======================================================

  card: {
    position: 'relative',

    marginHorizontal: 20,

    marginBottom: 12,

    overflow: 'hidden',

    borderRadius: 16,

    backgroundColor:
      CARD_BACKGROUND,

    borderWidth: 1,

    borderColor:
      BORDER_COLOR,

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.045,

    shadowRadius: 8,

    elevation: 2,
  },

  cardAccent: {
    position: 'absolute',

    top: 0,
    left: 0,
    bottom: 0,

    width: 3,
  },

  cardInner: {
    minHeight: 102,

    padding: 14,

    paddingLeft: 17,

    flexDirection: 'row',

    alignItems: 'center',
  },

  // =======================================================
  // AVATAR
  // =======================================================

  avatarContainer: {
    position: 'relative',

    marginRight: 13,
  },

  avatarRing: {
    width: 64,
    height: 64,

    padding: 2,

    borderRadius: 32,

    backgroundColor:
      '#E8ECF2',
  },

  primaryAvatarRing: {
    backgroundColor:
      PRIMARY_COLOR,
  },

  avatarClip: {
    flex: 1,

    overflow: 'hidden',

    borderRadius: 30,

    backgroundColor:
      '#F1F5F9',
  },

  avatarPlaceholder: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      '#F1F5F9',
  },

  avatarPlaceholderLarge: {
    width: 64,
    height: 64,

    borderRadius: 32,
  },

  primaryStar: {
    position: 'absolute',

    right: -2,
    bottom: -1,

    width: 23,
    height: 23,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 12,

    backgroundColor:
      '#F59E0B',

    borderWidth: 2,

    borderColor:
      CARD_BACKGROUND,
  },

  // =======================================================
  // INFO
  // =======================================================

  info: {
    flex: 1,

    minWidth: 0,
  },

  titleRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent:
      'space-between',
  },

  avatarType: {
    flex: 1,

    color:
      TEXT_PRIMARY,

    fontSize: 14,

    fontWeight: '700',
  },

  avatarNumber: {
    marginLeft: 5,

    color:
      '#CBD5E1',

    fontSize: 9,

    fontWeight: '800',

    letterSpacing: 0.5,
  },

  dateRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 6,

    gap: 4,
  },

  dateText: {
    color:
      TEXT_SECONDARY,

    fontSize: 9,

    fontWeight: '500',
  },

  statusRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 7,
  },

  primaryBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 7,
    paddingVertical: 4,

    borderRadius: 6,

    backgroundColor:
      '#FFF7E6',
  },

  primaryLabel: {
    marginLeft: 4,

    color: '#B45309',

    fontSize: 8,

    fontWeight: '700',
  },

  deletedBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 7,
    paddingVertical: 4,

    borderRadius: 6,

    backgroundColor:
      '#FEF2F2',
  },

  deletedLabel: {
    marginLeft: 4,

    color: '#DC2626',

    fontSize: 8,

    fontWeight: '700',
  },

  // =======================================================
  // ACTIONS
  // =======================================================

  actions: {
    marginLeft: 8,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,
  },

  smallAction: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  deleteAction: {
    backgroundColor:
      '#FEF2F2',
  },

  restoreAction: {
    height: 38,

    paddingHorizontal: 10,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

    borderRadius: 10,

    backgroundColor:
      `${PRIMARY_COLOR}10`,
  },

  restoreText: {
    color:
      PRIMARY_COLOR,

    fontSize: 9,

    fontWeight: '700',
  },

  restorePrimaryAction: {
    width: 38,
    height: 38,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 10,

    backgroundColor:
      PRIMARY_COLOR,
  },

  // =======================================================
  // UPLOAD BUTTON
  // =======================================================

  uploadButton: {
    position: 'absolute',

    left: 20,
    right: 20,
    bottom: 17,

    borderRadius: 16,

    overflow: 'hidden',

    shadowColor:
      '#5B2A97',

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.25,

    shadowRadius: 12,

    elevation: 8,
  },

  uploadGradient: {
    height: 56,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,
  },

  uploadText: {
    color: '#FFFFFF',

    fontSize: 13,

    fontWeight: '700',
  },

  // =======================================================
  // EMPTY
  // =======================================================

  emptyContainer: {
    marginHorizontal: 20,

    marginTop: 15,

    paddingVertical: 48,
    paddingHorizontal: 24,

    alignItems: 'center',

    borderRadius: 16,

    borderWidth: 1,

    borderStyle: 'dashed',

    borderColor:
      '#DCE2EA',

    backgroundColor:
      'rgba(255,255,255,0.65)',
  },

  emptyIcon: {
    width: 68,
    height: 68,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  emptyTitle: {
    marginTop: 16,

    color:
      TEXT_PRIMARY,

    fontSize: 17,

    fontWeight: '700',
  },

  emptyDescription: {
    marginTop: 7,

    maxWidth: 300,

    color:
      TEXT_SECONDARY,

    fontSize: 10,

    lineHeight: 16,

    textAlign: 'center',
  },

  emptyUploadButton: {
    marginTop: 19,

    paddingHorizontal: 15,
    paddingVertical: 10,

    flexDirection: 'row',

    alignItems: 'center',

    gap: 7,

    borderRadius: 9,

    backgroundColor:
      PRIMARY_COLOR,
  },

  emptyUploadText: {
    color: '#FFFFFF',

    fontSize: 10,

    fontWeight: '700',
  },

  // =======================================================
  // LOADING
  // =======================================================

  loadingScreen: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  loadingIcon: {
    width: 68,
    height: 68,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 19,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  loadingTitle: {
    marginTop: 14,

    color:
      TEXT_PRIMARY,

    fontSize: 17,

    fontWeight: '700',
  },

  loadingSubtitle: {
    marginTop: 5,

    color:
      TEXT_SECONDARY,

    fontSize: 10,
  },

  // =======================================================
  // STATES
  // =======================================================

  stateScreen: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  stateIcon: {
    width: 72,
    height: 72,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 20,
  },

  authIcon: {
    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  stateTitle: {
    marginTop: 20,

    color:
      TEXT_PRIMARY,

    fontSize: 20,

    fontWeight: '700',

    textAlign: 'center',
  },

  stateDescription: {
    marginTop: 8,

    maxWidth: 320,

    color:
      TEXT_SECONDARY,

    fontSize: 12,

    lineHeight: 18,

    textAlign: 'center',
  },

  // =======================================================
  // DIALOG
  // =======================================================

  dialog: {
    borderRadius: 18,

    backgroundColor:
      CARD_BACKGROUND,
  },

  dialogTitle: {
    color:
      TEXT_PRIMARY,

    fontWeight: '700',
  },

  dialogText: {
    color:
      TEXT_SECONDARY,

    fontSize: 13,

    lineHeight: 20,
  },
});