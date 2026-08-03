import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'device_id';
const DEVICE_FINGERPRINT_KEY = 'device_fingerprint';
const DEVICE_SALT_KEY = 'device_salt';

/**
 * Get a persistent device ID.
 * Uses expo-device's osBuildId if available, else modelId, else generates a UUID.
 * The ID is stored securely and reused across app sessions.
 */
export async function getDeviceId(): Promise<string> {
  let deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!deviceId) {
    // Try to get a stable device identifier from expo-device
    deviceId = Device.osBuildId || Device.modelId || '';
    if (!deviceId) {
      // Last resort: generate a random UUID
      deviceId = generateUUID();
    }
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get a stable device fingerprint.
 * Combines device ID with a per-device salt and hashes it.
 */
export async function getDeviceFingerprint(): Promise<string> {
  let fingerprint = await SecureStore.getItemAsync(DEVICE_FINGERPRINT_KEY);
  if (!fingerprint) {
    const deviceId = await getDeviceId();
    let salt = await SecureStore.getItemAsync(DEVICE_SALT_KEY);
    if (!salt) {
      salt = generateUUID();
      await SecureStore.setItemAsync(DEVICE_SALT_KEY, salt);
    }
    const combined = deviceId + salt;
    fingerprint = simpleHash(combined);
    await SecureStore.setItemAsync(DEVICE_FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
}

/**
 * Generate a random UUID v4.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Simple hash for fingerprint (not cryptographic, but stable).
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}