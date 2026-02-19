import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';

const NotificationDropdown = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const listContainerRef = useRef(null);
  const itemRefs = useRef(new Map());
  const seenNotificationIds = useRef(new Set());
  const navigate = useNavigate();

  const formatTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short'
    });
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'order':
        return '🛒';
      case 'recovery':
        return '💰';
      case 'receipt':
        return '📄';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'order':
        return 'text-blue-600';
      case 'recovery':
        return 'text-green-600';
      case 'receipt':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const unreadNotificationCount = notifications.filter((notification) => !notification.isRead).length;
  const parsedUnreadCount = Number.parseInt(unreadCount, 10);
  const effectiveUnreadCount = Number.isFinite(parsedUnreadCount) && parsedUnreadCount >= 0
    ? parsedUnreadCount
    : unreadNotificationCount;

  const markNotificationAsSeen = (notification) => {
    if (!notification || notification.isRead) {
      return;
    }
    if (seenNotificationIds.current.has(notification._id)) {
      return;
    }
    seenNotificationIds.current.add(notification._id);
    markAsRead(notification._id);
  };

  const toggleDropdown = async () => {
    const nextOpenState = !isOpen;
    setIsOpen(nextOpenState);
    if (nextOpenState) {
      await fetchNotifications();
    }
  };

  const setNotificationRef = (notificationId) => (node) => {
    if (!node) {
      itemRefs.current.delete(notificationId);
      return;
    }
    itemRefs.current.set(notificationId, node);
  };

  useEffect(() => {
    if (!isOpen || !listContainerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          const notificationId = entry.target.getAttribute('data-notification-id');
          if (!notificationId) {
            return;
          }

          const notification = notifications.find((item) => item._id === notificationId);
          markNotificationAsSeen(notification);
        });
      },
      {
        root: listContainerRef.current,
        threshold: 0.6
      }
    );

    itemRefs.current.forEach((node) => {
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
    };
  }, [isOpen, notifications]);

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg transition-colors"
        title="Notifications"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {effectiveUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center leading-none animate-pulse">
            {effectiveUnreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
                {effectiveUnreadCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    ({effectiveUnreadCount} unread)
                  </span>
                )}
              </h3>
              {effectiveUnreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div ref={listContainerRef} className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <div className="text-4xl mb-2">🔔</div>
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  ref={setNotificationRef(notification._id)}
                  data-notification-id={notification._id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => {
                    markNotificationAsSeen(notification);
                    setIsOpen(false);
                    
                    // Navigate to order page if it's an order notification
                    if (notification.type === 'order' && notification.relatedEntity) {
                      if (notification.relatedEntityType === 'Order') {
                        navigate('/admin/website-orders');
                      } else if (notification.relatedEntityType === 'ShopkeeperOrder') {
                        navigate('/admin/shopkeeper-orders');
                      }
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <span className="text-2xl">
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${getNotificationColor(notification.type)}`}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
