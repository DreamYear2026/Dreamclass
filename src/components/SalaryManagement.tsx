import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
  Download,
  Plus,
  Edit2,
  CheckCircle,
  Clock,
  Award,
  Eye,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Settings,
  Save
} from 'lucide-react';
import { Language, SalaryRecord, SalaryAdjustment, TeacherSalaryConfig, Teacher } from '../types';
import { useTranslation } from '../i18n';
import { useTeachers, useCourses, useFeedbacks } from '../contexts/AppContext';
import { useToast } from './Toast';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { exportToCSV, exportToExcel } from '../utils/export';
import BottomSheet from './BottomSheet';

const DEFAULT_BASE_SALARY = 3000;
const DEFAULT_HOURLY_RATE = 150;
const DEFAULT_PERFORMANCE_BONUS_THRESHOLD = 4.5;
const DEFAULT_PERFORMANCE_BONUS_AMOUNT = 500;
const DEFAULT_ATTENDANCE_BONUS = 300;
const DEFAULT_RETENTION_BONUS_RATE = 0.05;
const DEFAULT_TAX_RATE = 0.03;
const DEFAULT_INSURANCE_RATE = 0.08;

const generateMockSalaryRecords = (teachers: Teacher[]): SalaryRecord[] => {
  const records: SalaryRecord[] = [];
  const now = new Date();

  teachers.forEach((teacher, index) => {
    for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
      const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
      const totalHours = Math.floor(Math.random() * 40) + 20;
      const hourlySalary = totalHours * DEFAULT_HOURLY_RATE;
      const avgRating = 4 + Math.random();
      const performanceBonus = avgRating >= DEFAULT_PERFORMANCE_BONUS_THRESHOLD ? DEFAULT_PERFORMANCE_BONUS_AMOUNT : 0;
      const attendanceBonus = Math.random() > 0.3 ? DEFAULT_ATTENDANCE_BONUS : 0;
      const retentionBonus = Math.floor(hourlySalary * DEFAULT_RETENTION_BONUS_RATE);
      const totalBonus = performanceBonus + attendanceBonus + retentionBonus;
      const grossSalary = DEFAULT_BASE_SALARY + hourlySalary + totalBonus;
      const taxDeduction = Math.floor(grossSalary * DEFAULT_TAX_RATE);
      const insuranceDeduction = Math.floor(grossSalary * DEFAULT_INSURANCE_RATE);
      const totalDeduction = taxDeduction + insuranceDeduction;
      const netSalary = grossSalary - totalDeduction;

      const statuses: Array<'draft' | 'confirmed' | 'paid'> = ['paid', 'paid', 'paid', 'confirmed', 'draft', 'draft'];
      const status = statuses[monthOffset] || 'draft';

      records.push({
        id: `salary-${teacher.id}-${date.getFullYear()}-${date.getMonth()}`,
        teacherId: teacher.id,
        teacherName: teacher.name,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        baseSalary: DEFAULT_BASE_SALARY,
        hourlyRate: DEFAULT_HOURLY_RATE,
        totalHours,
        hourlySalary,
        performanceBonus,
        attendanceBonus,
        retentionBonus,
        otherBonus: 0,
        totalBonus,
        taxDeduction,
        insuranceDeduction,
        otherDeduction: 0,
        totalDeduction,
        netSalary,
        status,
        paidAt: status === 'paid' ? new Date(date.getFullYear(), date.getMonth(), 25).toISOString() : undefined,
        confirmedAt: status !== 'draft' ? new Date(date.getFullYear(), date.getMonth(), 20).toISOString() : undefined,
        createdAt: new Date(date.getFullYear(), date.getMonth(), 1).toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  });

  return records;
};

const generateMockSalaryConfigs = (teachers: Teacher[]): TeacherSalaryConfig[] => {
  return teachers.map(teacher => ({
    id: `config-${teacher.id}`,
    teacherId: teacher.id,
    teacherName: teacher.name,
    baseSalary: DEFAULT_BASE_SALARY + (Math.random() * 1000 - 500),
    hourlyRate: DEFAULT_HOURLY_RATE + (Math.random() * 50 - 25),
    performanceBonusThreshold: DEFAULT_PERFORMANCE_BONUS_THRESHOLD,
    performanceBonusAmount: DEFAULT_PERFORMANCE_BONUS_AMOUNT + (Math.random() * 200 - 100),
    attendanceBonusAmount: DEFAULT_ATTENDANCE_BONUS,
    retentionBonusRate: DEFAULT_RETENTION_BONUS_RATE,
    taxRate: DEFAULT_TAX_RATE,
    insuranceRate: DEFAULT_INSURANCE_RATE,
    effectiveDate: '2026-01-01',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: new Date().toISOString()
  }));
};

export default function SalaryManagement({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { teachers } = useTeachers();
  const { courses } = useCourses();
  const { feedbacks } = useFeedbacks();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'records' | 'config' | 'analytics'>('records');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [salaryConfigs, setSalaryConfigs] = useState<TeacherSalaryConfig[]>([]);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<TeacherSalaryConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teachers.length > 0) {
      setSalaryRecords(generateMockSalaryRecords(teachers));
      setSalaryConfigs(generateMockSalaryConfigs(teachers));
      setLoading(false);
    }
  }, [teachers]);

  const filteredRecords = useMemo(() => {
    return salaryRecords.filter(record => {
      const matchesYear = record.year === selectedYear;
      const matchesMonth = selectedMonth === 0 || record.month === selectedMonth;
      const matchesTeacher = selectedTeacher === 'all' || record.teacherId === selectedTeacher;
      const matchesSearch = record.teacherName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesYear && matchesMonth && matchesTeacher && matchesSearch;
    }).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [salaryRecords, selectedYear, selectedMonth, selectedTeacher, searchQuery]);

  const stats = useMemo(() => {
    const currentRecords = filteredRecords.filter(r => r.year === selectedYear && (selectedMonth === 0 || r.month === selectedMonth));
    const totalNetSalary = currentRecords.reduce((sum, r) => sum + r.netSalary, 0);
    const totalBaseSalary = currentRecords.reduce((sum, r) => sum + r.baseSalary, 0);
    const totalBonus = currentRecords.reduce((sum, r) => sum + r.totalBonus, 0);
    const totalDeduction = currentRecords.reduce((sum, r) => sum + r.totalDeduction, 0);
    const totalHours = currentRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const avgNetSalary = currentRecords.length > 0 ? Math.round(totalNetSalary / currentRecords.length) : 0;

    return {
      totalNetSalary,
      totalBaseSalary,
      totalBonus,
      totalDeduction,
      totalHours,
      avgNetSalary,
      recordCount: currentRecords.length
    };
  }, [filteredRecords, selectedYear, selectedMonth]);

  const monthlyChartData = useMemo(() => {
    const yearStart = startOfYear(new Date(selectedYear, 0, 1));
    const yearEnd = endOfYear(new Date(selectedYear, 0, 1));
    const yearRecords = salaryRecords.filter(r => r.year === selectedYear);
    
    return Array.from({ length: 12 }).map((_, i) => {
      const monthRecords = yearRecords.filter(r => r.month === i + 1);
      return {
        name: lang === 'zh' ? `${i + 1}月` : `Month ${i + 1}`,
        netSalary: monthRecords.reduce((sum, r) => sum + r.netSalary, 0),
        bonus: monthRecords.reduce((sum, r) => sum + r.totalBonus, 0),
        hours: monthRecords.reduce((sum, r) => sum + r.totalHours, 0)
      };
    });
  }, [salaryRecords, selectedYear, lang]);

  const teacherDistributionData = useMemo(() => {
    const currentRecords = filteredRecords.filter(r => r.year === selectedYear && (selectedMonth === 0 || r.month === selectedMonth));
    return currentRecords.map(r => ({
      name: r.teacherName,
      value: r.netSalary
    }));
  }, [filteredRecords, selectedYear, selectedMonth]);

  const calculateSalary = (teacherId: string, year: number, month: number): SalaryRecord => {
    const teacher = teachers.find(t => t.id === teacherId);
    const config = salaryConfigs.find(c => c.teacherId === teacherId);
    const monthStart = startOfMonth(new Date(year, month - 1, 1));
    const monthEnd = endOfMonth(new Date(year, month - 1, 1));

    const teacherCourses = courses.filter(c => {
      const courseDate = parseISO(c.date);
      return c.teacherId === teacherId && 
             c.status === 'completed' &&
             isWithinInterval(courseDate, { start: monthStart, end: monthEnd });
    });

    const totalHours = teacherCourses.length;
    const baseSalary = config?.baseSalary || DEFAULT_BASE_SALARY;
    const hourlyRate = config?.hourlyRate || DEFAULT_HOURLY_RATE;
    const hourlySalary = totalHours * hourlyRate;

    const teacherFeedbacks = feedbacks.filter(f => {
      const feedbackDate = parseISO(f.date);
      return f.teacherId === teacherId &&
             isWithinInterval(feedbackDate, { start: monthStart, end: monthEnd });
    });

    const avgRating = teacherFeedbacks.length > 0
      ? teacherFeedbacks.reduce((sum, f) => sum + f.rating, 0) / teacherFeedbacks.length
      : 4.5;

    const performanceBonusThreshold = config?.performanceBonusThreshold || DEFAULT_PERFORMANCE_BONUS_THRESHOLD;
    const performanceBonusAmount = config?.performanceBonusAmount || DEFAULT_PERFORMANCE_BONUS_AMOUNT;
    const performanceBonus = avgRating >= performanceBonusThreshold ? performanceBonusAmount : 0;
    const attendanceBonus = config?.attendanceBonusAmount || DEFAULT_ATTENDANCE_BONUS;
    const retentionBonusRate = config?.retentionBonusRate || DEFAULT_RETENTION_BONUS_RATE;
    const retentionBonus = Math.floor(hourlySalary * retentionBonusRate);
    const totalBonus = performanceBonus + attendanceBonus + retentionBonus;

    const grossSalary = baseSalary + hourlySalary + totalBonus;
    const taxRate = config?.taxRate || DEFAULT_TAX_RATE;
    const insuranceRate = config?.insuranceRate || DEFAULT_INSURANCE_RATE;
    const taxDeduction = Math.floor(grossSalary * taxRate);
    const insuranceDeduction = Math.floor(grossSalary * insuranceRate);
    const totalDeduction = taxDeduction + insuranceDeduction;
    const netSalary = grossSalary - totalDeduction;

    return {
      id: `salary-${teacherId}-${year}-${month}`,
      teacherId,
      teacherName: teacher?.name || '',
      year,
      month,
      baseSalary,
      hourlyRate,
      totalHours,
      hourlySalary,
      performanceBonus,
      attendanceBonus,
      retentionBonus,
      otherBonus: 0,
      totalBonus,
      taxDeduction,
      insuranceDeduction,
      otherDeduction: 0,
      totalDeduction,
      netSalary,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  };

  const generateMonthlySalaries = () => {
    const activeTeachers = teachers.filter(t => t.status === 'active');
    const newRecords: SalaryRecord[] = [];

    activeTeachers.forEach(teacher => {
      const existingRecord = salaryRecords.find(
        r => r.teacherId === teacher.id && r.year === selectedYear && r.month === selectedMonth
      );

      if (!existingRecord) {
        const newRecord = calculateSalary(teacher.id, selectedYear, selectedMonth);
        newRecords.push(newRecord);
      }
    });

    if (newRecords.length > 0) {
      setSalaryRecords([...salaryRecords, ...newRecords]);
      showToast(lang === 'zh' ? `已生成 ${newRecords.length} 条工资记录` : `Generated ${newRecords.length} salary records`, 'success');
    } else {
      showToast(lang === 'zh' ? '本月工资记录已生成' : 'Salary records already generated for this month', 'info');
    }
  };

  const confirmSalary = (recordId: string) => {
    setSalaryRecords(prev => prev.map(r => 
      r.id === recordId 
        ? { ...r, status: 'confirmed', confirmedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : r
    ));
    showToast(lang === 'zh' ? '工资已确认' : 'Salary confirmed', 'success');
  };

  const markAsPaid = (recordId: string) => {
    setSalaryRecords(prev => prev.map(r => 
      r.id === recordId 
        ? { ...r, status: 'paid', paidAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        : r
    ));
    showToast(lang === 'zh' ? '工资已发放' : 'Salary marked as paid', 'success');
  };

  const saveConfig = (config: TeacherSalaryConfig) => {
    if (editingConfig) {
      setSalaryConfigs(prev => prev.map(c => c.id === config.id ? config : c));
    } else {
      setSalaryConfigs([...salaryConfigs, config]);
    }
    setShowConfigForm(false);
    setEditingConfig(null);
    showToast(lang === 'zh' ? '薪资配置已保存' : 'Salary config saved', 'success');
  };

  const exportSalaryData = () => {
    const exportData = filteredRecords.map(r => ({
      '教师姓名': r.teacherName,
      '年份': r.year,
      '月份': r.month,
      '基本工资': r.baseSalary,
      '课时费': r.hourlySalary,
      '绩效奖金': r.performanceBonus,
      '全勤奖金': r.attendanceBonus,
      '留存奖金': r.retentionBonus,
      '其他奖金': r.otherBonus,
      '奖金合计': r.totalBonus,
      '个税': r.taxDeduction,
      '社保': r.insuranceDeduction,
      '其他扣款': r.otherDeduction,
      '扣款合计': r.totalDeduction,
      '实发工资': r.netSalary,
      '状态': r.status === 'draft' ? '草稿' : r.status === 'confirmed' ? '已确认' : '已发放'
    }));
    exportToExcel(exportData, `工资报表_${selectedYear}年${selectedMonth > 0 ? selectedMonth + '月' : ''}`, '工资数据');
    showToast(lang === 'zh' ? '导出成功' : 'Export successful', 'success');
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500" />
            {lang === 'zh' ? '工资管理系统' : 'Salary Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '智能薪酬计算，完整工资流程管理' : 'Smart salary calculation, complete payroll management'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportSalaryData}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === 'zh' ? '导出' : 'Export'}</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'records' 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {lang === 'zh' ? '工资记录' : 'Records'}
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'config' 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {lang === 'zh' ? '薪资配置' : 'Config'}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'analytics' 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {lang === 'zh' ? '数据分析' : 'Analytics'}
        </button>
      </div>

      {activeTab === 'records' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>
                        {year}年
                      </option>
                    );
                  })}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={0}>{lang === 'zh' ? '全年' : 'All Year'}</option>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}月
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder={lang === 'zh' ? '搜索教师...' : 'Search teacher...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">{lang === 'zh' ? '全部教师' : 'All Teachers'}</option>
                {teachers.filter(t => t.status === 'active').map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>

              <button
                onClick={generateMonthlySalaries}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">{lang === 'zh' ? '生成工资' : 'Generate'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{lang === 'zh' ? '实发工资' : 'Net Salary'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">¥{stats.totalNetSalary.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{lang === 'zh' ? '基本工资' : 'Base Salary'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">¥{stats.totalBaseSalary.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{lang === 'zh' ? '奖金合计' : 'Total Bonus'}</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">¥{stats.totalBonus.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                  <Award className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{lang === 'zh' ? '总课时' : 'Total Hours'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalHours}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{lang === 'zh' ? '平均工资' : 'Avg Salary'}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">¥{stats.avgNetSalary.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-teal-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {filteredRecords.map(record => (
                <div key={record.id} className="hover:bg-gray-50 transition">
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{record.teacherName}</p>
                        <p className="text-sm text-gray-500">
                          {record.year}年{record.month}月 · {record.totalHours}课时
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden md:block">
                        <p className="text-lg font-bold text-emerald-600">¥{record.netSalary.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{lang === 'zh' ? '实发' : 'Net'}</p>
                      </div>
                      
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        record.status === 'paid' ? 'bg-green-100 text-green-700' :
                        record.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {record.status === 'paid' ? (lang === 'zh' ? '已发放' : 'Paid') :
                         record.status === 'confirmed' ? (lang === 'zh' ? '已确认' : 'Confirmed') :
                         (lang === 'zh' ? '草稿' : 'Draft')}
                      </span>

                      <div className="flex items-center gap-2">
                        {record.status === 'draft' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmSalary(record.id);
                            }}
                            className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                            title={lang === 'zh' ? '确认工资' : 'Confirm Salary'}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {record.status === 'confirmed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsPaid(record.id);
                            }}
                            className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                            title={lang === 'zh' ? '标记发放' : 'Mark as Paid'}
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                          title={lang === 'zh' ? '查看详情' : 'View Details'}
                        >
                          {expandedRecord === record.id ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedRecord === record.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                      <div className="grid md:grid-cols-3 gap-4 mt-4">
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-blue-600" />
                            {lang === 'zh' ? '收入明细' : 'Income Details'}
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '基本工资' : 'Base Salary'}</span>
                              <span className="font-medium">¥{record.baseSalary.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '课时费' : 'Hourly Salary'}</span>
                              <span className="font-medium">¥{record.hourlySalary.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '绩效奖金' : 'Performance Bonus'}</span>
                              <span className="font-medium text-amber-600">+¥{record.performanceBonus.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '全勤奖金' : 'Attendance Bonus'}</span>
                              <span className="font-medium text-amber-600">+¥{record.attendanceBonus.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '留存奖金' : 'Retention Bonus'}</span>
                              <span className="font-medium text-amber-600">+¥{record.retentionBonus.toLocaleString()}</span>
                            </div>
                            <div className="pt-2 border-t border-blue-200 flex justify-between font-semibold">
                              <span>{lang === 'zh' ? '应发工资' : 'Gross Salary'}</span>
                              <span>¥{(record.baseSalary + record.hourlySalary + record.totalBonus).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-red-600" />
                            {lang === 'zh' ? '扣款明细' : 'Deduction Details'}
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '个人所得税' : 'Tax'}</span>
                              <span className="font-medium text-red-600">-¥{record.taxDeduction.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '社会保险' : 'Insurance'}</span>
                              <span className="font-medium text-red-600">-¥{record.insuranceDeduction.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '其他扣款' : 'Other Deductions'}</span>
                              <span className="font-medium text-red-600">-¥{record.otherDeduction.toLocaleString()}</span>
                            </div>
                            <div className="pt-2 border-t border-red-200 flex justify-between font-semibold">
                              <span>{lang === 'zh' ? '扣款合计' : 'Total Deductions'}</span>
                              <span className="text-red-600">-¥{record.totalDeduction.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            {lang === 'zh' ? '工作统计' : 'Work Stats'}
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '总课时' : 'Total Hours'}</span>
                              <span className="font-medium">{record.totalHours}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">{lang === 'zh' ? '课时费率' : 'Hourly Rate'}</span>
                              <span className="font-medium">¥{record.hourlyRate}/h</span>
                            </div>
                            <div className="pt-2 border-t border-emerald-200 flex justify-between font-semibold text-lg">
                              <span>{lang === 'zh' ? '实发工资' : 'Net Salary'}</span>
                              <span className="text-emerald-600">¥{record.netSalary.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredRecords.length === 0 && (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    {lang === 'zh' ? '暂无工资记录' : 'No salary records found'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {lang === 'zh' ? '点击"生成工资"按钮生成本月工资' : 'Click "Generate" to create salary records'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">{lang === 'zh' ? '教师薪资配置' : 'Teacher Salary Configs'}</h2>
            <button
              onClick={() => {
                setEditingConfig(null);
                setShowConfigForm(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>{lang === 'zh' ? '新建配置' : 'New Config'}</span>
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {salaryConfigs.map(config => (
              <div key={config.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{config.teacherName}</p>
                      <p className="text-xs text-gray-500">
                        {lang === 'zh' ? '生效日期' : 'Effective'}: {config.effectiveDate}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingConfig(config);
                      setShowConfigForm(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">{lang === 'zh' ? '基本工资' : 'Base Salary'}</p>
                    <p className="font-semibold">¥{config.baseSalary.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{lang === 'zh' ? '课时费率' : 'Hourly Rate'}</p>
                    <p className="font-semibold">¥{config.hourlyRate}/h</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{lang === 'zh' ? '绩效阈值' : 'Perf Threshold'}</p>
                    <p className="font-semibold">{config.performanceBonusThreshold}分</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{lang === 'zh' ? '绩效奖金' : 'Perf Bonus'}</p>
                    <p className="font-semibold">¥{config.performanceBonusAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                {lang === 'zh' ? '月度工资趋势' : 'Monthly Salary Trend'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="netSalary"
                      name={lang === 'zh' ? '实发工资' : 'Net Salary'}
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ fill: '#10B981', r: 4 }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="bonus"
                      name={lang === 'zh' ? '奖金' : 'Bonus'}
                      stroke="#F59E0B"
                      strokeWidth={3}
                      dot={{ fill: '#F59E0B', r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="hours"
                      name={lang === 'zh' ? '课时' : 'Hours'}
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={{ fill: '#6366F1', r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                {lang === 'zh' ? '教师工资分布' : 'Teacher Salary Distribution'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={teacherDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {teacherDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`¥${Number(value).toLocaleString()}`, lang === 'zh' ? '工资' : 'Salary']} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart className="w-5 h-5 text-blue-600" />
              {lang === 'zh' ? '各教师工资对比' : 'Teacher Salary Comparison'}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teacherDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`¥${Number(value).toLocaleString()}`, lang === 'zh' ? '工资' : 'Salary']} />
                  <Bar dataKey="value" name={lang === 'zh' ? '工资' : 'Salary'} fill="#6366F1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {showConfigForm && (
        <BottomSheet
          isOpen={showConfigForm}
          onClose={() => {
            setShowConfigForm(false);
            setEditingConfig(null);
          }}
          title={editingConfig ? (lang === 'zh' ? '编辑薪资配置' : 'Edit Salary Config') : (lang === 'zh' ? '新建薪资配置' : 'New Salary Config')}
        >
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'zh' ? '教师' : 'Teacher'}
              </label>
              <select
                defaultValue={editingConfig?.teacherId || ''}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{lang === 'zh' ? '请选择教师' : 'Select teacher'}</option>
                {teachers.filter(t => t.status === 'active').map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '基本工资' : 'Base Salary'}
                </label>
                <input
                  type="number"
                  defaultValue={editingConfig?.baseSalary || DEFAULT_BASE_SALARY}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '课时费率' : 'Hourly Rate'}
                </label>
                <input
                  type="number"
                  defaultValue={editingConfig?.hourlyRate || DEFAULT_HOURLY_RATE}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '绩效奖金阈值' : 'Perf Bonus Threshold'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  defaultValue={editingConfig?.performanceBonusThreshold || DEFAULT_PERFORMANCE_BONUS_THRESHOLD}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '绩效奖金额' : 'Perf Bonus Amount'}
                </label>
                <input
                  type="number"
                  defaultValue={editingConfig?.performanceBonusAmount || DEFAULT_PERFORMANCE_BONUS_AMOUNT}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {lang === 'zh' ? '生效日期' : 'Effective Date'}
              </label>
              <input
                type="date"
                defaultValue={editingConfig?.effectiveDate || format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-4 flex gap-2">
              <button
                onClick={() => {
                  setShowConfigForm(false);
                  setEditingConfig(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition"
              >
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={() => {
                  saveConfig({
                    id: editingConfig?.id || `config-${Date.now()}`,
                    teacherId: '',
                    teacherName: '',
                    baseSalary: DEFAULT_BASE_SALARY,
                    hourlyRate: DEFAULT_HOURLY_RATE,
                    performanceBonusThreshold: DEFAULT_PERFORMANCE_BONUS_THRESHOLD,
                    performanceBonusAmount: DEFAULT_PERFORMANCE_BONUS_AMOUNT,
                    attendanceBonusAmount: DEFAULT_ATTENDANCE_BONUS,
                    retentionBonusRate: DEFAULT_RETENTION_BONUS_RATE,
                    taxRate: DEFAULT_TAX_RATE,
                    insuranceRate: DEFAULT_INSURANCE_RATE,
                    effectiveDate: format(new Date(), 'yyyy-MM-dd'),
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {lang === 'zh' ? '保存' : 'Save'}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
