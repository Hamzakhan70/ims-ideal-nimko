import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SalesmanDashboardScreen from '../screens/salesman/SalesmanDashboardScreen';
import SalesmanPlaceOrderScreen from '../screens/salesman/SalesmanPlaceOrderScreen';
import SalesmanRecoveryScreen from '../screens/salesman/SalesmanRecoveryScreen';
import { ROUTES } from '../constants/routes';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const SalesmanNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.SALESMAN.DASHBOARD}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background
        },
        headerTitleStyle: {
          color: colors.textPrimary,
          fontWeight: '700'
        }
      }}
    >
      <Stack.Screen
        name={ROUTES.SALESMAN.DASHBOARD}
        component={SalesmanDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.SALESMAN.PLACE_ORDER}
        component={SalesmanPlaceOrderScreen}
        options={{ title: 'Place Order' }}
      />
      <Stack.Screen
        name={ROUTES.SALESMAN.RECOVERY}
        component={SalesmanRecoveryScreen}
        options={{ title: 'Recovery Board' }}
      />
    </Stack.Navigator>
  );
};

export default SalesmanNavigator;
