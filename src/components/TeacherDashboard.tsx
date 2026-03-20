import React, { useMemo, useState } from 'react';
import { Calendar, MessageSquare, Loader2, Clock, Users, CheckCircle, Star, TrendingUp, BookOpen, Award, Plus, ChevronRight, Sparkles, Heart, Bell } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useCourses, useStudents, useTeachers } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { parseISO, isToday, isAfter, format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function TeacherDashboard({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const { students, loading: studentsLoading } = useStudents();
  const { teachers, loading: teachersLoading } = useTeachers();
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'students'>('overview');

  const loading = coursesLoading || studentsLoading || teachersLoading;

  const currentTeacher = useMemo(() => {
    if (!user) return null;
    return teachers.find((t) => (t as any).userId === user.id || t.name === user.name) || null;
  }, [teachers, user?.id, user?.name]);

  const teacherCourses = useMemo(() => {
    if (!user) return [];
    const teacherId = currentTeacher?.id;
    return courses.filter(c => c.teacherId === teacherId || c.teacherId === user.id || c.teacherName === user.name);
  }, [courses, currentTeacher?.id, user?.id, user?.name]);

  const myStudents = useMemo(() => {
    const studentIds = new Set(teacherCourses.map(c => c.studentId));
    return students.filter(s => studentIds.has(s.id));
  }, [teacherCourses, students]);

  const todayCourses = useMemo(() => {
    return teacherCourses
      .filter(c => {
        const courseDate = parseISO(c.date);
        return isToday(courseDate) && c.status === 'scheduled';
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [teacherCourses]);

  const upcomingCourses = useMemo(() => {
    const now = new Date();
    return teacherCourses
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
  }, [teacherCourses]);

  const completedCount = useMemo(() => {
    return teacherCourses.filter(c => c.status === 'completed').length;
  }, [teacherCourses]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return days.map(day => {
      const dayCourses = teacherCourses.filter(c => {
        const courseDate = parseISO(c.date);
        return courseDate.toDateString() === day.toDateString();
      });
      return {
        name: format(day, lang === 'zh' ? 'EEE' : 'EEE', { locale: lang === 'zh' ? zhCN : undefined }),
        courses: dayCourses.length,
        hours: dayCourses.length * 1
      };
    });
  }, [teacherCourses, lang]);

  const levelDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    myStudents.forEach(student => {
      distribution[student.level] = (distribution[student.level] || 0) + 1;
    });
    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [myStudents]);

  const stats = useMemo(() => ({
    todayCount: todayCourses.length,
    upcomingCount: upcomingCourses.length,
    completedCount,
    studentCount: myStudents.length,
    totalCourses: teacherCourses.length,
    weeklyHours: weeklyData.reduce((sum, d) => sum + d.hours, 0)
  }), [todayCourses, upcomingCourses, completedCount, myStudents, teacherCourses, weeklyData]);

  const statCards = [
    {
      title: lang === 'zh' ? '今日课程' : 'Today',
      value: stats.todayCount,
      icon: Calendar,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      text: 'text-blue-600'
    },
    {
      title: lang === 'zh' ? '待上课程' : 'Upcoming',
      value: stats.upcomingCount,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      text: 'text-amber-600'
    },
    {
      title: lang === 'zh' ? '已完成' : 'Completed',
      value: stats.completedCount,
      icon: CheckCircle,
      gradient: 'from-green-500 to-emerald-500',
      bg: 'bg-green-50',
      text: 'text-green-600'
    },
    {
      title: lang === 'zh' ? '我的学员' : 'Students',
      value: stats.studentCount,
      icon: Users,
      gradient: 'from-purple-500 to-pink-500',
      bg: 'bg-purple-50',
      text: 'text-purple-600'
    }
  ];

  const quickActions = [
    {
      title: lang === 'zh' ? '新建课程' : 'New Class',
      icon: Plus,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      action: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'schedule' } }))
    },
    {
      title: lang === 'zh' ? '发送消息' : 'Send Message',
      icon: MessageSquare,
      color: 'text-green-600',
      bg: 'bg-green-50',
      action: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'messages' } }))
    },
    {
      title: lang === 'zh' ? '学员点评' : 'Give Feedback',
      icon: Star,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      action: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'feedback' } }))
    },
    {
      title: lang === 'zh' ? '查看通知' : 'Notifications',
      icon: Bell,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      action: () => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'notifications' } }))
    }
  ];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-[#4ECDC4] animate-spin mx-auto" />
            <Sparkles className="w-6 h-6 text-[#FFE66D] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="mt-4 text-gray-500">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20 md:pb-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            {lang === 'zh' ? '教师工作台' : 'Teacher Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Heart className="w-4 h-4 text-[#FF6B6B]" />
            {lang === 'zh' ? '管理您的课程和学员' : 'Manage your classes and students'}
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'feedback' }}))}
            className="flex-1 sm:flex-none bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-gray-900 px-4 py-2.5 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-md"
          >
            <Star className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === 'zh' ? '写点评' : 'Review'}</span>
          </button>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'homework' }}))}
            className="flex-1 sm:flex-none bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white px-4 py-2.5 rounded-xl hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-[#4ECDC4]/30"
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === 'zh' ? '布置作业' : 'Homework'}</span>
          </button>
        </div>
      </div>

      <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            activeTab === 'overview' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {lang === 'zh' ? '概览' : 'Overview'}
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            activeTab === 'schedule' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {lang === 'zh' ? '课程安排' : 'Schedule'}
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
            activeTab === 'students' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {lang === 'zh' ? '学员管理' : 'Students'}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((card, index) => (
              <div key={index} className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <div className={`absolute top-0 right-0 w-20 h-20 rounded-bl-full bg-gradient-to-br ${card.gradient} opacity-10`} />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                    <card.icon className={`w-6 h-6 ${card.text}`} />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{card.title}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                {lang === 'zh' ? '本周课程趋势' : 'Weekly Course Trend'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorCourses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Area type="monotone" dataKey="courses" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCourses)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                {lang === 'zh' ? '学员级别分布' : 'Student Levels'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={levelDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {todayCourses.length > 0 && (
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {lang === 'zh' ? '今日课程' : "Today's Classes"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {todayCourses.map(course => (
                  <div key={course.id} className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">{course.title}</p>
                        <p className="text-sm text-white/80">{course.studentName} • {course.room}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{course.startTime}</p>
                        <p className="text-xs text-white/80">{course.endTime}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-lg ${action.bg} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <p className="font-medium text-gray-900 text-sm">{action.title}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                {lang === 'zh' ? '即将上课' : 'Upcoming Classes'}
              </h3>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'schedule' } }))}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {lang === 'zh' ? '查看全部' : 'View All'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {upcomingCourses.map(course => {
                const courseDate = parseISO(course.date);
                const dateStr = format(courseDate, lang === 'zh' ? 'M月d日' : 'MMM d', { locale: lang === 'zh' ? zhCN : undefined });
                
                return (
                  <div key={course.id} className="flex items-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-100/50 transition">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-center min-w-[4rem]">
                      <p className="text-xs text-gray-500">{dateStr}</p>
                      <p className="text-lg font-bold text-gray-900">{course.startTime}</p>
                    </div>
                    <div className="ml-4 flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">{course.title}</h4>
                      <p className="text-sm text-gray-500">{course.studentName} • {course.room}</p>
                    </div>
                    <button 
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 px-4 py-2 rounded-lg hover:bg-blue-50 transition"
                      onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'feedback' } }))}
                    >
                      <Star className="w-4 h-4" />
                      {lang === 'zh' ? '点评' : 'Review'}
                    </button>
                  </div>
                );
              })}
              {upcomingCourses.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg">{lang === 'zh' ? '暂无待上课程' : 'No upcoming classes'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                {lang === 'zh' ? '我的学员' : 'My Students'}
              </h3>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'students' } }))}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                {lang === 'zh' ? '查看全部' : 'View All'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myStudents.slice(0, 6).map(student => (
                <div key={student.id} className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition cursor-pointer">
                  <img
                    src={student.avatar || `https://picsum.photos/seed/${student.id}/100/100`}
                    alt={student.name}
                    className="w-14 h-14 rounded-full border-2 border-white shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.level}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <BookOpen className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">{student.remainingHours} {lang === 'zh' ? '课时剩余' : 'hours left'}</span>
                    </div>
                  </div>
                </div>
              ))}
              {myStudents.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg">{lang === 'zh' ? '暂无学员' : 'No students'}</p>
                </div>
              )}
            </div>
            {myStudents.length > 6 && (
              <button 
                className="w-full mt-4 py-3 text-sm text-blue-600 hover:text-blue-700 font-medium rounded-xl hover:bg-blue-50 transition"
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'students' } }))}
              >
                {lang === 'zh' ? `查看全部 ${myStudents.length} 位学员` : `View all ${myStudents.length} students`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
