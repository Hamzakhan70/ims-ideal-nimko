import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import OrderStatusBadge from './OrderStatusBadge';
import { elevation } from '../../theme/elevation';

const OrderCard = ({ order, onPress, action }) => {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.rowBetween}>
        <Text style={styles.orderId}>#{order?._id?.slice(-8)}</Text>
        <OrderStatusBadge status={order?.status} />
      </View>

      <Text style={styles.customerName}>{order?.shopkeeper?.name || order?.customerName || 'Customer'}</Text>
      <Text style={styles.meta}>Total: {formatCurrency(order?.totalAmount || 0)}</Text>
      <Text style={styles.meta}>Payment: {(order?.paymentStatus || 'pending').replace('_', ' ')}</Text>
      <Text style={styles.meta}>Date: {formatDate(order?.createdAt || order?.orderDate)}</Text>

      {action ? <View style={styles.actionContainer}>{action}</View> : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...elevation.soft
  },
  pressed: {
    opacity: 0.96
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs
  },
  meta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs
  },
  actionContainer: {
    marginTop: spacing.md
  }
});

export default OrderCard;
