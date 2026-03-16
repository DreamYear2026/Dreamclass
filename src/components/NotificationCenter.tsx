import React, { useState, useEffect, useMemo } from 'react';
import { Bell, X, Clock, AlertTriangle, CheckCircle, Info, Calendar } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useCourses, useStudents } from '../contexts/AppContext';
import { useStudentByUser } from '../hooks/useStudentByUser';
import { parseISO, isToday, isAfter, differenceInHours, differenceInMinutes, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success' | 'reminder';
  title: string;
  message: string;
  time: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationCenterProps {
  lang: Language;
}

export default function NotificationCenter({ lang }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const { courses } = useCourses();
  const { students } = useStudents();
  const { student: myStudent } = useStudentByUser();

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const newNotifications: Notification[] = [];

    if (user?.role === 'parent' && myStudent) {
      if (myStudent.remainingHours < 5) {
        newNotifications.push({
          id: 'low-hours',
          type: 'warning',
          title: lang === 'zh' ? '课时不足提醒' : 'Low Hours Warning',
          message: lang === 'zh' 
            ? `${myStudent.name}剩余课时仅剩 ${myStudent.remainingHours} 节，请及时续费`
            : `${myStudent.name} has only ${myStudent.remainingHours} hours left, please renew`,
          time: new Date(),
          read: false,
        });
      }

      const now = new Date();
      const upcomingCourses = courses
        .filter(c => c.studentId === myStudent.id && c.status === 'scheduled')
        .filter(c => {
          const courseDate = parseISO(c.date);
          const [hours, minutes] = c.startTime.split(':').map(Number);
          courseDate.setHours(hours, minutes, 0, 0);
          const diffHours = differenceInHours(courseDate, now);
          return diffHours > 0 && diffHours <= 24;
        });

      upcomingCourses.forEach(course => {
        const courseDate = parseISO(course.date);
        const [hours, minutes] = course.startTime.split(':').map(Number);
        courseDate.setHours(hours, minutes, 0, 0);
        const diffHours = differenceInHours(courseDate, new Date());
        const diffMinutes = differenceInMinutes(courseDate, new Date());

        newNotifications.push({
          id: `course-${course.id}`,
          type: 'reminder',
          title: lang === 'zh' ? '课程提醒' : 'Class Reminder',
          message: lang === 'zh'
            ? `${course.title} 将在 ${diffHours > 0 ? `${diffHours}小时` : `${diffMinutes}分钟`}后开始`
            : `${course.title} starts in ${diffHours > 0 ? `${diffHours} hours` : `${diffMinutes} minutes`}`,
          time: new Date(),
          read: false,
        });
      });
    }

    if (user?.role === 'teacher') {
      const todayCourses = courses.filter(c => 
        c.teacherId === user.id && 
        c.status === 'scheduled' &&
        isToday(parseISO(c.date))
      );

      if (todayCourses.length > 0) {
        newNotifications.push({
          id: 'today-classes',
          type: 'info',
          title: lang === 'zh' ? '今日课程' : "Today's Classes",
          message: lang === 'zh'
            ? `今天有 ${todayCourses.length} 节课程待上`
            : `You have ${todayCourses.length} classes today`,
          time: new Date(),
          read: false,
        });
      }
    }

    if (user?.role === 'admin') {
      const lowHoursStudents = students.filter(s => s.remainingHours < 5);
      if (lowHoursStudents.length > 0) {
        newNotifications.push({
          id: 'admin-low-hours',
          type: 'warning',
          title: lang === 'zh' ? '课时预警' : 'Hours Warning',
          message: lang === 'zh'
            ? `有 ${lowHoursStudents.length} 位学员课时不足5节`
            : `${lowHoursStudents.length} students have less than 5 hours`,
          time: new Date(),
          read: false,
        });
      }
    }

    setNotifications(newNotifications);
  }, [user, myStudent, courses, students, lang]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'reminder': return <Clock className="w-5 h-5 text-blue-500" />;
      default: return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBgColor = (type: Notification['type']) => {
    switch (type) {
      case 'warning': return 'bg-amber-50 border-amber-200';
      case 'success': return 'bg-green-50 border-green-200';
      case 'reminder': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">
                {lang === 'zh' ? '通知中心' : 'Notifications'}
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  {lang === 'zh' ? '全部已读' : 'Mark all read'}
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">{lang === 'zh' ? '暂无通知' : 'No notifications'}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 ${!notification.read ? 'bg-blue-50/50' : ''} hover:bg-gray-50 transition cursor-pointer`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {format(notification.time, lang === 'zh' ? 'HH:mm' : 'h:mm a')}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
