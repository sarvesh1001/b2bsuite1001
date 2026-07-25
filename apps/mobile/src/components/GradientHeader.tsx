import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { StackHeaderRightProps } from '@react-navigation/stack';

interface HeaderProps {
  back?: {
    title?: string;
    href?: string;
  };
  navigation: any;
  route: any;
  options: {
    title?: string;
    headerTitle?: string | ((props: any) => React.ReactNode);
    headerShown?: boolean;
    headerRight?: (props: StackHeaderRightProps) => React.ReactNode;
  };
}

export function GradientHeader({ back, navigation, route, options }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const title =
    options?.title ||
    (typeof options?.headerTitle === 'string' ? options.headerTitle : '') ||
    route?.name ||
    '';

  // Get the right component, then ensure it's a valid element
  const rawRight = options?.headerRight ? options.headerRight({} as StackHeaderRightProps) : null;
  let rightComponent = rawRight;
  if (typeof rightComponent === 'string') {
    // Wrap string in a Text component
    rightComponent = <Text style={{ color: '#FFFFFF' }}>{rightComponent}</Text>;
  } else if (rightComponent && !React.isValidElement(rightComponent)) {
    // If it's something else (like number, boolean), wrap in Text
    rightComponent = <Text style={{ color: '#FFFFFF' }}>{String(rightComponent)}</Text>;
  }

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
        {rightComponent && <View style={styles.rightContainer}>{rightComponent}</View>}
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
    flex: 1, // pushes right content to the end
  },
  rightContainer: {
    marginLeft: 'auto',
  },
});