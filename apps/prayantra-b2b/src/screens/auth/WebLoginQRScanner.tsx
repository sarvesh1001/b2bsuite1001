import React, { useEffect, useState } from 'react';

import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  CameraView,
  useCameraPermissions,
} from 'expo-camera';

import {
  useNavigation,
} from '@react-navigation/native';

import {
  StackNavigationProp,
} from '@react-navigation/stack';

import {
  RootStackParamList,
} from '../../navigation';

import {
  pairWebSession,
} from '../../services/auth';

import {
  useUserAuthStore,
} from '../../store/userAuthStore';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import * as Base64 from 'base-64';

import {
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  GRADIENT_COLORS,
  GRADIENT_START,
  GRADIENT_END,
} from '../../constants/colors';

import {
  LinearGradient,
} from 'expo-linear-gradient';

// =========================================================
// TYPES
// =========================================================

type NavigationProp =
  StackNavigationProp<
    RootStackParamList,
    'QRScanner'
  >;

// =========================================================
// SCREEN
// =========================================================

export default function WebLoginQRScanner() {
  const navigation =
    useNavigation<NavigationProp>();

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [
    scanning,
    setScanning,
  ] = useState(false);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    torch,
    setTorch,
  ] = useState(false);

  const [
    facing,
    setFacing,
  ] = useState<'back' | 'front'>('back');

  const {
    accessToken,
  } = useUserAuthStore();

  // =======================================================
  // REQUEST CAMERA PERMISSION
  // =======================================================

  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain
    ) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // =======================================================
  // CHECK AUTH
  // =======================================================

  useEffect(() => {
    if (!accessToken) {
      Alert.alert(
        'Not Logged In',
        'You need to be logged in to pair a web session.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.goBack(),
          },
        ]
      );
    }
  }, [
    accessToken,
    navigation,
  ]);

  // =======================================================
  // QR HANDLER
  // =======================================================

  const handleBarcodeScanned =
    async ({
      data,
    }: {
      data: string;
    }) => {
      if (
        scanning ||
        processing ||
        !accessToken
      ) {
        return;
      }

      setScanning(true);

      console.log(
        '📱 [QR] Raw scanned data:',
        data
      );

      console.log(
        '📱 [QR] Data type:',
        typeof data
      );

      console.log(
        '📱 [QR] Data length:',
        data.length
      );

      try {
        // =================================================
        // PARSE QR
        // =================================================

        const qrPayload =
          JSON.parse(data);

        console.log(
          '📱 [QR] Parsed payload:',
          JSON.stringify(
            qrPayload,
            null,
            2
          )
        );

        console.log(
          '📱 [QR] Available keys:',
          Object.keys(qrPayload)
        );

        // =================================================
        // SESSION ID
        // =================================================

        const session_id =
          qrPayload.sid;

        if (!session_id) {
          console.warn(
            '⚠️ Missing "sid" in QR payload'
          );

          Alert.alert(
            'Invalid QR Code',
            'This QR code does not contain a valid web session.',
            [
              {
                text: 'Scan Again',
                onPress: () =>
                  setScanning(false),
              },
            ]
          );

          return;
        }

        // =================================================
        // RE-ENCODE ORIGINAL JSON
        // =================================================

        const signature =
          Base64.encode(data);

        console.log(
          '📱 [QR] Re-encoded base64 signature:',
          signature.substring(
            0,
            50
          ) + '...'
        );

        console.log(
          '📱 [QR] Signature length:',
          signature.length
        );

        // =================================================
        // PAIR
        // =================================================

        setProcessing(true);

        console.log(
          '📱 [QR] Pairing with session:',
          session_id
        );

        await pairWebSession(
          session_id,
          signature,
          accessToken
        );

        // =================================================
        // SUCCESS
        // =================================================

        Alert.alert(
          'Web Login Successful',
          'Your web session has been paired successfully. You can now continue on your computer.',
          [
            {
              text: 'Done',
              onPress: () =>
                navigation.goBack(),
            },
          ]
        );
      } catch (error: any) {
        console.error(
          '❌ [QR] Error processing QR:',
          error
        );

        const message =
          error?.response?.data?.message ||
          error?.message ||
          'Unable to pair the web session. Please try again.';

        Alert.alert(
          'Pairing Failed',
          message,
          [
            {
              text: 'Try Again',
              onPress: () =>
                setScanning(false),
            },
          ]
        );
      } finally {
        setProcessing(false);
        setScanning(false);
      }
    };

  // =======================================================
  // PERMISSION LOADING
  // =======================================================

  if (!permission) {
    return (
      <SafeAreaView
        edges={[
          'top',
          'bottom',
        ]}
        style={styles.permissionScreen}
      >
        <View style={styles.permissionContent}>

          <View
            style={styles.permissionIcon}
          >
            <Icon
              name="camera-outline"
              size={34}
              color={PRIMARY_COLOR}
            />
          </View>

          <Text
            style={styles.permissionTitle}
          >
            Camera Access
          </Text>

          <Text
            style={styles.permissionDescription}
          >
            Checking camera permissions...
          </Text>

          <ActivityIndicator
            color={PRIMARY_COLOR}
            style={{
              marginTop: 20,
            }}
          />

        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // PERMISSION DENIED
  // =======================================================

  if (!permission.granted) {
    return (
      <SafeAreaView
        edges={[
          'top',
          'bottom',
        ]}
        style={styles.permissionScreen}
      >

        <View style={styles.permissionContent}>

          <View
            style={[
              styles.permissionIcon,
              styles.permissionIconError,
            ]}
          >
            <Icon
              name="camera-off-outline"
              size={34}
              color="#EF4444"
            />
          </View>

          <Text
            style={styles.permissionTitle}
          >
            Camera Permission Required
          </Text>

          <Text
            style={styles.permissionDescription}
          >
            Prayantra needs access to your camera
            to securely scan the QR code shown on
            your computer.
          </Text>

          {permission.canAskAgain && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={requestPermission}
              style={styles.permissionButton}
            >
              <Icon
                name="camera-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.permissionButtonText
                }
              >
                Allow Camera Access
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              navigation.goBack()
            }
            style={styles.secondaryButton}
          >
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Go Back
            </Text>
          </TouchableOpacity>

        </View>

      </SafeAreaView>
    );
  }

  // =======================================================
  // MAIN CAMERA
  // =======================================================

  return (
    <View style={styles.container}>

      {/* =================================================
          CAMERA
      ================================================= */}

      <CameraView
        style={styles.camera}
        facing={facing}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={
          handleBarcodeScanned
        }
      >

        {/* =================================================
            DARK OVERLAY
        ================================================= */}

        <View
          style={
            styles.cameraOverlay
          }
        >

          {/* =================================================
              TOP HEADER
          ================================================= */}

          <SafeAreaView
            edges={['top']}
            style={styles.topSafeArea}
          >

            <View
              style={styles.topHeader}
            >

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  navigation.goBack()
                }
                style={
                  styles.headerIconButton
                }
              >
                <Icon
                  name="arrow-left"
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <View
                style={
                  styles.headerTitleContainer
                }
              >

                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  Scan QR Code
                </Text>

                <View
                  style={
                    styles.secureBadge
                  }
                >
                  <View
                    style={
                      styles.secureDot
                    }
                  />

                  <Text
                    style={
                      styles.secureText
                    }
                  >
                    Secure
                  </Text>
                </View>

              </View>

              <View
                style={
                  styles.headerPlaceholder
                }
              />

            </View>

          </SafeAreaView>

          {/* =================================================
              SCANNER CONTENT
          ================================================= */}

          <View
            style={
              styles.scannerContent
            }
          >

            <Text
              style={
                styles.scannerTitle
              }
            >
              Connect your computer
            </Text>

            <Text
              style={
                styles.scannerSubtitle
              }
            >
              Scan the QR code displayed on
              your Prayantra web login screen.
            </Text>

            {/* =================================================
                SCANNER FRAME
            ================================================= */}

            <View
              style={
                styles.scannerFrameContainer
              }
            >

              <View
                style={
                  styles.scannerFrame
                }
              >

                {/* Top left */}

                <View
                  style={[
                    styles.corner,
                    styles.cornerTopLeft,
                  ]}
                />

                {/* Top right */}

                <View
                  style={[
                    styles.corner,
                    styles.cornerTopRight,
                  ]}
                />

                {/* Bottom left */}

                <View
                  style={[
                    styles.corner,
                    styles.cornerBottomLeft,
                  ]}
                />

                {/* Bottom right */}

                <View
                  style={[
                    styles.corner,
                    styles.cornerBottomRight,
                  ]}
                />

                {/* Scan line */}

                {!processing && (
                  <View
                    style={
                      styles.scanLine
                    }
                  />
                )}

              </View>

            </View>

            <View
              style={
                styles.scanHintContainer
              }
            >

              <Icon
                name="qrcode"
                size={17}
                color="rgba(255,255,255,0.7)"
              />

              <Text
                style={
                  styles.scanHint
                }
              >
                Keep the QR code inside the frame
              </Text>

            </View>

          </View>

          {/* =================================================
              BOTTOM CONTROLS
          ================================================= */}

          <SafeAreaView
            edges={['bottom']}
            style={
              styles.bottomSafeArea
            }
          >

            <View
              style={
                styles.bottomControls
              }
            >

              {/* Camera flip */}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  setFacing(
                    current =>
                      current ===
                      'back'
                        ? 'front'
                        : 'back'
                  )
                }
                style={
                  styles.controlButton
                }
              >

                <View
                  style={
                    styles.controlIcon
                  }
                >
                  <Icon
                    name="camera-flip-outline"
                    size={21}
                    color="#FFFFFF"
                  />
                </View>

                <Text
                  style={
                    styles.controlText
                  }
                >
                  Flip
                </Text>

              </TouchableOpacity>

              {/* Center secure status */}

              <View
                style={
                  styles.securityStatus
                }
              >

                <Icon
                  name="shield-check-outline"
                  size={19}
                  color="#86EFAC"
                />

                <Text
                  style={
                    styles.securityText
                  }
                >
                  Encrypted pairing
                </Text>

              </View>

              {/* Torch */}

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  setTorch(
                    current => !current
                  )
                }
                style={
                  styles.controlButton
                }
              >

                <View
                  style={[
                    styles.controlIcon,
                    torch &&
                      styles.controlIconActive,
                  ]}
                >
                  <Icon
                    name={
                      torch
                        ? 'flashlight'
                        : 'flashlight-off'
                    }
                    size={21}
                    color="#FFFFFF"
                  />
                </View>

                <Text
                  style={
                    styles.controlText
                  }
                >
                  {torch
                    ? 'On'
                    : 'Flash'}
                </Text>

              </TouchableOpacity>

            </View>

          </SafeAreaView>

          {/* =================================================
              PROCESSING OVERLAY
          ================================================= */}

          {processing && (
            <View
              style={
                styles.processingOverlay
              }
            >

              <View
                style={
                  styles.processingCard
                }
              >

                <View
                  style={
                    styles.processingIcon
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      PRIMARY_COLOR
                    }
                  />
                </View>

                <Text
                  style={
                    styles.processingTitle
                  }
                >
                  Pairing securely
                </Text>

                <Text
                  style={
                    styles.processingDescription
                  }
                >
                  Connecting your mobile device
                  with the web session...
                </Text>

              </View>

            </View>
          )}

        </View>

      </CameraView>

    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({

  // =======================================================
  // CAMERA
  // =======================================================

  container: {
    flex: 1,

    backgroundColor: '#050507',
  },

  camera: {
    flex: 1,
  },

  cameraOverlay: {
    flex: 1,

    backgroundColor:
      'rgba(0,0,0,0.38)',

    justifyContent:
      'space-between',
  },

  topSafeArea: {
    width: '100%',
  },

  // =======================================================
  // HEADER
  // =======================================================

  topHeader: {
    height: 62,

    paddingHorizontal: 18,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerIconButton: {
    width: 42,
    height: 42,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,

    backgroundColor:
      'rgba(0,0,0,0.32)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.14)',
  },

  headerTitleContainer: {
    alignItems: 'center',
  },

  headerTitle: {
    color: '#FFFFFF',

    fontSize: 17,

    fontWeight: '700',
  },

  secureBadge: {
    marginTop: 5,

    paddingHorizontal: 8,
    paddingVertical: 3,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 20,

    backgroundColor:
      'rgba(255,255,255,0.11)',
  },

  secureDot: {
    width: 5,
    height: 5,

    marginRight: 5,

    borderRadius: 3,

    backgroundColor: '#86EFAC',
  },

  secureText: {
    color:
      'rgba(255,255,255,0.72)',

    fontSize: 8,

    fontWeight: '600',
  },

  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  // =======================================================
  // SCANNER CONTENT
  // =======================================================

  scannerContent: {
    alignItems: 'center',

    justifyContent: 'center',

    flex: 1,

    paddingHorizontal: 25,
  },

  scannerTitle: {
    color: '#FFFFFF',

    fontSize: 23,

    lineHeight: 29,

    fontWeight: '700',

    textAlign: 'center',
  },

  scannerSubtitle: {
    maxWidth: 315,

    marginTop: 8,

    color:
      'rgba(255,255,255,0.68)',

    fontSize: 11,

    lineHeight: 17,

    fontWeight: '500',

    textAlign: 'center',
  },

  // =======================================================
  // SCANNER FRAME
  // =======================================================

  scannerFrameContainer: {
    marginTop: 30,

    width: '82%',

    aspectRatio: 1,

    maxWidth: 315,
    maxHeight: 315,

    alignItems: 'center',
    justifyContent: 'center',
  },

  scannerFrame: {
    width: '100%',
    height: '100%',

    position: 'relative',

    borderRadius: 22,
  },

  // =======================================================
  // CORNERS
  // =======================================================

  corner: {
    position: 'absolute',

    width: 48,
    height: 48,

    borderColor: '#FFFFFF',
  },

  cornerTopLeft: {
    top: 0,
    left: 0,

    borderTopWidth: 4,
    borderLeftWidth: 4,

    borderTopLeftRadius: 17,
  },

  cornerTopRight: {
    top: 0,
    right: 0,

    borderTopWidth: 4,
    borderRightWidth: 4,

    borderTopRightRadius: 17,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,

    borderBottomWidth: 4,
    borderLeftWidth: 4,

    borderBottomLeftRadius: 17,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,

    borderBottomWidth: 4,
    borderRightWidth: 4,

    borderBottomRightRadius: 17,
  },

  // =======================================================
  // SCAN LINE
  // =======================================================

  scanLine: {
    position: 'absolute',

    top: '50%',

    left: 12,
    right: 12,

    height: 2,

    backgroundColor:
      '#A855F7',

    shadowColor:
      '#A855F7',

    shadowOffset: {
      width: 0,
      height: 0,
    },

    shadowOpacity: 0.9,

    shadowRadius: 7,

    elevation: 5,
  },

  // =======================================================
  // SCAN HINT
  // =======================================================

  scanHintContainer: {
    marginTop: 18,

    paddingHorizontal: 13,
    paddingVertical: 8,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 20,

    backgroundColor:
      'rgba(0,0,0,0.28)',
  },

  scanHint: {
    marginLeft: 6,

    color:
      'rgba(255,255,255,0.7)',

    fontSize: 10,

    fontWeight: '500',
  },

  // =======================================================
  // BOTTOM
  // =======================================================

  bottomSafeArea: {
    width: '100%',
  },

  bottomControls: {
    minHeight: 76,

    paddingHorizontal: 28,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  controlButton: {
    width: 55,

    alignItems: 'center',
    justifyContent: 'center',
  },

  controlIcon: {
    width: 42,
    height: 42,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 13,

    backgroundColor:
      'rgba(0,0,0,0.32)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.14)',
  },

  controlIconActive: {
    backgroundColor:
      'rgba(123,47,190,0.55)',

    borderColor:
      'rgba(255,255,255,0.25)',
  },

  controlText: {
    marginTop: 5,

    color:
      'rgba(255,255,255,0.72)',

    fontSize: 8,

    fontWeight: '600',
  },

  // =======================================================
  // SECURITY STATUS
  // =======================================================

  securityStatus: {
    paddingHorizontal: 12,
    paddingVertical: 8,

    flexDirection: 'row',
    alignItems: 'center',

    borderRadius: 20,

    backgroundColor:
      'rgba(0,0,0,0.30)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.10)',
  },

  securityText: {
    marginLeft: 6,

    color:
      'rgba(255,255,255,0.7)',

    fontSize: 9,

    fontWeight: '600',
  },

  // =======================================================
  // PROCESSING
  // =======================================================

  processingOverlay: {
    ...StyleSheet.absoluteFill, // <-- FIXED: replaced absoluteFillObject

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(0,0,0,0.60)',
  },

  processingCard: {
    width: '78%',

    paddingHorizontal: 22,
    paddingVertical: 25,

    alignItems: 'center',

    borderRadius: 19,

    backgroundColor:
      'rgba(255,255,255,0.97)',

    shadowColor: '#000',

    shadowOffset: {
      width: 0,
      height: 8,
    },

    shadowOpacity: 0.25,

    shadowRadius: 20,

    elevation: 10,
  },

  processingIcon: {
    width: 52,
    height: 52,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 15,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  processingTitle: {
    marginTop: 15,

    color: '#172033',

    fontSize: 17,

    fontWeight: '700',
  },

  processingDescription: {
    maxWidth: 240,

    marginTop: 6,

    color: '#64748B',

    fontSize: 10,

    lineHeight: 15,

    textAlign: 'center',
  },

  // =======================================================
  // PERMISSION SCREEN
  // =======================================================

  permissionScreen: {
    flex: 1,

    backgroundColor: '#F7F9FC',
  },

  permissionContent: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,
  },

  permissionIcon: {
    width: 76,
    height: 76,

    alignItems: 'center',
    justifyContent: 'center',

    borderRadius: 21,

    backgroundColor:
      `${PRIMARY_COLOR}12`,
  },

  permissionIconError: {
    backgroundColor: '#FEF2F2',
  },

  permissionTitle: {
    marginTop: 20,

    color: '#172033',

    fontSize: 21,

    fontWeight: '700',

    textAlign: 'center',
  },

  permissionDescription: {
    maxWidth: 340,

    marginTop: 9,

    color: '#64748B',

    fontSize: 12,

    lineHeight: 19,

    fontWeight: '500',

    textAlign: 'center',
  },

  permissionButton: {
    marginTop: 24,

    minHeight: 46,

    paddingHorizontal: 19,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,

    borderRadius: 11,

    backgroundColor:
      PRIMARY_COLOR,

    shadowColor:
      PRIMARY_COLOR,

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.20,

    shadowRadius: 10,

    elevation: 4,
  },

  permissionButtonText: {
    color: '#FFFFFF',

    fontSize: 12,

    fontWeight: '700',
  },

  secondaryButton: {
    marginTop: 12,

    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  secondaryButtonText: {
    color: '#64748B',

    fontSize: 11,

    fontWeight: '600',
  },
});