import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ORDER_STATUS } from '../../constants/orderStatus';
import { colors } from '../../theme/colors';

const statusStyles = {
  [ORDER_STATUS.PENDING]: { backgroundColor: '#FEF3C7', color: '#92400E' },
  [ORDER_STATUS.CONFIRMED]: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  [ORDER_STATUS.PREPARING]: { backgroundColor: '#EDE9FE', color: '#5B21B6' },
  [ORDER_STATUS.READY]: { backgroundColor: '#DCFCE7', color: '#166534' },
  [ORDER_STATUS.DELIVERED]: { backgroundColor: '#DCFCE7', color: '#166534' },
  [ORDER_STATUS.CANCELLED]: { backgroundColor: '#FEE2E2', color: '#991B1B' }
};

const OrderStatusBadge = ({ status }) => {
  const styleForStatus = statusStyles[status] || { backgroundColor: '#E2E8F0', color: colors.textSecondary };
  return (
    <View style={[styles.badge, { backgroundColor: styleForStatus.backgroundColor }]}>
      <Text style={[styles.text, { color: styleForStatus.color }]}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize'
  }
});

export default OrderStatusBadge;
