import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useColors, useThemedStyles, type Palette } from '../theme';

// ─── Shimmer base ────────────────────────────────────────────────────────────

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) => {
  const colors = useColors();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.6],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surface,
          opacity,
        },
        style,
      ]}
    />
  );
};

// ─── Pre-built skeleton layouts ──────────────────────────────────────────────

export const PatientCardSkeleton = () => {
  const s = useThemedStyles(createStyles);
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Skeleton width={50} height={50} borderRadius={25} />
        <View style={s.col}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={13} style={{ marginTop: 8 }} />
        </View>
        <Skeleton width={70} height={18} borderRadius={4} />
      </View>
    </View>
  );
};

export const PatientListSkeleton = () => {
  const s = useThemedStyles(createStyles);
  return (
    <View style={s.listContainer}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <PatientCardSkeleton key={i} />
      ))}
    </View>
  );
};

export const DashboardCardSkeleton = () => {
  const s = useThemedStyles(createStyles);
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Skeleton width={48} height={48} borderRadius={12} />
        <View style={s.col}>
          <Skeleton width="50%" height={13} />
          <Skeleton width="35%" height={22} style={{ marginTop: 6 }} />
        </View>
      </View>
    </View>
  );
};

export const DashboardSkeleton = () => {
  const s = useThemedStyles(createStyles);
  return (
    <View style={s.listContainer}>
      {[1, 2, 3, 4].map((i) => (
        <DashboardCardSkeleton key={i} />
      ))}
      <View style={{ marginTop: 24 }}>
        <Skeleton width="40%" height={18} style={{ marginBottom: 16 }} />
        {[1, 2].map((i) => (
          <View key={i} style={[s.card, s.row]}>
            <Skeleton width={44} height={44} borderRadius={22} />
            <View style={s.col}>
              <Skeleton width="65%" height={16} />
              <Skeleton width="50%" height={13} style={{ marginTop: 6 }} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export const AgendaSkeleton = () => {
  const s = useThemedStyles(createStyles);
  return (
    <View style={s.listContainer}>
      <Skeleton width={150} height={28} borderRadius={8} style={{ marginBottom: 16 }} />
      {[1, 2, 3].map((i) => (
        <View key={i} style={s.card}>
          <View style={s.row}>
            <View style={{ alignItems: 'center', width: 60 }}>
              <Skeleton width={50} height={14} />
              <Skeleton width={10} height={10} borderRadius={5} style={{ marginTop: 6 }} />
            </View>
            <View style={s.col}>
              <Skeleton width="55%" height={16} />
              <Skeleton width="70%" height={12} style={{ marginTop: 6 }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export const FinanceSkeleton = () => {
  const s = useThemedStyles(createStyles);
  const colors = useColors();
  return (
    <View style={s.listContainer}>
      {/* Balance cards */}
      <View style={[s.card, { flexDirection: 'row', justifyContent: 'space-around' }]}>
        <View style={{ alignItems: 'center' }}>
          <Skeleton width={100} height={13} />
          <Skeleton width={80} height={22} style={{ marginTop: 6 }} />
        </View>
        <View style={{ width: 1, backgroundColor: colors.border }} />
        <View style={{ alignItems: 'center' }}>
          <Skeleton width={80} height={13} />
          <Skeleton width={70} height={22} style={{ marginTop: 6 }} />
        </View>
      </View>
      {/* Transaction list */}
      <Skeleton width="45%" height={18} style={{ marginTop: 16, marginBottom: 12 }} />
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={s.card}>
          <View style={s.row}>
            <Skeleton width={40} height={40} borderRadius={20} />
            <View style={s.col}>
              <Skeleton width="60%" height={15} />
              <Skeleton width="35%" height={12} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={75} height={18} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
};

const createStyles = (colors: Palette) => StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  col: {
    flex: 1,
  },
});
