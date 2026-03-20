import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, Clock, Award, Target, PieChart, BarChart3, Loader2, Download, FileSpreadsheet, FileText, AlertTriangle, RefreshCw, Building2, Activity, Copy } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useCourses, useTeachers, useCampuses } from '../contexts/AppContext';
import { useToast } from './Toast';
import { parseISO, format, isThisMonth, isThisYear, subMonths, eachMonthOfInterval, differenceInMonths, startOfMonth, endOfMonth, differenceInDays, isWithinInterval, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { exportToExcel, exportToPDF, exportReportToPDF, exportMultipleSheetsToExcel } from '../utils/export';
import { apiRequest } from '../services/api';
import BusinessFilterBar from './BusinessFilterBar';

interface AnalyticsData {
  studentRetention: { month: string; rate: number; newStudents: number; leftStudents: number }[];
  courseConsumption: { month: string; total: number; average: number }[];
  teacherPerformance: { id: string; name: string; courses: number; rating: number; hours: number }[];
  revenueForecast: { month: string; actual: number; forecast: number }[];
  conversionFunnel: { stage: string; count: number; rate: number }[];
}

export default function AnalyticsPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading } = useStudents();
  const { courses, loading: coursesLoading } = useCourses();
  const { teachers, loading: teachersLoading } = useTeachers();
  const { campuses, selectedCampusId } = useCampuses();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'teachers' | 'finance'>('overview');
  const [analyticsWindow, setAnalyticsWindow] = useState<7 | 30 | 90>(30);
  const [analyticsStatus, setAnalyticsStatus] = useState<'all' | 'paid' | 'pending'>('all');

  const currentCampusName = useMemo(() => {
    return campuses.find((c) => c.id === selectedCampusId)?.name || (lang === 'zh' ? '当前校区' : 'Current Campus');
  }, [campuses, selectedCampusId, lang]);

  const formatCurrencyValue = (v: number) => `¥${Number(v || 0).toLocaleString()}`;

  const analyticsStatusLabel = useMemo(() => {
    return analyticsStatus === 'paid'
      ? (lang === 'zh' ? '仅已支付' : 'Paid only')
      : analyticsStatus === 'pending'
      ? (lang === 'zh' ? '仅待支付' : 'Pending only')
      : (lang === 'zh' ? '全部状态' : 'All status');
  }, [analyticsStatus, lang]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [students]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [paymentsData, leadsData] = await Promise.all([
        apiRequest<any[]>('/api/payments'),
        apiRequest<any[]>('/api/leads'),
      ]);

      const studentIdSet = new Set(students.map((s) => s.id));
      setPayments(paymentsData.filter((p) => studentIdSet.has(p.studentId)));
      setLeads(leadsData);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const allLoading = studentsLoading || coursesLoading || teachersLoading || loading;

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (analyticsStatus === 'paid') return p.amount > 0;
      if (analyticsStatus === 'pending') return p.amount < 0;
      return true;
    });
  }, [payments, analyticsStatus]);

  const windowedPayments = useMemo(() => {
    const start = subDays(new Date(), analyticsWindow - 1);
    const end = new Date();
    return filteredPayments.filter((p) =>
      isWithinInterval(parseISO(p.date), { start, end })
    );
  }, [filteredPayments, analyticsWindow]);

  const monthlyData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 11),
      end: new Date(),
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthCourses = courses.filter(c => {
        const courseDate = parseISO(c.date);
        return courseDate >= monthStart && courseDate <= monthEnd;
      });

      const monthPayments = filteredPayments.filter(p => {
        const paymentDate = parseISO(p.date);
        return paymentDate >= monthStart && paymentDate <= monthEnd;
      });

      const completedCourses = monthCourses.filter(c => c.status === 'completed');
      const income = monthPayments.filter(p => p.amount > 0).reduce((sum, p) => sum + p.amount, 0);
      const expense = monthPayments.filter(p => p.amount < 0).reduce((sum, p) => sum + Math.abs(p.amount), 0);

      return {
        month: format(month, lang === 'zh' ? 'M月' : 'MMM'),
        monthFull: format(month, lang === 'zh' ? 'yyyy年M月' : 'MMMM yyyy'),
        courses: monthCourses.length,
        completedCourses: completedCourses.length,
        income,
        expense,
        profit: income - expense,
        hours: completedCourses.length,
      };
    });
  }, [courses, filteredPayments, lang]);

  const studentAnalytics = useMemo(() => {
    const activeStudents = students.filter(s => s.remainingHours > 0);
    const lowHoursStudents = students.filter(s => s.remainingHours < 5 && s.remainingHours > 0);
    const zeroHoursStudents = students.filter(s => s.remainingHours === 0);

    const totalHours = students.reduce((sum, s) => sum + s.remainingHours, 0);
    const avgHours = students.length > 0 ? totalHours / students.length : 0;

    const retentionRate = students.length > 0 
      ? ((activeStudents.length / students.length) * 100).toFixed(1)
      : 0;

    const now = new Date();
    const thirtyDaysAgo = subDays(now, 30);
    const sixtyDaysAgo = subDays(now, 60);
    
    const atRiskStudents = students.filter(student => {
      if (student.remainingHours === 0) return true;
      if (student.remainingHours < 5) return true;
      const lastCourseDate = courses
        .filter(c => c.studentIds?.includes(student.id))
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())[0];
      if (lastCourseDate) {
        const daysSinceLastCourse = differenceInDays(now, parseISO(lastCourseDate.date));
        return daysSinceLastCourse > 30;
      }
      return false;
    });

    const highRiskStudents = atRiskStudents.filter(s => s.remainingHours === 0);
    const mediumRiskStudents = atRiskStudents.filter(s => s.remainingHours > 0 && s.remainingHours < 5);
    const lowRiskStudents = atRiskStudents.filter(s => s.remainingHours >= 5);

    return {
      total: students.length,
      active: activeStudents.length,
      lowHours: lowHoursStudents.length,
      zeroHours: zeroHoursStudents.length,
      totalHours,
      avgHours: avgHours.toFixed(1),
      retentionRate,
      atRiskStudents,
      highRiskStudents,
      mediumRiskStudents,
      lowRiskStudents,
    };
  }, [students, courses]);

  const renewalAnalytics = useMemo(() => {
    const thisMonth = startOfMonth(new Date());
    const lastMonth = startOfMonth(subMonths(new Date(), 1));
    
    const studentsWithRecentPayments = students.filter(student => {
      const recentPayment = payments.find(p => 
        p.studentId === student.id && 
        isThisMonth(parseISO(p.date)) && 
        p.amount > 0
      );
      return recentPayment !== undefined;
    });

    const studentsNeedingRenewal = students.filter(s => s.remainingHours < 5);
    const renewedStudents = studentsWithRecentPayments.filter(s => s.remainingHours < 10);
    
    const renewalRate = studentsNeedingRenewal.length > 0 
      ? ((renewedStudents.length / studentsNeedingRenewal.length) * 100).toFixed(1)
      : 0;

    return {
      needingRenewal: studentsNeedingRenewal.length,
      renewed: renewedStudents.length,
      renewalRate,
      studentsNeedingRenewal,
      renewedStudents,
    };
  }, [students, payments]);

  const teacherCapacityAnalytics = useMemo(() => {
    const thisMonthCourses = courses.filter(c => isThisMonth(parseISO(c.date)));
    
    return teachers.map(teacher => {
      const teacherCourses = thisMonthCourses.filter(c => c.teacherId === teacher.id);
      const completedCourses = teacherCourses.filter(c => c.status === 'completed');
      const totalStudents = teacherCourses.reduce((sum, course) => 
        sum + (course.studentIds?.length || 0), 0
      );
      
      const avgStudentsPerCourse = teacherCourses.length > 0 
        ? (totalStudents / teacherCourses.length).toFixed(1)
        : 0;
      
      const capacityUtilization = teacherCourses.length > 0 
        ? Math.min(100, (teacherCourses.length / 30) * 100).toFixed(1)
        : 0;
      
      return {
        id: teacher.id,
        name: teacher.name,
        courses: teacherCourses.length,
        completedCourses: completedCourses.length,
        hours: completedCourses.length,
        totalStudents,
        avgStudentsPerCourse,
        capacityUtilization,
        status: teacher.status,
      };
    }).sort((a, b) => b.completedCourses - a.completedCourses);
  }, [teachers, courses]);

  const campusRevenueAnalytics = useMemo(() => {
    const thisMonthPayments = payments.filter(p => isThisMonth(parseISO(p.date)));
    const thisYearPayments = payments.filter(p => isThisYear(parseISO(p.date)));
    const campusNameMap = new Map(campuses.map((c) => [c.id, c.name]));

    const studentCampusMap = new Map(
      students.map((s) => [s.id, s.campusId || selectedCampusId || 'unassigned'])
    );

    const studentCountByCampus = new Map<string, number>();
    students.forEach((s) => {
      const cid = s.campusId || selectedCampusId || 'unassigned';
      studentCountByCampus.set(cid, (studentCountByCampus.get(cid) || 0) + 1);
    });

    const monthIncomeByCampus = new Map<string, number>();
    thisMonthPayments
      .filter((p) => p.amount > 0)
      .forEach((p) => {
        const cid = studentCampusMap.get(p.studentId) || selectedCampusId || 'unassigned';
        monthIncomeByCampus.set(cid, (monthIncomeByCampus.get(cid) || 0) + p.amount);
      });

    const yearIncomeByCampus = new Map<string, number>();
    thisYearPayments
      .filter((p) => p.amount > 0)
      .forEach((p) => {
        const cid = studentCampusMap.get(p.studentId) || selectedCampusId || 'unassigned';
        yearIncomeByCampus.set(cid, (yearIncomeByCampus.get(cid) || 0) + p.amount);
      });

    const campusIds = Array.from(
      new Set([
        ...studentCountByCampus.keys(),
        ...monthIncomeByCampus.keys(),
        ...yearIncomeByCampus.keys(),
      ])
    );

    return campusIds
      .map((campusId) => {
        const monthIncome = monthIncomeByCampus.get(campusId) || 0;
        const yearIncome = yearIncomeByCampus.get(campusId) || 0;
        const studentCount = studentCountByCampus.get(campusId) || 0;
        return {
          id: campusId,
          name:
            campusNameMap.get(campusId) ||
            (campusId === 'unassigned' ? (lang === 'zh' ? '未分配校区' : 'Unassigned') : campusId),
          monthIncome,
          yearIncome,
          studentCount,
          avgRevenuePerStudent: studentCount > 0 ? (yearIncome / studentCount).toFixed(0) : 0,
        };
      })
      .sort((a, b) => b.yearIncome - a.yearIncome);
  }, [payments, students, campuses, selectedCampusId, lang]);

  const teacherAnalytics = useMemo(() => {
    const thisMonthCourses = courses.filter(c => isThisMonth(parseISO(c.date)));
    
    return teachers.map(teacher => {
      const teacherCourses = thisMonthCourses.filter(c => c.teacherId === teacher.id);
      const completedCourses = teacherCourses.filter(c => c.status === 'completed');
      
      return {
        id: teacher.id,
        name: teacher.name,
        courses: teacherCourses.length,
        completedCourses: completedCourses.length,
        hours: completedCourses.length,
        status: teacher.status,
      };
    }).sort((a, b) => b.courses - a.courses);
  }, [teachers, courses]);

  const financialAnalytics = useMemo(() => {
    const monthIncome = windowedPayments.filter(p => p.amount > 0).reduce((sum, p) => sum + p.amount, 0);
    const monthExpense = windowedPayments.filter(p => p.amount < 0).reduce((sum, p) => sum + Math.abs(p.amount), 0);
    const yearIncome = filteredPayments.filter(p => p.amount > 0).reduce((sum, p) => sum + p.amount, 0);
    const yearExpense = filteredPayments.filter(p => p.amount < 0).reduce((sum, p) => sum + Math.abs(p.amount), 0);

    const avgMonthIncome = monthlyData.reduce((sum, m) => sum + m.income, 0) / Math.max(monthlyData.length, 1);
    const forecastNextMonth = avgMonthIncome * 1.05;

    return {
      monthIncome,
      monthExpense,
      monthProfit: monthIncome - monthExpense,
      yearIncome,
      yearExpense,
      yearProfit: yearIncome - yearExpense,
      forecastNextMonth,
      profitRate: monthIncome > 0 ? (((monthIncome - monthExpense) / monthIncome) * 100).toFixed(1) : 0,
    };
  }, [windowedPayments, filteredPayments, monthlyData]);

  const conversionFunnel = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const contacted = leads.filter(l => l.status === 'contacted').length;
    const trial = leads.filter(l => l.status === 'trial').length;
    const converted = leads.filter(l => l.status === 'converted').length;
    const lost = leads.filter(l => l.status === 'lost').length;

    return [
      { stage: lang === 'zh' ? '总线索' : 'Total Leads', count: total, rate: 100 },
      { stage: lang === 'zh' ? '已联系' : 'Contacted', count: contacted + trial + converted, rate: total > 0 ? (((contacted + trial + converted) / total) * 100).toFixed(1) : 0 },
      { stage: lang === 'zh' ? '试听课' : 'Trial', count: trial + converted, rate: total > 0 ? (((trial + converted) / total) * 100).toFixed(1) : 0 },
      { stage: lang === 'zh' ? '已转化' : 'Converted', count: converted, rate: total > 0 ? ((converted / total) * 100).toFixed(1) : 0 },
    ];
  }, [leads, lang]);

  const handleExportExcel = () => {
    const studentData = students.map(s => ({
      '学员姓名': s.name,
      '联系电话': s.parentPhone || '-',
      '剩余课时': s.remainingHours,
      '状态': s.remainingHours > 0 ? '活跃' : '待续费',
    }));

    const teacherData = teacherAnalytics.map(t => ({
      '教师姓名': t.name,
      '本月课程': t.courses,
      '已完成': t.completedCourses,
      '课时数': t.hours,
    }));

    const financeData = monthlyData.map(m => ({
      '月份': m.monthFull,
      '课程数': m.courses,
      '已完成': m.completedCourses,
      '收入(元)': m.income,
      '收入(展示)': formatCurrencyValue(m.income),
      '支出(元)': m.expense,
      '支出(展示)': formatCurrencyValue(m.expense),
      '利润(元)': m.profit,
      '利润(展示)': formatCurrencyValue(m.profit),
    }));

    const summaryData = [
      { 指标: lang === 'zh' ? '校区' : 'Campus', 数值: currentCampusName, 数值展示: currentCampusName },
      { 指标: lang === 'zh' ? '时间窗口' : 'Window', 数值: analyticsWindow, 数值展示: lang === 'zh' ? `近${analyticsWindow}天` : `${analyticsWindow} days` },
      { 指标: lang === 'zh' ? '状态筛选' : 'Status', 数值: analyticsStatusLabel, 数值展示: analyticsStatusLabel },
      { 指标: lang === 'zh' ? '窗口收入' : 'Window Income', 数值: financialAnalytics.monthIncome, 数值展示: formatCurrencyValue(financialAnalytics.monthIncome) },
      { 指标: lang === 'zh' ? '窗口支出' : 'Window Expense', 数值: financialAnalytics.monthExpense, 数值展示: formatCurrencyValue(financialAnalytics.monthExpense) },
      { 指标: lang === 'zh' ? '窗口利润' : 'Window Profit', 数值: financialAnalytics.monthProfit, 数值展示: formatCurrencyValue(financialAnalytics.monthProfit) },
      { 指标: lang === 'zh' ? '窗口记录数' : 'Window Payment Rows', 数值: windowedPayments.length, 数值展示: String(windowedPayments.length) },
    ];

    exportMultipleSheetsToExcel([
      { name: lang === 'zh' ? '筛选汇总' : 'Summary', data: summaryData },
      { name: '学员统计', data: studentData },
      { name: '教师绩效', data: teacherData },
      { name: '财务数据', data: financeData },
    ], `经营分析报告_${currentCampusName}_${format(new Date(), 'yyyy-MM-dd')}_${analyticsWindow}d_${analyticsStatus}`);
    
    showToast(lang === 'zh' ? 'Excel导出成功' : 'Excel exported', 'success');
  };

  const handleExportPDF = () => {
    const studentData = students.slice(0, 20).map(s => ({
      name: s.name,
      phone: s.parentPhone || '-',
      hours: String(s.remainingHours),
      status: s.remainingHours > 0 ? '活跃' : '待续费',
    }));

    const teacherData = teacherAnalytics.slice(0, 10).map(t => ({
      name: t.name,
      courses: String(t.courses),
      completed: String(t.completedCourses),
      hours: String(t.hours),
    }));

    const financeData = monthlyData.map(m => ({
      month: m.month,
      courses: String(m.courses),
      income: formatCurrencyValue(m.income),
      expense: formatCurrencyValue(m.expense),
      profit: formatCurrencyValue(m.profit),
    }));

    exportReportToPDF({
      title: lang === 'zh' ? '经营分析报告' : 'Business Analytics Report',
      period: `${format(new Date(), 'yyyy年M月')} · ${currentCampusName} · ${lang === 'zh' ? `近${analyticsWindow}天` : `${analyticsWindow} days`} · ${analyticsStatusLabel}`,
      sections: [
        {
          title: lang === 'zh' ? '学员统计' : 'Student Statistics',
          columns: [
            { header: lang === 'zh' ? '姓名' : 'Name', dataKey: 'name' },
            { header: lang === 'zh' ? '电话' : 'Phone', dataKey: 'phone' },
            { header: lang === 'zh' ? '课时' : 'Hours', dataKey: 'hours' },
            { header: lang === 'zh' ? '状态' : 'Status', dataKey: 'status' },
          ],
          data: studentData,
        },
        {
          title: lang === 'zh' ? '教师绩效' : 'Teacher Performance',
          columns: [
            { header: lang === 'zh' ? '姓名' : 'Name', dataKey: 'name' },
            { header: lang === 'zh' ? '课程数' : 'Courses', dataKey: 'courses' },
            { header: lang === 'zh' ? '已完成' : 'Completed', dataKey: 'completed' },
            { header: lang === 'zh' ? '课时' : 'Hours', dataKey: 'hours' },
          ],
          data: teacherData,
        },
        {
          title: lang === 'zh' ? '财务数据' : 'Financial Data',
          columns: [
            { header: lang === 'zh' ? '月份' : 'Month', dataKey: 'month' },
            { header: lang === 'zh' ? '课程数' : 'Courses', dataKey: 'courses' },
            { header: lang === 'zh' ? '收入' : 'Income', dataKey: 'income' },
            { header: lang === 'zh' ? '支出' : 'Expense', dataKey: 'expense' },
            { header: lang === 'zh' ? '利润' : 'Profit', dataKey: 'profit' },
          ],
          data: financeData,
        },
      ],
      filename: `经营分析报告_${currentCampusName}_${format(new Date(), 'yyyy-MM-dd')}_${analyticsWindow}d_${analyticsStatus}`,
    });
    
    showToast(lang === 'zh' ? 'PDF导出成功' : 'PDF exported', 'success');
  };

  const handleCopyAnalyticsSnapshot = async () => {
    const generatedAt = format(new Date(), 'yyyy-MM-dd HH:mm');
    const text = [
      lang === 'zh' ? `校区：${currentCampusName}` : `Campus: ${currentCampusName}`,
      lang === 'zh' ? `窗口：近${analyticsWindow}天` : `Window: ${analyticsWindow} days`,
      lang === 'zh' ? `状态：${analyticsStatusLabel}` : `Status: ${analyticsStatusLabel}`,
      lang === 'zh'
        ? `收入/支出/利润：${formatCurrencyValue(financialAnalytics.monthIncome)} / ${formatCurrencyValue(financialAnalytics.monthExpense)} / ${formatCurrencyValue(financialAnalytics.monthProfit)}`
        : `Income/Expense/Profit: ${formatCurrencyValue(financialAnalytics.monthIncome)} / ${formatCurrencyValue(financialAnalytics.monthExpense)} / ${formatCurrencyValue(financialAnalytics.monthProfit)}`,
      lang === 'zh' ? `生成时间：${generatedAt}` : `Generated: ${generatedAt}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      showToast(lang === 'zh' ? '筛选快照已复制' : 'Snapshot copied', 'success');
    } catch {
      showToast(lang === 'zh' ? '复制失败' : 'Copy failed', 'error');
    }
  };

  const handleCopyAnalyticsMarkdown = async () => {
    const generatedAt = format(new Date(), 'yyyy-MM-dd HH:mm');
    const markdown = [
      `## ${lang === 'zh' ? '经营分析筛选快照' : 'Analytics Filter Snapshot'}`,
      '',
      `- ${lang === 'zh' ? '校区' : 'Campus'}: ${currentCampusName}`,
      `- ${lang === 'zh' ? '窗口' : 'Window'}: ${lang === 'zh' ? `近${analyticsWindow}天` : `${analyticsWindow} days`}`,
      `- ${lang === 'zh' ? '状态' : 'Status'}: ${analyticsStatusLabel}`,
      `- ${lang === 'zh' ? '收入' : 'Income'}: ${formatCurrencyValue(financialAnalytics.monthIncome)}`,
      `- ${lang === 'zh' ? '支出' : 'Expense'}: ${formatCurrencyValue(financialAnalytics.monthExpense)}`,
      `- ${lang === 'zh' ? '利润' : 'Profit'}: ${formatCurrencyValue(financialAnalytics.monthProfit)}`,
      `- ${lang === 'zh' ? '利润率' : 'Profit Rate'}: ${financialAnalytics.profitRate}%`,
      `- ${lang === 'zh' ? '生成时间' : 'Generated'}: ${generatedAt}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(markdown);
      showToast(lang === 'zh' ? 'Markdown 摘要已复制' : 'Markdown summary copied', 'success');
    } catch {
      showToast(lang === 'zh' ? '复制失败' : 'Copy failed', 'error');
    }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  if (allLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {lang === 'zh' ? '经营分析' : 'Analytics'}
        </h1>
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {lang === 'zh' ? '导出报告' : 'Export'}
          </button>
          
          {showExportMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowExportMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                <button
                  onClick={() => {
                    handleExportExcel();
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                  {lang === 'zh' ? '导出 Excel' : 'Export Excel'}
                </button>
                <button
                  onClick={() => {
                    handleExportPDF();
                    setShowExportMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                >
                  <FileText className="w-4 h-4 text-red-600" />
                  {lang === 'zh' ? '导出 PDF' : 'Export PDF'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: lang === 'zh' ? '总览' : 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'students', label: lang === 'zh' ? '学员分析' : 'Students', icon: <Users className="w-4 h-4" /> },
          { id: 'teachers', label: lang === 'zh' ? '教师分析' : 'Teachers', icon: <Award className="w-4 h-4" /> },
          { id: 'finance', label: lang === 'zh' ? '财务分析' : 'Finance', icon: <DollarSign className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{studentAnalytics.total}</p>
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '学员总数' : 'Total Students'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{studentAnalytics.retentionRate}%</p>
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '留存率' : 'Retention'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">¥{financialAnalytics.monthIncome.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '本月收入' : 'Month Income'}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{conversionFunnel[3].rate}%</p>
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '转化率' : 'Conversion'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
                {lang === 'zh' ? '收入趋势' : 'Revenue Trend'}
              </h3>
              <div className="flex items-end gap-2 h-32">
                {monthlyData.map((data, i) => {
                  const maxIncome = Math.max(...monthlyData.map(d => d.income), 1);
                  const height = (data.income / maxIncome) * 100;
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-gradient-to-t from-indigo-500 to-purple-400 rounded-t transition-all"
                        style={{ height: `${Math.max(height, 2)}%` }}
                      />
                      <span className="text-xs text-gray-500">{data.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                {lang === 'zh' ? '转化漏斗' : 'Conversion Funnel'}
              </h3>
              <div className="space-y-3">
                {conversionFunnel.map((stage, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{stage.stage}</span>
                      <span className="text-sm font-medium text-gray-900">{stage.count} ({stage.rate}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${stage.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              {lang === 'zh' ? '课程消耗趋势' : 'Course Consumption'}
            </h3>
            <div className="flex items-end gap-2 h-32">
              {monthlyData.map((data, i) => {
                const maxCourses = Math.max(...monthlyData.map(d => d.completedCourses), 1);
                const height = (data.completedCourses / maxCourses) * 100;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full bg-gradient-to-t from-green-500 to-emerald-400 rounded-t transition-all"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <span className="text-xs text-gray-500">{data.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">
                  {monthlyData.reduce((sum, m) => sum + m.completedCourses, 0)}
                </p>
                <p className="text-xs text-gray-500">{lang === 'zh' ? '年度总课时' : 'Yearly Hours'}</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-indigo-600">
                  {(monthlyData.reduce((sum, m) => sum + m.completedCourses, 0) / 12).toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">{lang === 'zh' ? '月均课时' : 'Avg/Month'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-gray-900">{studentAnalytics.total}</p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '学员总数' : 'Total'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-green-600">{studentAnalytics.active}</p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '活跃学员' : 'Active'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-amber-600">{studentAnalytics.lowHours}</p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '课时不足' : 'Low Hours'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-red-600">{studentAnalytics.zeroHours}</p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '已耗尽' : 'Zero Hours'}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              {lang === 'zh' ? '学员流失预警' : 'Churn Prediction'}
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-2xl font-bold text-red-600">{studentAnalytics.highRiskStudents.length}</p>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '高风险' : 'High Risk'}</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-2xl font-bold text-amber-600">{studentAnalytics.mediumRiskStudents.length}</p>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '中风险' : 'Medium Risk'}</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-2xl font-bold text-blue-600">{studentAnalytics.lowRiskStudents.length}</p>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '低风险' : 'Low Risk'}</p>
              </div>
            </div>
            <div className="space-y-2">
              {studentAnalytics.atRiskStudents.slice(0, 5).map(student => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-500">
                      {lang === 'zh' ? '剩余课时' : 'Remaining'}: {student.remainingHours}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    student.remainingHours === 0 ? 'bg-red-100 text-red-700' :
                    student.remainingHours < 5 ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {student.remainingHours === 0 ? (lang === 'zh' ? '需立即跟进' : 'Urgent') :
                     student.remainingHours < 5 ? (lang === 'zh' ? '建议续费' : 'Suggest Renew') :
                     (lang === 'zh' ? '关注中' : 'Monitoring')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-green-500" />
              {lang === 'zh' ? '续费转化率分析' : 'Renewal Conversion Analysis'}
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <p className="text-2xl font-bold text-amber-600">{renewalAnalytics.needingRenewal}</p>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '需续费' : 'Need Renew'}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{renewalAnalytics.renewed}</p>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '已续费' : 'Renewed'}</p>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-xl">
                <p className="text-2xl font-bold text-indigo-600">{renewalAnalytics.renewalRate}%</p>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '转化率' : 'Conversion Rate'}</p>
              </div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-400 to-indigo-500 rounded-full transition-all"
                style={{ width: `${renewalAnalytics.renewalRate}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">{lang === 'zh' ? '学员课时分布' : 'Hours Distribution'}</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-600">{studentAnalytics.zeroHours}</p>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '0课时' : '0 Hours'}</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl">
                <p className="text-2xl font-bold text-amber-600">{studentAnalytics.lowHours}</p>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '1-4课时' : '1-4 Hours'}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{studentAnalytics.active - studentAnalytics.lowHours}</p>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '5+课时' : '5+ Hours'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">{lang === 'zh' ? '关键指标' : 'Key Metrics'}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">{lang === 'zh' ? '平均剩余课时' : 'Avg Remaining Hours'}</span>
                <span className="font-bold text-gray-900">{studentAnalytics.avgHours}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">{lang === 'zh' ? '总剩余课时' : 'Total Remaining'}</span>
                <span className="font-bold text-gray-900">{studentAnalytics.totalHours}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">{lang === 'zh' ? '学员留存率' : 'Retention Rate'}</span>
                <span className="font-bold text-green-600">{studentAnalytics.retentionRate}%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-600">{lang === 'zh' ? '风险学员数' : 'At Risk Students'}</span>
                <span className="font-bold text-red-600">{studentAnalytics.atRiskStudents.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-gray-900">{teachers.filter(t => t.status === 'active').length}</p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '在职教师' : 'Active Teachers'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-indigo-600">
                {teacherCapacityAnalytics.reduce((sum, t) => sum + t.courses, 0)}
              </p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '本月课程' : 'Month Courses'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-green-600">
                {teacherCapacityAnalytics.reduce((sum, t) => sum + t.completedCourses, 0)}
              </p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '已完成' : 'Completed'}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-purple-600">
                {teacherCapacityAnalytics.length > 0 
                  ? (teacherCapacityAnalytics.reduce((sum, t) => sum + t.completedCourses, 0) / teacherCapacityAnalytics.length).toFixed(1)
                  : 0}
              </p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '人均课时' : 'Avg/Teacher'}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              {lang === 'zh' ? '教师产能对比' : 'Teacher Capacity Comparison'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">{lang === 'zh' ? '教师' : 'Teacher'}</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">{lang === 'zh' ? '课程数' : 'Courses'}</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">{lang === 'zh' ? '已完成' : 'Completed'}</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">{lang === 'zh' ? '学员数' : 'Students'}</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">{lang === 'zh' ? '平均学员' : 'Avg Students'}</th>
                    <th className="text-center py-2 px-3 text-gray-500 font-medium">{lang === 'zh' ? '产能利用率' : 'Capacity'}</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherCapacityAnalytics.map((teacher, i) => (
                    <tr key={teacher.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-amber-500 text-white' : 
                            i === 1 ? 'bg-gray-400 text-white' : 
                            i === 2 ? 'bg-amber-700 text-white' : 
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {i + 1}
                          </span>
                          <span className="font-medium text-gray-900">{teacher.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-3 text-gray-900">{teacher.courses}</td>
                      <td className="text-center py-2 px-3 text-green-600 font-medium">{teacher.completedCourses}</td>
                      <td className="text-center py-2 px-3 text-indigo-600">{teacher.totalStudents}</td>
                      <td className="text-center py-2 px-3 text-purple-600">{teacher.avgStudentsPerCourse}</td>
                      <td className="text-center py-2 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-400 to-indigo-500 rounded-full"
                              style={{ width: `${teacher.capacityUtilization}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{teacher.capacityUtilization}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">{lang === 'zh' ? '教师绩效排名' : 'Teacher Performance'}</h3>
            <div className="space-y-3">
              {teacherCapacityAnalytics.slice(0, 10).map((teacher, i) => (
                <div key={teacher.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{teacher.name}</p>
                    <p className="text-xs text-gray-500">
                      {lang === 'zh' ? `${teacher.courses}节课程 · ${teacher.completedCourses}节已完成 · ${teacher.totalStudents}名学员` : `${teacher.courses} courses · ${teacher.completedCourses} completed · ${teacher.totalStudents} students`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{teacher.completedCourses}</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '课时' : 'Hours'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="space-y-6">
          <BusinessFilterBar
            lang={lang}
            windowDays={analyticsWindow}
            onWindowDaysChange={setAnalyticsWindow}
            status={analyticsStatus}
            onStatusChange={setAnalyticsStatus}
            onExport={handleExportExcel}
            exportLabel={lang === 'zh' ? '导出经营分析' : 'Export Analytics'}
          />
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{lang === 'zh' ? '筛选快照' : 'Filter Snapshot'}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span>{lang === 'zh' ? `校区：${currentCampusName}` : `Campus: ${currentCampusName}`}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span>{lang === 'zh' ? `近${analyticsWindow}天` : `${analyticsWindow} days`}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span>{analyticsStatusLabel}</span>
              </div>
              <button
                onClick={handleCopyAnalyticsSnapshot}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                {lang === 'zh' ? '复制条件' : 'Copy Snapshot'}
              </button>
              <button
                onClick={handleCopyAnalyticsMarkdown}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {lang === 'zh' ? '复制 Markdown 摘要' : 'Copy Markdown'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-green-600">¥{financialAnalytics.monthIncome.toLocaleString()}</p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? `近${analyticsWindow}天收入` : `${analyticsWindow}d Income`}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-red-600">¥{financialAnalytics.monthExpense.toLocaleString()}</p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? `近${analyticsWindow}天支出` : `${analyticsWindow}d Expense`}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className={`text-3xl font-bold ${financialAnalytics.monthProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                ¥{financialAnalytics.monthProfit.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? `近${analyticsWindow}天利润` : `${analyticsWindow}d Profit`}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <p className="text-3xl font-bold text-purple-600">{financialAnalytics.profitRate}%</p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '利润率' : 'Profit Rate'}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-500" />
              {lang === 'zh' ? '校区营收对比' : 'Campus Revenue Comparison'}
            </h3>
            <div className="space-y-4">
              {campusRevenueAnalytics.map((campus, i) => (
                <div key={campus.id || campus.name} className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300'
                      }`}>
                        {i + 1}
                      </span>
                      <span className="font-bold text-gray-900">{campus.name}</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">¥{campus.yearIncome.toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-3">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">¥{campus.monthIncome.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? '本月收入' : 'Month Revenue'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">{campus.studentCount}</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? '学员数' : 'Students'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">¥{campus.avgRevenuePerStudent}</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? '人均营收' : 'Avg/Student'}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-indigo-500 rounded-full transition-all"
                        style={{ width: `${(campus.yearIncome / Math.max(...campusRevenueAnalytics.map(c => c.yearIncome), 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">{lang === 'zh' ? '年度汇总' : 'Year Summary'}</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                  <span className="text-gray-600">{lang === 'zh' ? '年度收入' : 'Year Income'}</span>
                  <span className="font-bold text-green-600">¥{financialAnalytics.yearIncome.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <span className="text-gray-600">{lang === 'zh' ? '年度支出' : 'Year Expense'}</span>
                  <span className="font-bold text-red-600">¥{financialAnalytics.yearExpense.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
                  <span className="text-gray-600">{lang === 'zh' ? '年度利润' : 'Year Profit'}</span>
                  <span className={`font-bold ${financialAnalytics.yearProfit >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                    ¥{financialAnalytics.yearProfit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">{lang === 'zh' ? '收入预测' : 'Revenue Forecast'}</h3>
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-indigo-600">¥{Math.round(financialAnalytics.forecastNextMonth).toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-2">{lang === 'zh' ? '预计下月收入' : 'Forecasted Next Month'}</p>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                <p className="text-xs text-gray-500">
                  {lang === 'zh' 
                    ? '基于近 12 个月平均收入计算，考虑 5% 增长预期'
                    : 'Based on 12-month average with 5% growth expectation'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4">{lang === 'zh' ? '收支对比' : 'Income vs Expense'}</h3>
            <div className="flex items-end gap-2 h-40">
              {monthlyData.map((data, i) => {
                const maxValue = Math.max(...monthlyData.map(d => Math.max(d.income, d.expense)), 1);
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end h-32">
                      <div 
                        className="flex-1 bg-green-400 rounded-t transition-all"
                        style={{ height: `${(data.income / maxValue) * 100}%` }}
                      />
                      <div 
                        className="flex-1 bg-red-400 rounded-t transition-all"
                        style={{ height: `${(data.expense / maxValue) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{data.month}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded" />
                <span className="text-xs text-gray-600">{lang === 'zh' ? '收入' : 'Income'}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded" />
                <span className="text-xs text-gray-600">{lang === 'zh' ? '支出' : 'Expense'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
