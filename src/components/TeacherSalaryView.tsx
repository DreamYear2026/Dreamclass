import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  Download,
  Eye
} from 'lucide-react';
import { Language, SalaryRecord } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useCourses, useFeedbacks, useTeachers } from '../contexts/AppContext';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { exportToExcel } from '../utils/export';

const DEFAULT_BASE_SALARY = 3000;
const DEFAULT_HOURLY_RATE = 150;
const DEFAULT_PERFORMANCE_BONUS_THRESHOLD = 4.5;
const DEFAULT_PERFORMANCE_BONUS_AMOUNT = 500;
const DEFAULT_ATTENDANCE_BONUS = 300;
const DEFAULT_RETENTION_BONUS_RATE = 0.05;
const DEFAULT_TAX_RATE = 0.03;
const DEFAULT_INSURANCE_RATE = 0.08;

const generateTeacherSalaryRecords = (teacherId: string, teacherName: string, courses: any[], feedbacks: any[]): SalaryRecord[] => {
  const records: SalaryRecord[] = [];
  const now = new Date();

  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);

    const monthCourses = courses.filter(c => {
      const courseDate = parseISO(c.date);
      return c.teacherId === teacherId && 
             c.status === 'completed' &&
             isWithinInterval(courseDate, { start: monthStart, end: monthEnd });
    });

    const totalHours = monthCourses.length;
    const hourlySalary = totalHours * DEFAULT_HOURLY_RATE;

    const monthFeedbacks = feedbacks.filter(f => {
      const feedbackDate = parseISO(f.date);
      return f.teacherId === teacherId &&
             isWithinInterval(feedbackDate, { start: monthStart, end: monthEnd });
    });

    const avgRating = monthFeedbacks.length > 0
      ? monthFeedbacks.reduce((sum, f) => sum + f.rating, 0) / monthFeedbacks.length
      : 4.5;

    const performanceBonus = avgRating >= DEFAULT_PERFORMANCE_BONUS_THRESHOLD ? DEFAULT_PERFORMANCE_BONUS_AMOUNT : 0;
    const attendanceBonus = totalHours >= 12 ? DEFAULT_ATTENDANCE_BONUS : 0;
    const retentionBonus = Math.floor(hourlySalary * DEFAULT_RETENTION_BONUS_RATE);
    const totalBonus = performanceBonus + attendanceBonus + retentionBonus;

    const grossSalary = DEFAULT_BASE_SALARY + hourlySalary + totalBonus;
    const taxDeduction = Math.floor(grossSalary * DEFAULT_TAX_RATE);
    const insuranceDeduction = Math.floor(grossSalary * DEFAULT_INSURANCE_RATE);
    const totalDeduction = taxDeduction + insuranceDeduction;
    const netSalary = grossSalary - totalDeduction;

    const statuses: Array<'draft' | 'confirmed' | 'paid'> = ['paid', 'paid', 'paid', 'confirmed', 'draft', 'draft'];
    const status = statuses[monthOffset] || 'paid';

    records.push({
      id: `salary-${teacherId}-${date.getFullYear()}-${date.getMonth()}`,
      teacherId,
      teacherName,
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

  return records;
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function TeacherSalaryView({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { courses } = useCourses();
  const { feedbacks } = useFeedbacks();
  const { teachers } = useTeachers();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);

  const currentTeacher = useMemo(() => {
    if (!user) return null;
    return teachers.find((t) => (t as any).userId === user.id || t.name === user.name) || null;
  }, [teachers, user?.id, user?.name]);

  const scopedCourses = useMemo(() => {
    if (!user) return [];
    const teacherId = currentTeacher?.id;
    return courses.filter(c => c.teacherId === teacherId || c.teacherId === user.id || c.teacherName === user.name);
  }, [courses, currentTeacher?.id, user?.id, user?.name]);

  const scopedFeedbacks = useMemo(() => {
    if (!user) return [];
    const teacherId = currentTeacher?.id;
    return feedbacks.filter(f => f.teacherId === teacherId || f.teacherId === user.id || f.teacherName === user.name);
  }, [feedbacks, currentTeacher?.id, user?.id, user?.name]);

  const salaryRecords = useMemo(() => {
    if (!user) return [];
    return generateTeacherSalaryRecords(currentTeacher?.id || user.id, user.name, scopedCourses, scopedFeedbacks);
  }, [user, currentTeacher?.id, scopedCourses, scopedFeedbacks]);

  const filteredRecords = useMemo(() => {
    return salaryRecords.filter(r => r.year === selectedYear)
      .sort((a, b) => b.month - a.month);
  }, [salaryRecords, selectedYear]);

  const stats = useMemo(() => {
    const yearRecords = salaryRecords.filter(r => r.year === selectedYear);
    const totalNetSalary = yearRecords.reduce((sum, r) => sum + r.netSalary, 0);
    const totalHours = yearRecords.reduce((sum, r) => sum + r.totalHours, 0);
    const totalBonus = yearRecords.reduce((sum, r) => sum + r.totalBonus, 0);
    const avgMonthlySalary = yearRecords.length > 0 ? Math.round(totalNetSalary / yearRecords.length) : 0;

    return {
      totalNetSalary,
      totalHours,
      totalBonus,
      avgMonthlySalary,
      recordCount: yearRecords.length
    };
  }, [salaryRecords, selectedYear]);

  const monthlyChartData = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => {
      const monthRecord = salaryRecords.find(r => r.year === selectedYear && r.month === i + 1);
      return {
        name: lang === 'zh' ? `${i + 1}月` : `Month ${i + 1}`,
        netSalary: monthRecord?.netSalary || 0,
        bonus: monthRecord?.totalBonus || 0,
        hours: monthRecord?.totalHours || 0
      };
    });
  }, [salaryRecords, selectedYear, lang]);

  const salaryCompositionData = useMemo(() => {
    const latestRecord = filteredRecords[0];
    if (!latestRecord) return [];

    return [
      { name: lang === 'zh' ? '基本工资' : 'Base', value: latestRecord.baseSalary },
      { name: lang === 'zh' ? '课时费' : 'Hourly', value: latestRecord.hourlySalary },
      { name: lang === 'zh' ? '绩效奖金' : 'Performance', value: latestRecord.performanceBonus },
      { name: lang === 'zh' ? '全勤奖金' : 'Attendance', value: latestRecord.attendanceBonus },
      { name: lang === 'zh' ? '留存奖金' : 'Retention', value: latestRecord.retentionBonus }
    ].filter(item => item.value > 0);
  }, [filteredRecords, lang]);

  const exportSalaryData = () => {
    const exportData = filteredRecords.map(r => ({
      '年份': r.year,
      '月份': r.month,
      '基本工资': r.baseSalary,
      '课时费': r.hourlySalary,
      '课时数': r.totalHours,
      '绩效奖金': r.performanceBonus,
      '全勤奖金': r.attendanceBonus,
      '留存奖金': r.retentionBonus,
      '奖金合计': r.totalBonus,
      '个税': r.taxDeduction,
      '社保': r.insuranceDeduction,
      '扣款合计': r.totalDeduction,
      '实发工资': r.netSalary,
      '状态': r.status === 'draft' ? '草稿' : r.status === 'confirmed' ? '已确认' : '已发放',
      '发放日期': r.paidAt ? format(parseISO(r.paidAt), 'yyyy-MM-dd') : ''
    }));
    exportToExcel(exportData, `工资明细_${selectedYear}年`, '工资数据');
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
            <DollarSign className="w-6 h-6 text-blue-500" />
            {lang === 'zh' ? '我的工资' : 'My Salary'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '查看工资明细和历史记录' : 'View salary details and history'}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <button
            onClick={exportSalaryData}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{lang === 'zh' ? '导出' : 'Export'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '年度总收入' : 'Annual Income'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">¥{stats.totalNetSalary.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '年度总课时' : 'Annual Hours'}</p>
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
              <p className="text-sm text-gray-500">{lang === 'zh' ? '年度奖金' : 'Annual Bonus'}</p>
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
              <p className="text-sm text-gray-500">{lang === 'zh' ? '月均工资' : 'Avg Monthly'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">¥{stats.avgMonthlySalary.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
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
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="hours"
                  name={lang === 'zh' ? '课时' : 'Hours'}
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            {lang === 'zh' ? '工资构成' : 'Salary Composition'}
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salaryCompositionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {salaryCompositionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`¥${Number(value).toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            {lang === 'zh' ? '工资明细' : 'Salary Details'}
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredRecords.map(record => (
            <div key={record.id} className="hover:bg-gray-50 transition">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.year}年{record.month}月
                    </p>
                    <p className="text-sm text-gray-500">
                      {record.totalHours}课时 · {lang === 'zh' ? '课时费' : 'Hourly'} ¥{record.hourlySalary.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-lg font-bold text-blue-600">¥{record.netSalary.toLocaleString()}</p>
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

                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                    {expandedRecord === record.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedRecord === record.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm">
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
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm">
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
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                      <h4 className="font-semibold text-gray-900 mb-3 text-sm">
                        {lang === 'zh' ? '工资汇总' : 'Salary Summary'}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{lang === 'zh' ? '应发工资' : 'Gross Salary'}</span>
                          <span className="font-medium">¥{(record.baseSalary + record.hourlySalary + record.totalBonus).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{lang === 'zh' ? '扣款合计' : 'Total Deductions'}</span>
                          <span className="font-medium text-red-600">-¥{record.totalDeduction.toLocaleString()}</span>
                        </div>
                        <div className="pt-2 border-t border-green-200 flex justify-between font-semibold text-lg">
                          <span>{lang === 'zh' ? '实发工资' : 'Net Salary'}</span>
                          <span className="text-green-600">¥{record.netSalary.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {record.paidAt && (
                    <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      {lang === 'zh' ? `发放日期: ${format(parseISO(record.paidAt), 'yyyy年MM月dd日')}` : 
                       `Paid on: ${format(parseISO(record.paidAt), 'yyyy-MM-dd')}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
