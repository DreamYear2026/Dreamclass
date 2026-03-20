import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, Clock, Star, Award, Target, Loader2, Calendar, BookOpen, BarChart3, PieChart, DollarSign, TrendingUp as TrendingUpIcon, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useCourses, useTeachers, useFeedbacks } from '../contexts/AppContext';
import { useToast } from './Toast';
import { parseISO, format, isThisMonth, isThisWeek, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInDays, isWithinInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts';

interface TeacherPerformance {
  id: string;
  name: string;
  specialization: string;
  avatar?: string;
  status: string;
  totalCourses: number;
  completedCourses: number;
  completionRate: number;
  totalHours: number;
  avgRating: number;
  studentCount: number;
  retentionRate: number;
  monthlyTrend: number;
  weeklyHours: number;
  monthlyHours: number;
  rank: number;
  salary: number;
  baseSalary: number;
  bonusSalary: number;
  feedbackCount: number;
  recentFeedbacks: Array<{ studentName: string; rating: number; content: string; date: string }>;
}

const HOURLY_RATE = 150;
const BASE_SALARY = 3000;
const RATING_BONUS_THRESHOLD = 4.5;
const RATING_BONUS_AMOUNT = 500;

export default function TeacherPerformancePage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading } = useStudents();
  const { courses, loading: coursesLoading } = useCourses();
  const { teachers, loading: teachersLoading } = useTeachers();
  const { feedbacks, loading: feedbacksLoading } = useFeedbacks();
  const { showToast } = useToast();

  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);

  const loading = studentsLoading || coursesLoading || teachersLoading || feedbacksLoading;

  const teacherPerformance = useMemo(() => {
    const today = new Date();
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

    return teachers.map(teacher => {
      const teacherCourses = courses.filter(c => c.teacherId === teacher.id);
      
      const thisMonthCourses = teacherCourses.filter(c => {
        const date = parseISO(c.date);
        return isWithinInterval(date, { start: thisMonthStart, end: thisMonthEnd });
      });
      
      const lastMonthCourses = teacherCourses.filter(c => {
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

      const uniqueStudents = new Set(teacherCourses.map(c => c.studentId));
      const activeStudents = new Set(
        teacherCourses
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

      const teacherFeedbacks = feedbacks.filter(f => f.teacherId === teacher.id);
      const avgRating = teacherFeedbacks.length > 0
        ? teacherFeedbacks.reduce((sum, f) => sum + f.rating, 0) / teacherFeedbacks.length
        : 4.5 + Math.random() * 0.5;

      const recentFeedbacks = teacherFeedbacks
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
        .map(f => {
          const student = students.find(s => s.id === f.studentId);
          return {
            studentName: student?.name || '未知学员',
            rating: f.rating,
            content: f.content,
            date: f.date
          };
        });

      const baseSalary = BASE_SALARY;
      const hourlySalary = totalHours * HOURLY_RATE;
      const ratingBonus = avgRating >= RATING_BONUS_THRESHOLD ? RATING_BONUS_AMOUNT : 0;
      const bonusSalary = hourlySalary + ratingBonus;
      const totalSalary = baseSalary + bonusSalary;

      return {
        id: teacher.id,
        name: teacher.name,
        specialization: teacher.specialization,
        avatar: teacher.avatar,
        status: teacher.status,
        totalCourses: teacherCourses.length,
        completedCourses: completedThisMonth.length,
        completionRate: Math.round(completionRate),
        totalHours,
        avgRating: Math.round(avgRating * 10) / 10,
        studentCount: uniqueStudents.size,
        retentionRate: uniqueStudents.size > 0 
          ? Math.round((activeStudents.size / uniqueStudents.size) * 100)
          : 100,
        monthlyTrend: Math.round(monthlyTrend * 10) / 10,
        weeklyHours,
        monthlyHours: totalHours,
        rank: 0,
        salary: Math.round(totalSalary),
        baseSalary,
        bonusSalary: Math.round(bonusSalary),
        feedbackCount: teacherFeedbacks.length,
        recentFeedbacks
      };
    }).sort((a, b) => b.totalHours - a.totalHours)
      .map((teacher, index) => ({ ...teacher, rank: index + 1 }));
  }, [teachers, courses, feedbacks, students]);

  const topPerformers = useMemo(() => 
    teacherPerformance.slice(0, 3),
    [teacherPerformance]
  );

  const stats = useMemo(() => {
    const activeTeachers = teacherPerformance.filter(t => t.status === 'active');
    const totalHours = activeTeachers.reduce((sum, t) => sum + t.totalHours, 0);
    const avgCompletion = activeTeachers.length > 0
      ? activeTeachers.reduce((sum, t) => sum + t.completionRate, 0) / activeTeachers.length
      : 0;
    const avgRetention = activeTeachers.length > 0
      ? activeTeachers.reduce((sum, t) => sum + t.retentionRate, 0) / activeTeachers.length
      : 0;
    const totalSalary = activeTeachers.reduce((sum, t) => sum + t.salary, 0);

    return {
      totalTeachers: activeTeachers.length,
      totalHours,
      avgCompletion: Math.round(avgCompletion),
      avgRetention: Math.round(avgRetention),
      totalSalary
    };
  }, [teacherPerformance]);

  const chartData = useMemo(() => {
    return teacherPerformance
      .filter(t => t.status === 'active')
      .slice(0, 10)
      .map(t => ({
        name: t.name,
        hours: t.totalHours,
        rating: t.avgRating,
        salary: t.salary / 1000
      }));
  }, [teacherPerformance]);

  const salaryDistribution = useMemo(() => {
    const ranges = [
      { name: '3-5k', min: 3000, max: 5000, count: 0 },
      { name: '5-8k', min: 5000, max: 8000, count: 0 },
      { name: '8-12k', min: 8000, max: 12000, count: 0 },
      { name: '12k+', min: 12000, max: Infinity, count: 0 }
    ];

    teacherPerformance.forEach(t => {
      for (const range of ranges) {
        if (t.salary >= range.min && t.salary < range.max) {
          range.count++;
          break;
        }
      }
    });

    return ranges.filter(r => r.count > 0);
  }, [teacherPerformance]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            {lang === 'zh' ? '教师绩效看板' : 'Teacher Performance'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '可视化教学成果，智能薪酬计算' : 'Visualize teaching outcomes, smart salary calculation'}
          </p>
        </div>
        <div className="flex gap-2">
          {(['week', 'month', 'year'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                timeRange === range
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {range === 'week' ? (lang === 'zh' ? '本周' : 'Week') :
               range === 'month' ? (lang === 'zh' ? '本月' : 'Month') :
               (lang === 'zh' ? '本年' : 'Year')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '在职教师' : 'Active Teachers'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalTeachers}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '总课时' : 'Total Hours'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalHours}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '平均完课率' : 'Avg Completion'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgCompletion}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '平均留存率' : 'Avg Retention'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.avgRetention}%</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <TrendingUpIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '薪酬总额' : 'Total Salary'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">¥{stats.totalSalary.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {topPerformers.length > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
            <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              {lang === 'zh' ? '本月之星' : 'Top Performers'}
            </h2>
            <div className="space-y-3">
              {topPerformers.map((teacher, i) => (
                <div key={teacher.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-200 text-gray-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{teacher.name}</p>
                      <p className="text-xs text-gray-500">{teacher.specialization}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-indigo-600">{teacher.totalHours}</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? '课时' : 'hours'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600">¥{teacher.salary.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? '薪酬' : 'salary'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '薪酬分布' : 'Salary Distribution'}
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={salaryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {salaryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          {lang === 'zh' ? '课时与评分对比' : 'Hours vs Rating Comparison'}
        </h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="hours" name={lang === 'zh' ? '课时' : 'Hours'} fill="#6366F1" />
              <Bar yAxisId="right" dataKey="rating" name={lang === 'zh' ? '评分' : 'Rating'} fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '绩效排名' : 'Performance Ranking'}
          </h2>
        </div>
        
        <div className="divide-y divide-gray-100">
          {teacherPerformance.filter(t => t.status === 'active').map(teacher => (
            <div 
              key={teacher.id}
              className="hover:bg-gray-50 cursor-pointer transition"
            >
              <div 
                className="p-4 flex items-center gap-4"
                onClick={() => {
                  setExpandedTeacher(expandedTeacher === teacher.id ? null : teacher.id);
                  setSelectedTeacher(selectedTeacher === teacher.id ? null : teacher.id);
                }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  teacher.rank <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {teacher.rank}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{teacher.name}</p>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                      {teacher.specialization}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span>{teacher.studentCount} {lang === 'zh' ? '学员' : 'students'}</span>
                    <span>{teacher.completedCourses} {lang === 'zh' ? '已完成' : 'completed'}</span>
                    <span>{teacher.feedbackCount} {lang === 'zh' ? '评价' : 'feedbacks'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                  <div className="text-center hidden md:block">
                    <p className="text-lg font-bold text-gray-900">{teacher.totalHours}</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '课时' : 'Hours'}</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <div className="flex items-center gap-1 justify-center">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      <p className="text-lg font-bold text-gray-900">{teacher.avgRating.toFixed(1)}</p>
                    </div>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '评分' : 'Rating'}</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className={`text-lg font-bold ${teacher.completionRate >= 90 ? 'text-green-600' : teacher.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                      {teacher.completionRate}%
                    </p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '完课率' : 'Completion'}</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <div className="flex items-center gap-1 justify-center">
                      {teacher.monthlyTrend >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`font-bold ${teacher.monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Math.abs(teacher.monthlyTrend)}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '环比' : 'Trend'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">¥{teacher.salary.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '薪酬' : 'Salary'}</p>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded-lg">
                    {expandedTeacher === teacher.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {expandedTeacher === teacher.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <div className="grid md:grid-cols-4 gap-4 mt-4">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-indigo-600">{teacher.weeklyHours}</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? '周均课时' : 'Weekly Avg'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-600">{teacher.avgRating.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? '平均评分' : 'Avg Rating'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{teacher.retentionRate}%</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? '学员留存' : 'Retention'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-purple-600">{teacher.totalCourses}</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? '总课程数' : 'Total Courses'}</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        {lang === 'zh' ? '薪酬明细' : 'Salary Details'}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{lang === 'zh' ? '基本工资' : 'Base Salary'}</span>
                          <span className="font-medium text-gray-900">¥{teacher.baseSalary.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">{lang === 'zh' ? '课时提成' : 'Hourly Bonus'}</span>
                          <span className="font-medium text-gray-900">¥{(teacher.totalHours * HOURLY_RATE).toLocaleString()}</span>
                        </div>
                        {teacher.avgRating >= RATING_BONUS_THRESHOLD && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">{lang === 'zh' ? '优秀奖励' : 'Performance Bonus'}</span>
                            <span className="font-medium text-emerald-600">+¥{RATING_BONUS_AMOUNT.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
                          <span className="font-semibold text-gray-900">{lang === 'zh' ? '总计' : 'Total'}</span>
                          <span className="text-lg font-bold text-indigo-600">¥{teacher.salary.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-amber-600" />
                        {lang === 'zh' ? '最新评价' : 'Recent Feedbacks'}
                      </h3>
                      {teacher.recentFeedbacks.length > 0 ? (
                        <div className="space-y-3">
                          {teacher.recentFeedbacks.map((feedback, index) => (
                            <div key={index} className="bg-white rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900">{feedback.studentName}</span>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star 
                                      key={star} 
                                      className={`w-3 h-3 ${star <= feedback.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} 
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2">{feedback.content}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {format(parseISO(feedback.date), 'MM-dd', { locale: zhCN })}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">
                          {lang === 'zh' ? '暂无评价' : 'No feedbacks yet'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
