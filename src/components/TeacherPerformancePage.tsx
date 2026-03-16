import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, Clock, Star, Award, Target, Loader2, Calendar, BookOpen, BarChart3, PieChart } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useCourses, useTeachers } from '../contexts/AppContext';
import { useToast } from './Toast';
import { parseISO, format, isThisMonth, isThisWeek, subMonths, eachMonthOfInterval, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

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
}

export default function TeacherPerformancePage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading } = useStudents();
  const { courses, loading: coursesLoading } = useCourses();
  const { teachers, loading: teachersLoading } = useTeachers();
  const { showToast } = useToast();

  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const loading = studentsLoading || coursesLoading || teachersLoading;

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
        return date >= thisMonthStart && date <= thisMonthEnd;
      });
      const lastMonthCourses = teacherCourses.filter(c => {
        const date = parseISO(c.date);
        return date >= lastMonthStart && date <= lastMonthEnd;
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
        avgRating: 4.5 + Math.random() * 0.5,
        studentCount: uniqueStudents.size,
        retentionRate: uniqueStudents.size > 0 
          ? Math.round((activeStudents.size / uniqueStudents.size) * 100)
          : 100,
        monthlyTrend: Math.round(monthlyTrend * 10) / 10,
        weeklyHours,
        monthlyHours: totalHours,
        rank: 0,
      };
    }).sort((a, b) => b.totalHours - a.totalHours)
      .map((teacher, index) => ({ ...teacher, rank: index + 1 }));
  }, [teachers, courses]);

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

    return {
      totalTeachers: activeTeachers.length,
      totalHours,
      avgCompletion: Math.round(avgCompletion),
      avgRetention: Math.round(avgRetention),
    };
  }, [teacherPerformance]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500" />
            {lang === 'zh' ? '教师绩效看板' : 'Teacher Performance'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '可视化教学成果，激励教师成长' : 'Visualize teaching outcomes'}
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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {topPerformers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            {lang === 'zh' ? '本月之星' : 'Top Performers'}
          </h2>
          <div className="grid md:grid-cols-3 gap-3">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              className="p-4 hover:bg-gray-50 cursor-pointer transition"
              onClick={() => setSelectedTeacher(selectedTeacher === teacher.id ? null : teacher.id)}
            >
              <div className="flex items-center gap-4">
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
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{teacher.totalHours}</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '课时' : 'Hours'}</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${teacher.completionRate >= 90 ? 'text-green-600' : teacher.completionRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                      {teacher.completionRate}%
                    </p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '完课率' : 'Completion'}</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1">
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
                </div>
              </div>

              {selectedTeacher === teacher.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid md:grid-cols-4 gap-4">
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
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
