import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Edit2, Clock, User, Phone, BookOpen, Calendar, Save, X, Plus, Minus, FileText, MessageSquare, ChevronRight, History, Tag, AlertCircle, CheckCircle, Pause, LogOut, TrendingUp, DollarSign, ClipboardList, CalendarX } from 'lucide-react';
import { Language, Student, HoursChangeRecord, Payment, Homework, LeaveRequest } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useCourses, useAppData } from '../contexts/AppContext';
import { useToast } from './Toast';
import { api } from '../services/api';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface StudentDetailProps {
  studentId: string;
  onBack: () => void;
  lang: Language;
}

const STATUS_CONFIG = {
  active: { label: '在读', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  paused: { label: '休学', color: 'bg-amber-100 text-amber-700', icon: Pause },
  graduated: { label: '毕业', color: 'bg-blue-100 text-blue-700', icon: TrendingUp },
  transferred: { label: '转出', color: 'bg-gray-100 text-gray-700', icon: LogOut },
};

export default function StudentDetail({ studentId, onBack, lang }: StudentDetailProps) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading, updateStudent, refreshStudents } = useStudents();
  const { courses, loading: coursesLoading } = useCourses();
  const { getAttendanceByStudent } = useAppData();
  const { showToast } = useToast();
  
  const [attendance, setAttendance] = useState<{ id: string; courseId: string; studentId: string; status: string; date: string }[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'hours' | 'notes' | 'history' | 'payments' | 'homeworks' | 'leaves'>('info');
  const [saving, setSaving] = useState(false);
  const [hoursHistory, setHoursHistory] = useState<HoursChangeRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [homeworksLoading, setHomeworksLoading] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);

  const student = students.find(s => s.id === studentId) || null;
  const studentCourses = courses.filter(c => c.studentId === studentId);

  const [editForm, setEditForm] = useState({
    name: '',
    age: 8,
    level: 'Beginner',
    parentName: '',
    parentPhone: '',
    remainingHours: 0,
    notes: '',
    status: 'active' as Student['status'],
    tags: [] as string[],
  });

  const [hoursAdjustment, setHoursAdjustment] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const data = await getAttendanceByStudent(studentId);
        setAttendance(data);
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
      } finally {
        setAttendanceLoading(false);
      }
    };
    fetchAttendance();
  }, [studentId, getAttendanceByStudent]);

  useEffect(() => {
    if (student) {
      setEditForm({
        name: student.name,
        age: student.age,
        level: student.level,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        remainingHours: student.remainingHours,
        notes: student.notes || '',
        status: student.status || 'active',
        tags: student.tags || [],
      });
    }
  }, [student]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHoursHistory();
    } else if (activeTab === 'payments') {
      fetchPayments();
    } else if (activeTab === 'homeworks') {
      fetchHomeworks();
    } else if (activeTab === 'leaves') {
      fetchLeaveRequests();
    }
  }, [activeTab, studentId]);

  const fetchHoursHistory = async () => {
    setHistoryLoading(true);
    try {
      const history = await api.getStudentHoursHistory(studentId);
      setHoursHistory(history);
    } catch (error) {
      console.error('Failed to fetch hours history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const data = await api.getPayments(studentId);
      setPayments(data);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const fetchHomeworks = async () => {
    setHomeworksLoading(true);
    try {
      const data = await api.getHomeworks();
      setHomeworks(data.filter((h: Homework) => h.studentId === studentId));
    } catch (error) {
      console.error('Failed to fetch homeworks:', error);
    } finally {
      setHomeworksLoading(false);
    }
  };

  const fetchLeaveRequests = async () => {
    setLeavesLoading(true);
    try {
      const data = await api.getLeaveRequests();
      setLeaveRequests(data.filter((l: LeaveRequest) => l.studentId === studentId));
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLeavesLoading(false);
    }
  };

  const loading = studentsLoading || coursesLoading || attendanceLoading;

  const handleSaveEdit = async () => {
    if (!student) return;
    
    if (!editForm.name.trim()) {
      showToast('请输入学员姓名', 'error');
      return;
    }
    if (!editForm.parentName.trim()) {
      showToast('请输入家长姓名', 'error');
      return;
    }
    if (!editForm.parentPhone.trim()) {
      showToast('请输入联系电话', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateStudent(student.id, editForm);
      showToast('学员信息更新成功', 'success');
      setIsEditing(false);
    } catch (error) {
      showToast('更新失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAdjustHours = async (adjustment: number) => {
    if (!student) return;
    
    try {
      await api.changeStudentHours(student.id, adjustment, adjustmentReason);
      await refreshStudents();
      showToast(`课时${adjustment > 0 ? '增加' : '减少'}成功`, 'success');
      setHoursAdjustment(0);
      setAdjustmentReason('');
      fetchHoursHistory();
    } catch (error) {
      showToast('课时调整失败', 'error');
    }
  };

  const handleAddNote = async () => {
    if (!student || !newNote.trim()) return;
    
    const currentNotes = student.notes || '';
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm');
    const updatedNotes = currentNotes 
      ? `${currentNotes}\n\n[${timestamp}] ${newNote}`
      : `[${timestamp}] ${newNote}`;
    
    try {
      await updateStudent(student.id, { notes: updatedNotes });
      showToast('备注添加成功', 'success');
      setNewNote('');
    } catch (error) {
      showToast('添加备注失败', 'error');
    }
  };

  const handleAddTag = async () => {
    if (!student || !newTag.trim()) return;
    if (editForm.tags.includes(newTag.trim())) {
      showToast('标签已存在', 'warning');
      return;
    }
    
    const updatedTags = [...editForm.tags, newTag.trim()];
    setEditForm({ ...editForm, tags: updatedTags });
    setNewTag('');
    
    try {
      await updateStudent(student.id, { tags: updatedTags });
      showToast('标签添加成功', 'success');
    } catch (error) {
      showToast('添加标签失败', 'error');
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!student) return;
    
    const updatedTags = editForm.tags.filter(t => t !== tagToRemove);
    setEditForm({ ...editForm, tags: updatedTags });
    
    try {
      await updateStudent(student.id, { tags: updatedTags });
      showToast('标签已移除', 'success');
    } catch (error) {
      showToast('移除标签失败', 'error');
    }
  };

  if (loading || !student) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const levelColors = {
    'Beginner': 'bg-emerald-100 text-emerald-700',
    'Intermediate': 'bg-blue-100 text-blue-700',
    'Advanced': 'bg-purple-100 text-purple-700',
  };

  const quickAdjustments = [1, 2, 5, 10, -1, -2, -5];
  const StatusIcon = STATUS_CONFIG[student.status || 'active'].icon;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack} 
          className="flex items-center text-gray-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" /> 返回学员列表
        </button>
        
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/25"
          >
            <Edit2 className="w-4 h-4" /> 编辑信息
          </button>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          <img 
            src={student.avatar} 
            alt={student.name} 
            className="w-24 h-24 rounded-2xl border-4 border-white/30 shadow-xl" 
            referrerPolicy="no-referrer" 
          />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{student.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${STATUS_CONFIG[student.status || 'active'].color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {STATUS_CONFIG[student.status || 'active'].label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${levelColors[student.level as keyof typeof levelColors]}`}>
                {student.level}
              </span>
              <span className="text-white/80">{student.age} 岁</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-white/80 text-sm">
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" /> {student.parentName}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" /> {student.parentPhone}
              </span>
            </div>
            {/* Tags */}
            {editForm.tags && editForm.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {editForm.tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center">
            <p className="text-sm text-white/70">剩余课时</p>
            <p className="text-4xl font-bold">{student.remainingHours}</p>
            <p className="text-xs text-white/60 mt-1">节</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-shrink-0 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'info' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          基本信息
        </button>
        <button
          onClick={() => setActiveTab('hours')}
          className={`flex-shrink-0 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'hours' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          课时管理
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-shrink-0 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
            activeTab === 'history' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" /> 变更记录
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-shrink-0 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
            activeTab === 'payments' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <DollarSign className="w-4 h-4" /> 缴费记录
        </button>
        <button
          onClick={() => setActiveTab('homeworks')}
          className={`flex-shrink-0 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
            activeTab === 'homeworks' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> 作业
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`flex-shrink-0 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
            activeTab === 'leaves' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <CalendarX className="w-4 h-4" /> 请假
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-shrink-0 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'notes' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          备注记录
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {isEditing ? (
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <User className="w-4 h-4 inline mr-1" />
                    学员姓名 *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">年龄</label>
                  <input
                    type="number"
                    value={editForm.age}
                    onChange={e => setEditForm({ ...editForm, age: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min={3}
                    max={18}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <BookOpen className="w-4 h-4 inline mr-1" />
                    级别
                  </label>
                  <select
                    value={editForm.level}
                    onChange={e => setEditForm({ ...editForm, level: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    学员状态
                  </label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value as Student['status'] })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">在读</option>
                    <option value="paused">休学</option>
                    <option value="graduated">毕业</option>
                    <option value="transferred">转出</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">家长姓名 *</label>
                  <input
                    type="text"
                    value={editForm.parentName}
                    onChange={e => setEditForm({ ...editForm, parentName: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    <Phone className="w-4 h-4 inline mr-1" />
                    联系电话 *
                  </label>
                  <input
                    type="tel"
                    value={editForm.parentPhone}
                    onChange={e => setEditForm({ ...editForm, parentPhone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Tag className="w-4 h-4 inline mr-1" />
                  学员标签
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editForm.tags.map((tag, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    placeholder="输入标签"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-xl hover:bg-indigo-200 transition"
                  >
                    添加
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">学员姓名</p>
                    <p className="font-medium text-gray-900">{student.name}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">年龄</p>
                    <p className="font-medium text-gray-900">{student.age} 岁</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">级别</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${levelColors[student.level as keyof typeof levelColors]}`}>
                      {student.level}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${STATUS_CONFIG[student.status || 'active'].color.replace('text-', 'bg-').replace('700', '100')}`}>
                    <StatusIcon className={`w-5 h-5 ${STATUS_CONFIG[student.status || 'active'].color.split(' ')[1]}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">学员状态</p>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_CONFIG[student.status || 'active'].color}`}>
                      {STATUS_CONFIG[student.status || 'active'].label}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">家长姓名</p>
                    <p className="font-medium text-gray-900">{student.parentName}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">联系电话</p>
                    <p className="font-medium text-gray-900">{student.parentPhone}</p>
                  </div>
                </div>
                <a 
                  href={`tel:${student.parentPhone}`}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  拨打
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="space-y-6">
          {/* Quick Adjust */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">快速调整课时</h3>
            <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
              {quickAdjustments.map(adj => (
                <button
                  key={adj}
                  onClick={() => handleAdjustHours(adj)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    adj > 0 
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200' 
                      : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  }`}
                >
                  {adj > 0 ? `+${adj}` : adj}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Adjust */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">自定义调整</h3>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHoursAdjustment(prev => Math.max(-99, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  value={hoursAdjustment}
                  onChange={e => setHoursAdjustment(parseInt(e.target.value) || 0)}
                  className="w-20 text-center py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => setHoursAdjustment(prev => prev + 1)}
                  className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <input
                type="text"
                placeholder="调整原因（可选）"
                value={adjustmentReason}
                onChange={e => setAdjustmentReason(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              
              <button
                onClick={() => handleAdjustHours(hoursAdjustment)}
                disabled={hoursAdjustment === 0}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认
              </button>
            </div>
            
            {hoursAdjustment !== 0 && (
              <p className="text-sm text-gray-500 mt-3">
                调整后课时: <span className={`font-bold ${hoursAdjustment > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {student.remainingHours + hoursAdjustment}
                </span> 节
              </p>
            )}
          </div>

          {/* Attendance History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">考勤记录</h3>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {attendance.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {attendance.slice(0, 10).map(a => (
                    <div key={a.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          a.status === 'present' ? 'bg-emerald-500' : 
                          a.status === 'absent' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        <span className="text-sm text-gray-900">{a.date}</span>
                      </div>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                        a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 
                        a.status === 'absent' ? 'bg-red-100 text-red-700' : 
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {a.status === 'present' ? '出勤' : a.status === 'absent' ? '缺勤' : '请假'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  暂无考勤记录
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">课时变更记录</h3>
            <button
              onClick={fetchHoursHistory}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              刷新
            </button>
          </div>
          
          {historyLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : hoursHistory.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {hoursHistory.map(record => (
                <div key={record.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        record.changeAmount > 0 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {record.changeAmount > 0 ? `+${record.changeAmount}` : record.changeAmount} 课时
                      </span>
                      <span className="text-sm text-gray-500">
                        {format(parseISO(record.createdAt), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {record.operatorName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{record.previousHours}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-900">{record.newHours}</span>
                    <span className="text-gray-400">课时</span>
                  </div>
                  {record.reason && (
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded-lg">
                      原因: {record.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>暂无课时变更记录</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Add Note */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">添加备注</h3>
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="输入备注内容..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> 添加备注
              </button>
            </div>
          </div>

          {/* Notes History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">备注记录</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {student.notes ? (
                <div className="p-4 space-y-3">
                  {student.notes.split('\n\n').filter(Boolean).map((note, idx) => {
                    const match = note.match(/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\]\s*(.*)$/s);
                    return (
                      <div key={idx} className="p-4 bg-gray-50 rounded-xl">
                        {match ? (
                          <>
                            <p className="text-xs text-indigo-600 font-medium mb-2">
                              {match[1]}
                            </p>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{match[2]}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>暂无备注记录</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">缴费记录</h3>
            <span className="text-sm text-gray-500">共 {payments.length} 笔</span>
          </div>
          
          {paymentsLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : payments.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {payments.map(payment => (
                <div key={payment.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'paid' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {payment.status === 'paid' ? '已支付' : '待支付'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {payment.date}
                      </span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      ¥{payment.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {payment.hours > 0 && (
                      <span>购买课时: {payment.hours}节</span>
                    )}
                    {payment.description && (
                      <span className="text-gray-400">{payment.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>暂无缴费记录</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'homeworks' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">作业记录</h3>
            <span className="text-sm text-gray-500">共 {homeworks.length} 份</span>
          </div>
          
          {homeworksLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : homeworks.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {homeworks.map(hw => (
                <div key={hw.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-gray-900">{hw.title}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      hw.status === 'pending' 
                        ? 'bg-amber-100 text-amber-700' 
                        : hw.status === 'submitted'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {hw.status === 'pending' ? '待完成' : hw.status === 'submitted' ? '已提交' : '已批改'}
                    </span>
                  </div>
                  {hw.description && (
                    <p className="text-sm text-gray-500 mb-2">{hw.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span>布置: {hw.teacherName}</span>
                    {hw.dueDate && <span>截止: {hw.dueDate}</span>}
                    {hw.rating && (
                      <span className="text-amber-600 font-medium">评分: {hw.rating}/5</span>
                    )}
                  </div>
                  {hw.submittedContent && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm text-gray-600">
                      提交内容: {hw.submittedContent}
                    </div>
                  )}
                  {hw.reviewComment && (
                    <div className="mt-2 p-2 bg-emerald-50 rounded-lg text-sm text-gray-600">
                      评语: {hw.reviewComment}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>暂无作业记录</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">请假记录</h3>
            <span className="text-sm text-gray-500">共 {leaveRequests.length} 条</span>
          </div>
          
          {leavesLoading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
            </div>
          ) : leaveRequests.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {leaveRequests.map(leave => (
                <div key={leave.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        leave.type === 'leave' 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {leave.type === 'leave' ? '请假' : '调课'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        leave.status === 'pending' 
                          ? 'bg-gray-100 text-gray-700' 
                          : leave.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {leave.status === 'pending' ? '待处理' : leave.status === 'approved' ? '已批准' : '已拒绝'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {format(parseISO(leave.requestDate), 'yyyy-MM-dd HH:mm')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{leave.reason}</p>
                  {leave.preferredDate && (
                    <p className="text-xs text-gray-400">
                      期望时间: {leave.preferredDate} {leave.preferredTime}
                    </p>
                  )}
                  {leave.response && (
                    <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                      回复: {leave.response}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <CalendarX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>暂无请假记录</p>
            </div>
          )}
        </div>
      )}

      {/* Course History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900">课程记录</h3>
          <span className="text-sm text-gray-500">共 {studentCourses.length} 节课</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {studentCourses.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {studentCourses.slice(0, 10).map(c => (
                <div key={c.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{c.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(parseISO(c.date), 'M月d日 EEEE', { locale: zhCN })} · {c.startTime}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">教师: {c.teacherName} · {c.room}</p>
                    </div>
                    <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                      c.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 
                      c.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                      'bg-indigo-100 text-indigo-700'
                    }`}>
                      {c.status === 'completed' ? '已完成' : c.status === 'cancelled' ? '已取消' : '待上课'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>暂无课程记录</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
