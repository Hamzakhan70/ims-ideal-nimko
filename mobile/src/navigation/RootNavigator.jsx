import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoadingState from '../components/common/LoadingState';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../constants/roles';
import { ROUTES } from '../constants/routes';
import AuthNavigator from './AuthNavigator';
import SalesmanNavigator from './SalesmanNavigator';
import ShopkeeperNavigator from './ShopkeeperNavigator';
import UnsupportedRoleScreen from '../screens/common/UnsupportedRoleScreen';

const Stack = createNativeStackNavigator();

const RootNavigator = () => {
  const { isInitializing, isAuthenticated, role } = useAuth();

  if (isInitializing) {
    return <LoadingState message="Preparing mobile app..." />;
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : role === USER_ROLES.SALESMAN ? (
        <SalesmanNavigator />
      ) : role === USER_ROLES.SHOPKEEPER ? (
        <ShopkeeperNavigator />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name={ROUTES.COMMON.UNSUPPORTED_ROLE} component={UnsupportedRoleScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
};

export default RootNavigator;
