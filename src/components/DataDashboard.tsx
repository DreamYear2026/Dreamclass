import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, Clock, Award, Target, PieChart, BarChart3, Activity, Zap, RefreshCw, Building2, BookOpen, Star, AlertTriangle, GraduationCap } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useCourses, useTeachers } from '../contexts/AppContext';
import { useToast } from './Toast';
import { parseISO, format, isToday, isThisWeek, isThisMonth, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInDays, differenceInHours } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export default function DataDashboard({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading } = useStudents();
  const { courses, loading: coursesLoading } = useCourses();
  const { teachers, loading: teachersLoading } = useTeachers();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const loading = studentsLoading || coursesLoading || teachersLoading;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastUpdate(new Date());
      setRefreshing(false);
      showToast(lang === 'zh' ? '数据已刷新' : 'Data refreshed', 'success');
    }, 1000);
  };

  const stats = useMemo(() => {
    const today = new Date();
    const todayCourses = courses.filter(c => isToday(parseISO(c.date)));
    const thisWeekCourses = courses.filter(c => isThisWeek(parseISO(c.date)));
    const thisMonthCourses = courses.filter(c => isThisMonth(parseISO(c.date)));
    
    const completedToday = todayCourses.filter(c => c.status === 'completed');
    const completedThisMonth = thisMonthCourses.filter(c => c.status === 'completed');
    
    const activeStudents = students.filter(s => s.remainingHours > 0);
    const expiringStudents = students.filter(s => s.remainingHours <= 5 && s.remainingHours > 0);
    
    const totalRevenue = completedThisMonth.length * 150;
    const lastMonthRevenue = 12500;
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    return {
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      expiringStudents: expiringStudents.length,
      totalTeachers: teachers.filter(t => t.status === 'active').length,
      todayCourses: todayCourses.length,
      completedToday: completedToday.length,
      thisWeekCourses: thisWeekCourses.length,
      thisMonthCourses: thisMonthCourses.length,
      completionRate: todayCourses.length > 0 
        ? Math.round((completedToday.length / todayCourses.length) * 100)
        : 0,
      totalRevenue,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,
      avgRating: 4.8,
    };
  }, [students, courses, teachers]);

  const monthlyTrend = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthCourses = courses.filter(c => {
        const date = parseISO(c.date);
        return date >= monthStart && date <= monthEnd;
      });

      const completed = monthCourses.filter(c => c.status === 'completed');

      return {
        month: format(month, lang === 'zh' ? 'M月' : 'MMM'),
        courses: monthCourses.length,
        completed: completed.length,
        revenue: completed.length * 150,
        students: students.length,
      };
    });
  }, [courses, students, lang]);

  const courseDistribution = useMemo(() => {
    const scheduled = courses.filter(c => c.status === 'scheduled').length;
    const completed = courses.filter(c => c.status === 'completed').length;
    const cancelled = courses.filter(c => c.status === 'cancelled').length;
    
    return [
      { name: lang === 'zh' ? '已安排' : 'Scheduled', value: scheduled, color: '#6366f1' },
      { name: lang === 'zh' ? '已完成' : 'Completed', value: completed, color: '#22c55e' },
      { name: lang === 'zh' ? '已取消' : 'Cancelled', value: cancelled, color: '#ef4444' },
    ];
  }, [courses, lang]);

  const teacherRanking = useMemo(() => {
    return teachers
      .filter(t => t.status === 'active')
      .map(teacher => {
        const teacherCourses = courses.filter(c => 
          c.teacherId === teacher.id && isThisMonth(parseISO(c.date))
        );
        const completed = teacherCourses.filter(c => c.status === 'completed');
        
        return {
          name: teacher.name,
          courses: teacherCourses.length,
          completed: completed.length,
          hours: completed.length,
        };
      })
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);
  }, [teachers, courses]);

  const hourlyDistribution = useMemo(() => {
    const hours = Array.from({ length: 12 }).map((_, i) => {
      const hour = i + 8;
      const hourCourses = courses.filter(c => {
        const startHour = parseInt(c.startTime.split(':')[0], 10);
        return startHour === hour;
      });
      
      return {
        hour: `${hour}:00`,
        count: hourCourses.length,
      };
    });
    
    return hours;
  }, [courses]);

  const studentLevelDistribution = useMemo(() => {
    const levelCounts: { [key: string]: number } = {};
    students.forEach(student => {
      const level = student.level || 'Unknown';
      levelCounts[level] = (levelCounts[level] || 0) + 1;
    });
    
    return Object.entries(levelCounts).map(([name, value]) => ({
      name,
      value,
      color: name === 'Beginner' ? '#22c55e' : 
             name === 'Intermediate' ? '#3b82f6' : 
             name === 'Advanced' ? '#8b5cf6' : '#6b7280'
    }));
  }, [students]);

  const studentGrowthTrend = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const newStudents = students.filter(s => {
        if (!s.createdAt) return false;
        const createdDate = parseISO(s.createdAt);
        return createdDate >= monthStart && createdDate <= monthEnd;
      });
      
      return {
        month: format(month, lang === 'zh' ? 'M月' : 'MMM'),
        newStudents: newStudents.length,
        totalStudents: students.filter(s => {
          if (!s.createdAt) return false;
          return parseISO(s.createdAt) <= monthEnd;
        }).length
      };
    });
  }, [students, lang]);

  const courseCompletionRate = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthCourses = courses.filter(c => {
        const courseDate = parseISO(c.date);
        return courseDate >= monthStart && courseDate <= monthEnd;
      });
      
      const completed = monthCourses.filter(c => c.status === 'completed').length;
      const total = monthCourses.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        month: format(month, lang === 'zh' ? 'M月' : 'MMM'),
        completionRate: rate,
        completed,
        scheduled: total
      };
    });
  }, [courses, lang]);

  const recentActivities = useMemo(() => {
    return [
      { type: 'course', desc: lang === 'zh' ? '小明 完成了课程' : 'Xiaoming completed a course', time: '10分钟前' },
      { type: 'student', desc: lang === 'zh' ? '新学员 小红 报名' : 'New student Xiaohong enrolled', time: '30分钟前' },
      { type: 'payment', desc: lang === 'zh' ? '收到续费 ¥1,500' : 'Received renewal ¥1,500', time: '1小时前' },
      { type: 'review', desc: lang === 'zh' ? '收到家长好评' : 'Received positive review', time: '2小时前' },
      { type: 'course', desc: lang === 'zh' ? '张老师 完成了3节课' : 'Teacher Zhang completed 3 classes', time: '3小时前' },
    ];
  }, [lang]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Activity className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            {lang === 'zh' ? '数据大屏' : 'Data Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '实时数据监控，一目了然' : 'Real-time data monitoring'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {lang === 'zh' ? '最后更新' : 'Last update'}: {format(lastUpdate, 'HH:mm:ss')}
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <Users className="w-8 h-8 text-white/80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              {stats.activeStudents}/{stats.totalStudents}
            </span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalStudents}</p>
          <p className="text-sm text-white/80">{lang === 'zh' ? '学员总数' : 'Total Students'}</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <GraduationCap className="w-8 h-8 text-white/80" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.totalTeachers}</p>
          <p className="text-sm text-white/80">{lang === 'zh' ? '在职教师' : 'Teachers'}</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <Calendar className="w-8 h-8 text-white/80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              {lang === 'zh' ? '今日' : 'Today'}
            </span>
          </div>
          <p className="text-2xl font-bold mt-2">{stats.todayCourses}</p>
          <p className="text-sm text-white/80">{lang === 'zh' ? '今日课程' : 'Classes Today'}</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <Target className="w-8 h-8 text-white/80" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.completionRate}%</p>
          <p className="text-sm text-white/80">{lang === 'zh' ? '完课率' : 'Completion'}</p>
        </div>
        
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <DollarSign className="w-8 h-8 text-white/80" />
            {stats.revenueGrowth >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
          <p className="text-2xl font-bold mt-2">¥{stats.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-white/80">{lang === 'zh' ? '本月营收' : 'Revenue'}</p>
        </div>
        
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <Star className="w-8 h-8 text-white/80" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.avgRating}</p>
          <p className="text-sm text-white/80">{lang === 'zh' ? '平均评分' : 'Avg Rating'}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '营收趋势' : 'Revenue Trend'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name={lang === 'zh' ? '营收' : 'Revenue'}
                  stroke="#6366f1"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '课程分布' : 'Course Distribution'}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={courseDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {courseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {courseDistribution.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '时段分布' : 'Hourly Distribution'}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="hour" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name={lang === 'zh' ? '课程数' : 'Courses'} fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '教师排行' : 'Teacher Ranking'}
          </h3>
          <div className="space-y-3">
            {teacherRanking.map((teacher, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? 'bg-amber-100 text-amber-700' :
                  i === 1 ? 'bg-gray-200 text-gray-700' :
                  i === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{teacher.name}</p>
                  <p className="text-xs text-gray-500">{teacher.hours} {lang === 'zh' ? '课时' : 'hours'}</p>
                </div>
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${(teacher.hours / (teacherRanking[0]?.hours || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '实时动态' : 'Live Activity'}
          </h3>
          <div className="space-y-3">
            {recentActivities.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === 'course' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'student' ? 'bg-green-100 text-green-600' :
                  activity.type === 'payment' ? 'bg-amber-100 text-amber-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {activity.type === 'course' ? <Calendar className="w-4 h-4" /> :
                   activity.type === 'student' ? <Users className="w-4 h-4" /> :
                   activity.type === 'payment' ? <DollarSign className="w-4 h-4" /> :
                   <Star className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-700">{activity.desc}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-4 border border-red-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.expiringStudents}</p>
              <p className="text-sm text-gray-600">{lang === 'zh' ? '即将到期学员' : 'Expiring Students'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.completedToday}</p>
              <p className="text-sm text-gray-600">{lang === 'zh' ? '今日已完成' : 'Completed Today'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{stats.thisWeekCourses}</p>
              <p className="text-sm text-gray-600">{lang === 'zh' ? '本周课程' : 'This Week'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '学员级别分布' : 'Student Level Distribution'}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={studentLevelDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {studentLevelDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2 flex-wrap">
            {studentLevelDistribution.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '学员增长趋势' : 'Student Growth Trend'}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={studentGrowthTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="totalStudents"
                  name={lang === 'zh' ? '总学员数' : 'Total Students'}
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ fill: '#6366f1' }}
                />
                <Line
                  type="monotone"
                  dataKey="newStudents"
                  name={lang === 'zh' ? '新增学员' : 'New Students'}
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '课程完成率' : 'Course Completion Rate'}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseCompletionRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}%`, lang === 'zh' ? '完成率' : 'Completion Rate']}
                />
                <Bar 
                  dataKey="completionRate" 
                  name={lang === 'zh' ? '完成率' : 'Completion Rate'} 
                  fill="#6366f1" 
                  radius={[4, 4, 0, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
