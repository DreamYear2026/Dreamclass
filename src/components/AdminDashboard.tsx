import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { 
  Users, Calendar, TrendingUp, Search, Plus, ArrowRight, 
  Loader2, DollarSign, Star, Clock, AlertTriangle, 
  ArrowUpRight, ArrowDownRight, MoreHorizontal, BookOpen,
  Building2, GraduationCap, MessageSquare, CheckCircle2, XCircle, Sparkles, Heart,
  ClipboardList, CheckCircle, BarChart2, Settings, Megaphone, Edit2, X
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area
} from 'recharts';
import { Language, Student, Course, Payment } from '../types';
import { useTranslation } from '../i18n';
import { parseISO, format as formatDate, startOfWeek, addDays, isSameDay, subDays, startOfMonth, endOfMonth, subMonths, subYears } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { exportToCSV, exportToExcel, exportToPDF, exportMultipleSheetsToExcel } from '../utils/export';
import StudentDetail from './StudentDetail';
import CourseForm from './CourseForm';
import StudentForm from './StudentForm';
import BusinessFilterBar from './BusinessFilterBar';
import { useStudents, useCourses, useAppData, useCampuses, useTeachers, useFeedbacks } from '../contexts/AppContext';
import { useToast } from './Toast';
import BottomSheet from './BottomSheet';
import { CHART_COLORS } from '../config/constants';
import { api } from '../services/api';

const GRADIENT_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'];

