/**
 * Notification Center - Enterprise-grade notification system
 * Real-time alerts, approval notifications, and system messages
 */
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, X, Check, AlertTriangle, Info, CheckCircle, XCircle,
  Clock, Package, ShoppingCart, Users, FileText, TrendingUp,
  Filter, Search, Trash2, MoreVertical, Pin, Archive
} from 'lucide-react';
import { db } from '@/lib/firebase/client';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, addDoc, orderBy, limit } from 'firebase/firestore';
import { Notification } from '@/types/module';

interface NotificationCenterProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ userId, isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'pinned'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as Notification);
      });
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filter === 'pinned') {
      filtered = filtered.filter(n => n.isPinned);
    }

    if (searchTerm) {
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifs.map(n => updateDoc(doc(db, 'notifications', n.id), { isRead: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const togglePin = async (notificationId: string, currentPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isPinned: !currentPinned
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: Notification['type'], category: Notification['category']) => {
    const iconClass = "w-5 h-5";
    
    switch (category) {
      case 'approval':
        return <Clock className={iconClass} />;
      case 'workflow':
        return <TrendingUp className={iconClass} />;
      case 'stock':
        return <Package className={iconClass} />;
      case 'deadline':
        return <AlertTriangle className={iconClass} />;
      case 'quality':
        return <CheckCircle className={iconClass} />;
      default:
        switch (type) {
          case 'success':
            return <CheckCircle className={iconClass} />;
          case 'error':
            return <XCircle className={iconClass} />;
          case 'warning':
            return <AlertTriangle className={iconClass} />;
          default:
            return <Info className={iconClass} />;
        }
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      case 'warning':
        return 'yellow';
      case 'alert':
        return 'orange';
      default:
        return 'blue';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filteredNotifications = getFilteredNotifications();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Notification Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Bell className="w-6 h-6 text-blue-400" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Notifications</h2>
                    <p className="text-xs text-zinc-400">{unreadCount} unread</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search notifications..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                {(['all', 'unread', 'pinned'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                      filter === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {f}
                    {f === 'unread' && unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                ))}
                
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="ml-auto text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"
                    />
                    <p className="text-zinc-500 text-sm">Loading...</p>
                  </div>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                  <Bell className="w-16 h-16 text-zinc-700 mb-4" />
                  <h3 className="text-lg font-semibold text-zinc-400 mb-2">No notifications</h3>
                  <p className="text-sm text-zinc-600">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {filteredNotifications.map((notification) => {
                    const color = getNotificationColor(notification.type);
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-4 hover:bg-zinc-900/50 transition-colors ${
                          !notification.isRead ? 'bg-blue-500/5' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`flex-shrink-0 w-10 h-10 bg-${color}-500/10 rounded-lg flex items-center justify-center text-${color}-400`}>
                            {getNotificationIcon(notification.type, notification.category)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-white text-sm">{notification.title}</h4>
                              {notification.isPinned && (
                                <Pin className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-zinc-400 mb-2">{notification.message}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-zinc-600">
                                {new Date(notification.createdAt).toLocaleString()}
                              </span>
                              <div className="flex items-center gap-2">
                                {notification.actionUrl && (
                                  <a
                                    href={notification.actionUrl}
                                    className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                                  >
                                    {notification.actionLabel || 'View'}
                                  </a>
                                )}
                                <button
                                  onClick={() => togglePin(notification.id, notification.isPinned)}
                                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                                  title={notification.isPinned ? 'Unpin' : 'Pin'}
                                >
                                  <Pin className={`w-4 h-4 ${notification.isPinned ? 'text-yellow-400' : 'text-zinc-600'}`} />
                                </button>
                                {!notification.isRead && (
                                  <button
                                    onClick={() => markAsRead(notification.id)}
                                    className="p-1 hover:bg-zinc-800 rounded transition-colors"
                                    title="Mark as read"
                                  >
                                    <Check className="w-4 h-4 text-zinc-600" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteNotification(notification.id)}
                                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4 text-zinc-600 hover:text-red-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Notification Bell Button Component
export function NotificationBell({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [userId]);

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="relative p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-zinc-400" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <NotificationCenter
        userId={userId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
