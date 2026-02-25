import React, { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../components/common/ScreenContainer';
import SectionTitle from '../../components/common/SectionTitle';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import AppButton from '../../components/common/AppButton';
import StatCard from '../../components/common/StatCard';
import OrderCard from '../../components/orders/OrderCard';
import { shopkeeperOrdersApi } from '../../services/api/endpoints';
import { getApiErrorMessage } from '../../utils/error';
import { formatCurrency } from '../../utils/currency';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ROUTES } from '../../constants/routes';
import { useAuth } from '../../context/AuthContext';

const ShopkeeperDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await shopkeeperOrdersApi.getAll({ page: 1, limit: 200 });
      setOrders(response.data?.orders || []);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to load your orders'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchOrders();
    }, [])
  );

  const stats = useMemo(() => {
    const pendingCount = orders.filter((order) => order.status === 'pending').length;
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    return { pendingCount, totalAmount };
  }, [orders]);

  if (loading) {
    return <LoadingState message="Loading shopkeeper dashboard..." />;
  }

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.welcome}>Welcome, {user?.name || 'Shopkeeper'}</Text>
          <Text style={styles.subtext}>Place and track orders quickly</Text>
        </View>
        <AppButton title="Logout" onPress={logout} variant="secondary" />
      </View>

      <View style={styles.actionRow}>
        <AppButton title="Place New Order" onPress={() => navigation.navigate(ROUTES.SHOPKEEPER.PLACE_ORDER)} />
      </View>

      <SectionTitle>Overview</SectionTitle>
      <View style={styles.statsGrid}>
        <StatCard title="Total Orders" value={String(orders.length)} />
        <StatCard title="Pending" value={String(stats.pendingCount)} />
        <StatCard title="Total Amount" value={formatCurrency(stats.totalAmount)} />
      </View>

      <SectionTitle>Your Orders</SectionTitle>
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" subtitle="Tap 'Place New Order' to create your first order." />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} />}
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  welcome: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: 13
  },
  actionRow: {
    marginBottom: spacing.lg
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg
  }
});

export default ShopkeeperDashboardScreen;
