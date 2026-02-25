import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { elevation } from '../../theme/elevation';

const AppButton = ({ title, onPress, loading = false, disabled = false, variant = 'primary', size = 'md' }) => {
  const isDisabled = disabled || loading;
  const buttonStyle = variant === 'secondary'
    ? styles.secondaryButton
    : variant === 'danger'
      ? styles.dangerButton
      : styles.primaryButton;

  const textStyle = variant === 'secondary' ? styles.secondaryText : styles.primaryText;
  const sizeStyle = size === 'sm' ? styles.smallButton : styles.mediumButton;
  const textSizeStyle = size === 'sm' ? styles.smallText : styles.mediumText;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.buttonBase,
        sizeStyle,
        buttonStyle,
        !isDisabled && variant !== 'secondary' && elevation.soft,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading
        ? <ActivityIndicator color={variant === 'secondary' ? colors.textPrimary : colors.surface} />
        : <Text style={[textStyle, textSizeStyle]}>{title}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonBase: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mediumButton: {
    minHeight: 44,
    paddingVertical: spacing.md
  },
  smallButton: {
    minHeight: 36,
    paddingVertical: spacing.sm
  },
  primaryButton: {
    backgroundColor: colors.primary
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  dangerButton: {
    backgroundColor: colors.error
  },
  primaryText: {
    color: colors.surface,
    fontWeight: '700'
  },
  secondaryText: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  mediumText: {
    fontSize: 15
  },
  smallText: {
    fontSize: 13
  },
  disabled: {
    opacity: 0.6
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }]
  }
});

export default AppButton;
