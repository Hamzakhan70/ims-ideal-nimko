import React, { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ScreenContainer from '../../components/common/ScreenContainer';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import SectionTitle from '../../components/common/SectionTitle';
import AppButton from '../../components/common/AppButton';
import StatCard from '../../components/common/StatCard';
import QuickActionCard from '../../components/common/QuickActionCard';
import ChipSelector from '../../components/common/ChipSelector';
import OrderCard from '../../components/orders/OrderCard';
import { shopkeeperOrdersApi } from '../../services/api/endpoints';
import { getApiErrorMessage } from '../../utils/error';
import { formatCurrency } from '../../utils/currency';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { NEXT_STATUS } from '../../constants/orderStatus';
import { SALESMAN_ORDER_FILTERS, SALESMAN_QUICK_ACTIONS } from '../../constants/dashboard';
import { useAuth } from '../../context/AuthContext';
import { elevation } from '../../theme/elevation';

const SalesmanDashboardScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStatus, setActiveStatus] = useState('all');

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
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to load orders'));
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

  const filteredOrders = useMemo(() => {
    if (activeStatus === 'all') return orders;
    return orders.filter((order) => order.status === activeStatus);
  }, [orders, activeStatus]);

  const stats = useMemo(() => {
    const pendingCount = orders.filter((order) => order.status === 'pending').length;
    const deliveredCount = orders.filter((order) => order.status === 'delivered').length;
    const totalAmount = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    return {
      totalCount: orders.length,
      pendingCount,
      deliveredCount,
      totalAmount
    };
  }, [orders]);

  const handleAdvanceStatus = async (orderId, currentStatus) => {
    const nextStatus = NEXT_STATUS[currentStatus];
    if (!nextStatus) return;

    try {
      await shopkeeperOrdersApi.updateStatus(orderId, { status: nextStatus });
      await fetchOrders(true);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Unable to update order status'));
    }
  };

  if (loading) {
    return <LoadingState message="Loading salesman dashboard..." />;
  }

  return (
    <ScreenContainer contentStyle={styles.container}>
      <View style={styles.hero}>
        <View>
          <Text style={styles.welcome}>Assalam o Alaikum, {user?.name || 'Salesman'}</Text>
          <Text style={styles.subtext}>Manage assigned orders and collect payments efficiently.</Text>
        </View>
        <AppButton title="Logout" onPress={logout} variant="secondary" size="sm" />
      </View>

      <SectionTitle>Overview</SectionTitle>
      <View style={styles.statsGrid}>
        <StatCard title="Total Orders" value={String(stats.totalCount)} compact tone="info" />
        <StatCard title="Pending" value={String(stats.pendingCount)} compact tone="warning" />
        <StatCard title="Delivered" value={String(stats.deliveredCount)} compact tone="success" />
        <StatCard title="Amount" value={formatCurrency(stats.totalAmount)} tone="default" />
      </View>

      <SectionTitle>Quick Actions</SectionTitle>
      <View style={styles.quickActionRow}>
        {SALESMAN_QUICK_ACTIONS.map((item) => (
          <QuickActionCard
            key={item.route}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => navigation.navigate(item.route)}
          />
        ))}
      </View>

      <SectionTitle>Order Status</SectionTitle>
      <ChipSelector
        options={SALESMAN_ORDER_FILTERS}
        selectedValue={activeStatus}
        onChange={setActiveStatus}
      />

      <SectionTitle
        rightNode={(
          <AppButton
            title="Refresh"
            onPress={() => fetchOrders(true)}
            variant="secondary"
            size="sm"
            loading={refreshing}
          />
        )}
      >
        Orders
      </SectionTitle>

      <View style={styles.ordersPanel}>
        {filteredOrders.length === 0 ? (
          <EmptyState title="No orders found" subtitle="Try changing the status filter." />
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={(item) => item._id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} />}
            renderItem={({ item }) => (
              <OrderCard
                order={item}
                action={
                  NEXT_STATUS[item.status] ? (
                    <AppButton
                      title={`Mark ${NEXT_STATUS[item.status]}`}
                      onPress={() => handleAdvanceStatus(item._id, item.status)}
                      size="sm"
                    />
                  ) : null
                }
              />
            )}
          />
        )}
      </View>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md
  },
  hero: {
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...elevation.soft
  },
  welcome: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.textPrimary
  },
  subtext: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
    maxWidth: 230
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm
  },
  quickActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  ordersPanel: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    ...elevation.soft
  }
});

export default SalesmanDashboardScreen;
