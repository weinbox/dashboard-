import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

function ShimmerBox({ style }: { style?: object }) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmer]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0.3, 0.65]),
  }));

  return (
    <Animated.View
      style={[
        { backgroundColor: '#e8e8e8', borderRadius: 6 },
        style,
        animStyle,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: object }) {
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: '#f5f5f5',
          borderRadius: 16,
          overflow: 'hidden',
          margin: 6,
        },
        style,
      ]}
    >
      {/* Image placeholder */}
      <ShimmerBox style={{ height: 160, borderRadius: 0 }} />

      {/* Content */}
      <View style={{ padding: 10, gap: 6 }}>
        <ShimmerBox style={{ height: 12, width: '90%' }} />
        <ShimmerBox style={{ height: 12, width: '65%' }} />
        <ShimmerBox style={{ height: 16, width: '45%', marginTop: 2 }} />
      </View>
    </View>
  );
}

export function SkeletonGrid() {
  return (
    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', padding: 6 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={{ width: '50%' }}>
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}
