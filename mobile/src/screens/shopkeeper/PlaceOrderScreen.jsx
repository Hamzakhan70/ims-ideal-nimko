import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../components/common/ScreenContainer';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import SectionTitle from '../../components/common/SectionTitle';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import { productsApi, shopkeeperOrdersApi } from '../../services/api/endpoints';
import { getApiErrorMessage } from '../../utils/error';
import { formatCurrency } from '../../utils/currency';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const PlaceOrderScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState({});

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productsApi.getAll();
      const productList = response.data?.products || response.data || [];
      setProducts(Array.isArray(productList) ? productList.filter((item) => Number(item.stock || 0) > 0) : []);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to load products'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchProducts();
    }, [])
  );

  const increaseQuantity = (productId) => {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const decreaseQuantity = (productId) => {
    setSelectedItems((prev) => {
      const current = prev[productId] || 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return {
        ...prev,
        [productId]: current - 1
      };
    });
  };

  const orderItems = useMemo(() => {
    return Object.entries(selectedItems).map(([productId, quantity]) => ({
      productId,
      quantity
    }));
  }, [selectedItems]);

  const totalAmount = useMemo(() => {
    const productsById = products.reduce((acc, product) => {
      acc[product._id] = product;
      return acc;
    }, {});

    return orderItems.reduce((sum, item) => {
      const product = productsById[item.productId];
      return sum + (Number(product?.price || 0) * Number(item.quantity || 0));
    }, 0);
  }, [orderItems, products]);

  const handleSubmit = async () => {
    if (orderItems.length === 0) {
      Alert.alert('Validation', 'Please select at least one product.');
      return;
    }

    setSubmitting(true);
    try {
      await shopkeeperOrdersApi.create({
        items: orderItems,
        notes,
        paymentMethod: 'cash',
        amountPaid: 0
      });
      Alert.alert('Success', 'Order placed successfully.');
      setSelectedItems({});
      setNotes('');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to place order'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading products..." />;
  }

  return (
    <ScreenContainer>
      <SectionTitle>Select Products</SectionTitle>
      {products.length === 0 ? (
        <EmptyState title="No products available" subtitle="Please check back later." />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const quantity = selectedItems[item._id] || 0;
            return (
              <View style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productMeta}>{formatCurrency(item.price)} | Stock: {item.stock}</Text>
                </View>

                <View style={styles.quantityControl}>
                  <Pressable style={styles.qtyButton} onPress={() => decreaseQuantity(item._id)}>
                    <Text style={styles.qtyButtonText}>-</Text>
                  </Pressable>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                  <Pressable style={styles.qtyButton} onPress={() => increaseQuantity(item._id)}>
                    <Text style={styles.qtyButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <AppInput
          label="Notes (Optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any delivery notes..."
        />
        <Text style={styles.totalText}>Total: {formatCurrency(totalAmount)}</Text>
        <AppButton title="Place Order" onPress={handleSubmit} loading={submitting} />
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  productInfo: {
    flex: 1,
    marginRight: spacing.md
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  productMeta: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  qtyButtonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '700'
  },
  qtyValue: {
    minWidth: 20,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.textPrimary
  },
  footer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  totalText: {
    marginBottom: spacing.md,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  }
});

export default PlaceOrderScreen;
