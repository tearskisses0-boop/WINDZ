import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppNotification } from '../types';
import { store } from '../lib/supabase/store';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(() => store.getNotifications());
  const [unreadCount, setUnreadCount] = useState<number>(() => store.getUnreadNotificationCount());

  useEffect(() => {
    const update = () => {
      setNotifications(store.getNotifications());
      setUnreadCount(store.getUnreadNotificationCount());
    };
    update();
    const unsubscribe = store.subscribe(update);
    return unsubscribe;
  }, [user]);

  const markAsRead = (id: string) => {
    store.markNotificationAsRead(id);
  };

  const markAllAsRead = () => {
    store.markAllNotificationsAsRead();
  };

  const clearAll = () => {
    store.clearNotifications();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};
