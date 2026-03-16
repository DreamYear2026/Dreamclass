import React, { useState, useEffect, useMemo } from 'react';
import { Star, MessageSquare, Clock, User, Calendar, Loader2, Send, ChevronRight, Target, TrendingUp } from 'lucide-react';
import { Language, Feedback, Course, SkillRatings } from '../types';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { useStudents, useTeachers, useCourses } from '../contexts/AppContext';
import { useStudentByUser } from '../hooks/useStudentByUser';
import { parseISO, format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import BottomSheet from './BottomSheet';

const SKILL_LABELS: Record<keyof SkillRatings, { zh: string; en: string }> = {
  pitch: { zh: '音准', en: 'Pitch' },
  rhythm: { zh: '节奏', en: 'Rhythm' },
  technique: { zh: '技巧', en: 'Technique' },
  expression: { zh: '表现力', en: 'Expression' },
  theory: { zh: '乐理', en: 'Theory' },
  sightReading: { zh: '视奏', en: 'Sight Reading' },
};

const DEFAULT_SKILL_RATINGS: SkillRatings = {
  pitch: 3,
  rhythm: 3,
  technique: 3,
  expression: 3,
  theory: 3,
  sightReading: 3,
};

export default function ClassReviews({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { courses } = useCourses();
  const { student: myStudent } = useStudentByUser();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [newFeedback, setNewFeedback] = useState({
    courseId: '',
    studentId: '',
    content: '',
    homework: '',
    rating: 5,
    skillRatings: { ...DEFAULT_SKILL_RATINGS },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const feedbacksData = await api.getFeedbacks();
        setFeedbacks(feedbacksData);
      } catch (error) {
        showToast('获取数据失败', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [showToast]);

  const filteredFeedbacks = useMemo(() => {
    let result = feedbacks;
    
    if (user?.role === 'parent' && myStudent) {
      result = feedbacks.filter(f => f.studentId === myStudent.id);
    } else if (user?.role === 'teacher') {
      result = feedbacks.filter(f => f.teacherId === user.id);
    }
    
    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [feedbacks, user, myStudent]);

  const groupedFeedbacks = useMemo(() => {
    const groups: { [key: string]: Feedback[] } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      thisMonth: [],
      earlier: [],
    };

    filteredFeedbacks.forEach(f => {
      const date = parseISO(f.date);
      if (isToday(date)) groups.today.push(f);
      else if (isYesterday(date)) groups.yesterday.push(f);
      else if (isThisWeek(date)) groups.thisWeek.push(f);
      else if (isThisMonth(date)) groups.thisMonth.push(f);
      else groups.earlier.push(f);
    });

    return groups;
  }, [filteredFeedbacks]);

  const getGroupLabel = (key: string): string => {
    const labels: { [key: string]: string } = {
      today: lang === 'zh' ? '今天' : 'Today',
      yesterday: lang === 'zh' ? '昨天' : 'Yesterday',
      thisWeek: lang === 'zh' ? '本周' : 'This Week',
      thisMonth: lang === 'zh' ? '本月' : 'This Month',
      earlier: lang === 'zh' ? '更早' : 'Earlier',
    };
    return labels[key] || key;
  };

  const handleAddFeedback = async () => {
    if (!newFeedback.studentId || !newFeedback.content) {
      showToast('请填写完整信息', 'error');
      return;
    }

    try {
      await api.addFeedback({
        courseId: newFeedback.courseId || 'general',
        studentId: newFeedback.studentId,
        teacherId: user?.id || '',
        content: newFeedback.content,
        homework: newFeedback.homework,
        rating: newFeedback.rating,
        skillRatings: newFeedback.skillRatings,
      });
      
      setFeedbacks(await api.getFeedbacks());
      setShowAddModal(false);
      setNewFeedback({ 
        courseId: '', 
        studentId: '', 
        content: '', 
        homework: '', 
        rating: 5,
        skillRatings: { ...DEFAULT_SKILL_RATINGS },
      });
      showToast('点评添加成功，技能数据已更新', 'success');
    } catch (error) {
      showToast('添加失败', 'error');
    }
  };

  const myStudents = useMemo(() => {
    if (user?.role !== 'teacher') return [];
    const myCourseStudentIds = new Set(
      courses.filter(c => c.teacherId === user.id).map(c => c.studentId)
    );
    return students.filter(s => myCourseStudentIds.has(s.id));
  }, [courses, students, user]);

  const recentCourses = useMemo(() => {
    if (user?.role !== 'teacher') return [];
    return courses
      .filter(c => c.teacherId === user.id && c.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [courses, user]);

  const renderSkillRating = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(level => (
          <div
            key={level}
            className={`w-2 h-2 rounded-full ${
              level <= rating ? 'bg-indigo-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  const isParent = user?.role === 'parent';
  const isTeacher = user?.role === 'teacher';

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {isParent 
            ? (lang === 'zh' ? '课堂反馈' : 'Class Feedback')
            : (lang === 'zh' ? '课堂点评' : 'Class Reviews')
          }
        </h1>
        {isTeacher && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            {lang === 'zh' ? '写点评' : 'Add Review'}
          </button>
        )}
      </div>

      {isParent && myStudent && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3">
            <img 
              src={myStudent.avatar || `https://picsum.photos/seed/${myStudent.id}/100/100`}
              alt={myStudent.name}
              className="w-12 h-12 rounded-full border-2 border-white/30"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="font-bold">{myStudent.name}</p>
              <p className="text-sm text-white/80">{filteredFeedbacks.length} {lang === 'zh' ? '条课堂点评' : 'reviews'}</p>
            </div>
          </div>
        </div>
      )}

      {filteredFeedbacks.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {lang === 'zh' ? '暂无课堂点评' : 'No reviews yet'}
          </p>
          {isParent && (
            <p className="text-sm text-gray-400 mt-1">
              {lang === 'zh' ? '上完课后老师会添加点评' : 'Teachers will add reviews after class'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedFeedbacks).map(([key, items]) => 
            items.length > 0 && (
              <div key={key}>
                <h3 className="text-sm font-medium text-gray-500 mb-3 px-1">{getGroupLabel(key)}</h3>
                <div className="space-y-3">
                  {items.map(feedback => {
                    const student = students.find(s => s.id === feedback.studentId);
                    const teacher = teachers.find(t => t.id === feedback.teacherId);
                    const course = courses.find(c => c.id === feedback.courseId);
                    const hasSkillRatings = feedback.skillRatings && Object.keys(feedback.skillRatings).length > 0;
                    
                    return (
                      <div 
                        key={feedback.id} 
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition cursor-pointer"
                        onClick={() => setSelectedFeedback(feedback)}
                      >
                        <div className="flex items-start gap-3">
                          <img
                            src={teacher?.avatar || `https://picsum.photos/seed/${feedback.teacherId}/100/100`}
                            alt={teacher?.name}
                            className="w-10 h-10 rounded-full"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-bold text-gray-900">{teacher?.name}</p>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3 h-3 ${i < feedback.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {isTeacher ? student?.name : format(parseISO(feedback.date), 'M月d日', { locale: zhCN })}
                            </p>
                            <p className="text-sm text-gray-700 mt-2 line-clamp-2">{feedback.content}</p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {hasSkillRatings && (
                                <div className="px-2 py-1 bg-indigo-50 rounded-lg inline-flex items-center gap-1">
                                  <Target className="w-3 h-3 text-indigo-600" />
                                  <span className="text-xs text-indigo-600 font-medium">
                                    {lang === 'zh' ? '技能评分' : 'Skills'}
                                  </span>
                                </div>
                              )}
                              {feedback.homework && (
                                <div className="px-2 py-1 bg-emerald-50 rounded-lg inline-flex items-center gap-1">
                                  <span className="text-xs text-emerald-600 font-medium">
                                    {lang === 'zh' ? '有作业' : 'Homework'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}

      <BottomSheet
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={lang === 'zh' ? '添加课堂点评' : 'Add Class Review'}
      >
        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '选择学员' : 'Select Student'} *
            </label>
            <select
              value={newFeedback.studentId}
              onChange={e => setNewFeedback({ ...newFeedback, studentId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">{lang === 'zh' ? '选择学员' : 'Select Student'}</option>
              {myStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '关联课程' : 'Related Course'}
            </label>
            <select
              value={newFeedback.courseId}
              onChange={e => setNewFeedback({ ...newFeedback, courseId: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">{lang === 'zh' ? '选择课程（可选）' : 'Select Course (Optional)'}</option>
              {recentCourses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} - {c.date}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '课堂评分' : 'Rating'}
            </label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNewFeedback({ ...newFeedback, rating: i + 1 })}
                  className="p-1"
                >
                  <Star
                    className={`w-8 h-8 transition ${i < newFeedback.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                  />
                </button>
              ))}
              <span className="text-sm text-gray-500 ml-2">{newFeedback.rating} {lang === 'zh' ? '分' : 'points'}</span>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-indigo-600" />
              <label className="text-sm font-medium text-indigo-900">
                {lang === 'zh' ? '技能评分（影响学习轨迹）' : 'Skill Ratings (Affects Progress)'}
              </label>
            </div>
            <p className="text-xs text-indigo-600 mb-3">
              {lang === 'zh' 
                ? '评分将累计计入学员的技能成长轨迹，1-5分对应不同水平' 
                : 'Ratings will accumulate into student skill progress, 1-5 corresponds to different levels'}
            </p>
            <div className="space-y-3">
              {(Object.keys(SKILL_LABELS) as (keyof SkillRatings)[]).map(skill => (
                <div key={skill} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {SKILL_LABELS[skill][lang]}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setNewFeedback({
                          ...newFeedback,
                          skillRatings: {
                            ...newFeedback.skillRatings,
                            [skill]: level,
                          },
                        })}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium transition ${
                          level <= newFeedback.skillRatings[skill]
                            ? 'bg-indigo-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-400'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '课堂表现' : 'Performance'} *
            </label>
            <textarea
              value={newFeedback.content}
              onChange={e => setNewFeedback({ ...newFeedback, content: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[100px]"
              placeholder={lang === 'zh' ? '描述学员在课堂上的表现...' : 'Describe student performance in class...'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '课后作业' : 'Homework'}
            </label>
            <textarea
              value={newFeedback.homework}
              onChange={e => setNewFeedback({ ...newFeedback, homework: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[60px]"
              placeholder={lang === 'zh' ? '布置课后作业...' : 'Assign homework...'}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleAddFeedback}
              className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-medium"
            >
              {lang === 'zh' ? '提交点评' : 'Submit'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        title={lang === 'zh' ? '点评详情' : 'Review Details'}
      >
        {selectedFeedback && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <img
                src={teachers.find(t => t.id === selectedFeedback.teacherId)?.avatar || `https://picsum.photos/seed/${selectedFeedback.teacherId}/100/100`}
                alt=""
                className="w-12 h-12 rounded-full"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="font-bold text-gray-900">
                  {teachers.find(t => t.id === selectedFeedback.teacherId)?.name}
                </p>
                <p className="text-sm text-gray-500">
                  {format(parseISO(selectedFeedback.date), lang === 'zh' ? 'yyyy年M月d日' : 'MMM d, yyyy')}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < selectedFeedback.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
            </div>

            {selectedFeedback.skillRatings && (
              <div className="bg-indigo-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <h4 className="text-sm font-medium text-indigo-900">
                    {lang === 'zh' ? '本次技能评分' : 'Skill Ratings'}
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(SKILL_LABELS) as (keyof SkillRatings)[]).map(skill => (
                    <div key={skill} className="flex items-center justify-between bg-white rounded-lg p-2">
                      <span className="text-xs text-gray-600">{SKILL_LABELS[skill][lang]}</span>
                      {renderSkillRating(selectedFeedback.skillRatings![skill])}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">
                {lang === 'zh' ? '课堂表现' : 'Performance'}
              </h4>
              <p className="text-gray-700 leading-relaxed">{selectedFeedback.content}</p>
            </div>

            {selectedFeedback.homework && (
              <div className="bg-emerald-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-emerald-800 mb-2">
                  {lang === 'zh' ? '课后作业' : 'Homework'}
                </h4>
                <p className="text-sm text-emerald-700">{selectedFeedback.homework}</p>
              </div>
            )}

            {isParent && (
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 text-center">
                  {lang === 'zh' ? '技能评分将累计计入学习轨迹' : 'Skill ratings will accumulate into learning progress'}
                </p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
