import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AppInput from '../common/AppInput';
import AppButton from '../common/AppButton';
import { formatCurrency } from '../../utils/currency';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const ProductSelectionCard = ({
  product,
  selectedQuantity,
  customPrice,
  onIncrease,
  onDecrease,
  onCustomPriceChange
}) => {
  const isSelected = selectedQuantity > 0;

  return (
    <View style={[styles.card, isSelected && styles.selectedCard]}>
      <View style={styles.topRow}>
        <View style={styles.infoWrap}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.metaText}>
            Stock: {product.stock} | Base: {formatCurrency(product.price)}
          </Text>
        </View>
        <View style={styles.quantityWrap}>
          <Pressable style={styles.qtyButton} onPress={onDecrease} disabled={!isSelected}>
            <Text style={styles.qtyButtonText}>-</Text>
          </Pressable>
          <Text style={styles.qtyText}>{selectedQuantity}</Text>
          <Pressable style={styles.qtyButton} onPress={onIncrease}>
            <Text style={styles.qtyButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {isSelected ? (
        <View style={styles.bottomRow}>
          <AppInput
            label="Custom Price (Optional)"
            keyboardType="numeric"
            value={customPrice}
            onChangeText={onCustomPriceChange}
            placeholder={`${product.price}`}
          />
          <AppButton size="sm" title="Selected" variant="secondary" onPress={() => null} disabled />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  selectedCard: {
    borderColor: colors.primary
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md
  },
  infoWrap: {
    flex: 1
  },
  productName: {
    fontWeight: '700',
    color: colors.textPrimary,
    fontSize: 15
  },
  metaText: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12
  },
  quantityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  qtyButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  qtyButtonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16
  },
  qtyText: {
    minWidth: 22,
    textAlign: 'center',
    color: colors.textPrimary,
    fontWeight: '700'
  },
  bottomRow: {
    marginTop: spacing.md,
    gap: spacing.sm
  }
});

export default ProductSelectionCard;
