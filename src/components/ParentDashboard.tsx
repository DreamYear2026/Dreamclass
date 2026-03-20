import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Clock, ChevronRight, User, Loader2, CheckCircle, Star, BookOpen, MessageSquare, Bell, CreditCard, Sparkles, Heart } from 'lucide-react';
import { Language, Payment, Notification, Homework } from '../types';
import { useStudents, useCourses, useFeedbacks } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { parseISO, isAfter, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { api } from '../services/api';

export default function ParentDashboard({ lang, studentId }: { lang: Language; studentId?: string }) {
  const { students, loading: studentsLoading } = useStudents();
  const { courses, loading: coursesLoading } = useCourses();
  const { feedbacks, loading: feedbacksLoading } = useFeedbacks();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'progress'>('overview');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [extraLoading, setExtraLoading] = useState(false);

  const loading = studentsLoading || coursesLoading || feedbacksLoading || extraLoading;

  const student = useMemo(() => {
    if (studentId) return students.find(s => s.id === studentId || s.userId === studentId) || null;
    if (user) return students.find(s => s.userId === user.id) || null;
    return null;
  }, [students, studentId, user?.id]);
  const studentCourses = student ? courses.filter(c => c.studentId === student.id) : [];

  useEffect(() => {
    if (!user || !student) return;
    let mounted = true;
    const loadExtras = async () => {
      try {
        setExtraLoading(true);
        const [notificationData, paymentData, homeworkData] = await Promise.all([
          api.getNotifications(user.id),
          api.getPayments(student.id),
          api.getHomeworks(),
        ]);
        if (!mounted) return;
        setNotifications(notificationData);
        setPayments(paymentData);
        setHomeworks(homeworkData.filter((h) => h.studentId === student.id));
      } catch {
        if (!mounted) return;
        setNotifications([]);
        setPayments([]);
        setHomeworks([]);
      } finally {
        if (mounted) setExtraLoading(false);
      }
    };
    loadExtras();
    return () => {
      mounted = false;
    };
  }, [user?.id, student?.id]);

  const upcomingCourses = useMemo(() => {
    const now = new Date();
    return studentCourses
      .filter(c => {
        const courseDate = parseISO(c.date);
        return isAfter(courseDate, now) && c.status === 'scheduled';
      })
      .sort((a, b) => {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  }, [studentCourses]);

  const completedCourses = useMemo(() => {
    return studentCourses.filter(c => c.status === 'completed');
  }, [studentCourses]);

  const unreadNotifications = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );
  const pendingHomeworkCount = useMemo(
    () => homeworks.filter((h) => h.status === 'pending').length,
    [homeworks]
  );
  const recentPayments = useMemo(() => {
    return payments
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [payments]);
  const latestFeedback = useMemo(() => {
    if (!student) return null;
    const scoped = feedbacks
      .filter((f) => f.studentId === student.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return scoped[0] || null;
  }, [feedbacks, student?.id]);
  const contactTeacherId = useMemo(() => {
    return upcomingCourses[0]?.teacherId || latestFeedback?.teacherId || null;
  }, [upcomingCourses, latestFeedback?.teacherId]);

  const statCards = student ? [
    {
      title: lang === 'zh' ? '剩余课时' : 'Hours Left',
      value: student.remainingHours,
      icon: Clock,
      gradient: 'from-[#FF6B6B] to-[#FF8E8E]',
      bg: 'bg-red-50',
      text: 'text-[#FF6B6B]',
      emoji: '⏰'
    },
    {
      title: lang === 'zh' ? '已完成课程' : 'Completed',
      value: completedCourses.length,
      icon: CheckCircle,
      gradient: 'from-[#95E1A3] to-[#7DD389]',
      bg: 'bg-green-50',
      text: 'text-[#95E1A3]',
      emoji: '✅'
    },
    {
      title: lang === 'zh' ? '待完成作业' : 'Pending Homework',
      value: pendingHomeworkCount,
      icon: BookOpen,
      gradient: 'from-[#4ECDC4] to-[#7EDDD6]',
      bg: 'bg-teal-50',
      text: 'text-[#4ECDC4]',
      emoji: '📝'
    },
    {
      title: lang === 'zh' ? '未读通知' : 'Unread Notices',
      value: unreadNotifications,
      icon: Bell,
      gradient: 'from-[#A29BFE] to-[#B8B3FF]',
      bg: 'bg-purple-50',
      text: 'text-[#A29BFE]',
      emoji: '🔔'
    }
  ] : [];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-[#FF6B6B] animate-spin mx-auto" />
            <Sparkles className="w-6 h-6 text-[#FFE66D] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="mt-4 text-gray-500">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">{lang === 'zh' ? '暂无学员信息' : 'No student information'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 animate-fade-in">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#FF6B6B] via-[#FF8E8E] to-[#4ECDC4] rounded-3xl p-6 shadow-xl">
        <div className="absolute top-4 right-4 animate-float">
          <Star className="w-6 h-6 text-[#FFE66D] fill-[#FFE66D] opacity-80" />
        </div>
        <div className="absolute bottom-4 left-4 animate-float" style={{ animationDelay: '1s' }}>
          <Heart className="w-5 h-5 text-white fill-white opacity-60" />
        </div>
        <div className="absolute top-1/2 right-8 animate-float" style={{ animationDelay: '0.5s' }}>
          <Sparkles className="w-4 h-4 text-[#FFE66D] opacity-70" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">{lang === 'zh' ? '下节课' : 'Next Class'}</h3>
              <p className="text-white/80 text-sm">{lang === 'zh' ? '准备好上课了吗？' : 'Ready for class?'}</p>
            </div>
          </div>
          
          {upcomingCourses.length > 0 ? (
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
              {upcomingCourses.slice(0, 1).map(course => {
                const courseDate = parseISO(course.date);
                return (
                  <div key={course.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white/90 bg-white/20 px-3 py-1 rounded-full">
                        {format(courseDate, lang === 'zh' ? 'M月d日' : 'MMM d', { locale: lang === 'zh' ? zhCN : undefined })}
                      </span>
                      <span className="text-lg font-bold text-white">{course.startTime}</span>
                    </div>
                    <h4 className="font-bold text-white text-lg">{course.title}</h4>
                    <p className="text-sm text-white/80 flex items-center gap-1 mt-1">
                      <User className="w-4 h-4" />
                      {course.teacherName}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-white/80">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-60" />
              <p className="text-sm">{lang === 'zh' ? '暂无课程安排' : 'No classes scheduled'}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex space-x-2 bg-gradient-to-r from-gray-100 to-gray-50 p-1.5 rounded-2xl shadow-inner">
        {[
          { id: 'overview', label: lang === 'zh' ? '概览' : 'Overview', emoji: '📊' },
          { id: 'schedule', label: lang === 'zh' ? '课程安排' : 'Schedule', emoji: '📅' },
          { id: 'progress', label: lang === 'zh' ? '学习进度' : 'Progress', emoji: '📈' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-lg transform scale-[1.02]'
                : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
            }`}
          >
            <span className="text-base">{tab.emoji}</span>
            <span className="text-sm">{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-slide-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((card, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-[#FFE66D]/30"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-gradient-to-br ${card.gradient} opacity-10`} />
                <div className="absolute -top-2 -right-2 text-3xl opacity-20">{card.emoji}</div>
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-3 shadow-sm`}>
                    <card.icon className={`w-6 h-6 ${card.text}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{card.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-4 animate-slide-in">
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                {lang === 'zh' ? '课程安排' : 'Class Schedule'}
              </h3>
            </div>
            <div className="space-y-3">
              {upcomingCourses.map((course, idx) => {
                const courseDate = parseISO(course.date);
                const dateStr = format(courseDate, lang === 'zh' ? 'M月d日 EEEE' : 'EEEE, MMM d', { locale: lang === 'zh' ? zhCN : undefined });
                
                return (
                  <div
                    key={course.id}
                    className="flex items-center p-4 rounded-2xl border-2 border-gray-100 bg-gradient-to-r from-gray-50 to-white hover:from-[#FF6B6B]/5 hover:to-[#4ECDC4]/5 hover:border-[#FFE66D]/30 transition-all duration-300 group"
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100 text-center min-w-[4.5rem] group-hover:shadow-lg transition-shadow">
                      <p className="text-xs text-gray-500">{dateStr}</p>
                      <p className="text-lg font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">{course.startTime}</p>
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">{course.title}</h4>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {course.teacherName} • {course.room}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#FF6B6B] transition-colors" />
                  </div>
                );
              })}
              {upcomingCourses.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-lg">{lang === 'zh' ? '暂无课程安排' : 'No classes scheduled'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-6 animate-slide-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#95E1A3] to-[#7DD389] rounded-lg flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                {lang === 'zh' ? '课程完成记录' : 'Course Completion'}
              </h3>
              <div className="space-y-3">
                {completedCourses.slice(-5).reverse().map((course, idx) => {
                  const courseDate = parseISO(course.date);
                  return (
                    <div
                      key={course.id}
                      className="flex items-center p-3 rounded-xl border border-gray-100 bg-gradient-to-r from-green-50 to-white hover:shadow-md transition-all"
                      style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#95E1A3] to-[#7DD389] flex items-center justify-center shadow-sm">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">{course.title}</h4>
                        <p className="text-xs text-gray-500">
                          {format(courseDate, lang === 'zh' ? 'M月d日' : 'MMM d', { locale: lang === 'zh' ? zhCN : undefined })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {completedCourses.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{lang === 'zh' ? '暂无完成记录' : 'No completion records'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                {lang === 'zh' ? '老师反馈' : 'Teacher Feedback'}
              </h3>
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#4ECDC4]/10 to-[#FFE66D]/10 border border-[#4ECDC4]/20">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i <= (latestFeedback?.rating || 0) ? 'text-[#FFE66D] fill-[#FFE66D]' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed italic">
                    "{latestFeedback?.content || (lang === 'zh' ? '暂无最新反馈' : 'No recent feedback')}"
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {latestFeedback ? `${lang === 'zh' ? '— 最新于 ' : '— Updated '} ${format(parseISO(latestFeedback.date), 'MM-dd HH:mm')}` : (lang === 'zh' ? '— 待老师更新' : '— Waiting for update')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#FFE66D]" />
                {lang === 'zh' ? '快捷链接' : 'Quick Links'}
              </h3>
              <div className="mb-3 text-xs text-gray-500">
                {lang === 'zh' ? `待缴费用：¥${pendingPayments.toLocaleString()}` : `Pending payments: ¥${pendingPayments.toLocaleString()}`}
              </div>
              <div className="space-y-2">
                <QuickLink
                  icon={<Calendar className="w-4 h-4" />}
                  label={lang === 'zh' ? '申请调课' : 'Request Reschedule'}
                  color="#FF6B6B"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'schedule' } }))}
                />
                <QuickLink
                  icon={<MessageSquare className="w-4 h-4" />}
                  label={lang === 'zh' ? '联系老师' : 'Contact Teacher'}
                  color="#4ECDC4"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'messages', teacherId: contactTeacherId } }))}
                />
                <QuickLink
                  icon={<Bell className="w-4 h-4" />}
                  label={lang === 'zh' ? '学校通知' : 'School Announcements'}
                  color="#A29BFE"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'parent-notifications' } }))}
                />
                <QuickLink
                  icon={<CreditCard className="w-4 h-4" />}
                  label={lang === 'zh' ? '账单记录' : 'Billing History'}
                  color="#95E1A3"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'payments' } }))}
                />
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-[#95E1A3] to-[#7DD389] rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                {lang === 'zh' ? '最近消费' : 'Recent Billing'}
              </h3>
              <div className="space-y-3">
                {recentPayments.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <CreditCard className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">{lang === 'zh' ? '暂无消费记录' : 'No billing records'}</p>
                  </div>
                ) : recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-50 to-white border border-green-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#95E1A3] to-[#7DD389] flex items-center justify-center shadow-sm">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.description || (lang === 'zh' ? '购买课时' : 'Purchase Hours')}</p>
                        <p className="text-xs text-gray-500">{format(parseISO(p.date), 'yyyy-MM-dd')}</p>
                      </div>
                    </div>
                    <p className="font-bold bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] bg-clip-text text-transparent">¥{p.amount.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLink({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-all text-left group">
      <div className="flex items-center text-gray-700 group-hover:text-gray-900 transition">
        <div className="p-2 rounded-lg mr-3 transition" style={{ backgroundColor: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
    </button>
  );
}
