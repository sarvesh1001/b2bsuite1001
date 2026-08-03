// apps/prayantra-b2b/src/navigation/navigationService.ts
import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './index';
import { useUserAuthStore } from '../store/userAuthStore';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingReset = false;

export function onNavigationReady() {
  if (pendingReset && navigationRef.isReady()) {
    pendingReset = false;
    resetToAuthScreen();
  }
}

export function resetToAuthScreen() {
  if (!navigationRef.isReady()) {
    pendingReset = true;
    return;
  }

  const { savedUserId, savedPhone, savedHasMpin } = useUserAuthStore.getState();

  let routeName: keyof RootStackParamList = 'PhoneInput';
  let params: any = undefined;

  if (savedUserId && savedPhone && savedHasMpin === true) {
    routeName = 'MPINVerification';
    params = { phone: savedPhone, userId: savedUserId };
  }

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: routeName, params }],
    })
  );
}