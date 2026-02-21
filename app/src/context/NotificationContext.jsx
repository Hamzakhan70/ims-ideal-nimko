import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { api } from '../utils/api';
import { useAdmin } from './AdminContext';
import { AUTH_TOKEN_STORAGE_KEY, NOTIFICATION_POLL_INTERVAL_MS } from '../config/appConfig';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated, token } = useAdmin();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      
      if (!token) {
        return;
      }
      
      const response = await axios.get(api.notifications.getAll(), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.data && response.data.success) {
        setNotifications(response.data.notifications || []);
        const normalizedUnread = Number.parseInt(response.data.unreadCount, 10);
        setUnreadCount(Number.isFinite(normalizedUnread) && normalizedUnread >= 0 ? normalizedUnread : 0);
      } else {
        console.error('Unexpected notification response format:', response.data);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      // Don't show error to user, just log it
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      await axios.put(api.notifications.markAsRead(notificationId), {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
      await axios.put(api.notifications.markAllAsRead(), {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Add new notification
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  };

  // Clear notifications
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Auto-fetch notifications every 30 seconds when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, NOTIFICATION_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
