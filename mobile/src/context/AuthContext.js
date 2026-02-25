import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../services/api/endpoints';
import { authStorage } from '../services/auth/authStorage';
import { getApiErrorMessage } from '../utils/error';

const AuthContext = createContext(null);

const normalizeUserFromUserLogin = (responseData) => {
  return {
    id: responseData._id,
    name: responseData.name,
    email: responseData.email,
    role: responseData.role
  };
};

const normalizeUserFromAdminLogin = (responseData) => {
  return {
    id: responseData.admin?.id || responseData.admin?._id,
    name: responseData.admin?.username || responseData.admin?.name || responseData.admin?.email,
    email: responseData.admin?.email,
    role: responseData.admin?.role
  };
};

export const AuthProvider = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const savedToken = await authStorage.getToken();
        const savedUser = await authStorage.getUser();
        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);
        }
      } finally {
        setIsInitializing(false);
      }
    };
    bootstrap();
  }, []);

  const login = async ({ email, password }) => {
    setAuthError(null);

    try {
      const userResponse = await authApi.loginUser({ email, password });
      const userData = normalizeUserFromUserLogin(userResponse.data);
      const userToken = userResponse.data.token;

      await authStorage.setToken(userToken);
      await authStorage.setUser(userData);
      setToken(userToken);
      setUser(userData);

      return { success: true, role: userData.role };
    } catch (userError) {
      try {
        const adminResponse = await authApi.loginAdmin({ email, password });
        const adminData = normalizeUserFromAdminLogin(adminResponse.data);
        const adminToken = adminResponse.data.token;

        await authStorage.setToken(adminToken);
        await authStorage.setUser(adminData);
        setToken(adminToken);
        setUser(adminData);

        return { success: true, role: adminData.role };
      } catch (adminError) {
        const message = getApiErrorMessage(adminError, getApiErrorMessage(userError, 'Login failed'));
        setAuthError(message);
        return { success: false, error: message };
      }
    }
  };

  const logout = async () => {
    await authStorage.clear();
    setToken(null);
    setUser(null);
    setAuthError(null);
  };

  const value = useMemo(() => ({
    isInitializing,
    token,
    user,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user),
    authError,
    login,
    logout
  }), [isInitializing, token, user, authError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
