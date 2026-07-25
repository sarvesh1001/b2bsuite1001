// src/navigation/navigationService.ts
import { NavigationContainerRef, CommonActions } from '@react-navigation/native';
import { RootStackParamList } from './index';
import { useAuthStore } from '../store/authStore';  // 👈 add this

let navigator: NavigationContainerRef<RootStackParamList> | null = null;
let pendingReset: (() => void) | null = null;

export function setTopLevelNavigator(
  ref: NavigationContainerRef<RootStackParamList> | null
) {
  navigator = ref;
  // If there was a pending reset, execute it now
  if (pendingReset) {
    pendingReset();
    pendingReset = null;
  }
}

export function resetToAuthScreen() {
  const performReset = () => {
    if (!navigator) return;

    // Get saved credentials from the store
    const { savedAdminId, savedPhone, savedHasMpin } = useAuthStore.getState();

    let routeName: keyof RootStackParamList = 'PhoneInput';
    let params: any = undefined;

    if (savedAdminId && savedPhone && savedHasMpin === true) {
      routeName = 'MPINVerification';
      params = { phone: savedPhone, adminId: savedAdminId };
    }
    // else PhoneInput (default)

    navigator.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: routeName, params }],
      })
    );
  };

  if (navigator) {
    performReset();
  } else {
    // Queue the reset until the navigator is ready
    pendingReset = performReset;
  }
}