export default function AdminDashboard({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading, addStudent } = useStudents();
  const { courses, loading: coursesLoading, updateCourseStatus, deleteCourse } = useCourses();
  const { campuses, selectedCampusId } = useCampuses();
  const { teachers } = useTeachers();
  const { feedbacks } = useFeedbacks();
  const { markAttendance } = useAppData();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'quick-actions' | 'business'>('overview');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [businessWindow, setBusinessWindow] = useState<7 | 30 | 90>(30);
  const [businessViewStatus, setBusinessViewStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [customQuickActions, setCustomQuickActions] = useState<string[]>(() => {
    const saved = localStorage.getItem('customQuickActions');
    return saved ? JSON.parse(saved) : ['schedule', 'add-student', 'homework', 'notify', 'checkin', 'finance', 'reports', 'settings'];
  });
  const [showCustomizeActions, setShowCustomizeActions] = useState(false);

  const loading = studentsLoading || coursesLoading;

  useEffect(() => {
    let mounted = true;
    const loadPayments = async () => {
      try {
        const data = await api.getPayments();
        if (mounted) setPayments(data);
      } catch {
        if (mounted) setPayments([]);
      }
    };
    loadPayments();
    return () => {
      mounted = false;
    };
  }, []);

  const allQuickActions = [
    { id: 'schedule', icon: Calendar, labelZh: '排课', labelEn: 'Schedule', color: 'from-indigo-50 to-purple-50', gradient: 'from-indigo-500 to-purple-500', border: 'border-indigo-100' },
    { id: 'add-student', icon: Users, labelZh: '添加学员', labelEn: 'Add Student', color: 'from-emerald-50 to-teal-50', gradient: 'from-emerald-500 to-teal-500', border: 'border-emerald-100' },
    { id: 'homework', icon: ClipboardList, labelZh: '布置作业', labelEn: 'Homework', color: 'from-amber-50 to-orange-50', gradient: 'from-amber-500 to-orange-500', border: 'border-amber-100' },
    { id: 'notify', icon: MessageSquare, labelZh: '发送通知', labelEn: 'Notify', color: 'from-pink-50 to-rose-50', gradient: 'from-pink-500 to-rose-500', border: 'border-pink-100' },
    { id: 'checkin', icon: CheckCircle, labelZh: '签到管理', labelEn: 'Check-in', color: 'from-cyan-50 to-sky-50', gradient: 'from-cyan-500 to-sky-500', border: 'border-cyan-100' },
    { id: 'finance', icon: DollarSign, labelZh: '财务记录', labelEn: 'Finance', color: 'from-green-50 to-emerald-50', gradient: 'from-green-500 to-emerald-500', border: 'border-green-100' },
    { id: 'reports', icon: BarChart2, labelZh: '数据报表', labelEn: 'Reports', color: 'from-violet-50 to-purple-50', gradient: 'from-violet-500 to-purple-500', border: 'border-violet-100' },
    { id: 'settings', icon: Settings, labelZh: '系统设置', labelEn: 'Settings', color: 'from-gray-50 to-slate-50', gradient: 'from-gray-500 to-slate-500', border: 'border-gray-200' },
    { id: 'marketing', icon: Megaphone, labelZh: '营销中心', labelEn: 'Marketing', color: 'from-purple-50 to-pink-50', gradient: 'from-purple-500 to-pink-500', border: 'border-purple-100' },
    { id: 'analytics', icon: TrendingUp, labelZh: '经营分析', labelEn: 'Analytics', color: 'from-blue-50 to-indigo-50', gradient: 'from-blue-500 to-indigo-500', border: 'border-blue-100' },
    { id: 'teachers', icon: GraduationCap, labelZh: '教师管理', labelEn: 'Teachers', color: 'from-teal-50 to-cyan-50', gradient: 'from-teal-500 to-cyan-500', border: 'border-teal-100' },
    { id: 'materials', icon: BookOpen, labelZh: '教材管理', labelEn: 'Materials', color: 'from-orange-50 to-amber-50', gradient: 'from-orange-500 to-amber-500', border: 'border-orange-100' },
  ];

  const toggleQuickAction = (id: string) => {
    let newActions;
    if (customQuickActions.includes(id)) {
      newActions = customQuickActions.filter(a => a !== id);
    } else {
      newActions = [...customQuickActions, id];
    }
    setCustomQuickActions(newActions);
    localStorage.setItem('customQuickActions', JSON.stringify(newActions));
  };

  const handleQuickAction = (id: string) => {
    switch (id) {
      case 'schedule':
        setEditingCourse({} as Course);
        break;
      case 'add-student':
        setShowStudentForm(true);
        break;
      case 'homework':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'homework' } }));
        break;
      case 'notify':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'messages' } }));
        break;
      case 'checkin':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'checkin' } }));
        break;
      case 'finance':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'finance' } }));
        break;
      case 'reports':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'reports' } }));
        break;
      case 'settings':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'settings' } }));
        break;
      case 'marketing':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'marketing' } }));
        break;
      case 'analytics':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'analytics' } }));
        break;
      case 'teachers':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'teachers' } }));
        break;
      case 'materials':
        window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'materials' } }));
        break;
    }
  };

  const today = new Date();
  const thisMonthStart = startOfMonth(today);
  const thisMonthEnd = endOfMonth(today);
  const lastMonthStart = startOfMonth(subDays(thisMonthStart, 1));
  const lastMonthEnd = endOfMonth(lastMonthStart);

  const scopedPayments = useMemo(() => {
    const studentIdSet = new Set(students.map((s) => s.id));
    return payments.filter((p) => studentIdSet.has(p.studentId));
  }, [payments, students]);

  const businessMetrics = useMemo(() => {
    const currentStart = subDays(today, businessWindow - 1);
    const prevStart = subDays(currentStart, businessWindow);
    const prevEnd = subDays(currentStart, 1);
    const lastYearEnd = subYears(today, 1);
    const lastYearStart = subDays(lastYearEnd, businessWindow - 1);

    const inRange = (dateStr: string, start: Date, end: Date) => {
      const d = parseISO(dateStr);
      return d >= start && d <= end;
    };

    const statusMatch = (p: Payment) => {
      if (businessViewStatus === 'paid') return p.status === 'paid';
      if (businessViewStatus === 'pending') return p.status !== 'paid';
      return true;
    };

    const currentRevenue = scopedPayments
      .filter((p) => statusMatch(p) && inRange(p.date, currentStart, today))
      .reduce((sum, p) => sum + p.amount, 0);
    const prevRevenue = scopedPayments
      .filter((p) => statusMatch(p) && inRange(p.date, prevStart, prevEnd))
      .reduce((sum, p) => sum + p.amount, 0);
    const yoyRevenue = scopedPayments
      .filter((p) => statusMatch(p) && inRange(p.date, lastYearStart, lastYearEnd))
      .reduce((sum, p) => sum + p.amount, 0);

    const currentClasses = courses.filter((c) => inRange(c.date, currentStart, today)).length;
    const prevClasses = courses.filter((c) => inRange(c.date, prevStart, prevEnd)).length;

    const duePayments = scopedPayments.filter((p) => inRange(p.date, currentStart, today));
    const expectedRevenue = duePayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingRevenue = duePayments.filter((p) => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0);
    const collectionRate = expectedRevenue > 0 ? Math.round((currentRevenue / expectedRevenue) * 100) : 0;

    const momRevenueGrowth = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0;
    const yoyRevenueGrowth = yoyRevenue > 0 ? Math.round(((currentRevenue - yoyRevenue) / yoyRevenue) * 100) : 0;
    const classGrowth = prevClasses > 0 ? Math.round(((currentClasses - prevClasses) / prevClasses) * 100) : 0;

    return {
      currentStart,
      currentRevenue,
      currentClasses,
      expectedRevenue,
      pendingRevenue,
      collectionRate,
      momRevenueGrowth,
      yoyRevenueGrowth,
      classGrowth,
    };
  }, [courses, scopedPayments, today, businessWindow, businessViewStatus]);

  const weeklyChartData = useMemo(() => {
    const bucketCount = 7;
    const bucketSize = Math.max(1, Math.ceil(businessWindow / bucketCount));
    const currentStart = subDays(today, businessWindow - 1);

    const inRange = (dateStr: string, start: Date, end: Date) => {
      const d = parseISO(dateStr);
      return d >= start && d <= end;
    };

    return Array.from({ length: bucketCount }).map((_, i) => {
      const bucketStart = addDays(currentStart, i * bucketSize);
      const bucketEnd = addDays(bucketStart, bucketSize - 1 > 0 ? bucketSize - 1 : 0);
      const end = bucketEnd > today ? today : bucketEnd;
      const name = `${formatDate(bucketStart, 'M/d')}`;
      const classes = courses.filter((c) => inRange(c.date, bucketStart, end)).length;
      const revenue = scopedPayments
        .filter((p) => {
          if (businessViewStatus === 'paid') return p.status === 'paid' && inRange(p.date, bucketStart, end);
          if (businessViewStatus === 'pending') return p.status !== 'paid' && inRange(p.date, bucketStart, end);
          return inRange(p.date, bucketStart, end);
        })
        .reduce((sum, p) => sum + p.amount, 0);
      return { name, classes, revenue };
    });
  }, [courses, scopedPayments, today, businessWindow, businessViewStatus]);

  const monthlyGrowthData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, idx) => {
      const monthDate = subMonths(today, 5 - idx);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthName = formatDate(monthDate, lang === 'zh' ? 'M月' : 'MMM', { locale: lang === 'zh' ? zhCN : undefined });
      const monthCourses = courses.filter(c => {
        const courseDate = parseISO(c.date);
        return courseDate >= monthStart && courseDate <= monthEnd;
      });
      const cumulativeStudents = students.filter((s) => {
        if (!s.createdAt) return true;
        const created = parseISO(s.createdAt);
        return created <= monthEnd;
      }).length;
      return {
        name: monthName,
        students: cumulativeStudents,
        courses: monthCourses.length
      };
    });
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
    
    const thisMonthRevenue = payments
      .filter((p) => p.status === 'paid')
      .filter((p) => {
        const paidDate = parseISO(p.date);
        return paidDate >= thisMonthStart && paidDate <= thisMonthEnd;
      })
      .reduce((sum, p) => sum + p.amount, 0);
    const lastMonthRevenue = payments
      .filter((p) => p.status === 'paid')
      .filter((p) => {
        const paidDate = parseISO(p.date);
        return paidDate >= lastMonthStart && paidDate <= lastMonthEnd;
      })
      .reduce((sum, p) => sum + p.amount, 0);
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
      revenueGrowth
    };
  }, [students, courses, campuses, teachers, payments, today, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd]);

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
    return feedbacks
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .map((f) => {
        const studentName = students.find((s) => s.id === f.studentId)?.name || (lang === 'zh' ? '未知学员' : 'Unknown');
        const teacherName = teachers.find((tch) => tch.id === f.teacherId)?.name || '';
        const rating = Math.max(1, Math.min(5, Number(f.rating || 0)));
        return { id: f.id, studentName, teacherName, content: f.content, rating, date: f.date };
      });
  }, [feedbacks, students, teachers, lang]);

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

  const handleExportBusiness = useCallback(() => {
    const campusName = campuses.find((c) => c.id === selectedCampusId)?.name || (lang === 'zh' ? '当前校区' : 'Current Campus');
    const statusText = businessViewStatus === 'paid' ? (lang === 'zh' ? '仅已支付' : 'paid-only') : businessViewStatus === 'pending' ? (lang === 'zh' ? '仅待支付' : 'pending-only') : (lang === 'zh' ? '全部状态' : 'all-status');
    const filtered = scopedPayments.filter((p) => {
      if (businessViewStatus === 'paid') return p.status === 'paid';
      if (businessViewStatus === 'pending') return p.status !== 'paid';
      return true;
    });
    const rows = filtered
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map((p) => ({
        校区: campusName,
        日期: p.date,
        学员ID: p.studentId,
        金额: p.amount,
        课时: p.hours,
        状态: p.status,
        说明: p.description || '',
      }));
    const summary = [
      { 指标: lang === 'zh' ? '校区' : 'Campus', 数值: campusName },
      { 指标: lang === 'zh' ? '窗口' : 'Window', 数值: lang === 'zh' ? `近${businessWindow}天` : `${businessWindow}d` },
      { 指标: lang === 'zh' ? '导出范围' : 'Export Scope', 数值: statusText },
      { 指标: lang === 'zh' ? '导出记录数' : 'Rows', 数值: rows.length },
      { 指标: lang === 'zh' ? '实收金额' : 'Received', 数值: filtered.filter((p) => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) },
      { 指标: lang === 'zh' ? '待收金额' : 'Outstanding', 数值: filtered.filter((p) => p.status !== 'paid').reduce((sum, p) => sum + p.amount, 0) },
    ];

    const filename = `${campusName}-business-${businessWindow}d-${formatDate(new Date(), 'yyyyMMdd-HHmm')}`;
    exportMultipleSheetsToExcel(
      [
        { name: lang === 'zh' ? '汇总' : 'Summary', data: summary },
        { name: lang === 'zh' ? '明细' : 'Details', data: rows },
      ],
      filename
    );
    showToast(lang === 'zh' ? '经营汇总+明细已导出' : 'Business summary and details exported', 'success');
  }, [campuses, selectedCampusId, scopedPayments, lang, showToast, businessWindow, businessViewStatus]);

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

      <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto whitespace-nowrap">
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

          <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
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
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 w-full min-w-0 overflow-hidden">
              <div className="flex items-center justify-between mb-6 gap-3 min-w-0">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 min-w-0">
                  <MessageSquare className="w-5 h-5 text-pink-600" />
                  {lang === 'zh' ? '最新动态' : 'Recent Activity'}
                </h3>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'feedback' } }))}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 shrink-0"
                >
                  {lang === 'zh' ? '查看全部' : 'View all'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {recentFeedback.map((feedback) => (
                  <button
                    key={feedback.id}
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'feedback' } }))}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition active:scale-[0.99]"
                    title={feedback.content}
                  >
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-pink-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-900 font-medium truncate">{feedback.studentName}</p>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {feedback.date ? formatDate(parseISO(feedback.date), 'MM-dd') : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{feedback.content}</p>
                      {!!feedback.teacherName && <p className="text-xs text-gray-400 truncate mt-0.5">{feedback.teacherName}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < feedback.rating ? 'text-amber-400 fill-current' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </button>
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
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#FFE66D]" />
                {lang === 'zh' ? '快捷操作' : 'Quick Actions'}
              </h3>
              <button
                onClick={() => setShowCustomizeActions(true)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition flex items-center gap-1"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'zh' ? '自定义' : 'Customize'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {allQuickActions
                .filter(action => customQuickActions.includes(action.id))
                .map(action => {
                  const Icon = action.icon;
                  return (
                    <button 
                      key={action.id}
                      onClick={() => handleQuickAction(action.id)}
                      className={`flex flex-col items-center p-5 rounded-xl bg-gradient-to-br ${action.color} hover:opacity-90 transition text-center group border ${action.border}`}
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition`} style={{ boxShadow: `0 10px 25px -5px rgba(99, 102, 241, 0.2)` }}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <span className="font-medium text-gray-700">{lang === 'zh' ? action.labelZh : action.labelEn}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {showCustomizeActions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCustomizeActions(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">{lang === 'zh' ? '自定义快捷操作' : 'Customize Quick Actions'}</h3>
              <button
                onClick={() => setShowCustomizeActions(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-500 mb-4">{lang === 'zh' ? '选择您想要显示的快捷操作' : 'Select the quick actions you want to display'}</p>
              {allQuickActions.map(action => {
                const Icon = action.icon;
                const isSelected = customQuickActions.includes(action.id);
                return (
                  <button
                    key={action.id}
                    onClick={() => toggleQuickAction(action.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
                      isSelected ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-medium text-gray-700">{lang === 'zh' ? action.labelZh : action.labelEn}</span>
                    <div className="ml-auto">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowCustomizeActions(false)}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
              >
                {lang === 'zh' ? '完成' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'business' && (
        <div className="space-y-6">
          <BusinessFilterBar
            lang={lang}
            windowDays={businessWindow}
            onWindowDaysChange={setBusinessWindow}
            status={businessViewStatus}
            onStatusChange={setBusinessViewStatus}
            onExport={handleExportBusiness}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              icon={<DollarSign className="w-5 h-5" />}
              title={
                lang === 'zh'
                  ? businessViewStatus === 'paid'
                    ? `近${businessWindow}天实收`
                    : businessViewStatus === 'pending'
                    ? `近${businessWindow}天待收`
                    : `近${businessWindow}天支付总额`
                  : businessViewStatus === 'paid'
                  ? `${businessWindow}d Received`
                  : businessViewStatus === 'pending'
                  ? `${businessWindow}d Pending`
                  : `${businessWindow}d Payment Total`
              }
              value={`¥${businessMetrics.currentRevenue.toLocaleString()}`}
              trend={`${businessMetrics.momRevenueGrowth >= 0 ? '+' : ''}${businessMetrics.momRevenueGrowth}%`}
              trendUp={businessMetrics.momRevenueGrowth >= 0}
              subtitle={lang === 'zh' ? `同比 ${businessMetrics.yoyRevenueGrowth >= 0 ? '+' : ''}${businessMetrics.yoyRevenueGrowth}%` : `YoY ${businessMetrics.yoyRevenueGrowth >= 0 ? '+' : ''}${businessMetrics.yoyRevenueGrowth}%`}
              color="emerald"
            />
            <StatCard
              icon={<Calendar className="w-5 h-5" />}
              title={lang === 'zh' ? `近${businessWindow}天课程` : `${businessWindow}d Classes`}
              value={businessMetrics.currentClasses}
              trend={`${businessMetrics.classGrowth >= 0 ? '+' : ''}${businessMetrics.classGrowth}%`}
              trendUp={businessMetrics.classGrowth >= 0}
              subtitle={lang === 'zh' ? '环比上个周期' : 'vs previous window'}
              color="indigo"
            />
            <StatCard
              icon={<CheckCircle2 className="w-5 h-5" />}
              title={lang === 'zh' ? '回款率' : 'Collection Rate'}
              value={`${businessMetrics.collectionRate}%`}
              subtitle={lang === 'zh' ? `应收 ¥${businessMetrics.expectedRevenue.toLocaleString()}` : `Expected ¥${businessMetrics.expectedRevenue.toLocaleString()}`}
              color="blue"
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              title={lang === 'zh' ? '待收金额' : 'Outstanding'}
              value={`¥${businessMetrics.pendingRevenue.toLocaleString()}`}
              subtitle={lang === 'zh' ? `统计区间：${formatDate(businessMetrics.currentStart, 'MM-dd')} ~ ${formatDate(today, 'MM-dd')}` : `${formatDate(businessMetrics.currentStart, 'MM-dd')} ~ ${formatDate(today, 'MM-dd')}`}
              color="amber"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {lang === 'zh' ? '窗口课程趋势' : 'Window Class Trend'}
              </h3>
              <div className="h-56 md:h-64">
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
                      name={lang === 'zh' ? '课程数' : 'Classes'}
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
                {lang === 'zh' ? '增长趋势（6个月）' : 'Growth Trend (6 months)'}
              </h3>
              <div className="h-56 md:h-64">
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
              <BarChart2 className="w-5 h-5 text-cyan-600" />
              {lang === 'zh' ? '支付漏斗' : 'Payment Funnel'}
            </h3>
            <div className="h-56 md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: lang === 'zh' ? '应收' : 'Expected', value: businessMetrics.expectedRevenue, fill: '#6366f1' },
                    {
                      name:
                        businessViewStatus === 'paid'
                          ? (lang === 'zh' ? '实收' : 'Received')
                          : businessViewStatus === 'pending'
                          ? (lang === 'zh' ? '待收(筛选)' : 'Pending (Filtered)')
                          : (lang === 'zh' ? '支付总额(筛选)' : 'Payment Total (Filtered)'),
                      value: businessMetrics.currentRevenue,
                      fill: businessViewStatus === 'pending' ? '#f97316' : '#10b981'
                    },
                    { name: lang === 'zh' ? '待收' : 'Outstanding', value: businessMetrics.pendingRevenue, fill: '#f59e0b' },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <Tooltip formatter={(v: number) => `¥${Number(v || 0).toLocaleString()}`} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {[
                      { fill: '#6366f1' },
                      { fill: businessViewStatus === 'pending' ? '#f97316' : '#10b981' },
                      { fill: '#f59e0b' },
                    ].map((entry, idx) => (
                      <Cell key={idx} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              {lang === 'zh' ? '经营预警' : 'Business Alerts'}
            </h3>
            <div className="space-y-3">
              {students.filter(s => s.remainingHours < 5).slice(0, 3).map(student => (
                <button
                  key={student.id}
                  onClick={() => {
                    localStorage.setItem('studentsHoursFilter', 'low');
                    window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'students' } }));
                  }}
                  className="w-full text-left flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-xl transition"
                >
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
                </button>
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
