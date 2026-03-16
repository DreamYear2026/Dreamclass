import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Plus, Clock, CheckCircle, XCircle, AlertTriangle, Star, Loader2, ChevronRight, FileText, Image, Video, Send, MessageSquare, ThumbsUp, Award, Sparkles, Heart, Calendar, Upload } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useTeachers, useCourses } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { format, parseISO, isToday, isPast, addDays, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import BottomSheet from './BottomSheet';

interface Homework {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  courseId?: string;
  createdAt: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  attachments: string[];
  submission?: {
    content: string;
    attachments: string[];
    submittedAt: string;
  };
  grade?: {
    score: number;
    feedback: string;
    gradedAt: string;
  };
}

const mockHomework: Homework[] = [
  {
    id: 'h1',
    title: '音阶练习 - C大调',
    description: '练习C大调音阶，要求流畅、均匀，注意指法。每天练习30分钟。',
    teacherId: 't1',
    teacherName: '张老师',
    studentId: 's1',
    studentName: '小明',
    createdAt: new Date().toISOString(),
    dueDate: addDays(new Date(), 3).toISOString(),
    status: 'pending',
    attachments: []
  },
  {
    id: 'h2',
    title: '《小星星》完整演奏',
    description: '完整演奏《小星星》，注意节奏和音准，录制视频提交。',
    teacherId: 't1',
    teacherName: '张老师',
    studentId: 's2',
    studentName: '小红',
    createdAt: addDays(new Date(), -5).toISOString(),
    dueDate: addDays(new Date(), -1).toISOString(),
    status: 'submitted',
    attachments: [],
    submission: {
      content: '已完成练习，请老师批改。',
      attachments: ['video.mp4'],
      submittedAt: addDays(new Date(), -1).toISOString()
    }
  },
  {
    id: 'h3',
    title: '乐理测试 - 音符识别',
    description: '完成乐理练习册第10-15页，识别各种音符和休止符。',
    teacherId: 't2',
    teacherName: '李老师',
    studentId: 's1',
    studentName: '小明',
    createdAt: addDays(new Date(), -7).toISOString(),
    dueDate: addDays(new Date(), -3).toISOString(),
    status: 'graded',
    attachments: [],
    submission: {
      content: '已完成',
      attachments: [],
      submittedAt: addDays(new Date(), -4).toISOString()
    },
    grade: {
      score: 95,
      feedback: '完成得很好！继续加油！',
      gradedAt: addDays(new Date(), -3).toISOString()
    }
  }
];

export default function HomeworkPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading } = useStudents();
  const { teachers, loading: teachersLoading } = useTeachers();
  const { courses, loading: coursesLoading } = useCourses();
  const { showToast } = useToast();
  const { user } = useAuth();

  const isParent = user?.role === 'parent';
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');
  const [homeworkList, setHomeworkList] = useState<Homework[]>(mockHomework);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null);
  const [loading] = useState(false);
  const [submissionContent, setSubmissionContent] = useState('');

  const [newHomework, setNewHomework] = useState({
    title: '',
    description: '',
    studentId: '',
    dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd')
  });

  const filteredHomework = useMemo(() => {
    if (activeTab === 'all') return homeworkList;
    return homeworkList.filter(h => h.status === activeTab);
  }, [homeworkList, activeTab]);

  const stats = useMemo(() => ({
    total: homeworkList.length,
    pending: homeworkList.filter(h => h.status === 'pending').length,
    submitted: homeworkList.filter(h => h.status === 'submitted').length,
    graded: homeworkList.filter(h => h.status === 'graded').length,
    overdue: homeworkList.filter(h => h.status === 'pending' && isPast(parseISO(h.dueDate))).length
  }), [homeworkList]);

  const handleCreateHomework = () => {
    if (!newHomework.title || !newHomework.studentId) {
      showToast(lang === 'zh' ? '请填写完整信息' : 'Please fill all fields', 'error');
      return;
    }

    const student = students.find(s => s.id === newHomework.studentId);
    const homework: Homework = {
      id: `h${Date.now()}`,
      title: newHomework.title,
      description: newHomework.description,
      teacherId: 'current-teacher',
      teacherName: '当前教师',
      studentId: newHomework.studentId,
      studentName: student?.name || '',
      createdAt: new Date().toISOString(),
      dueDate: new Date(newHomework.dueDate).toISOString(),
      status: 'pending',
      attachments: []
    };

    setHomeworkList([homework, ...homeworkList]);
    setShowCreateForm(false);
    setNewHomework({ title: '', description: '', studentId: '', dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd') });
    showToast(lang === 'zh' ? '作业发布成功' : 'Homework assigned', 'success');
  };

  const handleGradeHomework = (homeworkId: string, score: number, feedback: string) => {
    setHomeworkList(prev => prev.map(h => {
      if (h.id === homeworkId) {
        return {
          ...h,
          status: 'graded' as const,
          grade: {
            score,
            feedback,
            gradedAt: new Date().toISOString()
          }
        };
      }
      return h;
    }));
    setSelectedHomework(null);
    showToast(lang === 'zh' ? '批改完成' : 'Graded successfully', 'success');
  };

  const handleSubmitHomework = () => {
    if (!submissionContent.trim()) {
      showToast(lang === 'zh' ? '请输入提交内容' : 'Please enter submission content', 'error');
      return;
    }
    
    if (selectedHomework) {
      setHomeworkList(prev => prev.map(h => {
        if (h.id === selectedHomework.id) {
          return {
            ...h,
            status: 'submitted' as const,
            submission: {
              content: submissionContent,
              submittedAt: new Date().toISOString()
            }
          };
        }
        return h;
      }));
      setSelectedHomework(null);
      setSubmissionContent('');
      showToast(lang === 'zh' ? '提交成功' : 'Submitted successfully', 'success');
    }
  };

  const getStatusConfig = (status: string, dueDate: string) => {
    const isOverdue = status === 'pending' && isPast(parseISO(dueDate));
    
    if (isOverdue) {
      return {
        label: lang === 'zh' ? '已逾期' : 'Overdue',
        color: 'bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/20',
        icon: AlertTriangle,
        gradient: 'from-[#FF6B6B] to-[#FF8E8E]'
      };
    }
    
    switch (status) {
      case 'pending':
        return {
          label: lang === 'zh' ? '待完成' : 'Pending',
          color: 'bg-[#FFE66D]/10 text-amber-700 border-[#FFE66D]/20',
          icon: Clock,
          gradient: 'from-[#FFE66D] to-[#FFB347]'
        };
      case 'submitted':
        return {
          label: lang === 'zh' ? '待批改' : 'Submitted',
          color: 'bg-[#74B9FF]/10 text-blue-700 border-[#74B9FF]/20',
          icon: Send,
          gradient: 'from-[#74B9FF] to-[#A8E6CF]'
        };
      case 'graded':
        return {
          label: lang === 'zh' ? '已批改' : 'Graded',
          color: 'bg-[#95E1A3]/10 text-[#4ECDC4] border-[#95E1A3]/20',
          icon: CheckCircle,
          gradient: 'from-[#95E1A3] to-[#7DD389]'
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-600 border-gray-200',
          icon: Clock,
          gradient: 'from-gray-400 to-gray-500'
        };
    }
  };

  const getDueDateInfo = (dueDate: string) => {
    const date = parseISO(dueDate);
    if (isToday(date)) {
      return { text: lang === 'zh' ? '今天截止' : 'Due today', urgent: true };
    } else if (isTomorrow(date)) {
      return { text: lang === 'zh' ? '明天截止' : 'Due tomorrow', urgent: false };
    } else if (isPast(date)) {
      return { text: lang === 'zh' ? '已逾期' : 'Overdue', urgent: true };
    } else {
      return { text: format(date, lang === 'zh' ? 'M月d日截止' : 'MMM d'), urgent: false };
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            {lang === 'zh' ? '作业中心' : 'Homework Center'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Heart className="w-4 h-4 text-[#FF6B6B]" />
            {isParent 
              ? (lang === 'zh' ? '查看老师布置的作业' : 'View assigned homework')
              : (lang === 'zh' ? '布置作业、在线批改、实时反馈' : 'Assign, grade, and provide feedback')
            }
          </p>
        </div>
        {!isParent && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-[#4ECDC4]/30 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {lang === 'zh' ? '布置作业' : 'Assign'}
          </button>
        )}
      </div>

      {!isParent && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { key: 'total', label: lang === 'zh' ? '总作业' : 'Total', value: stats.total, color: 'from-[#A29BFE] to-[#B8B3FF]' },
            { key: 'pending', label: lang === 'zh' ? '待完成' : 'Pending', value: stats.pending, color: 'from-[#FFE66D] to-[#FFB347]' },
            { key: 'submitted', label: lang === 'zh' ? '待批改' : 'Submitted', value: stats.submitted, color: 'from-[#74B9FF] to-[#A8E6CF]' },
            { key: 'graded', label: lang === 'zh' ? '已批改' : 'Graded', value: stats.graded, color: 'from-[#95E1A3] to-[#7DD389]' },
            { key: 'overdue', label: lang === 'zh' ? '已逾期' : 'Overdue', value: stats.overdue, color: 'from-[#FF6B6B] to-[#FF8E8E]' },
          ].map(stat => (
            <div key={stat.key} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center hover:shadow-md transition">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-2 shadow-md`}>
                <span className="text-white font-bold">{stat.value}</span>
              </div>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: lang === 'zh' ? '全部' : 'All', icon: BookOpen },
          { id: 'pending', label: lang === 'zh' ? '待完成' : 'Pending', icon: Clock },
          ...(!isParent ? [
            { id: 'submitted', label: lang === 'zh' ? '待批改' : 'Submitted', icon: Send },
            { id: 'graded', label: lang === 'zh' ? '已批改' : 'Graded', icon: CheckCircle },
          ] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white shadow-lg shadow-[#4ECDC4]/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredHomework.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4ECDC4]/10 to-[#7EDDD6]/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-[#4ECDC4]" />
            </div>
            <p className="text-gray-500 font-medium">{lang === 'zh' ? '暂无作业' : 'No homework'}</p>
            <p className="text-sm text-gray-400 mt-1">{lang === 'zh' ? '老师还没有布置作业哦' : 'No homework assigned yet'}</p>
          </div>
        ) : (
          filteredHomework.map(homework => {
            const statusConfig = getStatusConfig(homework.status, homework.dueDate);
            const dueInfo = getDueDateInfo(homework.dueDate);
            const StatusIcon = statusConfig.icon;
            
            return (
              <div
                key={homework.id}
                onClick={() => setSelectedHomework(homework)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{homework.title}</h3>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{homework.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <BookOpen className="w-4 h-4" />
                        {homework.studentName}
                      </span>
                      <span className={`flex items-center gap-1.5 ${dueInfo.urgent ? 'text-[#FF6B6B] font-medium' : 'text-gray-500'}`}>
                        <Calendar className="w-4 h-4" />
                        {dueInfo.text}
                      </span>
                    </div>
                  </div>
                  {homework.grade && (
                    <div className="flex-shrink-0">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${homework.grade.score >= 90 ? 'from-[#95E1A3] to-[#7DD389]' : homework.grade.score >= 70 ? 'from-[#FFE66D] to-[#FFB347]' : 'from-[#FF6B6B] to-[#FF8E8E]'} flex flex-col items-center justify-center shadow-lg`}>
                        <span className="text-white font-bold text-xl">{homework.grade.score}</span>
                        <span className="text-white/80 text-xs">{lang === 'zh' ? '分' : 'pts'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomSheet
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title={lang === 'zh' ? '布置作业' : 'Assign Homework'}
      >
        <div className="p-5 space-y-5">
          <div className="bg-gradient-to-br from-[#4ECDC4]/5 to-[#7EDDD6]/5 rounded-2xl p-4 border border-[#4ECDC4]/10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <BookOpen className="w-4 h-4 inline mr-1" />
              {lang === 'zh' ? '作业标题' : 'Title'} *
            </label>
            <input
              type="text"
              value={newHomework.title}
              onChange={e => setNewHomework({ ...newHomework, title: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '例如：音阶练习 - C大调' : 'e.g., Scale Practice - C Major'}
            />
          </div>

          <div className="bg-gradient-to-br from-[#A29BFE]/5 to-[#B8B3FF]/5 rounded-2xl p-4 border border-[#A29BFE]/10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              {lang === 'zh' ? '作业描述' : 'Description'}
            </label>
            <textarea
              value={newHomework.description}
              onChange={e => setNewHomework({ ...newHomework, description: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A29BFE]/20 hover:border-gray-200 transition-all min-h-[100px]"
              placeholder={lang === 'zh' ? '详细描述作业要求...' : 'Describe the homework requirements...'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-[#FF6B6B]/5 to-[#FF8E8E]/5 rounded-2xl p-4 border border-[#FF6B6B]/10">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'zh' ? '选择学员' : 'Student'} *
              </label>
              <select
                value={newHomework.studentId}
                onChange={e => setNewHomework({ ...newHomework, studentId: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 hover:border-gray-200 transition-all"
              >
                <option value="">{lang === 'zh' ? '选择学员' : 'Select student'}</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-gradient-to-br from-[#FFE66D]/5 to-[#FFB347]/5 rounded-2xl p-4 border border-[#FFE66D]/10">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                {lang === 'zh' ? '截止日期' : 'Due Date'}
              </label>
              <input
                type="date"
                value={newHomework.dueDate}
                onChange={e => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFE66D]/20 hover:border-gray-200 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2 pb-20 md:pb-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleCreateHomework}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white font-medium hover:shadow-lg hover:shadow-[#4ECDC4]/30 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {lang === 'zh' ? '发布作业' : 'Assign'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={!!selectedHomework}
        onClose={() => {
          setSelectedHomework(null);
          setSubmissionContent('');
        }}
        title={selectedHomework?.title || ''}
      >
        {selectedHomework && (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              {(() => {
                const config = getStatusConfig(selectedHomework.status, selectedHomework.dueDate);
                const Icon = config.icon;
                return (
                  <span className={`px-3 py-1.5 rounded-full text-sm font-medium border flex items-center gap-1.5 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </span>
                );
              })()}
              <span className="text-sm text-gray-500">
                {lang === 'zh' ? '截止' : 'Due'}: {format(parseISO(selectedHomework.dueDate), 'yyyy年M月d日')}
              </span>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '作业要求' : 'Requirements'}</h4>
              <p className="text-gray-600 leading-relaxed">{selectedHomework.description}</p>
            </div>

            {selectedHomework.submission && (
              <div className="bg-gradient-to-br from-[#74B9FF]/5 to-[#A8E6CF]/5 rounded-2xl p-4 border border-[#74B9FF]/10">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#74B9FF]" />
                  {lang === 'zh' ? '提交内容' : 'Submission'}
                </h4>
                <p className="text-gray-600">{selectedHomework.submission.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {format(parseISO(selectedHomework.submission.submittedAt), 'yyyy年M月d日 HH:mm')}
                </p>
              </div>
            )}

            {selectedHomework.grade && (
              <div className="bg-gradient-to-br from-[#95E1A3]/5 to-[#7DD389]/5 rounded-2xl p-4 border border-[#95E1A3]/10">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#95E1A3]" />
                    {lang === 'zh' ? '批改结果' : 'Grade'}
                  </h4>
                  <div className={`px-4 py-2 rounded-xl bg-gradient-to-br ${selectedHomework.grade.score >= 90 ? 'from-[#95E1A3] to-[#7DD389]' : selectedHomework.grade.score >= 70 ? 'from-[#FFE66D] to-[#FFB347]' : 'from-[#FF6B6B] to-[#FF8E8E]'} text-white font-bold`}>
                    {selectedHomework.grade.score} {lang === 'zh' ? '分' : 'pts'}
                  </div>
                </div>
                <p className="text-gray-600">{selectedHomework.grade.feedback}</p>
              </div>
            )}

            {isParent && selectedHomework.status === 'pending' && (
              <div className="bg-gradient-to-br from-[#FFE66D]/5 to-[#FFB347]/5 rounded-2xl p-4 border border-[#FFE66D]/10">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '提交作业' : 'Submit Homework'}</h4>
                <textarea
                  value={submissionContent}
                  onChange={e => setSubmissionContent(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFE66D]/20 hover:border-gray-200 transition-all min-h-[100px]"
                  placeholder={lang === 'zh' ? '输入作业完成情况...' : 'Enter your submission...'}
                />
                <button
                  onClick={handleSubmitHomework}
                  className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-gray-800 font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {lang === 'zh' ? '提交作业' : 'Submit'}
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-2 pb-20 md:pb-2">
              <button
                onClick={() => {
                  setSelectedHomework(null);
                  setSubmissionContent('');
                }}
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
