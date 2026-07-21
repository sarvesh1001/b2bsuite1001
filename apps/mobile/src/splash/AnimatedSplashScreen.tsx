import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

interface AnimatedSplashProps {
  onFinish: () => void;
}

export const AnimatedSplash = ({ onFinish }: AnimatedSplashProps) => {
  const { width } = useWindowDimensions();

  const titleSize = Math.min(width * 0.12, 56);
  const taglineSize = Math.max(14, width * 0.038);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    scale.value = withTiming(1, {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });

    taglineOpacity.value = withDelay(
      350,
      withTiming(1, {
        duration: 500,
      })
    );

    const timer = setTimeout(() => {
      onFinish();
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <MaskedView
            maskElement={
              <Text
                style={[
                  styles.title,
                  {
                    fontSize: titleSize,
                    letterSpacing: titleSize * 0.10,
                  },
                ]}
              >
                PRAYANTRA
              </Text>
            }
          >
            <LinearGradient
              colors={['#00B4DB', '#7B2FBE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Text
                style={[
                  styles.title,
                  {
                    opacity: 0,
                    fontSize: titleSize,
                    letterSpacing: titleSize * 0.10,
                  },
                ]}
              >
                PRAYANTRA
              </Text>
            </LinearGradient>
          </MaskedView>
        </Animated.View>

        <Animated.Text
          style={[
            styles.tagline,
            subtitleStyle,
            {
              fontSize: taglineSize,
            },
          ]}
        >
          Integrate. Automate. Accelerate.
        </Animated.Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  center: {
    width: '90%',
    maxWidth: 700,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gradient: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },

  title: {
    fontWeight: '900',
    textAlign: 'center',
    includeFontPadding: false,
  },

  tagline: {
    marginTop: 20,
    color: '#7B7B8D',
    fontWeight: '500',
    letterSpacing: 2,
    textAlign: 'center',
  },
});