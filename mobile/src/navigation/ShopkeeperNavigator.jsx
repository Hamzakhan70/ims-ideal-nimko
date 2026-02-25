import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ShopkeeperDashboardScreen from '../screens/shopkeeper/ShopkeeperDashboardScreen';
import PlaceOrderScreen from '../screens/shopkeeper/PlaceOrderScreen';
import { ROUTES } from '../constants/routes';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator();

const ShopkeeperNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.SHOPKEEPER.DASHBOARD}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background
        }
      }}
    >
      <Stack.Screen
        name={ROUTES.SHOPKEEPER.DASHBOARD}
        component={ShopkeeperDashboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={ROUTES.SHOPKEEPER.PLACE_ORDER}
        component={PlaceOrderScreen}
        options={{ title: 'Place Order' }}
      />
    </Stack.Navigator>
  );
};

export default ShopkeeperNavigator;
