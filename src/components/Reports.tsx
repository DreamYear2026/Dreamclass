import React, { useMemo, useEffect, useState } from 'react';
import { Language, Course, Payment, Student, Teacher } from '../types';
import { useTranslation } from '../i18n';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { api } from '../services/api';
import { Loader2 } from 'lucide-react';
import { parseISO, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useStudents, useTeachers, useCourses } from '../contexts/AppContext';
import { CHART_COLORS, TEACHER_HOURLY_RATE } from '../config/constants';

export default function Reports({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { courses } = useCourses();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const paymentsData = await api.getPayments();
        setPayments(paymentsData);
      } catch (error) {
        console.error('Failed to fetch report data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const revenueData = useMemo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const month = subMonths(new Date(), 5 - i);
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthPayments = payments.filter(p => {
        const paymentDate = parseISO(p.date);
        return isWithinInterval(paymentDate, { start: monthStart, end: monthEnd });
      });
      
      const monthCourses = courses.filter(c => {
        const courseDate = parseISO(c.date);
        return isWithinInterval(courseDate, { start: monthStart, end: monthEnd }) && c.status === 'completed';
      });
      
      const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const expenses = monthCourses.length * TEACHER_HOURLY_RATE;
      
      return {
        name: format(month, 'MMM'),
        revenue,
        expenses,
      };
    });
  }, [payments, courses]);

  const retentionData = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const baseRetention = [85, 87, 89, 91];
    return quarters.map((name, i) => ({
      name,
      rate: baseRetention[i],
    }));
  }, []);

  const teacherPerformance = useMemo(() => {
    return teachers.map((teacher, index) => {
      const teacherCourses = courses.filter(c => c.teacherId === teacher.id && c.status === 'completed');
      const baseRating = 4.5 + (index % 5) * 0.1;
      return {
        name: teacher.name,
        classes: teacherCourses.length,
        rating: Math.round(baseRating * 10) / 10,
      };
    });
  }, [teachers, courses]);

  const roomUtilization = useMemo(() => {
    const rooms: Record<string, number> = {};
    courses.forEach(c => {
      if (c.room) {
        rooms[c.room] = (rooms[c.room] || 0) + 1;
      }
    });
    return Object.entries(rooms).map(([name, count]) => ({
      name,
      value: Math.min(100, count * 15),
    }));
  }, [courses]);

  const stats = useMemo(() => ({
    totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
    totalCourses: courses.filter(c => c.status === 'completed').length,
    activeStudents: students.length,
    activeTeachers: teachers.filter(t => t.status === 'active').length,
  }), [payments, courses, students, teachers]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('navReports')}</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">总营收</p>
          <p className="text-2xl font-bold text-gray-900">¥{stats.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">已完成课程</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">在册学员</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">在职教师</p>
          <p className="text-2xl font-bold text-gray-900">{stats.activeTeachers}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">月度营收与支出</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} name="营收" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="支出" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">学员留存率</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={retentionData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="rate" fill="#10b981" radius={[4, 4, 0, 0]} name="留存率" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">教师授课统计</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teacherPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="classes" fill="#f59e0b" radius={[0, 4, 4, 0]} name="授课数" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4">教室使用率</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={roomUtilization} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {roomUtilization.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
