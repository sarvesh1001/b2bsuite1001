import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingReset = false;

export function onNavigationReady() {
  if (pendingReset && navigationRef.isReady()) {
    pendingReset = false;
    resetToSettings();
  }
}

export function resetToSettings() {
  if (!navigationRef.isReady()) {
    pendingReset = true;
    return;
  }

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Settings' }],
    })
  );
}

export function resetToCamera() {
  if (!navigationRef.isReady()) {
    pendingReset = true;
    return;
  }

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Camera' }],
    })
  );
}

export function navigateTo<RouteName extends keyof RootStackParamList>(
  name: RouteName,
  params?: RootStackParamList[RouteName]
) {
  if (navigationRef.isReady()) {
    // Use a type assertion to work around strict overload matching
    (navigationRef as any).navigate(name, params);
  }
}