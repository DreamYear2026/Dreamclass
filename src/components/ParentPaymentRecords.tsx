import React, { useState, useMemo, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  TrendingUp
} from 'lucide-react';
import { Language, Payment } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useStudents } from '../contexts/AppContext';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { exportToExcel } from '../utils/export';
import { api } from '../services/api';

interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  type: 'tuition' | 'material' | 'activity' | 'other';
  typeName: string;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'pending' | 'overdue';
  paidAt?: string;
  dueDate: string;
  createdAt: string;
  notes?: string;
}

const generateMockPaymentRecords = (studentId: string, studentName: string): PaymentRecord[] => {
  const records: PaymentRecord[] = [];
  const now = new Date();

  const types = [
    { type: 'tuition', name: '学费' },
    { type: 'material', name: '教材费' },
    { type: 'activity', name: '活动费' },
    { type: 'other', name: '其他费用' }
  ] as const;

  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const typeInfo = types[i % types.length];
    const amount = typeInfo.type === 'tuition' ? 2000 + Math.floor(Math.random() * 500) : 
                   typeInfo.type === 'material' ? 200 + Math.floor(Math.random() * 100) :
                   typeInfo.type === 'activity' ? 100 + Math.floor(Math.random() * 50) :
                   50 + Math.floor(Math.random() * 30);

    records.push({
      id: `payment-${studentId}-${i}`,
      studentId,
      studentName,
      type: typeInfo.type,
      typeName: typeInfo.name,
      amount,
      paymentMethod: ['微信支付', '支付宝', '银行转账', '现金'][i % 4],
      status: i < 2 ? 'pending' : i === 2 ? 'overdue' : 'paid',
      paidAt: i >= 3 ? new Date(date.getFullYear(), date.getMonth(), 15).toISOString() : undefined,
      dueDate: new Date(date.getFullYear(), date.getMonth(), 10).toISOString(),
      createdAt: date.toISOString(),
      notes: i % 3 === 0 ? '备注信息' : undefined
    });
  }

  return records;
};

