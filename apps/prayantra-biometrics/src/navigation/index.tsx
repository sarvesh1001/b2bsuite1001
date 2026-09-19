import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { useDevice } from '../hooks/useDevice';
import { RootStackParamList, MainTabParamList } from './types';

import SettingsScreen from '../screens/SettingsScreen';
import CameraScreen from '../screens/CameraScreen';
import HistoryScreen from '../screens/HistoryScreen';
import EmployeeListScreen from '../screens/EmployeeListScreen';
import EnrollmentScreen from '../screens/EnrollmentScreen';
import SyncStatusScreen from '../screens/SyncStatusScreen';
import ThirdPartyNotices from '../screens/ThirdPartyNotices';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName = '';
          if (route.name === 'Camera') iconName = 'camera';
          else if (route.name === 'History') iconName = 'history';
          else if (route.name === 'Employees') iconName = 'account-group';
          else if (route.name === 'Settings') iconName = 'cog';
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#7B2FBE',
        tabBarInactiveTintColor: '#94A3B8',
      })}
    >
      <Tab.Screen name="Camera" component={CameraScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Employees" component={EmployeeListScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { isConfigured } = useDevice();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isConfigured ? (
        <Stack.Screen name="Settings" component={SettingsScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Enrollment"
            component={EnrollmentScreen}
            options={{ headerShown: true, title: 'Enroll Employee' }}
          />
          <Stack.Screen
            name="SyncStatus"
            component={SyncStatusScreen}
            options={{ headerShown: true, title: 'Sync Status' }}
          />
          <Stack.Screen
            name="ThirdPartyNotices"
            component={ThirdPartyNotices}
            options={{ headerShown: true, title: 'Third‑Party Notices' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}