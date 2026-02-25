import React, { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenContainer from '../../components/common/ScreenContainer';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import SectionTitle from '../../components/common/SectionTitle';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import SelectionSheet from '../../components/common/SelectionSheet';
import ProductSelectionCard from '../../components/salesman/ProductSelectionCard';
import { assignmentsApi, productsApi, receiptsApi, shopkeeperOrdersApi } from '../../services/api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/error';
import { formatCurrency } from '../../utils/currency';
import { buildOrderReceiptContentHtml, buildOrderReceiptDocumentHtml } from '../../utils/receiptTemplates';
import { PAYMENT_METHODS } from '../../constants/payment';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { elevation } from '../../theme/elevation';
import { printHtmlReceipt } from '../../services/receipt/printService';

const SalesmanPlaceOrderScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);

  const [shopkeeperSheetVisible, setShopkeeperSheetVisible] = useState(false);
  const [selectedShopkeeperId, setSelectedShopkeeperId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedItems, setSelectedItems] = useState({});
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [productsResponse, shopkeepersResponse] = await Promise.all([
        productsApi.getAll(),
        assignmentsApi.getShopkeepersBySalesman(user.id)
      ]);

      const productsData = productsResponse.data?.products || productsResponse.data || [];
      const shopkeepersData = shopkeepersResponse.data?.shopkeepers || [];

      setProducts(Array.isArray(productsData) ? productsData : []);
      setShopkeepers(Array.isArray(shopkeepersData) ? shopkeepersData : []);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to load order placement data'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [user?.id])
  );

  const selectedShopkeeper = useMemo(() => (
    shopkeepers.find((shopkeeper) => shopkeeper._id === selectedShopkeeperId) || null
  ), [shopkeepers, selectedShopkeeperId]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const inStock = Number(product.stock || 0) > 0;
      const matchesSearch = !normalizedSearch
        || product.name?.toLowerCase().includes(normalizedSearch)
        || product.category?.toLowerCase().includes(normalizedSearch);
      return inStock && matchesSearch;
    });
  }, [products, searchTerm]);

  const selectedProductList = useMemo(() => {
    return Object.entries(selectedItems)
      .filter(([, details]) => Number(details.quantity || 0) > 0)
      .map(([productId, details]) => {
        const product = products.find((row) => row._id === productId);
        return {
          productId,
          product,
          quantity: Number(details.quantity || 0),
          customPrice: details.customPrice
        };
      })
      .filter((item) => item.product);
  }, [selectedItems, products]);

  const totalAmount = useMemo(() => {
    return selectedProductList.reduce((sum, item) => {
      const basePrice = Number(item.product.price || 0);
      const customPrice = item.customPrice === '' ? basePrice : Number(item.customPrice || basePrice);
      const safePrice = Number.isNaN(customPrice) ? basePrice : customPrice;
      return sum + safePrice * item.quantity;
    }, 0);
  }, [selectedProductList]);

  const paidValue = Number(amountPaid || 0);
  const currentPending = Number(selectedShopkeeper?.pendingAmount || 0);
  const estimatedPending = Math.max(0, currentPending + totalAmount - paidValue);

  const increaseQuantity = (product) => {
    setSelectedItems((previous) => {
      const current = previous[product._id] || { quantity: 0, customPrice: '' };
      if (current.quantity >= Number(product.stock || 0)) {
        Alert.alert('Stock Limit', `Only ${product.stock} units available for ${product.name}.`);
        return previous;
      }
      return {
        ...previous,
        [product._id]: {
          ...current,
          quantity: current.quantity + 1
        }
      };
    });
  };

  const decreaseQuantity = (productId) => {
    setSelectedItems((previous) => {
      const current = previous[productId];
      if (!current) return previous;
      if (current.quantity <= 1) {
        const next = { ...previous };
        delete next[productId];
        return next;
      }

      return {
        ...previous,
        [productId]: {
          ...current,
          quantity: current.quantity - 1
        }
      };
    });
  };

  const updateCustomPrice = (productId, value) => {
    setSelectedItems((previous) => {
      const current = previous[productId];
      if (!current) return previous;
      return {
        ...previous,
        [productId]: {
          ...current,
          customPrice: value
        }
      };
    });
  };

  const resetForm = () => {
    setSelectedItems({});
    setAmountPaid('');
    setPaymentMethod('cash');
    setNotes('');
  };

  const handleSubmit = async () => {
    if (!selectedShopkeeperId) {
      Alert.alert('Validation', 'Please select a shopkeeper.');
      return;
    }

    if (selectedProductList.length === 0) {
      Alert.alert('Validation', 'Please select at least one product.');
      return;
    }

    if (paidValue < 0) {
      Alert.alert('Validation', 'Paid amount cannot be negative.');
      return;
    }

    const payload = {
      shopkeeperId: selectedShopkeeperId,
      items: selectedProductList.map((item) => {
        const basePrice = Number(item.product.price || 0);
        const parsedCustom = item.customPrice === '' ? basePrice : Number(item.customPrice);
        const useCustomPrice = !Number.isNaN(parsedCustom) && parsedCustom !== basePrice;
        return {
          productId: item.productId,
          quantity: item.quantity,
          ...(useCustomPrice ? { customPrice: parsedCustom } : {})
        };
      }),
      amountPaid: paidValue,
      paymentMethod,
      notes
    };

    setSubmitting(true);
    try {
      const response = await shopkeeperOrdersApi.create(payload);
      const createdOrder = response.data?.order;

      try {
        // Preserve existing web behavior where stock is reduced immediately after placing the order.
        await Promise.all(
          selectedProductList.map((item) => productsApi.updateStock(item.productId, { quantitySold: item.quantity }))
        );
      } catch (stockError) {
        Alert.alert('Order Placed', 'Order was created, but stock update failed. Please verify inventory.');
      }

      const finalizeSuccess = async () => {
        resetForm();
        await fetchData();
      };

      const printReceipt = async () => {
        if (!createdOrder?._id) {
          Alert.alert('Receipt', 'Order created, but receipt data is unavailable.');
          await finalizeSuccess();
          return;
        }

        const receiptContent = buildOrderReceiptContentHtml(createdOrder);
        const receiptDocument = buildOrderReceiptDocumentHtml(createdOrder);

        try {
          await printHtmlReceipt(receiptDocument);
        } catch (printError) {
          Alert.alert('Print Failed', getApiErrorMessage(printError, 'Unable to print receipt on this device.'));
        }

        try {
          await receiptsApi.create({
            receiptType: 'order',
            orderId: createdOrder._id,
            receiptContent,
            totalAmount: Number(createdOrder.totalAmount || totalAmount || 0),
            notes: 'Order receipt printed by salesman'
          });
        } catch (recordError) {
          // Printing should not fail if backend receipt logging fails.
        }

        await finalizeSuccess();
      };

      Alert.alert(
        'Order Placed',
        'Order has been placed successfully. Do you want to print receipt now?',
        [
          {
            text: 'Later',
            style: 'cancel',
            onPress: () => {
              void finalizeSuccess();
            }
          },
          {
            text: 'Print Receipt',
            onPress: () => {
              void printReceipt();
            }
          }
        ],
        { cancelable: false }
      );
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to place order'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading products and shopkeepers..." />;
  }

  return (
    <ScreenContainer contentStyle={styles.screenRoot}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Place Order for Shopkeeper</Text>
            <Text style={styles.heroSubtitle}>Select assigned shopkeeper, add items, and record payment in one flow.</Text>
          </View>

          <SectionTitle>Shopkeeper</SectionTitle>
          <View style={styles.selectCard}>
            <Text style={styles.selectedText}>
              {selectedShopkeeper ? selectedShopkeeper.name : 'No shopkeeper selected'}
            </Text>
            <Text style={styles.selectedSubText}>
              {selectedShopkeeper ? `Pending: ${formatCurrency(selectedShopkeeper.pendingAmount || 0)}` : 'Tap below to choose from assigned list'}
            </Text>
            <AppButton title="Choose Shopkeeper" onPress={() => setShopkeeperSheetVisible(true)} />
          </View>

          <SectionTitle>Payment Details</SectionTitle>
          <View style={styles.panel}>
            <AppInput
              label="Amount Paid Now"
              value={amountPaid}
              onChangeText={setAmountPaid}
              keyboardType="numeric"
              placeholder="0"
            />

            <Text style={styles.label}>Payment Method</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paymentMethodRow}>
              {PAYMENT_METHODS.filter((method) => method.value !== 'other').map((method) => {
                const selected = method.value === paymentMethod;
                return (
                  <AppButton
                    key={method.value}
                    title={method.label}
                    variant={selected ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => setPaymentMethod(method.value)}
                  />
                );
              })}
            </ScrollView>

            <AppInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions..."
              multiline
              style={styles.notesInput}
            />
          </View>

          <SectionTitle>Products</SectionTitle>
          <AppInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by name or category"
          />
          {filteredProducts.length === 0 ? (
            <EmptyState title="No products available" subtitle="Try clearing search filters." />
          ) : (
            filteredProducts.map((product) => {
              const selected = selectedItems[product._id] || { quantity: 0, customPrice: '' };
              return (
                <ProductSelectionCard
                  key={product._id}
                  product={product}
                  selectedQuantity={selected.quantity}
                  customPrice={selected.customPrice}
                  onIncrease={() => increaseQuantity(product)}
                  onDecrease={() => decreaseQuantity(product._id)}
                  onCustomPriceChange={(value) => updateCustomPrice(product._id, value)}
                />
              );
            })
          )}

          <SectionTitle>Order Summary</SectionTitle>
          <View style={styles.summaryCard}>
            <SummaryRow label="Selected Items" value={String(selectedProductList.length)} />
            <SummaryRow label="Order Total" value={formatCurrency(totalAmount)} />
            <SummaryRow label="Current Pending" value={formatCurrency(currentPending)} />
            <SummaryRow label="Estimated New Pending" value={formatCurrency(estimatedPending)} strong />
          </View>
        </ScrollView>

        <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          <View style={styles.footerSummary}>
            <Text style={styles.footerSummaryText}>{selectedProductList.length} item(s)</Text>
            <Text style={styles.footerSummaryAmount}>{formatCurrency(totalAmount)}</Text>
          </View>
          <AppButton
            title={submitting ? 'Placing Order...' : 'Place Order for Shopkeeper'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!selectedShopkeeperId || selectedProductList.length === 0}
          />
        </View>
      </KeyboardAvoidingView>

      <SelectionSheet
        visible={shopkeeperSheetVisible}
        title="Choose Assigned Shopkeeper"
        items={shopkeepers}
        itemLabel={(item) => item.name}
        itemSubLabel={(item) => `Pending: ${formatCurrency(item.pendingAmount || 0)}${item.address ? ` | ${item.address}` : ''}`}
        onSelect={(item) => setSelectedShopkeeperId(item._id)}
        onClose={() => setShopkeeperSheetVisible(false)}
      />
    </ScreenContainer>
  );
};

const SummaryRow = ({ label, value, strong = false }) => (
  <View style={styles.summaryRow}>
    <Text style={[styles.summaryLabel, strong && styles.summaryStrong]}>{label}</Text>
    <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1
  },
  keyboardContainer: {
    flex: 1
  },
  scrollArea: {
    flex: 1
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl + 96
  },
  heroCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.lg,
    ...elevation.soft
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary
  },
  heroSubtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 13
  },
  selectCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
    ...elevation.soft
  },
  selectedText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  selectedSubText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  panel: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    ...elevation.soft
  },
  label: {
    marginBottom: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary
  },
  paymentMethodRow: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  notesInput: {
    minHeight: 90,
    textAlignVertical: 'top'
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.sm,
    ...elevation.soft
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 13
  },
  summaryValue: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  summaryStrong: {
    color: colors.primaryDark,
    fontWeight: '800'
  },
  stickyFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm
  },
  footerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  footerSummaryText: {
    color: colors.textSecondary,
    fontWeight: '600'
  },
  footerSummaryAmount: {
    color: colors.textPrimary,
    fontWeight: '800'
  }
});

export default SalesmanPlaceOrderScreen;
