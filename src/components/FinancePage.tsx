import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Clock, Plus, Eye, Loader2, Calendar, ArrowUpRight, ArrowDownRight, Search, Filter, Download, Sparkles, Heart, Star, Wallet, CreditCard, Receipt, PiggyBank } from 'lucide-react';
import { Language, Payment, Student } from '../types';
import { useTranslation } from '../i18n';
import { useStudents } from '../contexts/AppContext';
import { useToast } from './Toast';
import BottomSheet from './BottomSheet';
import { parseISO, isThisMonth, isThisYear, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { api } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface FinanceStats {
  totalIncome: number;
  totalExpense: number;
  monthIncome: number;
  monthExpense: number;
  pendingPayments: number;
  balance: number;
}

export default function FinancePage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students } = useStudents();
  const { showToast } = useToast();
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'pending'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [newPayment, setNewPayment] = useState({
    studentId: '',
    amount: '',
    hours: '',
    description: '',
    type: 'income' as 'income' | 'expense',
    category: 'tuition',
  });

  const categories = [
    { id: 'tuition', nameZh: '学费收入', nameEn: 'Tuition', icon: '📚', color: 'from-[#4ECDC4] to-[#7EDDD6]' },
    { id: 'material', nameZh: '教材费', nameEn: 'Materials', icon: '📖', color: 'from-[#FF6B6B] to-[#FF8E8E]' },
    { id: 'registration', nameZh: '报名费', nameEn: 'Registration', icon: '📝', color: 'from-[#A29BFE] to-[#B8B3FF]' },
    { id: 'salary', nameZh: '教师工资', nameEn: 'Salary', icon: '👨‍🏫', color: 'from-[#FFE66D] to-[#FFB347]' },
    { id: 'rent', nameZh: '房租', nameEn: 'Rent', icon: '🏢', color: 'from-[#FD79A8] to-[#FFB8D0]' },
    { id: 'utilities', nameZh: '水电费', nameEn: 'Utilities', icon: '💡', color: 'from-[#74B9FF] to-[#A8E6CF]' },
    { id: 'equipment', nameZh: '设备采购', nameEn: 'Equipment', icon: '🎹', color: 'from-[#95E1A3] to-[#7DD389]' },
    { id: 'other', nameZh: '其他', nameEn: 'Other', icon: '📦', color: 'from-gray-400 to-gray-500' },
  ];

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await api.getPayments();
      setPayments(data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats: FinanceStats = useMemo(() => {
    const thisMonthPayments = payments.filter(p => isThisMonth(parseISO(p.date)));
    const totalIncome = payments.filter(p => p.amount > 0).reduce((sum, p) => sum + p.amount, 0);
    const totalExpense = payments.filter(p => p.amount < 0).reduce((sum, p) => sum + Math.abs(p.amount), 0);

    return {
      totalIncome,
      totalExpense,
      monthIncome: thisMonthPayments.filter(p => p.amount > 0).reduce((sum, p) => sum + p.amount, 0),
      monthExpense: thisMonthPayments.filter(p => p.amount < 0).reduce((sum, p) => sum + Math.abs(p.amount), 0),
      pendingPayments: payments.filter(p => p.status === 'pending').length,
      balance: totalIncome - totalExpense,
    };
  }, [payments]);

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthPayments = payments.filter(p => {
        const date = parseISO(p.date);
        return date >= monthStart && date <= monthEnd;
      });
      
      months.push({
        name: format(month, lang === 'zh' ? 'M月' : 'MMM', { locale: lang === 'zh' ? zhCN : undefined }),
        income: monthPayments.filter(p => p.amount > 0).reduce((sum, p) => sum + p.amount, 0),
        expense: Math.abs(monthPayments.filter(p => p.amount < 0).reduce((sum, p) => sum + p.amount, 0)),
      });
    }
    return months;
  }, [payments, lang]);

  const filteredPayments = useMemo(() => {
    let result = payments;
    
    if (filter === 'income') {
      result = result.filter(p => p.amount > 0);
    } else if (filter === 'expense') {
      result = result.filter(p => p.amount < 0);
    } else if (filter === 'pending') {
      result = result.filter(p => p.status === 'pending');
    }

    if (searchQuery) {
      result = result.filter(p => {
        const student = students.find(s => s.id === p.studentId);
        return student?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               p.description?.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }
    
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, filter, searchQuery, students]);

  const handleAddPayment = async () => {
    if (!newPayment.amount) {
      showToast(lang === 'zh' ? '请输入金额' : 'Please enter amount', 'error');
      return;
    }

    try {
      const paymentData = {
        ...newPayment,
        amount: parseFloat(newPayment.amount) * (newPayment.type === 'expense' ? -1 : 1),
        hours: parseInt(newPayment.hours) || 0,
        description: newPayment.description,
        studentId: newPayment.studentId || undefined,
      };
      
      await api.addPayment(paymentData);
      
      showToast(lang === 'zh' ? '添加成功' : 'Success', 'success');
      setShowForm(false);
      setNewPayment({
        studentId: '',
        amount: '',
        hours: '',
        description: '',
        type: 'income',
        category: 'tuition',
      });
      fetchPayments();
    } catch (error) {
      showToast(lang === 'zh' ? '添加失败' : 'Failed', 'error');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['日期', '类型', '金额', '课时', '状态', '备注'].join(','),
      ...filteredPayments.map(p => [
        format(parseISO(p.date), 'yyyy-MM-dd'),
        p.amount > 0 ? '收入' : '支出',
        Math.abs(p.amount),
        p.hours || 0,
        p.status === 'paid' ? '已支付' : '待支付',
        p.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `财务记录_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    showToast(lang === 'zh' ? '导出成功' : 'Export success', 'success');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-[#FF6B6B] animate-spin mx-auto" />
            <Sparkles className="w-6 h-6 text-[#FFE66D] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="mt-4 text-gray-500">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            {lang === 'zh' ? '财务管理' : 'Finance Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Heart className="w-4 h-4 text-[#FF6B6B]" />
            {lang === 'zh' ? '管理收支记录，掌握财务状况' : 'Manage income and expenses'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {lang === 'zh' ? '导出' : 'Export'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-[#FF6B6B]/30 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {lang === 'zh' ? '添加记录' : 'Add Record'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#4ECDC4]/10 to-[#7EDDD6]/10 rounded-2xl p-5 border border-[#4ECDC4]/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] flex items-center justify-center shadow-lg shadow-[#4ECDC4]/30">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '总收入' : 'Total Income'}</p>
              <p className="text-xl font-bold text-gray-900">¥{stats.totalIncome.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#4ECDC4]">
            <ArrowUpRight className="w-3 h-3" />
            <span>+{stats.monthIncome.toLocaleString()} {lang === 'zh' ? '本月' : 'this month'}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#FF6B6B]/10 to-[#FF8E8E]/10 rounded-2xl p-5 border border-[#FF6B6B]/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center shadow-lg shadow-[#FF6B6B]/30">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '总支出' : 'Total Expense'}</p>
              <p className="text-xl font-bold text-gray-900">¥{stats.totalExpense.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#FF6B6B]">
            <ArrowDownRight className="w-3 h-3" />
            <span>-{stats.monthExpense.toLocaleString()} {lang === 'zh' ? '本月' : 'this month'}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#A29BFE]/10 to-[#B8B3FF]/10 rounded-2xl p-5 border border-[#A29BFE]/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A29BFE] to-[#B8B3FF] flex items-center justify-center shadow-lg shadow-[#A29BFE]/30">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '结余' : 'Balance'}</p>
              <p className={`text-xl font-bold ${stats.balance >= 0 ? 'text-[#4ECDC4]' : 'text-[#FF6B6B]'}`}>
                ¥{stats.balance.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <PiggyBank className="w-3 h-3" />
            <span>{lang === 'zh' ? '累计结余' : 'Accumulated'}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#FFE66D]/10 to-[#FFB347]/10 rounded-2xl p-5 border border-[#FFE66D]/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFE66D] to-[#FFB347] flex items-center justify-center shadow-lg shadow-[#FFE66D]/30">
              <Clock className="w-6 h-6 text-gray-800" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '待处理' : 'Pending'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.pendingPayments}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Receipt className="w-3 h-3" />
            <span>{lang === 'zh' ? '待确认收款' : 'Pending payments'}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <BarChart className="w-5 h-5 text-[#4ECDC4]" />
          {lang === 'zh' ? '收支趋势' : 'Income & Expense Trend'}
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
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
              <Bar dataKey="income" name={lang === 'zh' ? '收入' : 'Income'} fill="#4ECDC4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name={lang === 'zh' ? '支出' : 'Expense'} fill="#FF6B6B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '搜索学员或备注...' : 'Search student or notes...'}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(['all', 'income', 'expense', 'pending'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f
                    ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? (lang === 'zh' ? '全部' : 'All') :
                 f === 'income' ? (lang === 'zh' ? '收入' : 'Income') :
                 f === 'expense' ? (lang === 'zh' ? '支出' : 'Expense') :
                 (lang === 'zh' ? '待处理' : 'Pending')}
              </button>
            ))}
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500">{lang === 'zh' ? '暂无记录' : 'No records'}</p>
            <p className="text-sm text-gray-400 mt-1">{lang === 'zh' ? '点击右上角添加第一条记录' : 'Click the button above to add'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPayments.slice(0, 20).map(payment => {
              const category = categories.find(c => c.id === payment.category) || categories[7];
              return (
                <div 
                  key={payment.id} 
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => {
                    setSelectedPayment(payment);
                    setShowDetail(true);
                  }}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-xl shadow-md`}>
                    {category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {payment.studentId ? students.find(s => s.id === payment.studentId)?.name : category.nameZh}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        payment.amount > 0 ? 'bg-[#4ECDC4]/10 text-[#4ECDC4]' : 'bg-[#FF6B6B]/10 text-[#FF6B6B]'
                      }`}>
                        {payment.amount > 0 ? (lang === 'zh' ? '收入' : 'Income') : (lang === 'zh' ? '支出' : 'Expense')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{payment.description || category.nameZh}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${payment.amount > 0 ? 'text-[#4ECDC4]' : 'text-[#FF6B6B]'}`}>
                      {payment.amount > 0 ? '+' : '-'}¥{Math.abs(payment.amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">{format(parseISO(payment.date), lang === 'zh' ? 'M月d日' : 'MMM d')}</p>
                  </div>
                  {payment.status === 'pending' && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-600 rounded-full text-xs font-medium">
                      {lang === 'zh' ? '待处理' : 'Pending'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={lang === 'zh' ? '添加财务记录' : 'Add Payment Record'}
      >
        <div className="p-5 space-y-5">
          <div className="bg-gradient-to-br from-[#FF6B6B]/5 to-[#4ECDC4]/5 rounded-2xl p-4 border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {lang === 'zh' ? '记录类型' : 'Type'} *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setNewPayment({ ...newPayment, type: 'income' })}
                className={`p-4 rounded-xl text-center transition-all ${
                  newPayment.type === 'income'
                    ? 'bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] text-white shadow-lg shadow-[#4ECDC4]/30'
                    : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-gray-200'
                }`}
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-2" />
                <span className="font-medium">{lang === 'zh' ? '收入' : 'Income'}</span>
              </button>
              <button
                onClick={() => setNewPayment({ ...newPayment, type: 'expense' })}
                className={`p-4 rounded-xl text-center transition-all ${
                  newPayment.type === 'expense'
                    ? 'bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] text-white shadow-lg shadow-[#FF6B6B]/30'
                    : 'bg-white border-2 border-gray-100 text-gray-600 hover:border-gray-200'
                }`}
              >
                <TrendingDown className="w-6 h-6 mx-auto mb-2" />
                <span className="font-medium">{lang === 'zh' ? '支出' : 'Expense'}</span>
              </button>
            </div>
          </div>

          {newPayment.type === 'income' && (
            <div className="bg-gradient-to-br from-[#A29BFE]/5 to-[#B8B3FF]/5 rounded-2xl p-4 border border-[#A29BFE]/10">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'zh' ? '关联学员' : 'Student'}
              </label>
              <select
                value={newPayment.studentId}
                onChange={e => setNewPayment({ ...newPayment, studentId: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A29BFE]/20 hover:border-gray-200 transition-all"
              >
                <option value="">{lang === 'zh' ? '选择学员（可选）' : 'Select Student (Optional)'}</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-gradient-to-br from-[#FFE66D]/5 to-[#FFB347]/5 rounded-2xl p-4 border border-[#FFE66D]/10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {lang === 'zh' ? '金额' : 'Amount'} *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">¥</span>
              <input
                type="number"
                value={newPayment.amount}
                onChange={e => setNewPayment({ ...newPayment, amount: e.target.value || '' })}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFE66D]/20 hover:border-gray-200 transition-all text-lg font-medium"
                placeholder="0.00"
              />
            </div>
          </div>

          {newPayment.type === 'income' && newPayment.studentId && (
            <div className="bg-gradient-to-br from-[#95E1A3]/5 to-[#7DD389]/5 rounded-2xl p-4 border border-[#95E1A3]/10">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'zh' ? '课时数' : 'Hours'}
              </label>
              <input
                type="number"
                value={newPayment.hours}
                onChange={e => setNewPayment({ ...newPayment, hours: e.target.value || '' })}
                className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#95E1A3]/20 hover:border-gray-200 transition-all"
                placeholder="0"
                min={0}
              />
              <p className="text-xs text-gray-500 mt-2">{lang === 'zh' ? '缴费后自动增加学员课时' : 'Auto add hours to student'}</p>
            </div>
          )}

          <div className="bg-gradient-to-br from-[#4ECDC4]/5 to-[#7EDDD6]/5 rounded-2xl p-4 border border-[#4ECDC4]/10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {lang === 'zh' ? '分类' : 'Category'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {categories.filter(c => newPayment.type === 'income' ? ['tuition', 'material', 'registration', 'other'].includes(c.id) : true).map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewPayment({ ...newPayment, category: c.id })}
                  className={`p-3 rounded-xl text-center transition-all ${
                    newPayment.category === c.id
                      ? `bg-gradient-to-br ${c.color} text-white shadow-md`
                      : 'bg-white border border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  <p className="text-xs mt-1 font-medium">{lang === 'zh' ? c.nameZh.slice(0, 2) : c.nameEn.slice(0, 4)}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {lang === 'zh' ? '备注' : 'Notes'}
            </label>
            <input
              type="text"
              value={newPayment.description}
              onChange={e => setNewPayment({ ...newPayment, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '备注信息...' : 'Notes...'}
            />
          </div>

          <div className="flex gap-3 pt-2 pb-20 md:pb-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleAddPayment}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white font-medium hover:shadow-lg hover:shadow-[#FF6B6B]/30 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {lang === 'zh' ? '保存' : 'Save'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={lang === 'zh' ? '记录详情' : 'Payment Details'}
      >
        {selectedPayment && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedPayment.amount > 0 ? 'bg-[#4ECDC4]/10 text-[#4ECDC4]' : 'bg-[#FF6B6B]/10 text-[#FF6B6B]'
              }`}>
                {selectedPayment.amount > 0 ? (lang === 'zh' ? '收入' : 'Income') : (lang === 'zh' ? '支出' : 'Expense')}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                selectedPayment.status === 'paid' ? 'bg-[#95E1A3]/10 text-[#95E1A3]' : 'bg-[#FFE66D]/10 text-amber-600'
              }`}>
                {selectedPayment.status === 'paid' ? (lang === 'zh' ? '已支付' : 'Paid') : (lang === 'zh' ? '待支付' : 'Pending')}
              </span>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500">{lang === 'zh' ? '金额' : 'Amount'}</p>
                <p className={`text-3xl font-bold ${selectedPayment.amount > 0 ? 'text-[#4ECDC4]' : 'text-[#FF6B6B]'}`}>
                  {selectedPayment.amount > 0 ? '+' : '-'}¥{Math.abs(selectedPayment.amount).toLocaleString()}
                </p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{lang === 'zh' ? '日期' : 'Date'}</span>
                  <span className="font-medium text-gray-900">
                    {format(parseISO(selectedPayment.date), lang === 'zh' ? 'yyyy年M月d日' : 'MMM d, yyyy')}
                  </span>
                </div>

                {selectedPayment.studentId && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">{lang === 'zh' ? '学员' : 'Student'}</span>
                    <span className="font-medium text-gray-900">
                      {students.find(s => s.id === selectedPayment.studentId)?.name || '-'}
                    </span>
                  </div>
                )}

                {selectedPayment.hours > 0 && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">{lang === 'zh' ? '课时' : 'Hours'}</span>
                    <span className="font-medium text-[#4ECDC4]">+{selectedPayment.hours}</span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{lang === 'zh' ? '分类' : 'Category'}</span>
                  <span className="font-medium text-gray-900">
                    {categories.find(c => c.id === selectedPayment.category)?.nameZh || '-'}
                  </span>
                </div>

                {selectedPayment.description && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-500">{lang === 'zh' ? '备注' : 'Notes'}</span>
                    <span className="font-medium text-gray-900">{selectedPayment.description}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2 pb-20 md:pb-2">
              <button
                onClick={() => setShowDetail(false)}
                className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
              >
                {lang === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
