import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Star,
  Award,
  Target,
  Calendar,
  BookOpen,
  BarChart3,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Download
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useStudents, useCourses, useFeedbacks, useTeachers } from '../contexts/AppContext';
import { parseISO, format, isThisMonth, isThisWeek, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInDays, isWithinInterval, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { exportToExcel } from '../utils/export';

export default function TeacherPerformanceView({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { students } = useStudents();
  const { courses } = useCourses();
  const { feedbacks } = useFeedbacks();
  const { teachers } = useTeachers();

  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const currentTeacher = useMemo(() => {
    if (!user) return null;
    return teachers.find((t) => (t as any).userId === user.id || t.name === user.name) || null;
  }, [teachers, user?.id, user?.name]);

  const myCourses = useMemo(() => {
    if (!user) return [];
    const teacherId = currentTeacher?.id;
    return courses.filter(c => c.teacherId === teacherId || c.teacherId === user.id || c.teacherName === user.name);
  }, [courses, currentTeacher?.id, user?.id, user?.name]);

  const myFeedbacks = useMemo(() => {
    if (!user) return [];
    const teacherId = currentTeacher?.id;
    return feedbacks.filter(f => f.teacherId === teacherId || f.teacherId === user.id || f.teacherName === user.name);
  }, [feedbacks, currentTeacher?.id, user?.id, user?.name]);

  const myStudents = useMemo(() => {
    const studentIds = new Set(myCourses.map(c => c.studentId));
    return students.filter(s => studentIds.has(s.id));
  }, [myCourses, students]);

  const performanceData = useMemo(() => {
    const today = new Date();
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

    const thisMonthCourses = myCourses.filter(c => {
      const date = parseISO(c.date);
      return isWithinInterval(date, { start: thisMonthStart, end: thisMonthEnd });
    });

    const lastMonthCourses = myCourses.filter(c => {
      const date = parseISO(c.date);
      return isWithinInterval(date, { start: lastMonthStart, end: lastMonthEnd });
    });

    const completedThisMonth = thisMonthCourses.filter(c => c.status === 'completed');
    const completedLastMonth = lastMonthCourses.filter(c => c.status === 'completed');

    const totalHours = completedThisMonth.length;
    const lastMonthHours = completedLastMonth.length;
    const monthlyTrend = lastMonthHours > 0 
      ? ((totalHours - lastMonthHours) / lastMonthHours) * 100 
      : totalHours > 0 ? 100 : 0;

    const uniqueStudents = new Set(myCourses.map(c => c.studentId));
    const activeStudents = new Set(
      myCourses
        .filter(c => {
          const date = parseISO(c.date);
          return differenceInDays(today, date) <= 30;
        })
        .map(c => c.studentId)
    );

    const completionRate = thisMonthCourses.length > 0
      ? (completedThisMonth.length / thisMonthCourses.length) * 100
      : 0;

    const weeklyHours = Math.round(totalHours / 4 * 10) / 10;

    const monthFeedbacks = myFeedbacks.filter(f => {
      const date = parseISO(f.date);
      return isWithinInterval(date, { start: thisMonthStart, end: thisMonthEnd });
    });

    const avgRating = monthFeedbacks.length > 0
      ? monthFeedbacks.reduce((sum, f) => sum + f.rating, 0) / monthFeedbacks.length
      : 0;

    const retentionRate = uniqueStudents.size > 0
      ? (activeStudents.size / uniqueStudents.size) * 100
      : 0;

    return {
      totalCourses: thisMonthCourses.length,
      completedCourses: completedThisMonth.length,
      completionRate,
      totalHours,
      weeklyHours,
      monthlyTrend,
      studentCount: uniqueStudents.size,
      activeStudentCount: activeStudents.size,
      retentionRate,
      avgRating,
      feedbackCount: monthFeedbacks.length
    };
  }, [myCourses, myFeedbacks]);

  const monthlyTrendData = useMemo(() => {
    const today = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(today, 5),
      end: today
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthCourses = myCourses.filter(c => {
        const date = parseISO(c.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd }) && c.status === 'completed';
      });

      const monthFeedbacks = myFeedbacks.filter(f => {
        const date = parseISO(f.date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      });

      const avgRating = monthFeedbacks.length > 0
        ? monthFeedbacks.reduce((sum, f) => sum + f.rating, 0) / monthFeedbacks.length
        : 0;

      return {
        name: format(month, lang === 'zh' ? 'M月' : 'MMM'),
        hours: monthCourses.length,
        rating: Number(avgRating.toFixed(1)),
        students: new Set(monthCourses.map(c => c.studentId)).size
      };
    });
  }, [myCourses, myFeedbacks, lang]);

  const weeklyData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    
    return days.map(day => {
      const dayCourses = myCourses.filter(c => {
        const courseDate = parseISO(c.date);
        return courseDate.toDateString() === day.toDateString();
      });
      return {
        name: format(day, lang === 'zh' ? 'EEE' : 'EEE', { locale: lang === 'zh' ? zhCN : undefined }),
        courses: dayCourses.length,
        hours: dayCourses.length
      };
    });
  }, [myCourses, lang]);

  const radarData = useMemo(() => {
    return [
      {
        subject: lang === 'zh' ? '课时量' : 'Hours',
        A: Math.min(performanceData.totalHours / 40 * 100, 100),
        fullMark: 100,
      },
      {
        subject: lang === 'zh' ? '完成率' : 'Completion',
        A: performanceData.completionRate,
        fullMark: 100,
      },
      {
        subject: lang === 'zh' ? '学员评分' : 'Rating',
        A: performanceData.avgRating * 20,
        fullMark: 100,
      },
      {
        subject: lang === 'zh' ? '学员留存' : 'Retention',
        A: performanceData.retentionRate,
        fullMark: 100,
      },
      {
        subject: lang === 'zh' ? '活跃学员' : 'Active Students',
        A: Math.min(performanceData.activeStudentCount / 20 * 100, 100),
        fullMark: 100,
      },
    ];
  }, [performanceData, lang]);

  const recentFeedbacks = useMemo(() => {
    return myFeedbacks
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [myFeedbacks]);

  const statsCards = [
    {
      title: lang === 'zh' ? '本月课时' : 'Monthly Hours',
      value: performanceData.totalHours,
      suffix: lang === 'zh' ? '节' : 'hrs',
      icon: Clock,
      gradient: 'from-blue-500 to-cyan-500',
      trend: performanceData.monthlyTrend,
      bg: 'bg-blue-50',
      text: 'text-blue-600'
    },
    {
      title: lang === 'zh' ? '完成率' : 'Completion',
      value: performanceData.completionRate.toFixed(1),
      suffix: '%',
      icon: Target,
      gradient: 'from-green-500 to-emerald-500',
      bg: 'bg-green-50',
      text: 'text-green-600'
    },
    {
      title: lang === 'zh' ? '平均评分' : 'Avg Rating',
      value: performanceData.avgRating.toFixed(1),
      suffix: '/5',
      icon: Star,
      gradient: 'from-amber-500 to-orange-500',
      bg: 'bg-amber-50',
      text: 'text-amber-600'
    },
    {
      title: lang === 'zh' ? '学员留存' : 'Retention',
      value: performanceData.retentionRate.toFixed(1),
      suffix: '%',
      icon: Users,
      gradient: 'from-purple-500 to-pink-500',
      bg: 'bg-purple-50',
      text: 'text-purple-600'
    }
  ];

  const exportPerformanceData = () => {
    const exportData = [{
      '月份': format(new Date(), 'yyyy年MM月'),
      '总课时': performanceData.totalHours,
      '周均课时': performanceData.weeklyHours,
      '完成课程': performanceData.completedCourses,
      '完成率': `${performanceData.completionRate.toFixed(1)}%`,
      '学员数': performanceData.studentCount,
      '活跃学员': performanceData.activeStudentCount,
      '学员留存率': `${performanceData.retentionRate.toFixed(1)}%`,
      '平均评分': performanceData.avgRating.toFixed(1),
      '反馈数量': performanceData.feedbackCount,
      '环比增长': `${performanceData.monthlyTrend.toFixed(1)}%`
    }];
    exportToExcel(exportData, `绩效报告_${format(new Date(), 'yyyy年MM月')}`, '绩效数据');
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
            <TrendingUp className="w-6 h-6 text-blue-500" />
            {lang === 'zh' ? '我的绩效' : 'My Performance'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '查看个人绩效数据和工作表现' : 'View personal performance data and work performance'}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">{lang === 'zh' ? '本周' : 'This Week'}</option>
            <option value="month">{lang === 'zh' ? '本月' : 'This Month'}</option>
            <option value="year">{lang === 'zh' ? '本年' : 'This Year'}</option>
          </select>
          <button
            onClick={exportPerformanceData}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === 'zh' ? '导出' : 'Export'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <div key={index} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <span className="text-sm text-gray-500">{card.suffix}</span>
                </div>
                {card.trend !== undefined && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${card.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {card.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{Math.abs(card.trend).toFixed(1)}%</span>
                  </div>
                )}
              </div>
              <div className={`w-10 h-10 rounded-full ${card.bg} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.text}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            {lang === 'zh' ? '月度趋势' : 'Monthly Trend'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="hours"
                  name={lang === 'zh' ? '课时' : 'Hours'}
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="rating"
                  name={lang === 'zh' ? '评分' : 'Rating'}
                  stroke="#F59E0B"
                  strokeWidth={3}
                  dot={{ fill: '#F59E0B', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            {lang === 'zh' ? '能力雷达' : 'Performance Radar'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name={lang === 'zh' ? '我的表现' : 'My Performance'}
                  dataKey="A"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.5}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-600" />
          {lang === 'zh' ? '本周课程分布' : 'Weekly Course Distribution'}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="courses" name={lang === 'zh' ? '课程数' : 'Courses'} fill="#10B981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-600" />
            {lang === 'zh' ? '最近评价' : 'Recent Feedbacks'}
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {recentFeedbacks.length > 0 ? recentFeedbacks.map((feedback, index) => {
            const student = students.find(s => s.id === feedback.studentId);
            return (
              <div key={index} className="p-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-amber-700">
                        {student?.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student?.name || '未知学员'}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{feedback.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(parseISO(feedback.date), 'MM-dd')}
                    </span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">
                {lang === 'zh' ? '暂无评价' : 'No feedbacks yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-2">
              {lang === 'zh' ? '本月工作总结' : 'Monthly Summary'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-sm text-white/80">{lang === 'zh' ? '总课时' : 'Total Hours'}</p>
                <p className="text-2xl font-bold">{performanceData.totalHours}</p>
              </div>
              <div>
                <p className="text-sm text-white/80">{lang === 'zh' ? '完成课程' : 'Completed'}</p>
                <p className="text-2xl font-bold">{performanceData.completedCourses}</p>
              </div>
              <div>
                <p className="text-sm text-white/80">{lang === 'zh' ? '服务学员' : 'Students'}</p>
                <p className="text-2xl font-bold">{performanceData.studentCount}</p>
              </div>
              <div>
                <p className="text-sm text-white/80">{lang === 'zh' ? '收到评价' : 'Feedbacks'}</p>
                <p className="text-2xl font-bold">{performanceData.feedbackCount}</p>
              </div>
            </div>
          </div>
          <Award className="w-20 h-20 text-white/20 hidden md:block" />
        </div>
      </div>
    </div>
  );
}
