import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  Calendar,
  MessageSquare,
  CreditCard,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  ChevronRight
} from 'lucide-react';
import { Language, Notification } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { api } from '../services/api';

interface ParentNotification {
  id: string;
  type: 'course' | 'payment' | 'feedback' | 'activity' | 'award' | 'system';
  title: string;
  content: string;
  time: string;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  actionUrl?: string;
}

export default function ParentNotificationCenter({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<ParentNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'course' | 'payment' | 'system'>('all');

  const mapNotification = (n: Notification): ParentNotification => {
    const text = `${n.title} ${n.content}`.toLowerCase();
    const type: ParentNotification['type'] =
      text.includes('缴费') || text.includes('payment') ? 'payment' :
      text.includes('课程') || text.includes('class') || text.includes('schedule') ? 'course' :
      text.includes('反馈') || text.includes('作业') || text.includes('homework') ? 'feedback' :
      text.includes('获奖') || text.includes('award') ? 'award' :
      text.includes('活动') || text.includes('event') ? 'activity' :
      'system';
    const priority: ParentNotification['priority'] =
      text.includes('逾期') || text.includes('紧急') || text.includes('urgent') ? 'high' :
      text.includes('提醒') || text.includes('notice') ? 'medium' :
      'low';
    const actionUrl =
      type === 'payment' ? 'payments' :
      type === 'course' ? 'schedule' :
      type === 'feedback' ? 'messages' :
      type === 'award' || type === 'activity' ? 'growth' :
      undefined;
    return {
      id: n.id,
      type,
      title: n.title,
      content: n.content,
      time: n.timestamp,
      read: n.read,
      priority,
      actionUrl,
    };
  };

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getNotifications(user.id);
        if (mounted) setNotifications(data.map(mapNotification));
      } catch {
        if (mounted) setNotifications([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const filteredNotifications = useMemo(() => {
    let result = notifications;
    
    if (filter === 'unread') {
      result = result.filter(n => !n.read);
    } else if (filter !== 'all') {
      result = result.filter(n => n.type === filter);
    }
    
    return result.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [notifications, filter]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      unread: unreadCount,
      course: notifications.filter(n => n.type === 'course').length,
      payment: notifications.filter(n => n.type === 'payment').length,
      system: notifications.filter(n => n.type === 'system').length
    };
  }, [notifications, unreadCount]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await api.markNotificationRead(id);
    } catch {}
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await Promise.all(unread.map((id) => api.markNotificationRead(id).catch(() => null)));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-green-600" />;
      case 'feedback':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'activity':
        return <Award className="w-5 h-5 text-amber-600" />;
      case 'award':
        return <Award className="w-5 h-5 text-yellow-600" />;
      case 'system':
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'course':
        return 'bg-blue-50';
      case 'payment':
        return 'bg-green-50';
      case 'feedback':
        return 'bg-purple-50';
      case 'activity':
        return 'bg-amber-50';
      case 'award':
        return 'bg-yellow-50';
      default:
        return 'bg-gray-50';
    }
  };

  const formatTime = (time: string) => {
    const date = parseISO(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return lang === 'zh' ? '刚刚' : 'Just now';
    if (diffMins < 60) return lang === 'zh' ? `${diffMins}分钟前` : `${diffMins}m ago`;
    if (diffHours < 24) return lang === 'zh' ? `${diffHours}小时前` : `${diffHours}h ago`;
    if (diffDays < 7) return lang === 'zh' ? `${diffDays}天前` : `${diffDays}d ago`;
    return format(date, 'MM-dd HH:mm');
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">{lang === 'zh' ? '请先登录' : 'Please login first'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-orange-500" />
            {lang === 'zh' ? '通知中心' : 'Notifications'}
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '查看和管理您的所有通知' : 'View and manage all your notifications'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => void markAllAsRead()}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === 'zh' ? '全部已读' : 'Mark All Read'}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`p-3 rounded-xl border transition ${
            filter === 'all' 
              ? 'bg-orange-50 border-orange-200 text-orange-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '全部' : 'All'}</p>
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`p-3 rounded-xl border transition ${
            filter === 'unread' 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold">{stats.unread}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '未读' : 'Unread'}</p>
        </button>
        <button
          onClick={() => setFilter('course')}
          className={`p-3 rounded-xl border transition ${
            filter === 'course' 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold">{stats.course}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '课程' : 'Course'}</p>
        </button>
        <button
          onClick={() => setFilter('payment')}
          className={`p-3 rounded-xl border transition ${
            filter === 'payment' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold">{stats.payment}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '缴费' : 'Payment'}</p>
        </button>
        <button
          onClick={() => setFilter('system')}
          className={`p-3 rounded-xl border transition ${
            filter === 'system' 
              ? 'bg-gray-50 border-gray-200 text-gray-700' 
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <p className="text-2xl font-bold">{stats.system}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '系统' : 'System'}</p>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              {lang === 'zh' ? '通知加载中...' : 'Loading notifications...'}
            </div>
          ) : filteredNotifications.length > 0 ? (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition cursor-pointer ${
                  !notification.read ? 'bg-orange-50/30' : ''
                }`}
                onClick={() => void markAsRead(notification.id)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full ${getNotificationBg(notification.type)} flex items-center justify-center flex-shrink-0`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900 flex items-center gap-2">
                        {notification.title}
                        {!notification.read && (
                          <span className="w-2 h-2 bg-red-500 rounded-full" />
                        )}
                        {notification.priority === 'high' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                            {lang === 'zh' ? '重要' : 'Important'}
                          </span>
                        )}
                      </h4>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {formatTime(notification.time)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.content}
                    </p>
                    {notification.actionUrl && (
                      <button 
                        className="mt-2 text-xs text-orange-600 flex items-center gap-1 hover:text-orange-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: notification.actionUrl } }));
                        }}
                      >
                        {lang === 'zh' ? '查看详情' : 'View Details'}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">
                {lang === 'zh' ? '暂无通知' : 'No notifications'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {lang === 'zh' ? '新的通知将显示在这里' : 'New notifications will appear here'}
              </p>
            </div>
          )}
        </div>
      </div>

      {filteredNotifications.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          {lang === 'zh' ? `共 ${filteredNotifications.length} 条通知` : `${filteredNotifications.length} notifications`}
        </div>
      )}
    </div>
  );
}
