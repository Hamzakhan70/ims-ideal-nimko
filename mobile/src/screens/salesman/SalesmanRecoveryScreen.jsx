import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionTitle from '../../components/common/SectionTitle';
import AppButton from '../../components/common/AppButton';
import AppInput from '../../components/common/AppInput';
import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import StatCard from '../../components/common/StatCard';
import SelectionSheet from '../../components/common/SelectionSheet';
import RecoveryItemRow from '../../components/salesman/RecoveryItemRow';
import { assignmentsApi, productsApi, receiptsApi, recoveriesApi } from '../../services/api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { getApiErrorMessage } from '../../utils/error';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { buildRecoveryReceiptContentHtml, buildRecoveryReceiptDocumentHtml } from '../../utils/receiptTemplates';
import { PAYMENT_METHODS } from '../../constants/payment';
import { RECOVERY_TYPES } from '../../constants/recovery';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { elevation } from '../../theme/elevation';
import { printHtmlReceipt } from '../../services/receipt/printService';

const defaultForm = {
  shopkeeperId: '',
  recoveryType: 'payment_only',
  amountCollected: '',
  paymentMethod: 'cash',
  notes: '',
  recoveryLocation: '',
  items: []
};

const defaultNewItem = {
  productId: '',
  quantity: '',
  unitPrice: ''
};

