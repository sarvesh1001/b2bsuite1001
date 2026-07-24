// apps/mobile/src/components/GradientHeader.tsx
import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// The props that React Navigation passes to a custom header
interface HeaderProps {
  back?: {
    title?: string;
    href?: string;
  };
  navigation: any; // We only use goBack, so any is fine
  route: any;
  options: {
    title?: string;
    headerTitle?: string | ((props: any) => React.ReactNode); // can be a string or function
    headerShown?: boolean;
  };
}

export function GradientHeader({ back, navigation, route, options }: HeaderProps) {
  const insets = useSafeAreaInsets();
  // Resolve title: prefer options.title, then headerTitle if it's a string, else route.name
  const title =
    options?.title ||
    (typeof options?.headerTitle === 'string' ? options.headerTitle : '') ||
    route?.name ||
    '';

  return (
    <LinearGradient
      colors={['#00B4DB', '#7B2FBE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.header, { paddingTop: insets.top }]}
    >
      <View style={styles.container}>
        {back && (
          <TouchableOpacity onPress={navigation.goBack} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
  },
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});