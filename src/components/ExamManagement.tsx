import React, { useState, useMemo } from 'react';
import { Award, Calendar, Users, Clock, CheckCircle, XCircle, AlertTriangle, Plus, FileText, Download, ChevronRight, Star, Target, TrendingUp, BookOpen, Medal } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useTeachers } from '../contexts/AppContext';
import { useToast } from './Toast';
import { format, parseISO, addDays, subDays, isPast, isFuture, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ExamRegistration {
  id: string;
  studentId: string;
  studentName: string;
  examType: string;
  level: number;
  examDate: string;
  venue: string;
  status: 'registered' | 'confirmed' | 'completed' | 'passed' | 'failed';
  score?: number;
  certificate?: string;
  registeredAt: string;
  fee: number;
  paid: boolean;
  teacherId: string;
  teacherName: string;
  notes?: string;
}

interface ExamType {
  id: string;
  name: string;
  organization: string;
  levels: number[];
  fee: number;
  registrationDeadline: string;
  examDate: string;
  venue: string;
}

const examTypes: ExamType[] = [
  {
    id: 'et1',
    name: '中央音乐学院考级',
    organization: '中央音乐学院',
    levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    fee: 300,
    registrationDeadline: addDays(new Date(), 30).toISOString(),
    examDate: addDays(new Date(), 60).toISOString(),
    venue: '中央音乐学院考级点',
  },
  {
    id: 'et2',
    name: '中国音乐家协会考级',
    organization: '中国音乐家协会',
    levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    fee: 280,
    registrationDeadline: addDays(new Date(), 25).toISOString(),
    examDate: addDays(new Date(), 55).toISOString(),
    venue: '市文化中心',
  },
  {
    id: 'et3',
    name: '上海音乐学院考级',
    organization: '上海音乐学院',
    levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    fee: 320,
    registrationDeadline: addDays(new Date(), 20).toISOString(),
    examDate: addDays(new Date(), 50).toISOString(),
    venue: '上海音乐学院',
  },
];

const mockRegistrations: ExamRegistration[] = [
  {
    id: 'er1',
    studentId: 's1',
    studentName: '小明',
    examType: '中央音乐学院考级',
    level: 5,
    examDate: addDays(new Date(), 60).toISOString(),
    venue: '中央音乐学院考级点',
    status: 'registered',
    registeredAt: subDays(new Date(), 5).toISOString(),
    fee: 300,
    paid: true,
    teacherId: 't1',
    teacherName: '张老师',
  },
  {
    id: 'er2',
    studentId: 's2',
    studentName: '小红',
    examType: '中国音乐家协会考级',
    level: 3,
    examDate: subDays(new Date(), 10).toISOString(),
    venue: '市文化中心',
    status: 'passed',
    score: 92,
    certificate: 'CERT-2024-001',
    registeredAt: subDays(new Date(), 40).toISOString(),
    fee: 280,
    paid: true,
    teacherId: 't1',
    teacherName: '张老师',
  },
  {
    id: 'er3',
    studentId: 's3',
    studentName: '小华',
    examType: '上海音乐学院考级',
    level: 7,
    examDate: subDays(new Date(), 15).toISOString(),
    venue: '上海音乐学院',
    status: 'failed',
    score: 58,
    registeredAt: subDays(new Date(), 45).toISOString(),
    fee: 320,
    paid: true,
    teacherId: 't2',
    teacherName: '李老师',
  },
];

export default function ExamManagement({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'exams' | 'results'>('overview');
  const [registrations, setRegistrations] = useState<ExamRegistration[]>(mockRegistrations);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamType | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [newRegistration, setNewRegistration] = useState({
    studentId: '',
    examTypeId: '',
    level: 1,
    notes: '',
  });

  const stats = useMemo(() => ({
    total: registrations.length,
    registered: registrations.filter(r => r.status === 'registered' || r.status === 'confirmed').length,
    completed: registrations.filter(r => r.status === 'completed').length,
    passed: registrations.filter(r => r.status === 'passed').length,
    failed: registrations.filter(r => r.status === 'failed').length,
    passRate: registrations.filter(r => r.status === 'passed' || r.status === 'failed').length > 0
      ? Math.round((registrations.filter(r => r.status === 'passed').length / 
          registrations.filter(r => r.status === 'passed' || r.status === 'failed').length) * 100)
      : 0,
    totalFees: registrations.filter(r => r.paid).reduce((sum, r) => sum + r.fee, 0),
  }), [registrations]);

  const filteredRegistrations = useMemo(() => {
    if (filterStatus === 'all') return registrations;
    return registrations.filter(r => r.status === filterStatus);
  }, [registrations, filterStatus]);

  const upcomingExams = useMemo(() => {
    return registrations
      .filter(r => isFuture(parseISO(r.examDate)) || isToday(parseISO(r.examDate)))
      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
  }, [registrations]);

  const handleRegister = () => {
    if (!newRegistration.studentId || !newRegistration.examTypeId) {
      showToast(lang === 'zh' ? '请填写完整信息' : 'Please fill all fields', 'error');
      return;
    }

    const student = students.find(s => s.id === newRegistration.studentId);
    const examType = examTypes.find(e => e.id === newRegistration.examTypeId);
    
    if (!student || !examType) return;

    const registration: ExamRegistration = {
      id: `er${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      examType: examType.name,
      level: newRegistration.level,
      examDate: examType.examDate,
      venue: examType.venue,
      status: 'registered',
      registeredAt: new Date().toISOString(),
      fee: examType.fee,
      paid: false,
      teacherId: 'current-teacher',
      teacherName: '当前教师',
      notes: newRegistration.notes,
    };

    setRegistrations([registration, ...registrations]);
    setShowRegisterForm(false);
    setNewRegistration({ studentId: '', examTypeId: '', level: 1, notes: '' });
    showToast(lang === 'zh' ? '报名成功' : 'Registration successful', 'success');
  };

  const handleUpdateStatus = (id: string, status: ExamRegistration['status'], score?: number) => {
    setRegistrations(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, status, score };
      }
      return r;
    }));
    showToast(lang === 'zh' ? '状态已更新' : 'Status updated', 'success');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">{lang === 'zh' ? '已报名' : 'Registered'}</span>;
      case 'confirmed':
        return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">{lang === 'zh' ? '已确认' : 'Confirmed'}</span>;
      case 'completed':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">{lang === 'zh' ? '已考完' : 'Completed'}</span>;
      case 'passed':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />{lang === 'zh' ? '通过' : 'Passed'}
        </span>;
      case 'failed':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
          <XCircle className="w-3 h-3" />{lang === 'zh' ? '未通过' : 'Failed'}
        </span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-indigo-600" />
            {lang === 'zh' ? '考级管理' : 'Exam Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '考级报名、成绩跟踪、证书管理' : 'Registration, results, and certificates'}
          </p>
        </div>
        <button
          onClick={() => setShowRegisterForm(true)}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {lang === 'zh' ? '报名考级' : 'Register'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '总报名' : 'Total'}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '待考试' : 'Pending'}</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.registered}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '通过' : 'Passed'}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.passed}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '未通过' : 'Failed'}</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.failed}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '通过率' : 'Pass Rate'}</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.passRate}%</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '报名费' : 'Fees'}</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">¥{stats.totalFees}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: lang === 'zh' ? '总览' : 'Overview', icon: <Target className="w-4 h-4" /> },
          { id: 'registrations', label: lang === 'zh' ? '报名记录' : 'Registrations', icon: <Users className="w-4 h-4" /> },
          { id: 'exams', label: lang === 'zh' ? '可报名考试' : 'Available Exams', icon: <Calendar className="w-4 h-4" /> },
          { id: 'results', label: lang === 'zh' ? '成绩管理' : 'Results', icon: <Medal className="w-4 h-4" /> },
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
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {lang === 'zh' ? '即将参加考试' : 'Upcoming Exams'}
            </h3>
            <div className="space-y-3">
              {upcomingExams.length === 0 ? (
                <p className="text-center text-gray-500 py-4">{lang === 'zh' ? '暂无即将进行的考试' : 'No upcoming exams'}</p>
              ) : (
                upcomingExams.slice(0, 5).map(exam => (
                  <div key={exam.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                      <Award className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{exam.studentName}</p>
                      <p className="text-sm text-gray-500">{exam.examType} - {exam.level}{lang === 'zh' ? '级' : ' Level'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{format(parseISO(exam.examDate), 'M月d日')}</p>
                      <p className="text-xs text-gray-500">{exam.venue}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              {lang === 'zh' ? '最近成绩' : 'Recent Results'}
            </h3>
            <div className="space-y-3">
              {registrations.filter(r => r.status === 'passed' || r.status === 'failed').slice(0, 5).map(exam => (
                <div key={exam.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    exam.status === 'passed' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {exam.status === 'passed' 
                      ? <CheckCircle className="w-5 h-5 text-green-600" />
                      : <XCircle className="w-5 h-5 text-red-600" />
                    }
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{exam.studentName}</p>
                    <p className="text-sm text-gray-500">{exam.examType} - {exam.level}{lang === 'zh' ? '级' : ' Level'}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${exam.status === 'passed' ? 'text-green-600' : 'text-red-600'}`}>
                      {exam.score} {lang === 'zh' ? '分' : 'pts'}
                    </p>
                    {exam.certificate && (
                      <p className="text-xs text-indigo-600">{lang === 'zh' ? '已获证书' : 'Certified'}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['all', 'registered', 'confirmed', 'passed', 'failed'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filterStatus === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? (lang === 'zh' ? '全部' : 'All') :
                 status === 'registered' ? (lang === 'zh' ? '已报名' : 'Registered') :
                 status === 'confirmed' ? (lang === 'zh' ? '已确认' : 'Confirmed') :
                 status === 'passed' ? (lang === 'zh' ? '通过' : 'Passed') :
                 (lang === 'zh' ? '未通过' : 'Failed')}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '学员' : 'Student'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '考试' : 'Exam'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '级别' : 'Level'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '考试日期' : 'Date'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '状态' : 'Status'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '成绩' : 'Score'}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '操作' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRegistrations.map(reg => (
                    <tr key={reg.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{reg.studentName}</p>
                        <p className="text-xs text-gray-500">{reg.teacherName}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{reg.examType}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{reg.level}{lang === 'zh' ? '级' : ''}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{format(parseISO(reg.examDate), 'yyyy-MM-dd')}</td>
                      <td className="px-4 py-3">{getStatusBadge(reg.status)}</td>
                      <td className="px-4 py-3">
                        {reg.score !== undefined ? (
                          <span className={`font-bold ${reg.score >= 60 ? 'text-green-600' : 'text-red-600'}`}>
                            {reg.score}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {reg.status === 'registered' && (
                            <button
                              onClick={() => handleUpdateStatus(reg.id, 'confirmed')}
                              className="text-xs text-indigo-600 hover:text-indigo-700"
                            >
                              {lang === 'zh' ? '确认' : 'Confirm'}
                            </button>
                          )}
                          {reg.status === 'completed' && (
                            <>
                              <button
                                onClick={() => handleUpdateStatus(reg.id, 'passed', 85)}
                                className="text-xs text-green-600 hover:text-green-700"
                              >
                                {lang === 'zh' ? '通过' : 'Pass'}
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(reg.id, 'failed', 55)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                {lang === 'zh' ? '不通过' : 'Fail'}
                              </button>
                            </>
                          )}
                          {reg.certificate && (
                            <button className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                              <Download className="w-3 h-3" />
                              {lang === 'zh' ? '证书' : 'Cert'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'exams' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {examTypes.map(exam => (
            <div key={exam.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                  <p className="text-sm text-gray-500">{exam.organization}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Award className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{lang === 'zh' ? '考试日期' : 'Exam Date'}</span>
                  <span className="font-medium text-gray-900">{format(parseISO(exam.examDate), 'M月d日')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{lang === 'zh' ? '报名截止' : 'Deadline'}</span>
                  <span className="font-medium text-amber-600">{format(parseISO(exam.registrationDeadline), 'M月d日')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{lang === 'zh' ? '报名费' : 'Fee'}</span>
                  <span className="font-bold text-gray-900">¥{exam.fee}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{lang === 'zh' ? '可报级别' : 'Levels'}</span>
                  <span className="text-gray-900">1-10{lang === 'zh' ? '级' : ''}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedExam(exam);
                  setNewRegistration({ ...newRegistration, examTypeId: exam.id });
                  setShowRegisterForm(true);
                }}
                className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                {lang === 'zh' ? '立即报名' : 'Register Now'}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'results' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">{lang === 'zh' ? '成绩录入' : 'Enter Results'}</h3>
          <div className="space-y-3">
            {registrations.filter(r => r.status === 'completed').map(reg => (
              <div key={reg.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{reg.studentName}</p>
                  <p className="text-sm text-gray-500">{reg.examType} - {reg.level}{lang === 'zh' ? '级' : ' Level'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={lang === 'zh' ? '分数' : 'Score'}
                    className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                    min="0"
                    max="100"
                  />
                  <button
                    onClick={() => handleUpdateStatus(reg.id, 'passed', 85)}
                    className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  >
                    {lang === 'zh' ? '通过' : 'Pass'}
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(reg.id, 'failed', 55)}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                  >
                    {lang === 'zh' ? '不通过' : 'Fail'}
                  </button>
                </div>
              </div>
            ))}
            {registrations.filter(r => r.status === 'completed').length === 0 && (
              <p className="text-center text-gray-500 py-8">{lang === 'zh' ? '暂无待录入成绩' : 'No results to enter'}</p>
            )}
          </div>
        </div>
      )}

      {showRegisterForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowRegisterForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                {lang === 'zh' ? '考级报名' : 'Exam Registration'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '选择学员' : 'Select Student'} *
                  </label>
                  <select
                    value={newRegistration.studentId}
                    onChange={e => setNewRegistration({ ...newRegistration, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{lang === 'zh' ? '选择学员' : 'Select student'}</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '考试类型' : 'Exam Type'} *
                  </label>
                  <select
                    value={newRegistration.examTypeId}
                    onChange={e => setNewRegistration({ ...newRegistration, examTypeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">{lang === 'zh' ? '选择考试' : 'Select exam'}</option>
                    {examTypes.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '报考级别' : 'Level'} *
                  </label>
                  <select
                    value={newRegistration.level}
                    onChange={e => setNewRegistration({ ...newRegistration, level: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 10 }).map((_, i) => (
                      <option key={i} value={i + 1}>{i + 1}{lang === 'zh' ? '级' : ' Level'}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '备注' : 'Notes'}
                  </label>
                  <textarea
                    value={newRegistration.notes}
                    onChange={e => setNewRegistration({ ...newRegistration, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    placeholder={lang === 'zh' ? '其他说明...' : 'Additional notes...'}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowRegisterForm(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleRegister}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    {lang === 'zh' ? '提交报名' : 'Register'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
