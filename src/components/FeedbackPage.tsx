import React, { useState, useEffect, useMemo } from 'react';
import { MessageSquare, Star, Send, Clock, User, BookOpen, ThumbsUp, Award, Sparkles, Heart, Calendar, ChevronRight, Search, TrendingUp, Smile, Frown, Meh } from 'lucide-react';
import { Language, Feedback } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useTeachers, useCourses, useFeedbacks } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './Toast';
import { format, parseISO, isToday, isThisWeek, isThisMonth, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import BottomSheet from './BottomSheet';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DisplayFeedback extends Feedback {
  studentName: string;
  teacherName: string;
  comment: string;
}

const COLORS = ['#95E1A3', '#4ECDC4', '#FFE66D', '#FF6B6B'];

export default function FeedbackPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { courses } = useCourses();
  const { feedbacks: rawFeedbacks, loading } = useFeedbacks();
  const { showToast } = useToast();
  const { user } = useAuth();

  const isParent = user?.role === 'parent';
  const [selectedFeedback, setSelectedFeedback] = useState<DisplayFeedback | null>(null);
  const [filter, setFilter] = useState<'all' | 'excellent' | 'good' | 'needsWork'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const feedbacks = useMemo<DisplayFeedback[]>(() => {
    const studentNameMap = new Map(students.map((s) => [s.id, s.name]));
    const teacherNameMap = new Map(teachers.map((t) => [t.id, t.name]));
    const parentStudentIds = isParent ? new Set(students.filter((s) => s.userId === user?.id).map((s) => s.id)) : null;
    return rawFeedbacks
      .filter((f) => !isParent || parentStudentIds?.has(f.studentId))
      .map((f) => ({
        ...f,
        studentName: studentNameMap.get(f.studentId) || '',
        teacherName: teacherNameMap.get(f.teacherId) || '',
        comment: f.content,
      }));
  }, [rawFeedbacks, students, teachers, isParent, user?.id]);

  const filteredFeedbacks = useMemo(() => {
    let result = feedbacks;

    if (filter === 'excellent') {
      result = result.filter(f => f.rating === 5);
    } else if (filter === 'good') {
      result = result.filter(f => f.rating === 4);
    } else if (filter === 'needsWork') {
      result = result.filter(f => f.rating <= 3);
    }

    if (searchQuery) {
      result = result.filter(f => 
        f.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.comment.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [feedbacks, filter, searchQuery]);

  const stats = useMemo(() => ({
    total: feedbacks.length,
    excellent: feedbacks.filter(f => f.rating === 5).length,
    good: feedbacks.filter(f => f.rating === 4).length,
    needsWork: feedbacks.filter(f => f.rating <= 3).length,
    averageRating: feedbacks.length > 0 
      ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)
      : '0',
    thisMonth: feedbacks.filter(f => isThisMonth(parseISO(f.date))).length
  }), [feedbacks]);

  const ratingDistribution = useMemo(() => [
    { name: lang === 'zh' ? '优秀' : 'Excellent', value: stats.excellent, color: '#95E1A3' },
    { name: lang === 'zh' ? '良好' : 'Good', value: stats.good, color: '#4ECDC4' },
    { name: lang === 'zh' ? '一般' : 'Average', value: feedbacks.filter(f => f.rating === 3).length, color: '#FFE66D' },
    { name: lang === 'zh' ? '需努力' : 'Needs Work', value: feedbacks.filter(f => f.rating <= 2).length, color: '#FF6B6B' },
  ], [stats, feedbacks, lang]);

  const weeklyTrend = useMemo(() => {
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dayFeedbacks = feedbacks.filter(f => 
        format(parseISO(f.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      days.push({
        name: format(date, lang === 'zh' ? 'E' : 'EEE', { locale: lang === 'zh' ? zhCN : undefined }),
        count: dayFeedbacks.length,
        avgRating: dayFeedbacks.length > 0 
          ? dayFeedbacks.reduce((sum, f) => sum + f.rating, 0) / dayFeedbacks.length 
          : 0
      });
    }
    return days;
  }, [feedbacks, lang]);

  const getRatingConfig = (rating: number) => {
    if (rating >= 5) {
      return {
        label: lang === 'zh' ? '优秀' : 'Excellent',
        emoji: '🌟',
        color: 'from-[#95E1A3] to-[#7DD389]',
        bgColor: 'bg-[#95E1A3]/10',
        borderColor: 'border-[#95E1A3]/30',
        textColor: 'text-[#4ECDC4]',
        icon: Star
      };
    } else if (rating >= 4) {
      return {
        label: lang === 'zh' ? '良好' : 'Good',
        emoji: '😊',
        color: 'from-[#4ECDC4] to-[#7EDDD6]',
        bgColor: 'bg-[#4ECDC4]/10',
        borderColor: 'border-[#4ECDC4]/30',
        textColor: 'text-[#4ECDC4]',
        icon: Smile
      };
    } else if (rating >= 3) {
      return {
        label: lang === 'zh' ? '一般' : 'Average',
        emoji: '😐',
        color: 'from-[#FFE66D] to-[#FFB347]',
        bgColor: 'bg-[#FFE66D]/10',
        borderColor: 'border-[#FFE66D]/30',
        textColor: 'text-amber-600',
        icon: Meh
      };
    } else {
      return {
        label: lang === 'zh' ? '需努力' : 'Needs Work',
        emoji: '💪',
        color: 'from-[#FF6B6B] to-[#FF8E8E]',
        bgColor: 'bg-[#FF6B6B]/10',
        borderColor: 'border-[#FF6B6B]/30',
        textColor: 'text-[#FF6B6B]',
        icon: Frown
      };
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return { text: lang === 'zh' ? '今天' : 'Today', isToday: true };
    } else if (isThisWeek(date)) {
      return { text: format(date, lang === 'zh' ? 'EEEE' : 'EEEE', { locale: lang === 'zh' ? zhCN : undefined }), isToday: false };
    } else {
      return { text: format(date, lang === 'zh' ? 'M月d日' : 'MMM d'), isToday: false };
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#A29BFE]/20 via-[#FD79A8]/20 to-[#FFE66D]/20 rounded-3xl" />
        <div className="relative p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#A29BFE] to-[#FD79A8] flex items-center justify-center shadow-lg shadow-[#A29BFE]/30">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#A29BFE] to-[#FD79A8] bg-clip-text text-transparent">
                {lang === 'zh' ? '学习反馈' : 'Learning Feedback'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {lang === 'zh' ? '查看孩子的学习表现和进步' : 'Track your child\'s learning progress'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#A29BFE]/10 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold bg-gradient-to-r from-[#A29BFE] to-[#B8B3FF] bg-clip-text text-transparent">
                {stats.total}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A29BFE] to-[#B8B3FF] flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '总反馈数' : 'Total Feedback'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#FFE66D]/10 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold text-amber-500">
                {stats.averageRating}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFE66D] to-[#FFB347] flex items-center justify-center">
                <Star className="w-5 h-5 text-white fill-white" />
              </div>
            </div>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '平均评分' : 'Avg Rating'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#95E1A3]/10 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold text-[#4ECDC4]">
                {stats.excellent}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#95E1A3] to-[#7DD389] flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '优秀评价' : 'Excellent'}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#FD79A8]/10 to-transparent rounded-bl-full" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-bold text-[#FD79A8]">
                {stats.thisMonth}
              </span>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FD79A8] to-[#FFB8D0] flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '本月反馈' : 'This Month'}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#4ECDC4]" />
            {lang === 'zh' ? '近7天反馈趋势' : 'Weekly Trend'}
          </h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A29BFE" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#A29BFE" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px'
                  }}
                />
                <Area type="monotone" dataKey="count" stroke="#A29BFE" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-[#FFE66D]" />
            {lang === 'zh' ? '评分分布' : 'Rating Distribution'}
          </h3>
          <div className="flex items-center gap-6">
            <div className="h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ratingDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ratingDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {ratingDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 bg-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#A29BFE]/20 hover:border-gray-200 transition-all"
            placeholder={lang === 'zh' ? '搜索反馈内容...' : 'Search feedback...'}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {[
            { id: 'all', label: lang === 'zh' ? '全部' : 'All', emoji: '📋' },
            { id: 'excellent', label: lang === 'zh' ? '优秀' : 'Excellent', emoji: '🌟' },
            { id: 'good', label: lang === 'zh' ? '良好' : 'Good', emoji: '😊' },
            { id: 'needsWork', label: lang === 'zh' ? '需努力' : 'Needs Work', emoji: '💪' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                filter === f.id
                  ? 'bg-gradient-to-r from-[#A29BFE] to-[#FD79A8] text-white shadow-lg shadow-[#A29BFE]/30'
                  : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-200'
              }`}
            >
              <span>{f.emoji}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
            {lang === 'zh' ? '反馈加载中...' : 'Loading feedback...'}
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#A29BFE]/10 to-[#FD79A8]/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-12 h-12 text-[#A29BFE]" />
            </div>
            <p className="text-gray-500 font-medium text-lg">{lang === 'zh' ? '暂无反馈' : 'No feedback'}</p>
            <p className="text-sm text-gray-400 mt-2">{lang === 'zh' ? '老师还没有发布反馈哦' : 'No feedback has been posted yet'}</p>
          </div>
        ) : (
          filteredFeedbacks.map((feedback, index) => {
            const ratingConfig = getRatingConfig(feedback.rating);
            const dateInfo = getDateLabel(feedback.date);
            const RatingIcon = ratingConfig.icon;
            
            return (
              <div
                key={feedback.id}
                onClick={() => setSelectedFeedback(feedback)}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-lg transition-all active:scale-[0.99]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Rating Header */}
                <div className={`bg-gradient-to-r ${ratingConfig.color} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-2xl">{ratingConfig.emoji}</span>
                      </div>
                      <div>
                        <p className="text-white font-bold text-lg">{ratingConfig.label}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < feedback.rating ? 'text-white fill-white' : 'text-white/30'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white/80 text-sm">{dateInfo.text}</p>
                      <p className="text-white/60 text-xs mt-1">{feedback.teacherName}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <p className="text-gray-700 leading-relaxed line-clamp-3">{feedback.comment}</p>
                  
                  {feedback.homework && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-[#95E1A3]/5 to-[#7DD389]/5 rounded-2xl border border-[#95E1A3]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-[#4ECDC4]" />
                        <span className="text-sm font-medium text-[#4ECDC4]">
                          {lang === 'zh' ? '课后作业' : 'Homework'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{feedback.homework}</p>
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      <span>{feedback.studentName}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      <BottomSheet
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        title={lang === 'zh' ? '反馈详情' : 'Feedback Details'}
      >
        {selectedFeedback && (
          <div className="p-5 space-y-5">
            {/* Rating Header */}
            {(() => {
              const config = getRatingConfig(selectedFeedback.rating);
              return (
                <div className={`bg-gradient-to-r ${config.color} rounded-2xl p-5 text-center`}>
                  <span className="text-5xl mb-2 block">{config.emoji}</span>
                  <p className="text-white font-bold text-xl">{config.label}</p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-6 h-6 ${i < selectedFeedback.rating ? 'text-white fill-white' : 'text-white/30'}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-[#A29BFE]/5 to-[#B8B3FF]/5 rounded-2xl p-4 border border-[#A29BFE]/10">
                <p className="text-xs text-gray-500 mb-1">{lang === 'zh' ? '学员' : 'Student'}</p>
                <p className="font-semibold text-gray-900">{selectedFeedback.studentName}</p>
              </div>
              <div className="bg-gradient-to-br from-[#4ECDC4]/5 to-[#7EDDD6]/5 rounded-2xl p-4 border border-[#4ECDC4]/10">
                <p className="text-xs text-gray-500 mb-1">{lang === 'zh' ? '教师' : 'Teacher'}</p>
                <p className="font-semibold text-gray-900">{selectedFeedback.teacherName}</p>
              </div>
            </div>

            {/* Comment */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#A29BFE]" />
                {lang === 'zh' ? '学习表现' : 'Performance'}
              </h4>
              <p className="text-gray-700 leading-relaxed">{selectedFeedback.comment}</p>
            </div>

            {/* Homework */}
            {selectedFeedback.homework && (
              <div className="bg-gradient-to-br from-[#95E1A3]/5 to-[#7DD389]/5 rounded-2xl p-5 border border-[#95E1A3]/10">
                <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#4ECDC4]" />
                  {lang === 'zh' ? '课后作业' : 'Homework'}
                </h4>
                <p className="text-gray-700">{selectedFeedback.homework}</p>
              </div>
            )}

            {/* Date */}
            <div className="text-center text-sm text-gray-500 pt-2">
              <Clock className="w-4 h-4 inline mr-1" />
              {format(parseISO(selectedFeedback.date), lang === 'zh' ? 'yyyy年M月d日 HH:mm' : 'MMM d, yyyy HH:mm')}
            </div>

            <div className="flex gap-3 pt-2 pb-20 md:pb-2">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#A29BFE] to-[#FD79A8] text-white font-medium hover:shadow-lg transition-all"
              >
                {lang === 'zh' ? '知道了' : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
