import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Image, Calendar, TrendingUp, Award, Plus, Loader2, X, ChevronRight, Music, FileText, Video, Sparkles, Heart, Star } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useStudents, useCourses } from '../contexts/AppContext';
import { useStudentByUser } from '../hooks/useStudentByUser';
import { useToast } from './Toast';
import BottomSheet from './BottomSheet';
import { format, parseISO, differenceInMonths, differenceInDays, isAfter, isBefore, startOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { apiRequest } from '../services/api';

interface PortfolioItem {
  id: string;
  studentId: string;
  type: 'photo' | 'video' | 'audio' | 'document';
  title: string;
  description: string;
  fileUrl: string;
  thumbnailUrl?: string;
  date: string;
  tags: string[];
  teacherComment?: string;
  rating?: number;
}

interface Milestone {
  id: string;
  studentId: string;
  title: string;
  description: string;
  date: string;
  category: 'skill' | 'performance' | 'exam' | 'achievement';
  icon: string;
}

export default function PortfolioPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { students } = useStudents();
  const { courses } = useCourses();
  const { student: myStudent } = useStudentByUser();
  const { showToast } = useToast();

  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'gallery'>('timeline');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [newItem, setNewItem] = useState({
    type: 'photo' as PortfolioItem['type'],
    title: '',
    description: '',
    tags: '',
    rating: 5,
    teacherComment: '',
  });

  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    category: 'skill' as Milestone['category'],
    date: format(new Date(), 'yyyy-MM-dd'),
  });

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
      fetchPortfolioData(targetStudentId);
    }
  }, [targetStudentId]);

  const fetchPortfolioData = async (studentId: string) => {
    try {
      setLoading(true);
      const [portfolioData, milestonesData] = await Promise.all([
        apiRequest<PortfolioItem[]>(`/api/portfolio/${studentId}`),
        apiRequest<Milestone[]>(`/api/milestones/${studentId}`),
      ]);

      setPortfolioItems(portfolioData);
      setMilestones(milestonesData);
    } catch (error) {
      console.error('Failed to fetch portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  const student = useMemo(() => {
    return students.find(s => s.id === targetStudentId);
  }, [students, targetStudentId]);

  const studentCourses = useMemo(() => {
    if (!targetStudentId) return [];
    return courses.filter(c => c.studentId === targetStudentId);
  }, [courses, targetStudentId]);

  const progressData = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    
    const monthlyData = [];
    for (let i = 0; i < 6; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthItems = portfolioItems.filter(item => {
        const itemDate = parseISO(item.date);
        return itemDate >= monthStart && itemDate <= monthEnd;
      });
      
      const monthMilestones = milestones.filter(m => {
        const mDate = parseISO(m.date);
        return mDate >= monthStart && mDate <= monthEnd;
      });
      
      monthlyData.push({
        month: format(monthStart, lang === 'zh' ? 'M月' : 'MMM'),
        items: monthItems.length,
        milestones: monthMilestones.length,
        avgRating: monthItems.length > 0 
          ? monthItems.reduce((sum, item) => sum + (item.rating || 0), 0) / monthItems.length 
          : 0,
      });
    }
    
    return monthlyData.reverse();
  }, [portfolioItems, milestones, lang]);

  const handleUpload = async () => {
    if (!targetStudentId || !newItem.title.trim()) {
      showToast(lang === 'zh' ? '请填写标题' : 'Please enter title', 'error');
      return;
    }

    try {
      await apiRequest<PortfolioItem>('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: targetStudentId,
          ...newItem,
          tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean),
          date: new Date().toISOString(),
          fileUrl: `https://picsum.photos/seed/${Date.now()}/800/600`,
          thumbnailUrl: `https://picsum.photos/seed/${Date.now()}/200/200`,
        }),
      });

      showToast(lang === 'zh' ? '作品已上传' : 'Uploaded', 'success');
      setShowUpload(false);
      setNewItem({ type: 'photo', title: '', description: '', tags: '', rating: 5, teacherComment: '' });
      fetchPortfolioData(targetStudentId);
    } catch (error) {
      showToast(lang === 'zh' ? '上传失败' : 'Failed to upload', 'error');
    }
  };

  const handleAddMilestone = async () => {
    if (!targetStudentId || !newMilestone.title.trim()) {
      showToast(lang === 'zh' ? '请填写标题' : 'Please enter title', 'error');
      return;
    }

    try {
      await apiRequest<Milestone>('/api/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: targetStudentId,
          ...newMilestone,
          icon: newMilestone.category === 'skill' ? '🎯' : 
                newMilestone.category === 'performance' ? '🎭' :
                newMilestone.category === 'exam' ? '📝' : '🏆',
        }),
      });

      showToast(lang === 'zh' ? '里程碑已添加' : 'Milestone added', 'success');
      setShowAddMilestone(false);
      setNewMilestone({ title: '', description: '', category: 'skill', date: format(new Date(), 'yyyy-MM-dd') });
      fetchPortfolioData(targetStudentId);
    } catch (error) {
      showToast(lang === 'zh' ? '添加失败' : 'Failed to add', 'error');
    }
  };

  const getTypeIcon = (type: PortfolioItem['type']) => {
    switch (type) {
      case 'photo': return <Image className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryLabel = (category: Milestone['category']) => {
    const labels = {
      skill: lang === 'zh' ? '技能突破' : 'Skill',
      performance: lang === 'zh' ? '演出经历' : 'Performance',
      exam: lang === 'zh' ? '考级成就' : 'Exam',
      achievement: lang === 'zh' ? '荣誉奖项' : 'Achievement',
    };
    return labels[category];
  };

  if (loading && targetStudentId) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-[#A29BFE] animate-spin mx-auto" />
            <Sparkles className="w-6 h-6 text-[#FFE66D] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="mt-4 text-gray-500">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!targetStudentId && (isAdmin || isTeacher)) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-24 animate-fade-in">
        <h1 className="text-xl font-bold bg-gradient-to-r from-[#A29BFE] to-[#FD79A8] bg-clip-text text-transparent flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#FFE66D]" />
          {lang === 'zh' ? '成长档案' : 'Portfolio'}
        </h1>
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {lang === 'zh' ? '选择学员' : 'Select Student'}
          </label>
          <select
            value={selectedStudentId || ''}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A29BFE] focus:border-transparent"
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
      <div className="p-4 md:p-6 max-w-2xl mx-auto animate-fade-in">
        <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#A29BFE] to-[#FD79A8] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-500">{lang === 'zh' ? '未找到学员信息' : 'Student not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 pb-24 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#A29BFE] to-[#FD79A8] bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            {lang === 'zh' ? '成长档案' : 'Portfolio'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Heart className="w-4 h-4 text-[#FD79A8]" />
            {lang === 'zh' ? '记录学员的成长轨迹' : 'Record student growth journey'}
          </p>
        </div>
        {(isTeacher || isAdmin) && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddMilestone(true)}
              className="px-3 py-2.5 bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-gray-900 rounded-xl text-sm font-medium hover:shadow-lg transition-all duration-300 flex items-center gap-1 shadow-md"
            >
              <Award className="w-4 h-4" />
              {lang === 'zh' ? '里程碑' : 'Milestone'}
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-[#A29BFE] to-[#B8B3FF] text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all duration-300 flex items-center gap-2 shadow-md shadow-[#A29BFE]/30"
            >
              <Upload className="w-4 h-4" />
              {lang === 'zh' ? '上传作品' : 'Upload'}
            </button>
          </div>
        )}
      </div>

      {student && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-4">
            <img
              src={student.avatar || `https://picsum.photos/seed/${student.id}/100/100`}
              alt={student.name}
              className="w-16 h-16 rounded-full border-2 border-white/30"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold">{student.name}</h2>
              <p className="text-sm text-white/80">{student.level}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span>{portfolioItems.length} {lang === 'zh' ? '作品' : 'works'}</span>
                <span>{milestones.length} {lang === 'zh' ? '里程碑' : 'milestones'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-600" />
          {lang === 'zh' ? '成长曲线' : 'Growth Curve'}
        </h3>
        <div className="flex items-end gap-2 h-24">
          {progressData.map((data, i) => {
            const maxItems = Math.max(...progressData.map(d => d.items), 1);
            const height = (data.items / maxItems) * 100;
            
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className="w-full bg-gradient-to-t from-purple-500 to-pink-400 rounded-t transition-all"
                  style={{ height: `${Math.max(height, 5)}%` }}
                />
                <span className="text-xs text-gray-500">{data.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{portfolioItems.length}</p>
            <p className="text-xs text-gray-500">{lang === 'zh' ? '总作品' : 'Total Works'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{milestones.length}</p>
            <p className="text-xs text-gray-500">{lang === 'zh' ? '里程碑' : 'Milestones'}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{studentCourses.filter(c => c.status === 'completed').length}</p>
            <p className="text-xs text-gray-500">{lang === 'zh' ? '已完成课程' : 'Completed'}</p>
          </div>
        </div>
      </div>

      {milestones.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            {lang === 'zh' ? '成长里程碑' : 'Milestones'}
          </h3>
          <div className="space-y-3">
            {milestones.slice(0, 5).map(milestone => (
              <div key={milestone.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-lg">
                  {milestone.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{milestone.title}</p>
                    <span className="text-xs text-gray-500">
                      {format(parseISO(milestone.date), lang === 'zh' ? 'yyyy年M月d日' : 'MMM d, yyyy')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                  <span className="inline-block mt-2 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                    {getCategoryLabel(milestone.category)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Image className="w-5 h-5 text-purple-600" />
            {lang === 'zh' ? '作品展示' : 'Gallery'}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-lg transition ${viewMode === 'timeline' ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
            >
              <Calendar className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`p-2 rounded-lg transition ${viewMode === 'gallery' ? 'bg-purple-100 text-purple-600' : 'text-gray-400'}`}
            >
              <Image className="w-4 h-4" />
            </button>
          </div>
        </div>

        {portfolioItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Image className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p>{lang === 'zh' ? '暂无作品' : 'No works yet'}</p>
          </div>
        ) : viewMode === 'gallery' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {portfolioItems.map(item => (
              <div
                key={item.id}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group"
                onClick={() => setSelectedItem(item)}
              >
                <img
                  src={item.thumbnailUrl || item.fileUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition">
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium truncate">{item.title}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  {getTypeIcon(item.type)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {portfolioItems.map(item => (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-xl border border-gray-100 hover:border-purple-200 transition cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <img
                  src={item.thumbnailUrl || item.fileUrl}
                  alt={item.title}
                  className="w-16 h-16 rounded-lg object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 truncate">{item.title}</p>
                    {getTypeIcon(item.type)}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(parseISO(item.date), lang === 'zh' ? 'yyyy年M月d日' : 'MMM d, yyyy')}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomSheet
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        title={lang === 'zh' ? '上传作品' : 'Upload Work'}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '类型' : 'Type'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['photo', 'video', 'audio', 'document'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setNewItem({ ...newItem, type })}
                  className={`p-3 rounded-xl border text-center transition ${
                    newItem.type === type
                      ? 'border-purple-600 bg-purple-50 text-purple-600'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {getTypeIcon(type)}
                  <p className="text-xs mt-1">
                    {type === 'photo' ? (lang === 'zh' ? '图片' : 'Photo') :
                     type === 'video' ? (lang === 'zh' ? '视频' : 'Video') :
                     type === 'audio' ? (lang === 'zh' ? '音频' : 'Audio') :
                     (lang === 'zh' ? '文档' : 'Doc')}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '标题' : 'Title'} *
            </label>
            <input
              type="text"
              value={newItem.title}
              onChange={e => setNewItem({ ...newItem, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder={lang === 'zh' ? '作品标题' : 'Work title'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '描述' : 'Description'}
            </label>
            <textarea
              value={newItem.description}
              onChange={e => setNewItem({ ...newItem, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
              placeholder={lang === 'zh' ? '作品描述...' : 'Description...'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '评分' : 'Rating'}
            </label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNewItem({ ...newItem, rating: i + 1 })}
                  className="p-1"
                >
                  <Award
                    className={`w-8 h-8 transition ${
                      i < newItem.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '教师评语' : 'Teacher Comment'}
            </label>
            <textarea
              value={newItem.teacherComment}
              onChange={e => setNewItem({ ...newItem, teacherComment: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[60px]"
              placeholder={lang === 'zh' ? '教师点评...' : 'Comment...'}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowUpload(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleUpload}
              className="flex-1 py-3 rounded-xl bg-purple-600 text-white font-medium"
            >
              {lang === 'zh' ? '上传' : 'Upload'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showAddMilestone}
        onClose={() => setShowAddMilestone(false)}
        title={lang === 'zh' ? '添加里程碑' : 'Add Milestone'}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '类型' : 'Category'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['skill', 'performance', 'exam', 'achievement'] as const).map(cat => (
                <button
                  key={cat}
                  onClick={() => setNewMilestone({ ...newMilestone, category: cat })}
                  className={`p-3 rounded-xl border text-center transition ${
                    newMilestone.category === cat
                      ? 'border-amber-600 bg-amber-50 text-amber-600'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <p className="text-sm">{getCategoryLabel(cat)}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '标题' : 'Title'} *
            </label>
            <input
              type="text"
              value={newMilestone.title}
              onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder={lang === 'zh' ? '里程碑标题' : 'Milestone title'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '描述' : 'Description'}
            </label>
            <textarea
              value={newMilestone.description}
              onChange={e => setNewMilestone({ ...newMilestone, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
              placeholder={lang === 'zh' ? '详细描述...' : 'Description...'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '日期' : 'Date'}
            </label>
            <input
              type="date"
              value={newMilestone.date}
              onChange={e => setNewMilestone({ ...newMilestone, date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAddMilestone(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleAddMilestone}
              className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-medium"
            >
              {lang === 'zh' ? '添加' : 'Add'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title={lang === 'zh' ? '作品详情' : 'Work Details'}
      >
        {selectedItem && (
          <div className="p-4 space-y-4">
            <img
              src={selectedItem.fileUrl}
              alt={selectedItem.title}
              className="w-full rounded-xl"
              referrerPolicy="no-referrer"
            />
            
            <div>
              <h3 className="font-bold text-gray-900">{selectedItem.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {format(parseISO(selectedItem.date), lang === 'zh' ? 'yyyy年M月d日' : 'MMM d, yyyy')}
              </p>
            </div>

            {selectedItem.description && (
              <p className="text-sm text-gray-600">{selectedItem.description}</p>
            )}

            {selectedItem.rating && (
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Award
                    key={i}
                    className={`w-5 h-5 ${
                      i < selectedItem.rating! ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}

            {selectedItem.teacherComment && (
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-sm font-medium text-purple-800 mb-1">
                  {lang === 'zh' ? '教师评语' : 'Teacher Comment'}
                </p>
                <p className="text-sm text-purple-700">{selectedItem.teacherComment}</p>
              </div>
            )}

            {selectedItem.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedItem.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
