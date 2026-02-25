import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const ChipSelector = ({ options, selectedValue, onChange }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const selected = selectedValue === option;
        return (
          <Pressable
            key={option}
            style={[styles.chip, selected && styles.selectedChip]}
            onPress={() => onChange(option)}
          >
            <Text style={[styles.chipText, selected && styles.selectedChipText]}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingBottom: spacing.sm
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md
  },
  selectedChip: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  selectedChipText: {
    color: colors.primaryDark
  }
});

export default ChipSelector;
