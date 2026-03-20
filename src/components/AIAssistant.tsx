import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Wand2, Users, TrendingUp, BookOpen, Award, MessageSquare, User, Target, Brain, Zap, Copy, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Attendance, Course, Feedback, Language, Lead, Payment, Student, Teacher } from '../types';
import { useTranslation } from '../i18n';
import { useToast } from './Toast';
import BottomSheet from './BottomSheet';
import AIService from '../services/aiService';
import { motion, AnimatePresence } from 'motion/react';
import { useAppData, useStudents, useTeachers } from '../contexts/AppContext';
import { apiRequest } from '../services/api';

const mockStudent: Student = {
  id: 'demo-student',
  name: '小明',
  age: 8,
  level: '初级',
  parentName: '王妈妈',
  parentPhone: '138-0000-0000',
  remainingHours: 12,
  notes: '学习钢琴3个月，对音乐很有兴趣',
  tags: ['钢琴', '儿童'],
  status: 'active'
};

const mockTeacher: Teacher = {
  id: 'demo-teacher',
  name: '张老师',
  phone: '139-0000-0000',
  email: 'teacher@dreamyear.com',
  specialization: '钢琴教育',
  status: 'active'
};

const mockLead: Lead = {
  id: 'demo-lead',
  name: '李小红',
  phone: '137-0000-0000',
  source: 'wechat',
  status: 'new',
  notes: '对小提琴课程感兴趣，孩子6岁',
  createdAt: new Date().toISOString(),
  age: 6,
  interests: ['小提琴', '音乐']
};