const SalesmanRecoveryScreen = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recoveries, setRecoveries] = useState([]);
  const [shopkeepers, setShopkeepers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);

  const [form, setForm] = useState(defaultForm);
  const [newItem, setNewItem] = useState(defaultNewItem);

  const [shopkeeperSheetVisible, setShopkeeperSheetVisible] = useState(false);
  const [productSheetVisible, setProductSheetVisible] = useState(false);

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [recoveriesResponse, statsResponse, recoveriesShopkeepersResponse, allShopkeepersResponse, productsResponse] = await Promise.all([
        recoveriesApi.getAll({ limit: 100 }),
        recoveriesApi.getStats(),
        recoveriesApi.getShopkeepers(user.id),
        assignmentsApi.getShopkeepersBySalesman(user.id),
        productsApi.getAll()
      ]);

      const recoveriesData = recoveriesResponse.data?.recoveries || [];
      const statsData = statsResponse.data?.stats || null;
      const pendingShopkeepers = recoveriesShopkeepersResponse.data?.shopkeepers || [];
      const assignedShopkeepers = allShopkeepersResponse.data?.shopkeepers || [];
      const productsData = productsResponse.data?.products || productsResponse.data || [];

      // Recovery-specific endpoint only returns pending shopkeepers. Merge with assigned list for flexibility.
      const shopkeepersMap = new Map();
      [...assignedShopkeepers, ...pendingShopkeepers].forEach((shopkeeper) => {
        if (shopkeeper?._id) {
          shopkeepersMap.set(shopkeeper._id, shopkeeper);
        }
      });

      setRecoveries(Array.isArray(recoveriesData) ? recoveriesData : []);
      setStats(statsData);
      setShopkeepers(Array.from(shopkeepersMap.values()));
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to load recovery data'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [user?.id])
  );

  const selectedShopkeeper = useMemo(() => {
    return shopkeepers.find((item) => item._id === form.shopkeeperId) || null;
  }, [shopkeepers, form.shopkeeperId]);

  const itemsValue = useMemo(() => (
    form.items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0)
  ), [form.items]);

  const amountCollectedNumeric = Number(form.amountCollected || 0);
  const netPayment = Math.max(0, amountCollectedNumeric - itemsValue);
  const newPending = Math.max(0, Number(selectedShopkeeper?.pendingAmount || 0) - netPayment);

  const availableProducts = useMemo(() => {
    return products.filter((item) => Number(item.stock || 0) > 0);
  }, [products]);

  const addItem = () => {
    const quantity = Number(newItem.quantity || 0);
    const unitPrice = Number(newItem.unitPrice || 0);

    if (!newItem.productId || quantity <= 0 || unitPrice < 0) {
      Alert.alert('Validation', 'Please select product, quantity and unit price.');
      return;
    }

    const product = products.find((row) => row._id === newItem.productId);
    if (!product) {
      Alert.alert('Validation', 'Selected product is not valid.');
      return;
    }

    if (quantity > Number(product.stock || 0)) {
      Alert.alert('Validation', `Only ${product.stock} units are available for ${product.name}.`);
      return;
    }

    const item = {
      product: newItem.productId,
      productName: product.name,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice
    };

    setForm((previous) => ({
      ...previous,
      items: [...previous.items, item]
    }));
    setNewItem(defaultNewItem);
  };

  const removeItem = (index) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const onSelectShopkeeper = (shopkeeper) => {
    setForm((previous) => ({
      ...previous,
      shopkeeperId: shopkeeper._id,
      recoveryLocation: shopkeeper.address || previous.recoveryLocation
    }));
  };

  const onSelectProduct = (product) => {
    setNewItem((previous) => ({
      ...previous,
      productId: product._id,
      unitPrice: String(product.price || 0)
    }));
  };

  const resetForm = () => {
    setForm(defaultForm);
    setNewItem(defaultNewItem);
  };

  const handleSubmit = async () => {
    if (!form.shopkeeperId) {
      Alert.alert('Validation', 'Please choose a shopkeeper.');
      return;
    }

    if (!form.amountCollected || Number(form.amountCollected) <= 0) {
      Alert.alert('Validation', 'Amount collected must be greater than 0.');
      return;
    }

    if (form.recoveryType === 'payment_with_items' && form.items.length === 0) {
      Alert.alert('Validation', 'Add at least one item for payment with items type.');
      return;
    }

    if (form.recoveryType === 'payment_with_items' && Number(form.amountCollected) < itemsValue) {
      Alert.alert('Validation', 'Amount collected must be greater than or equal to items value.');
      return;
    }

    const payload = {
      shopkeeperId: form.shopkeeperId,
      recoveryType: form.recoveryType,
      amountCollected: Number(form.amountCollected),
      paymentMethod: form.paymentMethod,
      notes: form.notes,
      recoveryLocation: form.recoveryLocation,
      items: form.recoveryType === 'payment_with_items'
        ? form.items.map((item) => ({
          product: item.product,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice)
        }))
        : []
    };

    setSubmitting(true);
    try {
      const response = await recoveriesApi.create(payload);
      const createdRecovery = response.data?.recovery;

      const finalizeSuccess = async () => {
        resetForm();
        await fetchData();
      };

      const printReceipt = async () => {
        if (!createdRecovery?._id) {
          Alert.alert('Receipt', 'Recovery created, but receipt data is unavailable.');
          await finalizeSuccess();
          return;
        }

        const receiptContent = buildRecoveryReceiptContentHtml(createdRecovery);
        const receiptDocument = buildRecoveryReceiptDocumentHtml(createdRecovery);

        try {
          await printHtmlReceipt(receiptDocument);
        } catch (printError) {
          Alert.alert('Print Failed', getApiErrorMessage(printError, 'Unable to print receipt on this device.'));
        }

        try {
          await receiptsApi.create({
            receiptType: 'recovery',
            recoveryId: createdRecovery._id,
            receiptContent,
            totalAmount: Number(createdRecovery.amountCollected || form.amountCollected || 0),
            notes: 'Recovery receipt printed by salesman'
          });
        } catch (recordError) {
          // Printing should not fail if backend receipt logging fails.
        }

        await finalizeSuccess();
      };

      Alert.alert(
        'Recovery Recorded',
        'Recovery has been saved successfully. Do you want to print receipt now?',
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
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to record recovery'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading recovery board..." />;
  }

  return (
    <ScreenContainer scroll contentStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Recovery Board</Text>
        <Text style={styles.heroSubtitle}>Record collections, track pending balances, and review recent recoveries.</Text>
      </View>

      <SectionTitle>Statistics</SectionTitle>
      <View style={styles.statsGrid}>
        <StatCard title="Total Collected" value={formatCurrency(stats?.totalAmountCollected || 0)} tone="success" />
        <StatCard title="Net Payment" value={formatCurrency(stats?.totalNetPayment || 0)} tone="info" />
        <StatCard title="Recoveries" value={String(stats?.totalRecoveries || 0)} compact tone="warning" />
        <StatCard title="Average" value={formatCurrency(stats?.averageRecovery || 0)} compact />
      </View>

      <SectionTitle>Record Recovery</SectionTitle>
      <View style={styles.formPanel}>
        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>Shopkeeper</Text>
          <AppButton
            title={selectedShopkeeper ? selectedShopkeeper.name : 'Choose Shopkeeper'}
            onPress={() => setShopkeeperSheetVisible(true)}
            variant="secondary"
          />
          {selectedShopkeeper ? (
            <Text style={styles.helperText}>Pending: {formatCurrency(selectedShopkeeper.pendingAmount || 0)}</Text>
          ) : null}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>Recovery Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {RECOVERY_TYPES.map((type) => (
              <AppButton
                key={type.value}
                title={type.label}
                size="sm"
                variant={form.recoveryType === type.value ? 'primary' : 'secondary'}
                onPress={() => setForm((previous) => ({ ...previous, recoveryType: type.value, items: [] }))}
              />
            ))}
          </ScrollView>
        </View>

        <AppInput
          label="Amount Collected"
          keyboardType="numeric"
          value={form.amountCollected}
          onChangeText={(value) => setForm((previous) => ({ ...previous, amountCollected: value }))}
          placeholder="0"
        />

        <View style={styles.inputGroup}>
          <Text style={styles.fieldLabel}>Payment Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {PAYMENT_METHODS.filter((method) => method.value !== 'credit').map((method) => (
              <AppButton
                key={method.value}
                title={method.label}
                size="sm"
                variant={form.paymentMethod === method.value ? 'primary' : 'secondary'}
                onPress={() => setForm((previous) => ({ ...previous, paymentMethod: method.value }))}
              />
            ))}
          </ScrollView>
        </View>

        {form.recoveryType === 'payment_with_items' ? (
          <View style={styles.itemsPanel}>
            <Text style={styles.panelTitle}>Items Delivered</Text>
            <View style={styles.itemSelectionRow}>
              <AppButton
                title={newItem.productId ? products.find((item) => item._id === newItem.productId)?.name || 'Choose Product' : 'Choose Product'}
                variant="secondary"
                onPress={() => setProductSheetVisible(true)}
              />
            </View>
            <View style={styles.itemInputRow}>
              <View style={styles.halfField}>
                <AppInput
                  label="Quantity"
                  keyboardType="numeric"
                  value={newItem.quantity}
                  onChangeText={(value) => setNewItem((previous) => ({ ...previous, quantity: value }))}
                  placeholder="0"
                />
              </View>
              <View style={styles.halfField}>
                <AppInput
                  label="Unit Price"
                  keyboardType="numeric"
                  value={newItem.unitPrice}
                  onChangeText={(value) => setNewItem((previous) => ({ ...previous, unitPrice: value }))}
                  placeholder="0"
                />
              </View>
            </View>
            <AppButton title="Add Item" onPress={addItem} size="sm" />

            <View style={styles.itemList}>
              {form.items.map((item, index) => (
                <RecoveryItemRow
                  key={`${item.product}-${index}`}
                  item={item}
                  onRemove={() => removeItem(index)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <AppInput
          label="Recovery Location"
          value={form.recoveryLocation}
          onChangeText={(value) => setForm((previous) => ({ ...previous, recoveryLocation: value }))}
          placeholder="Shop address or area"
        />

        <AppInput
          label="Notes"
          value={form.notes}
          onChangeText={(value) => setForm((previous) => ({ ...previous, notes: value }))}
          placeholder="Optional notes"
          multiline
          style={styles.notesInput}
        />

        <View style={styles.summaryCard}>
          <SummaryRow label="Amount Collected" value={formatCurrency(amountCollectedNumeric)} />
          <SummaryRow label="Items Value" value={formatCurrency(itemsValue)} />
          <SummaryRow label="Net Payment" value={formatCurrency(netPayment)} />
          <SummaryRow label="New Pending" value={formatCurrency(newPending)} strong />
        </View>

        <AppButton
          title={submitting ? 'Recording...' : 'Record Recovery'}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
        />
      </View>

      <SectionTitle>Recent Recoveries</SectionTitle>
      <View style={styles.listPanel}>
        {recoveries.length === 0 ? (
          <EmptyState title="No recoveries yet" subtitle="Your recorded recoveries will appear here." />
        ) : (
          recoveries.map((item) => (
            <View style={styles.recoveryCard} key={item._id}>
              <View style={styles.recoveryTop}>
                <Text style={styles.recoveryShopkeeper}>{item.shopkeeper?.name || 'Shopkeeper'}</Text>
                <Text style={styles.recoveryAmount}>{formatCurrency(item.amountCollected || 0)}</Text>
              </View>
              <Text style={styles.recoveryMeta}>
                {item.recoveryType === 'payment_only' ? 'Payment Only' : 'Payment + Items'} | {item.paymentMethod}
              </Text>
              <Text style={styles.recoveryMeta}>Date: {formatDate(item.recoveryDate || item.createdAt)}</Text>
            </View>
          ))
        )}
      </View>

      <SelectionSheet
        visible={shopkeeperSheetVisible}
        title="Choose Shopkeeper"
        items={shopkeepers}
        itemLabel={(item) => item.name}
        itemSubLabel={(item) => `Pending: ${formatCurrency(item.pendingAmount || 0)}`}
        onSelect={onSelectShopkeeper}
        onClose={() => setShopkeeperSheetVisible(false)}
      />

      <SelectionSheet
        visible={productSheetVisible}
        title="Choose Product"
        items={availableProducts}
        itemLabel={(item) => item.name}
        itemSubLabel={(item) => `Stock: ${item.stock} | ${formatCurrency(item.price)}`}
        onSelect={onSelectProduct}
        onClose={() => setProductSheetVisible(false)}
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
  content: {
    gap: spacing.md
  },
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    padding: spacing.lg,
    ...elevation.soft
  },
  heroTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    fontWeight: '800'
  },
  heroSubtitle: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 13
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md
  },
  formPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
    ...elevation.soft
  },
  inputGroup: {
    gap: spacing.sm
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 12
  },
  chips: {
    gap: spacing.sm
  },
  itemsPanel: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.sm
  },
  panelTitle: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14
  },
  itemSelectionRow: {
    marginTop: spacing.xs
  },
  itemInputRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  halfField: {
    flex: 1
  },
  itemList: {
    gap: spacing.sm
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    padding: spacing.md,
    gap: spacing.sm
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
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
  listPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    minHeight: 160,
    ...elevation.soft
  },
  recoveryCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundMuted,
    paddingVertical: spacing.md
  },
  recoveryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  recoveryShopkeeper: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  recoveryAmount: {
    color: colors.success,
    fontWeight: '800'
  },
  recoveryMeta: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontSize: 12
  }
});

export default SalesmanRecoveryScreen;
