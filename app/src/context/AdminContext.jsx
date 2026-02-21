import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import { api } from '../utils/api';
import { AUTH_TOKEN_STORAGE_KEY, AUTH_USER_ID_STORAGE_KEY, REQUEST_TIMEOUT_MS } from '../config/appConfig';

const AdminContext = createContext();

const adminReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        admin: action.payload.admin,
        token: action.payload.token,
        error: null
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        admin: null,
        token: null,
        error: action.payload
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        admin: null,
        token: null,
        error: null
      };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const AdminProvider = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, {
    isAuthenticated: false,
    admin: null,
    token: localStorage.getItem(AUTH_TOKEN_STORAGE_KEY),
    loading: true, // Start with loading true to prevent immediate redirect
    error: null
  });

  // Set up axios interceptor for token
  useEffect(() => {
    if (state.token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
      // Verify token on app load
      verifyToken();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.token]);

  const verifyToken = async () => {
    try {
      // Try new user system first
      const response = await axios.get(api.users.profile());
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          admin: response.data.user,
          token: state.token
        }
      });
    } catch (error) {
      // Try old admin system as fallback (same API base, different path)
      try {
        const response = await axios.get(api.admin.profile());
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            admin: response.data.admin,
            token: state.token
          }
        });
      } catch (fallbackError) {
        dispatch({ type: 'LOGOUT' });
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_USER_ID_STORAGE_KEY);
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getErrorMessage = (error) => {
    // Handle network errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return 'Connection timeout. Please check your internet connection and try again.';
      }
      if (error.message === 'Network Error') {
        return 'Network error. Please check your internet connection and try again.';
      }
      return 'Unable to connect to server. Please check your internet connection and try again.';
    }

    // Handle HTTP errors
    const status = error.response.status;
    const errorData = error.response.data;

    switch (status) {
      case 401:
        return errorData?.error || 'Invalid email or password. Please try again.';
      case 403:
        return errorData?.error || 'Access denied. You do not have permission to access this resource.';
      case 404:
        return errorData?.error || 'Service not found. Please contact support.';
      case 429:
        return 'Too many login attempts. Please wait a few minutes and try again.';
      case 500:
        return errorData?.error || 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return errorData?.error || errorData?.message || `Login failed. Please try again. (Error ${status})`;
    }
  };

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      // Try new user system first
      const response = await axios.post(api.users.login(), { email, password }, {
        timeout: REQUEST_TIMEOUT_MS
      });
      const { token, ...userData } = response.data;
      
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
      localStorage.setItem(AUTH_USER_ID_STORAGE_KEY, userData.user?._id || userData._id);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { token, admin: userData }
      });
      
      return { success: true };
    } catch (error) {
      // If it's a network/timeout error, don't try fallback - return error immediately
      if (!error.response) {
        const errorMessage = getErrorMessage(error);
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: errorMessage
        });
        return { success: false, error: errorMessage };
      }
      
      // Only try fallback for authentication errors (401, 403, etc.)
      if (error.response?.status === 401 || error.response?.status === 403) {
      } else {
        // For other errors, return immediately
        const errorMessage = getErrorMessage(error);
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: errorMessage
        });
        return { success: false, error: errorMessage };
      }
      
      try {
        // Fallback to old admin system
        const response = await axios.post(api.admin.login(), { email, password }, {
          timeout: REQUEST_TIMEOUT_MS
        });
        const { token, admin } = response.data;
        
        localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
        localStorage.setItem(AUTH_USER_ID_STORAGE_KEY, admin?._id);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { token, admin }
        });
        
        return { success: true };
      } catch (fallbackError) {
        const errorMessage = getErrorMessage(fallbackError);
        dispatch({
          type: 'LOGIN_FAILURE',
          payload: errorMessage
        });
        return { success: false, error: errorMessage };
      }
    }
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_ID_STORAGE_KEY);
    delete axios.defaults.headers.common['Authorization'];
    dispatch({ type: 'LOGOUT' });
  };

  const setError = (error) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  };

  const setLoading = (loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  return (
    <AdminContext.Provider value={{
      ...state,
      login,
      logout,
      setError,
      setLoading
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
    }
  return context;
};
