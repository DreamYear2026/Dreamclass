import React, { useState, useEffect, useMemo } from 'react';
import { Target, TrendingUp, Clock, Award, Plus, Loader2, Star, BookOpen, Music } from 'lucide-react';
import { Language, StudentProgress, LearningGoal, PracticeRecord } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useStudents, useCourses } from '../contexts/AppContext';
import { useStudentByUser } from '../hooks/useStudentByUser';
import { parseISO, format, differenceInDays, isAfter, isBefore } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import BottomSheet from './BottomSheet';
import { useToast } from './Toast';
import { apiRequest } from '../services/api';

const SKILL_CATEGORIES = [
  { id: 'technique', nameZh: '演奏技巧', nameEn: 'Technique', icon: '🎹' },
  { id: 'theory', nameZh: '乐理知识', nameEn: 'Music Theory', icon: '📖' },
  { id: 'sight_reading', nameZh: '视奏能力', nameEn: 'Sight Reading', icon: '👀' },
  { id: 'ear_training', nameZh: '听力训练', nameEn: 'Ear Training', icon: '👂' },
  { id: 'performance', nameZh: '舞台表现', nameEn: 'Performance', icon: '🎭' },
];

export default function StudentProgressPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { students, loading: studentsLoading } = useStudents();
  const { courses, loading: coursesLoading } = useCourses();
  const { student: myStudent } = useStudentByUser();
  const { showToast } = useToast();
  
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [practiceRecords, setPracticeRecords] = useState<PracticeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [showPracticeForm, setShowPracticeForm] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  const [newGoal, setNewGoal] = useState({ title: '', description: '', targetDate: '' });
  const [newPractice, setNewPractice] = useState({ duration: 30, pieces: '', notes: '' });

  const isParent = user?.role === 'parent';
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

  const targetStudentId = useMemo(() => {
    if (isParent && myStudent) return myStudent.id;
    if (selectedStudentId) return selectedStudentId;
    return null;
  }, [isParent, myStudent, selectedStudentId]);

  useEffect(() => {
    if (targetStudentId) {
      fetchProgressData(targetStudentId);
    }
  }, [targetStudentId]);

  const fetchProgressData = async (studentId: string) => {
    try {
      setLoading(true);
      const [progressData, goalsData, practiceData] = await Promise.all([
        apiRequest<StudentProgress[]>(`/api/student-progress/${studentId}`),
        apiRequest<LearningGoal[]>(`/api/learning-goals/${studentId}`),
        apiRequest<PracticeRecord[]>(`/api/practice-records/${studentId}`),
      ]);

      setProgress(progressData);
      setGoals(goalsData);
      setPracticeRecords(practiceData);
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const studentCourses = useMemo(() => {
    if (!targetStudentId) return [];
    return courses.filter(c => c.studentId === targetStudentId);
  }, [courses, targetStudentId]);

  const completedCourses = useMemo(() => {
    return studentCourses.filter(c => c.status === 'completed').length;
  }, [studentCourses]);

  const totalPracticeMinutes = useMemo(() => {
    return practiceRecords.reduce((sum, r) => sum + r.duration, 0);
  }, [practiceRecords]);

  const activeGoals = useMemo(() => {
    return goals.filter(g => g.status === 'in_progress');
  }, [goals]);

  const completedGoals = useMemo(() => {
    return goals.filter(g => g.status === 'completed').length;
  }, [goals]);

  const handleAddGoal = async () => {
    if (!targetStudentId || !newGoal.title.trim()) {
      showToast(lang === 'zh' ? '请填写目标标题' : 'Please enter goal title', 'error');
      return;
    }

    try {
      await apiRequest<LearningGoal>('/api/learning-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: targetStudentId,
          ...newGoal,
        }),
      });

      showToast(lang === 'zh' ? '目标已添加' : 'Goal added', 'success');
      setShowGoalForm(false);
      setNewGoal({ title: '', description: '', targetDate: '' });
      fetchProgressData(targetStudentId);
    } catch (error) {
      showToast(lang === 'zh' ? '添加失败' : 'Failed to add', 'error');
    }
  };

  const handleAddPractice = async () => {
    if (!targetStudentId) return;

    try {
      await apiRequest<PracticeRecord>('/api/practice-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: targetStudentId,
          date: new Date().toISOString().split('T')[0],
          duration: newPractice.duration,
          pieces: newPractice.pieces.split(',').map(p => p.trim()).filter(Boolean),
          notes: newPractice.notes,
        }),
      });

      showToast(lang === 'zh' ? '练习记录已添加' : 'Practice recorded', 'success');
      setShowPracticeForm(false);
      setNewPractice({ duration: 30, pieces: '', notes: '' });
      fetchProgressData(targetStudentId);
    } catch (error) {
      showToast(lang === 'zh' ? '添加失败' : 'Failed to add', 'error');
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      await apiRequest<LearningGoal>(`/api/learning-goals/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (targetStudentId) {
        showToast(lang === 'zh' ? '目标已完成' : 'Goal completed', 'success');
        fetchProgressData(targetStudentId);
      }
    } catch (error) {
      showToast(lang === 'zh' ? '操作失败' : 'Failed', 'error');
    }
  };

  if (studentsLoading || coursesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!targetStudentId && (isAdmin || isTeacher)) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-24">
        <h1 className="text-xl font-bold text-gray-900">
          {lang === 'zh' ? '学员进度' : 'Student Progress'}
        </h1>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {lang === 'zh' ? '选择学员' : 'Select Student'}
          </label>
          <select
            value={selectedStudentId || ''}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">{lang === 'zh' ? '请选择学员' : 'Select a student'}</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  if (!targetStudentId) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{lang === 'zh' ? '未找到学员信息' : 'Student not found'}</p>
        </div>
      </div>
    );
  }

  const student = students.find(s => s.id === targetStudentId);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {lang === 'zh' ? '学习进度' : 'Learning Progress'}
        </h1>
        {(isParent || isTeacher) && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowPracticeForm(true)}
              className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition flex items-center gap-1"
            >
              <Clock className="w-4 h-4" />
              {lang === 'zh' ? '记录练习' : 'Log Practice'}
            </button>
            <button
              onClick={() => setShowGoalForm(true)}
              className="px-3 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              {lang === 'zh' ? '目标' : 'Goal'}
            </button>
          </div>
        )}
      </div>

      {student && (
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3">
            <img
              src={student.avatar || `https://picsum.photos/seed/${student.id}/100/100`}
              alt={student.name}
              className="w-12 h-12 rounded-full border-2 border-white/30"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="font-bold text-lg">{student.name}</p>
              <p className="text-sm text-white/80">{student.level}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
            <Award className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedCourses}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '已完成课程' : 'Completed'}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{Math.floor(totalPracticeMinutes / 60)}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '练习小时' : 'Hours'}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <Target className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{completedGoals}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '达成目标' : 'Goals'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          {lang === 'zh' ? '技能掌握' : 'Skills'}
        </h2>
        <div className="space-y-3">
          {SKILL_CATEGORIES.map(category => {
            const skillProgress = progress.find(p => p.skillCategory === category.id);
            const level = skillProgress?.level || 0;
            const maxLevel = skillProgress?.maxLevel || 5;
            const percentage = (level / maxLevel) * 100;

            return (
              <div key={category.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {lang === 'zh' ? category.nameZh : category.nameEn}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{level}/{maxLevel}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-amber-600" />
          {lang === 'zh' ? '学习目标' : 'Learning Goals'}
        </h2>
        {activeGoals.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{lang === 'zh' ? '暂无学习目标' : 'No goals yet'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGoals.map(goal => {
              const targetDate = goal.targetDate || goal.createdAt;
              const daysLeft = differenceInDays(parseISO(targetDate), new Date());
              const isUrgent = daysLeft <= 7 && daysLeft > 0;
              const isOverdue = daysLeft < 0;

              return (
                <div
                  key={goal.id}
                  className={`p-3 rounded-xl border ${
                    isOverdue ? 'border-red-200 bg-red-50' :
                    isUrgent? 'border-amber-200 bg-amber-50' :
                    'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{goal.title}</p>
                      {goal.description && (
                        <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                      )}
                      <p className={`text-xs mt-2 ${
                        isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-500'
                      }`}>
                        {isOverdue
                          ? (lang === 'zh' ? '已过期' : 'Overdue')
                          : (lang === 'zh' ? `还剩 ${daysLeft} 天` : `${daysLeft} days left`)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCompleteGoal(goal.id)}
                      className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition"
                    >
                      <Award className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Music className="w-5 h-5 text-green-600" />
          {lang === 'zh' ? '练习记录' : 'Practice Records'}
        </h2>
        {practiceRecords.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Music className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">{lang === 'zh' ? '暂无练习记录' : 'No practice records'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {practiceRecords.slice(0, 5).map(record => (
              <div key={record.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {record.duration} {lang === 'zh' ? '分钟' : 'min'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(record.date), lang === 'zh' ? 'M月d日' : 'MMM d')}
                    {record.pieces.length > 0 && ` · ${record.pieces.join(', ')}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        isOpen={showGoalForm}
        onClose={() => setShowGoalForm(false)}
        title={lang === 'zh' ? '添加学习目标' : 'Add Learning Goal'}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '目标标题' : 'Title'} *
            </label>
            <input
              type="text"
              value={newGoal.title}
              onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder={lang === 'zh' ? '例如：完成一首新曲子' : 'e.g., Learn a new piece'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '目标描述' : 'Description'}
            </label>
            <textarea
              value={newGoal.description}
              onChange={e => setNewGoal({ ...newGoal, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
              placeholder={lang === 'zh' ? '详细描述...' : 'Details...'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '目标日期' : 'Target Date'}
            </label>
            <input
              type="date"
              value={newGoal.targetDate}
              onChange={e => setNewGoal({ ...newGoal, targetDate: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowGoalForm(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleAddGoal}
              className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-medium"
            >
              {lang === 'zh' ? '添加' : 'Add'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showPracticeForm}
        onClose={() => setShowPracticeForm(false)}
        title={lang === 'zh' ? '记录练习' : 'Log Practice'}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '练习时长（分钟）' : 'Duration (minutes)'}
            </label>
            <input
              type="number"
              value={newPractice.duration}
              onChange={e => setNewPractice({ ...newPractice, duration: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '练习曲目' : 'Pieces Practiced'}
            </label>
            <input
              type="text"
              value={newPractice.pieces}
              onChange={e => setNewPractice({ ...newPractice, pieces: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder={lang === 'zh' ? '用逗号分隔多个曲目' : 'Separate with commas'}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '备注' : 'Notes'}
            </label>
            <textarea
              value={newPractice.notes}
              onChange={e => setNewPractice({ ...newPractice, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[60px]"
              placeholder={lang === 'zh' ? '练习心得...' : 'Practice notes...'}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPracticeForm(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleAddPractice}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium"
            >
              {lang === 'zh' ? '保存' : 'Save'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
