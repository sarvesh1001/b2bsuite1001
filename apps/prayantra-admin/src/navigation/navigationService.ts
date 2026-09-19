// src/navigation/navigationService.ts
import {
  CommonActions,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { RootStackParamList } from './index';
import { useAuthStore } from '../store/authStore';

// Use the official ref creator – no more custom navigator variable
export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

// Queue flag: true means a reset is waiting for the navigator to become ready
let pendingReset = false;

/**
 * Call this from <NavigationContainer onReady={onNavigationReady}>
 * It will execute any queued reset once the navigator is fully initialised.
 */
export function onNavigationReady() {
  if (pendingReset && navigationRef.isReady()) {
    pendingReset = false;
    resetToAuthScreen();
  }
}

/**
 * Reset the navigation stack to the appropriate auth screen.
 * If the navigator isn't ready yet, the reset is queued and executed
 * when onNavigationReady fires.
 */
export function resetToAuthScreen() {
  // If navigator not ready, queue the reset
  if (!navigationRef.isReady()) {
    pendingReset = true;
    return;
  }

  const { savedAdminId, savedPhone, savedHasMpin } = useAuthStore.getState();

  let routeName: keyof RootStackParamList = 'PhoneInput';
  let params: any = undefined;

  if (savedAdminId && savedPhone && savedHasMpin === true) {
    routeName = 'MPINVerification';
    params = { phone: savedPhone, adminId: savedAdminId };
  }

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName, params }],
    })
  );
}