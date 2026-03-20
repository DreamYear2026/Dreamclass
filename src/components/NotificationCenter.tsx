import React, { useState, useEffect, useMemo } from 'react';
import { Bell, X, Clock, AlertTriangle, CheckCircle, Info, Calendar, Filter, Settings, BellRing, Trash2, CheckCheck } from 'lucide-react';
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
  category: 'course' | 'finance' | 'system' | 'marketing' | 'other';
  title: string;
  message: string;
  time: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ReminderSettings {
  courseReminder: boolean;
  courseReminderTime: number;
  lowHoursReminder: boolean;
  classCheckInReminder: boolean;
}

interface NotificationCenterProps {
  lang: Language;
}

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  courseReminder: true,
  courseReminderTime: 24,
  lowHoursReminder: true,
  classCheckInReminder: true,
};

const CATEGORIES = [
  { id: 'all', labelZh: '全部', labelEn: 'All' },
  { id: 'course', labelZh: '课程', labelEn: 'Course' },
  { id: 'finance', labelZh: '财务', labelEn: 'Finance' },
  { id: 'system', labelZh: '系统', labelEn: 'System' },
  { id: 'marketing', labelZh: '营销', labelEn: 'Marketing' },
  { id: 'other', labelZh: '其他', labelEn: 'Other' },
];

export default function NotificationCenter({ lang }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() => {
    const saved = localStorage.getItem('reminderSettings');
    return saved ? JSON.parse(saved) : DEFAULT_REMINDER_SETTINGS;
  });
  const { user } = useAuth();
  const { courses } = useCourses();
  const { students } = useStudents();
  const { student: myStudent } = useStudentByUser();

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (selectedCategory === 'all') {
      return notifications;
    }
    return notifications.filter(n => n.category === selectedCategory);
  }, [notifications, selectedCategory]);

  useEffect(() => {
    localStorage.setItem('reminderSettings', JSON.stringify(reminderSettings));
  }, [reminderSettings]);

  useEffect(() => {
    const newNotifications: Notification[] = [];

    if (user?.role === 'parent' && myStudent) {
      if (reminderSettings.lowHoursReminder && myStudent.remainingHours < 5) {
        newNotifications.push({
          id: 'low-hours',
          type: 'warning',
          category: 'finance',
          title: lang === 'zh' ? '课时不足提醒' : 'Low Hours Warning',
          message: lang === 'zh' 
            ? `${myStudent.name}剩余课时仅剩 ${myStudent.remainingHours} 节，请及时续费`
            : `${myStudent.name} has only ${myStudent.remainingHours} hours left, please renew`,
          time: new Date(),
          read: false,
        });
      }

      if (reminderSettings.courseReminder) {
        const now = new Date();
        const upcomingCourses = courses
          .filter(c => c.studentId === myStudent.id && c.status === 'scheduled')
          .filter(c => {
            const courseDate = parseISO(c.date);
            const [hours, minutes] = c.startTime.split(':').map(Number);
            courseDate.setHours(hours, minutes, 0, 0);
            const diffHours = differenceInHours(courseDate, now);
            return diffHours > 0 && diffHours <= reminderSettings.courseReminderTime;
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
            category: 'course',
            title: lang === 'zh' ? '课程提醒' : 'Class Reminder',
            message: lang === 'zh'
              ? `${course.title} 将在 ${diffHours > 0 ? `${diffHours}小时` : `${diffMinutes}分钟`}后开始`
              : `${course.title} starts in ${diffHours > 0 ? `${diffHours} hours` : `${diffMinutes} minutes`}`,
            time: new Date(),
            read: false,
          });
        });
      }
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
          category: 'course',
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
          category: 'finance',
          title: lang === 'zh' ? '课时预警' : 'Hours Warning',
          message: lang === 'zh'
            ? `有 ${lowHoursStudents.length} 位学员课时不足5节`
            : `${lowHoursStudents.length} students have less than 5 hours`,
          time: new Date(),
          read: false,
        });
      }
    }

    setNotifications(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const updated = [...prev];
      
      newNotifications.forEach(n => {
        if (!existingIds.has(n.id)) {
          updated.unshift(n);
        }
      });
      
      return updated.slice(0, 50);
    });
  }, [user, myStudent, courses, students, lang, reminderSettings]);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
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

  const getCategoryLabel = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return lang === 'zh' ? cat?.labelZh : cat?.labelEn;
  };

  if (showSettings) {
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
              onClick={() => { setIsOpen(false); setShowSettings(false); }}
            />
            <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                  <h3 className="font-bold text-gray-900">
                    {lang === 'zh' ? '提醒设置' : 'Reminder Settings'}
                  </h3>
                </div>
              </div>

              <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {lang === 'zh' ? '课程提醒' : 'Course Reminders'}
                      </span>
                    </div>
                    <button
                      onClick={() => setReminderSettings(prev => ({
                        ...prev,
                        courseReminder: !prev.courseReminder
                      }))}
                      className={`w-11 h-6 rounded-full transition ${
                        reminderSettings.courseReminder ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                        reminderSettings.courseReminder ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  
                  {reminderSettings.courseReminder && (
                    <div className="ml-6 space-y-2">
                      <label className="text-xs text-gray-500">
                        {lang === 'zh' ? '提前提醒时间（小时）' : 'Remind before (hours)'}
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 6, 12, 24].map(hours => (
                          <button
                            key={hours}
                            onClick={() => setReminderSettings(prev => ({
                              ...prev,
                              courseReminderTime: hours
                            }))}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                              reminderSettings.courseReminderTime === hours
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {hours}h
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {lang === 'zh' ? '课时不足提醒' : 'Low Hours Reminder'}
                    </span>
                  </div>
                  <button
                    onClick={() => setReminderSettings(prev => ({
                      ...prev,
                      lowHoursReminder: !prev.lowHoursReminder
                    }))}
                    className={`w-11 h-6 rounded-full transition ${
                      reminderSettings.lowHoursReminder ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                      reminderSettings.lowHoursReminder ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {lang === 'zh' ? '签到提醒' : 'Check-in Reminder'}
                    </span>
                  </div>
                  <button
                    onClick={() => setReminderSettings(prev => ({
                      ...prev,
                      classCheckInReminder: !prev.classCheckInReminder
                    }))}
                    className={`w-11 h-6 rounded-full transition ${
                      reminderSettings.classCheckInReminder ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                      reminderSettings.classCheckInReminder ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

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
            <div className="p-4 border-b border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900">
                  {lang === 'zh' ? '通知中心' : 'Notifications'}
                </h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 hover:bg-gray-100 rounded-lg text-blue-600"
                      title={lang === 'zh' ? '全部已读' : 'Mark all read'}
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"
                    title={lang === 'zh' ? '提醒设置' : 'Reminder Settings'}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {lang === 'zh' ? cat.labelZh : cat.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">
                    {lang === 'zh' ? '暂无通知' : 'No notifications'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`p-4 ${!notification.read ? 'bg-blue-50/50' : ''} hover:bg-gray-50 transition cursor-pointer relative group`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {notification.title}
                            </p>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {getCategoryLabel(notification.category)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {format(notification.time, lang === 'zh' ? 'MM-dd HH:mm' : 'MMM d, h:mm a', { locale: lang === 'zh' ? zhCN : undefined })}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                          )}
                          <button
                            onClick={(e) => deleteNotification(notification.id, e)}
                            className="p-1 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition"
                            title={lang === 'zh' ? '删除' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {filteredNotifications.length > 0 && (
              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={clearAllNotifications}
                  className="w-full py-2 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  {lang === 'zh' ? '清空所有通知' : 'Clear all notifications'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