export default function ParentPaymentRecords({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { students } = useStudents();

  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const student = useMemo(() => {
    if (!students.length) return undefined;
    if (!user) return undefined;
    return students.find((s) => s.userId === user.id);
  }, [students, user]);

  useEffect(() => {
    if (!student) return;
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getPayments(student.id);
        if (mounted) setPayments(data);
      } catch {
        if (mounted) setPayments([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [student?.id]);

  const paymentRecords = useMemo(() => {
    if (!student) return [];
    const now = new Date();
    return payments.map((p) => {
      const text = (p.description || '').toLowerCase();
      const type: PaymentRecord['type'] =
        text.includes('教材') || text.includes('material') ? 'material' :
        text.includes('活动') || text.includes('activity') ? 'activity' :
        text.includes('学费') || text.includes('tuition') ? 'tuition' :
        'other';
      const typeName =
        type === 'material' ? '教材费' :
        type === 'activity' ? '活动费' :
        type === 'tuition' ? '学费' :
        '其他费用';
      const overdue = p.status === 'pending' && parseISO(p.date).getTime() < now.getTime();
      return {
        id: p.id,
        studentId: p.studentId,
        studentName: student.name,
        type,
        typeName,
        amount: p.amount,
        paymentMethod: lang === 'zh' ? '线上支付' : 'Online',
        status: overdue ? 'overdue' : p.status,
        paidAt: p.status === 'paid' ? p.date : undefined,
        dueDate: p.date,
        createdAt: p.date,
        notes: p.description,
      };
    });
  }, [student, payments, lang]);

  const filteredRecords = useMemo(() => {
    if (filterStatus === 'all') return paymentRecords;
    return paymentRecords.filter(r => r.status === filterStatus);
  }, [paymentRecords, filterStatus]);

  const stats = useMemo(() => {
    const totalPaid = paymentRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);
    const totalPending = paymentRecords.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.amount, 0);
    const totalOverdue = paymentRecords.filter(r => r.status === 'overdue').reduce((sum, r) => sum + r.amount, 0);

    return {
      totalPaid,
      totalPending,
      totalOverdue,
      totalAmount: totalPaid + totalPending + totalOverdue
    };
  }, [paymentRecords]);

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }).map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date;
    }).reverse();

    return months.map(month => {
      const monthRecords = paymentRecords.filter(r => {
        const recordDate = parseISO(r.createdAt);
        return recordDate.getMonth() === month.getMonth() && 
               recordDate.getFullYear() === month.getFullYear();
      });

      return {
        name: format(month, lang === 'zh' ? 'M月' : 'MMM'),
        amount: monthRecords.reduce((sum, r) => sum + r.amount, 0)
      };
    });
  }, [paymentRecords, lang]);

  const exportPaymentData = () => {
    const exportData = filteredRecords.map(r => ({
      '日期': format(parseISO(r.createdAt), 'yyyy-MM-dd'),
      '学员': r.studentName,
      '费用类型': r.typeName,
      '金额': r.amount,
      '支付方式': r.paymentMethod,
      '状态': r.status === 'paid' ? '已支付' : r.status === 'pending' ? '待支付' : '已逾期',
      '支付时间': r.paidAt ? format(parseISO(r.paidAt), 'yyyy-MM-dd') : '',
      '备注': r.notes || ''
    }));
    exportToExcel(exportData, `缴费记录_${format(new Date(), 'yyyy年MM月')}`, '缴费数据');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {lang === 'zh' ? '已支付' : 'Paid'}
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lang === 'zh' ? '待支付' : 'Pending'}
          </span>
        );
      case 'overdue':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {lang === 'zh' ? '已逾期' : 'Overdue'}
          </span>
        );
      default:
        return null;
    }
  };

  if (!student) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">{lang === 'zh' ? '暂无学员信息' : 'No student information'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-orange-500" />
            {lang === 'zh' ? '缴费记录' : 'Payment Records'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '查看缴费历史和费用明细' : 'View payment history and fee details'}
          </p>
        </div>
        <button
          onClick={exportPaymentData}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{lang === 'zh' ? '导出' : 'Export'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '已缴费用' : 'Paid'}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">¥{stats.totalPaid.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '待缴费用' : 'Pending'}</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">¥{stats.totalPending.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '逾期费用' : 'Overdue'}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">¥{stats.totalOverdue.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '累计缴费' : 'Total'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">¥{stats.totalAmount.toLocaleString()}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-orange-600" />
          {lang === 'zh' ? '月度缴费趋势' : 'Monthly Payment Trend'}
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => [`¥${Number(value).toLocaleString()}`, lang === 'zh' ? '金额' : 'Amount']} />
              <Bar dataKey="amount" fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'paid', 'pending', 'overdue'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              filterStatus === status
                ? 'bg-orange-100 text-orange-700'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? (lang === 'zh' ? '全部' : 'All') :
             status === 'paid' ? (lang === 'zh' ? '已支付' : 'Paid') :
             status === 'pending' ? (lang === 'zh' ? '待支付' : 'Pending') :
             (lang === 'zh' ? '已逾期' : 'Overdue')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              {lang === 'zh' ? '缴费记录加载中...' : 'Loading payments...'}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              {lang === 'zh' ? '暂无缴费记录' : 'No payment records'}
            </div>
          ) : filteredRecords.map(record => (
            <div key={record.id} className="hover:bg-gray-50 transition">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{record.typeName}</p>
                    <p className="text-sm text-gray-500">
                      {format(parseISO(record.createdAt), lang === 'zh' ? 'yyyy年MM月dd日' : 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-lg font-bold text-orange-600">¥{record.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{record.paymentMethod}</p>
                  </div>
                  
                  {getStatusBadge(record.status)}

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
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">{lang === 'zh' ? '费用类型' : 'Type'}</p>
                      <p className="font-medium text-gray-900">{record.typeName}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">{lang === 'zh' ? '支付方式' : 'Payment Method'}</p>
                      <p className="font-medium text-gray-900">{record.paymentMethod}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">{lang === 'zh' ? '应付日期' : 'Due Date'}</p>
                      <p className="font-medium text-gray-900">
                        {format(parseISO(record.dueDate), 'yyyy-MM-dd')}
                      </p>
                    </div>
                  </div>
                  {record.paidAt && (
                    <div className="mt-4 text-sm text-gray-500 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {lang === 'zh' ? `支付时间: ${format(parseISO(record.paidAt), 'yyyy年MM月dd日 HH:mm')}` : 
                       `Paid at: ${format(parseISO(record.paidAt), 'MMM d, yyyy HH:mm')}`}
                    </div>
                  )}
                  {record.notes && (
                    <div className="mt-2 text-sm text-gray-500">
                      {lang === 'zh' ? '备注' : 'Notes'}: {record.notes}
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
