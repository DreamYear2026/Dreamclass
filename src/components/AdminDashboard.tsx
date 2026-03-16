import React, { useMemo, useState, useCallback } from 'react';
import { 
  Users, Calendar, TrendingUp, Search, Plus, ArrowRight, 
  Download, Loader2, DollarSign, Star, Clock, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, MoreHorizontal, BookOpen,
  Building2, GraduationCap, MessageSquare, CheckCircle2, XCircle, Sparkles, Heart,
  ClipboardList, CheckCircle, BarChart2, Settings
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import { Language, Student, Course } from '../types';
import { useTranslation } from '../i18n';
import { parseISO, format as formatDate, startOfWeek, addDays, isSameDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/export';
import StudentDetail from './StudentDetail';
import CourseForm from './CourseForm';
import StudentForm from './StudentForm';
import { useStudents, useCourses, useAppData, useCampuses, useTeachers } from '../contexts/AppContext';
import { useToast } from './Toast';
import BottomSheet from './BottomSheet';
import { CHART_COLORS } from '../config/constants';

const GRADIENT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export default function AdminDashboard({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading, addStudent } = useStudents();
  const { courses, loading: coursesLoading, updateCourseStatus, deleteCourse } = useCourses();
  const { campuses } = useCampuses();
  const { teachers } = useTeachers();
  const { markAttendance } = useAppData();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'quick-actions' | 'business'>('overview');

  const loading = studentsLoading || coursesLoading;

  const today = new Date();
  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);
  const lastMonthStart = startOfMonth(subDays(thisMonthStart, 1));
  const lastMonthEnd = endOfMonth(lastMonthStart);

  const weeklyChartData = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    
    return Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(start, i);
      const dayName = formatDate(day, lang === 'zh' ? 'EEE' : 'EEE', { locale: lang === 'zh' ? zhCN : undefined });
      const count = courses.filter(c => isSameDay(parseISO(c.date), day)).length;
      const revenue = count * 150;
      return { name: dayName, classes: count, revenue };
    });
  }, [courses, lang, today]);

  const monthlyGrowthData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const month = subDays(today, i * 30);
      const monthName = formatDate(month, lang === 'zh' ? 'M月' : 'MMM', { locale: lang === 'zh' ? zhCN : undefined });
      const monthCourses = courses.filter(c => {
        const courseDate = parseISO(c.date);
        return courseDate >= subDays(month, 15) && courseDate <= addDays(month, 15);
      });
      return { 
        name: monthName, 
        students: Math.max(5, students.length - i * 2),
        courses: monthCourses.length
      };
    }).reverse();
  }, [courses, students, lang, today]);

  const courseTypeData = useMemo(() => {
    const types: Record<string, number> = {};
    courses.forEach(c => {
      const type = c.title.includes('Piano') ? lang === 'zh' ? '钢琴' : 'Piano' : 
                   c.title.includes('Violin') ? lang === 'zh' ? '小提琴' : 'Violin' : 
                   c.title.includes('Guitar') ? lang === 'zh' ? '吉他' : 'Guitar' : 
                   lang === 'zh' ? '其他' : 'Other';
      types[type] = (types[type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [courses, lang]);

  const stats = useMemo(() => {
    const todayCourses = courses.filter(c => isSameDay(parseISO(c.date), today));
    const pendingCheckIn = todayCourses.filter(c => c.status === 'scheduled').length;
    const completedToday = todayCourses.filter(c => c.status === 'completed').length;
    
    const thisMonthCourses = courses.filter(c => {
      const courseDate = parseISO(c.date);
      return courseDate >= thisMonthStart && courseDate <= thisMonthEnd;
    });
    const lastMonthCourses = courses.filter(c => {
      const courseDate = parseISO(c.date);
      return courseDate >= lastMonthStart && courseDate <= lastMonthEnd;
    });
    
    const lowHoursStudents = students.filter(s => s.remainingHours < 5 && s.remainingHours > 0);
    const activeStudents = students.filter(s => s.remainingHours > 0);
    
    const thisMonthRevenue = thisMonthCourses.filter(c => c.status === 'completed').length * 150;
    const lastMonthRevenue = lastMonthCourses.filter(c => c.status === 'completed').length * 150;
    const revenueGrowth = lastMonthRevenue > 0 
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) 
      : 0;
    
    return {
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      lowHoursStudents: lowHoursStudents.length,
      classesToday: todayCourses.length,
      completedToday,
      pendingCheckIn,
      campuses: campuses.length,
      teachers: teachers.length,
      thisMonthRevenue,
      revenueGrowth,
      avgStudentHours: students.length > 0 
        ? Math.round(students.reduce((sum, s) => sum + s.remainingHours, 0) / students.length) 
        : 0
    };
  }, [students, courses, campuses, teachers, today, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd]);

  const filteredStudents = useMemo(() => {
    let filtered = students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentPhone.includes(searchQuery)
    );
    
    return filtered.sort((a, b) => {
      return sortOrder === 'asc' ? a.remainingHours - b.remainingHours : b.remainingHours - a.remainingHours;
    });
  }, [students, searchQuery, sortOrder]);

  const todayCourses = useMemo(() => {
    return courses.filter(c => isSameDay(parseISO(c.date), today))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [courses, today]);

  const recentFeedback = useMemo(() => {
    return students.slice(0, 3).map(s => ({
      studentName: s.name,
      comment: lang === 'zh' ? '课堂表现优秀，进步明显' : 'Excellent performance in class',
      rating: 5
    }));
  }, [students, lang]);

  const handleExportCSV = useCallback(() => {
    const data = students.map(s => ({
      '学员姓名': s.name,
      '年龄': s.age,
      '级别': s.level,
      '家长姓名': s.parentName,
      '联系电话': s.parentPhone,
      '剩余课时': s.remainingHours,
      '状态': s.status || 'active'
    }));
    exportToCSV(data, lang === 'zh' ? '学员数据' : 'student-data');
    showToast(lang === 'zh' ? '学员数据导出成功' : 'Student data exported successfully', 'success');
    setShowExportModal(false);
  }, [students, showToast, lang]);

  const handleExportExcel = useCallback(() => {
    const data = students.map(s => ({
      '学员姓名': s.name,
      '年龄': s.age,
      '级别': s.level,
      '家长姓名': s.parentName,
      '联系电话': s.parentPhone,
      '剩余课时': s.remainingHours,
      '状态': s.status || 'active'
    }));
    exportToExcel(data, lang === 'zh' ? '学员数据' : 'student-data', lang === 'zh' ? '学员列表' : 'Students');
    showToast(lang === 'zh' ? '学员数据导出成功' : 'Student data exported successfully', 'success');
    setShowExportModal(false);
  }, [students, showToast, lang]);

  const handleAttendance = useCallback(async (courseId: string, studentId: string, status: string, date: string) => {
    try {
      await markAttendance({ courseId, studentId, status, date });
      await updateCourseStatus(courseId, 'completed');
      showToast(lang === 'zh' ? '签到成功' : 'Check-in successful', 'success');
    } catch (error) {
      showToast(lang === 'zh' ? '签到失败' : 'Check-in failed', 'error');
    }
  }, [markAttendance, updateCourseStatus, showToast, lang]);

  const handleAddStudent = useCallback(async (data: Omit<Student, 'id'>) => {
    await addStudent(data);
    showToast(lang === 'zh' ? '学员添加成功' : 'Student added successfully', 'success');
  }, [addStudent, showToast, lang]);

  const handleDeleteCourse = useCallback(async (id: string) => {
    if (confirm(lang === 'zh' ? '确定要取消这节课吗？' : 'Are you sure you want to cancel this class?')) {
      await deleteCourse(id);
      showToast(lang === 'zh' ? '课程已取消' : 'Class cancelled', 'success');
    }
  }, [deleteCourse, showToast, lang]);

  if (selectedStudentId) {
    return <StudentDetail studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} lang={lang} />;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const StatCard = ({ 
    icon, 
    title, 
    value, 
    trend, 
    trendUp, 
    color = 'indigo',
    subtitle,
    onClick
  }: { 
    icon: React.ReactNode; 
    title: string; 
    value: string | number; 
    trend?: string;
    trendUp?: boolean;
    color?: 'indigo' | 'emerald' | 'amber' | 'purple' | 'blue' | 'pink';
    subtitle?: string;
    onClick?: () => void;
  }) => {
    const colorClasses = {
      indigo: 'from-indigo-500 to-indigo-600',
      emerald: 'from-emerald-500 to-teal-600',
      amber: 'from-amber-500 to-orange-600',
      purple: 'from-purple-500 to-violet-600',
      blue: 'from-blue-500 to-cyan-600',
      pink: 'from-pink-500 to-rose-600',
    };

    return (
      <div 
        onClick={onClick}
        className={`bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all ${
          onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center shadow-lg`}>
            <div className="text-white">{icon}</div>
          </div>
          {trend && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
              trendUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend}
            </div>
          )}
        </div>
        <p className="mt-4 text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {lang === 'zh' ? '管理控制台' : 'Admin Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' 
              ? formatDate(today, 'yyyy年M月d日 EEEE', { locale: zhCN })
              : formatDate(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'overview' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {lang === 'zh' ? '概览' : 'Overview'}
        </button>
        <button
          onClick={() => setActiveTab('quick-actions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'quick-actions' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {lang === 'zh' ? '快捷操作' : 'Quick Actions'}
        </button>
        <button
          onClick={() => setActiveTab('business')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'business' 
              ? 'bg-indigo-100 text-indigo-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {lang === 'zh' ? '经营预览' : 'Business'}
        </button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={<Users className="w-6 h-6" />} 
              title={lang === 'zh' ? '总学员数' : 'Total Students'} 
              value={stats.totalStudents}
              color="indigo"
              subtitle={lang === 'zh' ? `${stats.activeStudents} 名在读` : `${stats.activeStudents} active`}
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'students' } }))}
            />
            <StatCard 
              icon={<Calendar className="w-6 h-6" />} 
              title={lang === 'zh' ? '今日课程' : "Today's Classes"} 
              value={stats.classesToday}
              trend={lang === 'zh' ? `${stats.completedToday} 已完成` : `${stats.completedToday} completed`}
              trendUp={true}
              color="emerald"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'schedule' } }))}
            />
            <StatCard 
              icon={<DollarSign className="w-6 h-6" />} 
              title={lang === 'zh' ? '本月营收' : 'This Month Revenue'} 
              value={`¥${stats.thisMonthRevenue.toLocaleString()}`}
              trend={`${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%`}
              trendUp={stats.revenueGrowth >= 0}
              color="amber"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'analytics' } }))}
            />
            <StatCard 
              icon={<AlertTriangle className="w-6 h-6" />} 
              title={lang === 'zh' ? '课时不足' : 'Low Hours'} 
              value={stats.lowHoursStudents}
              color="pink"
              subtitle={lang === 'zh' ? '需要关注' : 'Need attention'}
              onClick={() => {
                localStorage.setItem('studentsHoursFilter', 'low');
                window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'students' } }));
              }}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              icon={<Building2 className="w-5 h-5" />} 
              title={lang === 'zh' ? '校区' : 'Campuses'} 
              value={stats.campuses}
              color="purple"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'campuses' } }))}
            />
            <StatCard 
              icon={<GraduationCap className="w-5 h-5" />} 
              title={lang === 'zh' ? '教师' : 'Teachers'} 
              value={stats.teachers}
              color="blue"
              onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'teachers' } }))}
            />
            <StatCard 
              icon={<Clock className="w-5 h-5" />} 
              title={lang === 'zh' ? '平均课时' : 'Avg Hours'} 
              value={stats.avgStudentHours}
              color="indigo"
            />
            <StatCard 
              icon={<Star className="w-5 h-5" />} 
              title={lang === 'zh' ? '完课率' : 'Completion'} 
              value="94%"
              color="emerald"
              trend="+5%"
              trendUp={true}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  {lang === 'zh' ? '今日课程' : "Today's Classes"}
                </h3>
                {todayCourses.length > 0 && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                    {todayCourses.length} {lang === 'zh' ? '节' : 'classes'}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {todayCourses.map(course => (
                  <div key={course.id} className="flex items-center p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition">
                    <div className="w-16 text-center">
                      <p className="font-bold text-gray-900">{course.startTime}</p>
                      <p className="text-xs text-gray-500">{course.endTime}</p>
                    </div>
                    <div className="flex-1 ml-4">
                      <h4 className="font-medium text-gray-900">{course.title}</h4>
                      <p className="text-sm text-gray-500">{course.studentName} • {course.room}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {course.status === 'scheduled' ? (
                        <button 
                          onClick={() => handleAttendance(course.id, course.studentId, 'present', course.date)}
                          className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition"
                        >
                          {lang === 'zh' ? '签到' : 'Check In'}
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-lg flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          {lang === 'zh' ? '已完成' : 'Completed'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {todayCourses.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">{lang === 'zh' ? '今日无课程' : 'No classes today'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-pink-600" />
                  {lang === 'zh' ? '最新动态' : 'Recent Activity'}
                </h3>
              </div>
              <div className="space-y-3">
                {recentFeedback.slice(0, 3).map((feedback, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-pink-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium truncate">{feedback.studentName}</p>
                      <p className="text-xs text-gray-500 truncate">{feedback.comment}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(feedback.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-amber-400 fill-current" />
                      ))}
                    </div>
                  </div>
                ))}
                {recentFeedback.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>{lang === 'zh' ? '暂无动态' : 'No activity'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'quick-actions' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-[#FFE66D]" />
              {lang === 'zh' ? '快捷操作' : 'Quick Actions'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button 
                onClick={() => setEditingCourse({} as Course)}
                className="flex flex-col items-center p-5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 transition text-center group border border-indigo-100"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <span className="font-medium text-gray-700">{lang === 'zh' ? '排课' : 'Schedule'}</span>
              </button>
              <button 
                onClick={() => setShowStudentForm(true)}
                className="flex flex-col items-center p-5 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition text-center group border border-emerald-100"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <span className="font-medium text-gray-700">{lang === 'zh' ? '添加学员' : 'Add Student'}</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'homework' } }))}
                className="flex flex-col items-center p-5 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition text-center group border border-amber-100"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-3 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition">
                  <ClipboardList className="w-7 h-7 text-white" />
                </div>
                <span className="font-medium text-gray-700">{lang === 'zh' ? '布置作业' : 'Homework'}</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'messages' } }))}
                className="flex flex-col items-center p-5 rounded-xl bg-gradient-to-br from-pink-50 to-rose-50 hover:from-pink-100 hover:to-rose-100 transition text-center group border border-pink-100"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center mb-3 shadow-lg shadow-pink-500/30 group-hover:scale-110 transition">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <span className="font-medium text-gray-700">{lang === 'zh' ? '发送通知' : 'Notify'}</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'checkin' } }))}
                className="flex flex-col items-center p-5 rounded-xl bg-gradient-to-br from-cyan-50 to-sky-50 hover:from-cyan-100 hover:to-sky-100 transition text-center group border border-cyan-100"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center mb-3 shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <span className="font-medium text-gray-700">{lang === 'zh' ? '签到管理' : 'Check-in'}</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'finance' } }))}
                className="flex flex-col items-center p-5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 transition text-center group border border-green-100"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mb-3 shadow-lg shadow-green-500/30 group-hover:scale-110 transition">
                  <DollarSign className="w-7 h-7 text-white" />
                </div>
                <span className="font-medium text-gray-700">{lang === 'zh' ? '财务记录' : 'Finance'}</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'reports' } }))}
                className="flex flex-col items-center p-5 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition text-center group border border-violet-100"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-3 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition">
                  <BarChart2 className="w-7 h-7 text-white" />
                </div>
                <span className="font-medium text-gray-700">{lang === 'zh' ? '数据报表' : 'Reports'}</span>
              </button>
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'settings' } }))}
                className="flex flex-col items-center p-5 rounded-xl bg-gradient-to-br from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100 transition text-center group border border-gray-200"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-500 to-slate-500 flex items-center justify-center mb-3 shadow-lg shadow-gray-500/30 group-hover:scale-110 transition">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <span className="font-medium text-gray-700">{lang === 'zh' ? '系统设置' : 'Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'business' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {lang === 'zh' ? '每周课程趋势' : 'Weekly Class Trend'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyChartData}>
                    <defs>
                      <linearGradient id="colorClassesBusiness" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="classes" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorClassesBusiness)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                {lang === 'zh' ? '增长趋势' : 'Growth Trend'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="students" 
                      name={lang === 'zh' ? '学员' : 'Students'}
                      stroke="#8b5cf6" 
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="courses" 
                      name={lang === 'zh' ? '课程' : 'Courses'}
                      stroke="#6366f1" 
                      strokeWidth={3}
                      dot={{ fill: '#6366f1', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              {lang === 'zh' ? '经营预警' : 'Business Alerts'}
            </h3>
            <div className="space-y-3">
              {students.filter(s => s.remainingHours < 5).slice(0, 3).map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{lang === 'zh' ? '课时不足' : 'Low hours'}</p>
                    </div>
                  </div>
                  <span className="text-red-600 font-medium">{student.remainingHours} {lang === 'zh' ? '节' : 'hrs'}</span>
                </div>
              ))}
              {students.filter(s => s.remainingHours < 5).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
                  <p>{lang === 'zh' ? '暂无预警' : 'No alerts'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showStudentForm && (
        <StudentForm
          onClose={() => setShowStudentForm(false)}
          onSave={handleAddStudent}
          campuses={campuses}
        />
      )}

      {editingCourse && (
        <CourseForm 
          course={editingCourse.id ? editingCourse : undefined} 
          onClose={() => setEditingCourse(null)} 
          onSave={async () => {
            showToast(lang === 'zh' ? '课程保存成功' : 'Class saved successfully', 'success');
          }} 
        />
      )}

      {showExportModal && (
        <BottomSheet
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title={lang === 'zh' ? '导出学员数据' : 'Export Student Data'}
        >
          <div className="p-4 space-y-3">
            <button
              onClick={handleExportCSV}
              className="w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center gap-3 text-left"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{lang === 'zh' ? 'CSV 格式' : 'CSV Format'}</p>
                <p className="text-sm text-gray-500">{lang === 'zh' ? '适合用 Excel 打开编辑' : 'Best for editing in Excel'}</p>
              </div>
            </button>
            <button
              onClick={handleExportExcel}
              className="w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center gap-3 text-left"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{lang === 'zh' ? 'Excel 格式' : 'Excel Format'}</p>
                <p className="text-sm text-gray-500">{lang === 'zh' ? '适合数据分析和报表' : 'Best for data analysis'}</p>
              </div>
            </button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