interface AIFeature {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

export default function AIAssistant({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { showToast } = useToast();
  const { courses, feedbacks, getAttendanceByStudent } = useAppData();
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiRequest<Lead[]>('/api/leads');
        setLeads(data);
      } catch {
        setLeads([]);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedStudentId && students.length) setSelectedStudentId(students[0].id);
  }, [students, selectedStudentId]);

  useEffect(() => {
    if (!selectedTeacherId && teachers.length) setSelectedTeacherId(teachers[0].id);
  }, [teachers, selectedTeacherId]);

  useEffect(() => {
    if (!selectedLeadId && leads.length) setSelectedLeadId(leads[0].id);
  }, [leads, selectedLeadId]);

  const selectedStudent = useMemo(() => {
    return students.find((s) => s.id === selectedStudentId) || students[0] || mockStudent;
  }, [students, selectedStudentId]);

  const selectedTeacher = useMemo(() => {
    return teachers.find((tch) => tch.id === selectedTeacherId) || teachers[0] || mockTeacher;
  }, [teachers, selectedTeacherId]);

  const selectedLead = useMemo(() => {
    return leads.find((l) => l.id === selectedLeadId) || leads[0] || mockLead;
  }, [leads, selectedLeadId]);

  const features: AIFeature[] = [
    {
      id: 'course-recommendation',
      icon: <BookOpen className="w-6 h-6" />,
      title: lang === 'zh' ? '课程推荐' : 'Course Recommendation',
      description: lang === 'zh' ? 'AI智能推荐最适合的课程' : 'AI recommends the best courses',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'feedback-template',
      icon: <MessageSquare className="w-6 h-6" />,
      title: lang === 'zh' ? '课堂点评助手' : 'Feedback Assistant',
      description: lang === 'zh' ? '一键生成专业课堂反馈' : 'Generate professional feedback',
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'marketing-script',
      icon: <Target className="w-6 h-6" />,
      title: lang === 'zh' ? '招生话术生成' : 'Marketing Scripts',
      description: lang === 'zh' ? '智能生成沟通话术' : 'Generate communication scripts',
      color: 'from-orange-500 to-red-500'
    },
    {
      id: 'learning-path',
      icon: <TrendingUp className="w-6 h-6" />,
      title: lang === 'zh' ? '学习路径规划' : 'Learning Path',
      description: lang === 'zh' ? '制定个性化学习计划' : 'Create personalized learning plans',
      color: 'from-green-500 to-teal-500'
    },
    {
      id: 'lesson-plan',
      icon: <Award className="w-6 h-6" />,
      title: lang === 'zh' ? '教案助手' : 'Lesson Planner',
      description: lang === 'zh' ? 'AI辅助备课建议' : 'AI-assisted lesson planning',
      color: 'from-amber-500 to-yellow-500'
    },
    {
      id: 'retention-prediction',
      icon: <Brain className="w-6 h-6" />,
      title: lang === 'zh' ? '续费预测' : 'Retention Prediction',
      description: lang === 'zh' ? '智能预测续费风险' : 'Predict renewal risk',
      color: 'from-indigo-500 to-purple-500'
    }
  ];

  const selectorNeeds = useMemo(() => {
    if (!activeFeature) return { student: true, teacher: true, lead: true, window: true };
    if (activeFeature === 'marketing-script') return { student: false, teacher: false, lead: true, window: true };
    if (activeFeature === 'lesson-plan') return { student: true, teacher: true, lead: false, window: true };
    if (activeFeature === 'feedback-template') return { student: true, teacher: false, lead: false, window: false };
    return { student: true, teacher: false, lead: false, window: true };
  }, [activeFeature]);

  const generate = async (featureId: string) => {
    setLoading(true);
    setResult(null);

    try {
      const studentCourses: Course[] = courses.filter((c) => c.studentId === selectedStudent.id);
      const studentFeedbacks: Feedback[] = feedbacks.filter((f) => f.studentId === selectedStudent.id);
      const attendance: Attendance[] = await getAttendanceByStudent(selectedStudent.id).catch(() => []);
      const payments: Payment[] = await apiRequest<Payment[]>(`/api/payments?studentId=${encodeURIComponent(selectedStudent.id)}`).catch(() => []);

      const studentContext = { courses: studentCourses, feedbacks: studentFeedbacks, attendance, payments };

      switch (featureId) {
        case 'course-recommendation':
          setResult(await AIService.generateCourseRecommendation(selectedStudent, studentContext, { windowDays }));
          break;
        case 'feedback-template':
          setResult(await AIService.generateFeedbackTemplate(selectedStudent, {
            pitch: 4,
            rhythm: 3,
            technique: 4,
            expression: 3,
            theory: 5
          }));
          break;
        case 'marketing-script': {
          const followUps = await apiRequest<any[]>(`/api/leads/${encodeURIComponent(selectedLead.id)}/follow-ups`).catch(() => []);
          const now = Date.now();
          const within = (d: string) => {
            const t = new Date(d).getTime();
            return !Number.isNaN(t) && now - t <= windowDays * 86400000;
          };
          const scoped = followUps.filter((f) => f?.createdAt && within(f.createdAt));
          setResult(await AIService.generateMarketingScript(selectedLead, { followUps: scoped }));
          break;
        }
        case 'learning-path':
          setResult(await AIService.generateLearningPath(selectedStudent, studentContext, { windowDays }));
          break;
        case 'lesson-plan':
          setResult(await AIService.generateLessonPlan(selectedTeacher, selectedStudent, studentContext, { windowDays }));
          break;
        case 'retention-prediction':
          setResult(await AIService.predictRetentionRisk(selectedStudent, studentContext, { windowDays }));
          break;
      }

      showToast(lang === 'zh' ? 'AI生成完成！' : 'AI generation complete!', 'success');
    } catch (error) {
      showToast(lang === 'zh' ? '生成失败，请重试' : 'Generation failed, please retry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureClick = (featureId: string) => {
    setActiveFeature(featureId);
    setShowResult(true);
    generate(featureId);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(lang === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard', 'success');
  };

  const renderResult = () => {
    if (!result) return null;

    switch (activeFeature) {
      case 'course-recommendation':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              {lang === 'zh' ? '推荐课程' : 'Recommended Courses'}
            </h3>
            {result.metrics && (
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">{lang === 'zh' ? '数据概览' : 'Data Summary'}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">{lang === 'zh' ? '最近上课' : 'Last class'}</span>
                    <span className="font-medium">{result.metrics.lastCourseDate || (lang === 'zh' ? '无' : 'N/A')}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">
                      {lang === 'zh' ? `出勤(${result.metrics.windowDays || 30}天)` : `Attendance(${result.metrics.windowDays || 30}d)`}
                    </span>
                    <span className="font-medium">
                      {result.metrics.attendanceRateWindow === null || result.metrics.attendanceRateWindow === undefined
                        ? (lang === 'zh' ? '无' : 'N/A')
                        : `${Math.round(result.metrics.attendanceRateWindow * 100)}%`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">{lang === 'zh' ? '满意度均分' : 'Avg rating'}</span>
                    <span className="font-medium">
                      {result.metrics.avgFeedbackRating === null || result.metrics.avgFeedbackRating === undefined
                        ? (lang === 'zh' ? '无' : 'N/A')
                        : `${Number(result.metrics.avgFeedbackRating).toFixed(1)}/5`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">{lang === 'zh' ? '最近缴费' : 'Last payment'}</span>
                    <span className="font-medium">{result.metrics.lastPaymentDate || (lang === 'zh' ? '无' : 'N/A')}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {result.recommendations?.map((rec: any, i: number) => (
                <div key={i} className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{rec.course}</h4>
                    <div className="flex items-center gap-2">
                      {typeof rec.fitScore === 'number' && (
                        <span className="text-xs px-2 py-1 bg-white/70 text-gray-700 rounded-full border border-blue-200">
                          {lang === 'zh' ? '匹配度' : 'Fit'} {Math.round(rec.fitScore)}%
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 bg-blue-200 text-blue-700 rounded-full">{rec.difficulty}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{rec.reason}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-semibold text-gray-900 mb-2">{lang === 'zh' ? '学习建议' : 'Suggestions'}</h4>
              <ul className="space-y-1">
                {result.suggestions?.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            {result.progress && (
              <div className="p-4 bg-gradient-to-r from-green-50 to-teal-50 rounded-xl border border-green-200">
                <p className="text-sm text-green-700 font-medium">{result.progress}</p>
              </div>
            )}
          </div>
        );

      case 'feedback-template':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-purple-500" />
                {lang === 'zh' ? '课堂反馈' : 'Feedback'}
              </h3>
              <button
                onClick={() => handleCopy(result)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition"
              >
                <Copy className="w-4 h-4" />
                {lang === 'zh' ? '复制' : 'Copy'}
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl whitespace-pre-wrap text-sm text-gray-700">
              {result}
            </div>
          </div>
        );

      case 'marketing-script':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-orange-500" />
                {lang === 'zh' ? '招生话术' : 'Marketing Scripts'}
              </h3>
              <button
                onClick={() => handleCopy(result)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition"
              >
                <Copy className="w-4 h-4" />
                {lang === 'zh' ? '复制' : 'Copy'}
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl whitespace-pre-wrap text-sm text-gray-700">
              {result}
            </div>
          </div>
        );

      case 'learning-path':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              {lang === 'zh' ? '6个月学习路径' : '6-Month Learning Path'}
            </h3>
            {result.metrics && (
              <div className="p-4 bg-white rounded-xl border border-gray-200 text-sm text-gray-700">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">{lang === 'zh' ? '最近上课' : 'Last class'}</span>
                    <span className="font-medium">{result.metrics.lastCourseDate || (lang === 'zh' ? '无' : 'N/A')}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">
                      {lang === 'zh' ? `出勤(${result.metrics.windowDays || 30}天)` : `Attendance(${result.metrics.windowDays || 30}d)`}
                    </span>
                    <span className="font-medium">
                      {result.metrics.attendanceRateWindow === null || result.metrics.attendanceRateWindow === undefined
                        ? (lang === 'zh' ? '无' : 'N/A')
                        : `${Math.round(result.metrics.attendanceRateWindow * 100)}%`}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {[
                { key: 'months1_2', label: lang === 'zh' ? '第1-2个月' : 'Months 1-2', color: 'from-blue-500 to-cyan-500' },
                { key: 'months3_4', label: lang === 'zh' ? '第3-4个月' : 'Months 3-4', color: 'from-purple-500 to-pink-500' },
                { key: 'months5_6', label: lang === 'zh' ? '第5-6个月' : 'Months 5-6', color: 'from-green-500 to-teal-500' }
              ].map((phase, i) => {
                const data = result[phase.key];
                if (!data) return null;
                return (
                  <div key={i} className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${phase.color} flex items-center justify-center text-white font-bold text-sm`}>
                        {i + 1}
                      </div>
                      <h4 className="font-semibold text-gray-900">{phase.label}</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium text-gray-700">{lang === 'zh' ? '目标' : 'Goal'}:</span> {data.goal}</p>
                      <p><span className="font-medium text-gray-700">{lang === 'zh' ? '内容' : 'Content'}:</span> {data.content}</p>
                      <p><span className="font-medium text-gray-700">{lang === 'zh' ? '课时' : 'Hours'}:</span> {data.hours}</p>
                      <p><span className="font-medium text-green-600">{lang === 'zh' ? '里程碑' : 'Milestone'}:</span> {data.milestone}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'lesson-plan':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                {lang === 'zh' ? '教案建议' : 'Lesson Plan'}
              </h3>
              <button
                onClick={() => handleCopy(result)}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition"
              >
                <Copy className="w-4 h-4" />
                {lang === 'zh' ? '复制' : 'Copy'}
              </button>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl whitespace-pre-wrap text-sm text-gray-700">
              {result}
            </div>
          </div>
        );

      case 'retention-prediction':
        const riskColors = {
          high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🔴' },
          medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '🟠' },
          low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '🟢' }
        };
        const risk = riskColors[result.riskLevel as keyof typeof riskColors] || riskColors.low;
        
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-500" />
              {lang === 'zh' ? '续费风险分析' : 'Retention Risk Analysis'}
            </h3>
            
            <div className={`p-6 ${risk.bg} ${risk.border} border rounded-2xl text-center`}>
              <span className="text-4xl mb-2 block">{risk.icon}</span>
              <p className={`text-xl font-bold ${risk.text}`}>
                {result.riskLevel === 'high' ? (lang === 'zh' ? '高风险' : 'High Risk') :
                 result.riskLevel === 'medium' ? (lang === 'zh' ? '中风险' : 'Medium Risk') :
                 (lang === 'zh' ? '低风险' : 'Low Risk')}
              </p>
              {typeof result.totalScore === 'number' && (
                <p className="mt-2 text-sm text-gray-600">
                  {lang === 'zh' ? '综合风险分' : 'Risk score'}: <span className="font-semibold">{result.totalScore}</span>
                </p>
              )}
            </div>

            {Array.isArray(result.breakdown) && result.breakdown.length > 0 && (
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">{lang === 'zh' ? '评分依据' : 'Score Breakdown'}</h4>
                <div className="space-y-2">
                  {result.breakdown.map((b: any) => (
                    <div key={b.key} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{b.label}</p>
                        <p className="text-gray-500 break-words">{b.detail}</p>
                      </div>
                      <span className="shrink-0 px-2 py-1 rounded-lg bg-gray-100 text-gray-700 font-semibold">
                        {b.score}/{b.max}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="font-semibold text-gray-900 mb-2">{lang === 'zh' ? '风险原因' : 'Risk Reasons'}</h4>
              <ul className="space-y-1">
                {result.reasons?.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-green-50 rounded-xl border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">{lang === 'zh' ? '应对建议' : 'Suggestions'}</h4>
              <ul className="space-y-1">
                {result.suggestions?.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
              <h4 className="font-semibold text-indigo-800 mb-2">{lang === 'zh' ? '挽留方案' : 'Retention Plan'}</h4>
              <p className="text-sm text-indigo-700">{result.retentionPlan}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 md:p-8">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl -ml-24 -mb-24" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {lang === 'zh' ? 'AI智能助手' : 'AI Assistant'}
              </h1>
              <p className="text-white/80 mt-1">
                {lang === 'zh' ? '用AI赋能教育，提升效率10倍' : 'AI-powered education, 10x efficiency'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <motion.button
            key={feature.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleFeatureClick(feature.id)}
            className="p-6 bg-white rounded-2xl shadow-sm border border-gray-100 text-left hover:shadow-lg transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <div className="text-white">{feature.icon}</div>
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
            <p className="text-sm text-gray-500">{feature.description}</p>
          </motion.button>
        ))}
      </div>

      <BottomSheet
        isOpen={showResult}
        onClose={() => {
          setShowResult(false);
          setResult(null);
          setActiveFeature(null);
        }}
        title={
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            {lang === 'zh' ? 'AI生成结果' : 'AI Result'}
          </div>
        }
      >
        <div className="p-4">
          {activeFeature && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {selectorNeeds.student && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">{lang === 'zh' ? '学员' : 'Student'}</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                      {!students.length && <option value="">{lang === 'zh' ? '暂无学员' : 'No students'}</option>}
                    </select>
                  </div>
                )}

                {selectorNeeds.teacher && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">{lang === 'zh' ? '教师' : 'Teacher'}</label>
                    <select
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      {teachers.map((tch) => (
                        <option key={tch.id} value={tch.id}>
                          {tch.name}
                        </option>
                      ))}
                      {!teachers.length && <option value="">{lang === 'zh' ? '暂无教师' : 'No teachers'}</option>}
                    </select>
                  </div>
                )}

                {selectorNeeds.lead && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">{lang === 'zh' ? '线索' : 'Lead'}</label>
                    <select
                      value={selectedLeadId}
                      onChange={(e) => setSelectedLeadId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}（{l.status}）
                        </option>
                      ))}
                      {!leads.length && <option value="">{lang === 'zh' ? '无权限或暂无线索' : 'No leads or no permission'}</option>}
                    </select>
                  </div>
                )}

                {selectorNeeds.window && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-600">{lang === 'zh' ? '时间窗口' : 'Window'}</label>
                    <select
                      value={windowDays}
                      onChange={(e) => setWindowDays(Number(e.target.value) as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                      <option value={30}>{lang === 'zh' ? '近30天' : 'Last 30d'}</option>
                      <option value={60}>{lang === 'zh' ? '近60天' : 'Last 60d'}</option>
                      <option value={90}>{lang === 'zh' ? '近90天' : 'Last 90d'}</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => generate(activeFeature)}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white disabled:opacity-60"
                >
                  {lang === 'zh' ? '重新生成' : 'Regenerate'}
                </button>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center"
              >
                <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">{lang === 'zh' ? 'AI正在思考中...' : 'AI is thinking...'}</p>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {renderResult()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </BottomSheet>
    </div>
  );
}
