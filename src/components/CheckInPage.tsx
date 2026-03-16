import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, X, Clock, Users, Camera, Loader2, Search } from 'lucide-react';
import { Language, Student } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useAppData } from '../contexts/AppContext';
import { useToast } from './Toast';
import { format } from 'date-fns';
import { api } from '../services/api';

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  checkInTime: string;
}

export default function CheckInPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading } = useStudents();
  const { showToast } = useToast();
  const { getAttendanceByStudent, markAttendance: markAttendanceContext } = useAppData();
  
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    fetchAttendanceRecords();
  }, []);

  const fetchAttendanceRecords = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/attendance');
      if (response.ok) {
        setAttendanceRecords(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const todayStats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = attendanceRecords.filter(r => r.date === today);
    
    return {
      total: todayRecords.length,
      present: todayRecords.filter(r => r.status === 'present').length,
      absent: todayRecords.filter(r => r.status === 'absent').length,
      late: todayRecords.filter(r => r.status === 'late').length,
    };
  }, [attendanceRecords]);

  const filteredStudents = useMemo(() => {
    let filtered = students;
    
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.parentPhone.includes(searchQuery)
      );
    }
    
    return filtered;
  }, [students, searchQuery]);

  const handleCheckIn = async (studentId: string) => {
    setCheckingIn(studentId);
    try {
      await api.markAttendance({
        courseId: '',
        studentId,
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'present',
      });
      showToast(lang === 'zh' ? '签到成功' : 'Check-in successful', 'success');
      fetchAttendanceRecords();
    } catch (error) {
      showToast(lang === 'zh' ? '签到失败' : 'Check-in failed', 'error');
    } finally {
      setCheckingIn(null);
    }
  };

  if (studentsLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {lang === 'zh' ? '智能签到' : 'Smart Check-in'}
        </h1>
        <button
          onClick={() => setShowScanner(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          {lang === 'zh' ? '扫码签到' : 'QR Scan'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayStats.total}</p>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '今日签到' : 'Today'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayStats.present}</p>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '已到' : 'Present'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayStats.absent}</p>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '缺勤' : 'Absent'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{todayStats.late}</p>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '迟到' : 'Late'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">
            {lang === 'zh' ? '签到记录' : 'Records'}
          </h2>
          <div className="flex gap-2">
            {['all', 'present', 'absent', 'late'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? (lang === 'zh' ? '全部' : 'All') :
                 f === 'present' ? (lang === 'zh' ? '已到' : 'Present') :
                 f === 'absent' ? (lang === 'zh' ? '缺勤' : 'Absent') :
                 (lang === 'zh' ? '迟到' : 'Late')}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={lang === 'zh' ? '搜索学员' : 'Search student'}
          />
        </div>

        <div className="max-h-96 overflow-y-auto space-y-2">
          {filteredStudents.map(student => {
            const hasCheckedIn = attendanceRecords.some(
              r => r.studentId === student.id && r.date === format(new Date(), 'yyyy-MM-dd')
            );
            const isCheckingIn = checkingIn === student.id;

            return (
              <div
                key={student.id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-200 transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={student.avatar || `https://picsum.photos/seed/${student.id}/100/100`}
                    alt={student.name}
                    className="w-10 h-10 rounded-full"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-xs text-gray-500">{student.level}</p>
                  </div>
                </div>

                {hasCheckedIn ? (
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {lang === 'zh' ? '已签到' : 'Checked in'}
                  </span>
                ) : (
                  <button
                    onClick={() => handleCheckIn(student.id)}
                    disabled={isCheckingIn}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1"
                  >
                    {isCheckingIn ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    {lang === 'zh' ? '签到' : 'Check in'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-4 max-w-sm w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">
                {lang === 'zh' ? '扫描二维码' : 'Scan QR Code'}
              </h3>
              <button
                onClick={() => setShowScanner(false)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
              <Camera className="w-16 h-16 text-gray-400" />
            </div>
            <p className="text-center text-gray-500 text-sm mt-4">
              {lang === 'zh' ? '请将二维码对准扫描框' : 'Point camera at QR code'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
