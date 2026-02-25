import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const AppInput = ({ label, error, style, rightSlot, ...inputProps }) => {
  const multiline = Boolean(inputProps.multiline);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputShell, multiline && styles.multilineShell, error && styles.inputError]}>
        <TextInput
          style={[styles.input, multiline && styles.multilineInput, style]}
          placeholderTextColor={colors.textTertiary}
          {...inputProps}
        />
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md
  },
  label: {
    marginBottom: spacing.sm,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600'
  },
  inputShell: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md
  },
  multilineShell: {
    alignItems: 'flex-start'
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary
  },
  multilineInput: {
    minHeight: 88,
    textAlignVertical: 'top'
  },
  inputError: {
    borderColor: colors.error
  },
  rightSlot: {
    marginLeft: spacing.sm
  },
  error: {
    marginTop: spacing.xs,
    color: colors.error,
    fontSize: 12
  }
});

export default AppInput;
