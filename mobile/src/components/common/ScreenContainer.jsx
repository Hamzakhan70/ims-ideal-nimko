import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const ScreenContainer = ({ children, scroll = false, contentStyle, scrollProps = {} }) => {
  const insets = useSafeAreaInsets();
  const Wrapper = scroll ? ScrollView : View;

  return (
    <Wrapper
      style={[styles.container, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.sm }]}
      {...(scroll
        ? {
          contentContainerStyle: [styles.scrollContent, contentStyle],
          keyboardShouldPersistTaps: 'handled',
          keyboardDismissMode: 'on-drag',
          showsVerticalScrollIndicator: false,
          ...scrollProps
        }
        : {})}
    >
      <View style={[!scroll && styles.fill, !scroll && contentStyle ? contentStyle : undefined]}>{children}</View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg
  },
  scrollContent: {
    paddingBottom: spacing.xxl
  },
  fill: {
    flex: 1
  }
});

export default ScreenContainer;
