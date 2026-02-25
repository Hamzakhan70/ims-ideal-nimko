import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '../../utils/currency';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const RecoveryItemRow = ({ item, onRemove }) => {
  return (
    <View style={styles.row}>
      <View style={styles.content}>
        <Text style={styles.title}>{item.productName || 'Product'}</Text>
        <Text style={styles.subTitle}>
          {item.quantity} x {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
        </Text>
      </View>

      <Pressable style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeText}>Remove</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  content: {
    flex: 1
  },
  title: {
    fontWeight: '700',
    color: colors.textPrimary
  },
  subTitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12
  },
  removeButton: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  removeText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: 12
  }
});

export default RecoveryItemRow;
