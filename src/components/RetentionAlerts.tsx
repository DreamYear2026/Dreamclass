import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, TrendingDown, Clock, Users, DollarSign, Loader2, Bell, Check, X, ChevronRight, Sparkles, Target, Zap } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useCourses, useTeachers } from '../contexts/AppContext';
import { useToast } from './Toast';
import { format, parseISO, subDays, subWeeks, differenceInDays, isAfter, isBefore, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface StudentRisk {
  id: string;
  name: string;
  remainingHours: number;
  riskLevel: 'high' | 'medium' | 'low';
  riskScore: number;
  factors: string[];
  lastClassDays: number;
  avgClassesPerWeek: number;
  predictedChurnDate: string | null;
  suggestedAction: string;
  estimatedValue: number;
}

export default function RetentionAlerts({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading } = useStudents();
  const { courses, loading: coursesLoading } = useCourses();
  const { teachers } = useTeachers();
  const { showToast } = useToast();

  const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedStudent, setSelectedStudent] = useState<StudentRisk | null>(null);

  const loading = studentsLoading || coursesLoading;

  const studentRisks = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    
    return students.map(student => {
      const studentCourses = courses.filter(c => c.studentId === student.id);
      const recentCourses = studentCourses.filter(c => 
        isAfter(parseISO(c.date), thirtyDaysAgo) && c.status === 'completed'
      );
      
      const lastCourse = studentCourses
        .filter(c => c.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const lastClassDays = lastCourse 
        ? differenceInDays(today, parseISO(lastCourse.date))
        : 999;
      
      const avgClassesPerWeek = recentCourses.length / 4;
      
      const factors: string[] = [];
      let riskScore = 0;
      
      if (student.remainingHours <= 0) {
        factors.push(lang === 'zh' ? '课时已耗尽' : 'No remaining hours');
        riskScore += 40;
      } else if (student.remainingHours <= 2) {
        factors.push(lang === 'zh' ? `仅剩 ${student.remainingHours} 课时` : `Only ${student.remainingHours} hours left`);
        riskScore += 25;
      } else if (student.remainingHours <= 5) {
        factors.push(lang === 'zh' ? `剩余 ${student.remainingHours} 课时` : `${student.remainingHours} hours remaining`);
        riskScore += 10;
      }
      
      if (lastClassDays > 21) {
        factors.push(lang === 'zh' ? `已 ${lastClassDays} 天未上课` : `No class for ${lastClassDays} days`);
        riskScore += 30;
      } else if (lastClassDays > 14) {
        factors.push(lang === 'zh' ? `${lastClassDays} 天未上课` : `${lastClassDays} days since last class`);
        riskScore += 20;
      } else if (lastClassDays > 7) {
        factors.push(lang === 'zh' ? '一周未上课' : 'No class this week');
        riskScore += 10;
      }
      
      if (avgClassesPerWeek < 0.5 && student.remainingHours > 0) {
        factors.push(lang === 'zh' ? '上课频率过低' : 'Low attendance frequency');
        riskScore += 15;
      }
      
      const cancelledCourses = studentCourses.filter(c => 
        c.status === 'cancelled' && isAfter(parseISO(c.date), subWeeks(today, 4))
      );
      if (cancelledCourses.length >= 2) {
        factors.push(lang === 'zh' ? '近期多次取消课程' : 'Multiple recent cancellations');
        riskScore += 20;
      }
      
      let riskLevel: 'high' | 'medium' | 'low';
      if (riskScore >= 50) {
        riskLevel = 'high';
      } else if (riskScore >= 25) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }
      
      let suggestedAction = '';
      if (riskLevel === 'high') {
        if (student.remainingHours <= 0) {
          suggestedAction = lang === 'zh' ? '立即联系家长推荐续费套餐' : 'Contact parent for renewal immediately';
        } else {
          suggestedAction = lang === 'zh' ? '安排回访了解学员情况' : 'Schedule follow-up to understand situation';
        }
      } else if (riskLevel === 'medium') {
        suggestedAction = lang === 'zh' ? '发送课时提醒和优惠信息' : 'Send hours reminder with promotion';
      } else {
        suggestedAction = lang === 'zh' ? '保持正常沟通' : 'Maintain regular communication';
      }
      
      const predictedChurnDate = riskScore >= 40 && student.remainingHours > 0
        ? format(subDays(today, -Math.floor(student.remainingHours / Math.max(avgClassesPerWeek, 0.5) * 7)), 'yyyy-MM-dd')
        : null;
      
      const estimatedValue = student.remainingHours * 150;
      
      return {
        id: student.id,
        name: student.name,
        remainingHours: student.remainingHours,
        riskLevel,
        riskScore: Math.min(riskScore, 100),
        factors,
        lastClassDays,
        avgClassesPerWeek: Math.round(avgClassesPerWeek * 10) / 10,
        predictedChurnDate,
        suggestedAction,
        estimatedValue,
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }, [students, courses, lang]);

  const filteredRisks = useMemo(() => {
    if (activeFilter === 'all') return studentRisks;
    return studentRisks.filter(s => s.riskLevel === activeFilter);
  }, [studentRisks, activeFilter]);

  const stats = useMemo(() => {
    const high = studentRisks.filter(s => s.riskLevel === 'high');
    const medium = studentRisks.filter(s => s.riskLevel === 'medium');
    const low = studentRisks.filter(s => s.riskLevel === 'low');
    
    const totalAtRisk = high.length + medium.length;
    const potentialLoss = [...high, ...medium].reduce((sum, s) => sum + s.estimatedValue, 0);
    
    return {
      total: students.length,
      high: high.length,
      medium: medium.length,
      low: low.length,
      totalAtRisk,
      potentialLoss,
    };
  }, [studentRisks, students.length]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            {lang === 'zh' ? '智能续费预警' : 'Smart Retention Alerts'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? 'AI 分析学员流失风险，提前预警' : 'AI-powered churn prediction and alerts'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">{lang === 'zh' ? '高风险' : 'High Risk'}</p>
              <p className="text-3xl font-bold mt-1">{stats.high}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">{lang === 'zh' ? '中风险' : 'Medium Risk'}</p>
              <p className="text-3xl font-bold mt-1">{stats.medium}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">{lang === 'zh' ? '低风险' : 'Low Risk'}</p>
              <p className="text-3xl font-bold mt-1">{stats.low}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">{lang === 'zh' ? '潜在损失' : 'Potential Loss'}</p>
              <p className="text-2xl font-bold mt-1">¥{stats.potentialLoss.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '风险学员列表' : 'At-Risk Students'}
          </h2>
          <div className="flex gap-2">
            {(['all', 'high', 'medium', 'low'] as const).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeFilter === filter
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {filter === 'all' ? (lang === 'zh' ? '全部' : 'All') :
                 filter === 'high' ? (lang === 'zh' ? '高风险' : 'High') :
                 filter === 'medium' ? (lang === 'zh' ? '中风险' : 'Medium') :
                 (lang === 'zh' ? '低风险' : 'Low')}
              </button>
            ))}
          </div>
        </div>

        {filteredRisks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Check className="w-12 h-12 mx-auto mb-3 text-green-300" />
            <p>{lang === 'zh' ? '暂无风险学员' : 'No at-risk students'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRisks.map(student => (
              <div
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  student.riskLevel === 'high' 
                    ? 'border-red-200 bg-red-50 hover:border-red-300'
                    : student.riskLevel === 'medium'
                    ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                    : 'border-green-200 bg-green-50 hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      student.riskLevel === 'high' 
                        ? 'bg-red-200 text-red-700'
                        : student.riskLevel === 'medium'
                        ? 'bg-amber-200 text-amber-700'
                        : 'bg-green-200 text-green-700'
                    }`}>
                      {student.riskScore}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {student.remainingHours} {lang === 'zh' ? '课时' : 'hours'}
                        </span>
                        <span>
                          {student.lastClassDays === 999 
                            ? (lang === 'zh' ? '从未上课' : 'Never attended')
                            : `${student.lastClassDays} ${lang === 'zh' ? '天前' : 'days ago'}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                
                <div className="mt-3 flex flex-wrap gap-2">
                  {student.factors.map((factor, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        student.riskLevel === 'high'
                          ? 'bg-red-200 text-red-700'
                          : student.riskLevel === 'medium'
                          ? 'bg-amber-200 text-amber-700'
                          : 'bg-green-200 text-green-700'
                      }`}
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedStudent(null)} />
            
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{selectedStudent.name}</h3>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className={`p-4 rounded-xl mb-4 ${
                selectedStudent.riskLevel === 'high'
                  ? 'bg-red-50 border border-red-200'
                  : selectedStudent.riskLevel === 'medium'
                  ? 'bg-amber-50 border border-amber-200'
                  : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">{lang === 'zh' ? '风险评分' : 'Risk Score'}</span>
                  <span className={`text-2xl font-bold ${
                    selectedStudent.riskLevel === 'high'
                      ? 'text-red-600'
                      : selectedStudent.riskLevel === 'medium'
                      ? 'text-amber-600'
                      : 'text-green-600'
                  }`}>
                    {selectedStudent.riskScore}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedStudent.riskLevel === 'high'
                        ? 'bg-red-500'
                        : selectedStudent.riskLevel === 'medium'
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${selectedStudent.riskScore}%` }}
                  />
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{lang === 'zh' ? '剩余课时' : 'Remaining Hours'}</span>
                  <span className="font-medium text-gray-900">{selectedStudent.remainingHours}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{lang === 'zh' ? '上次上课' : 'Last Class'}</span>
                  <span className="font-medium text-gray-900">
                    {selectedStudent.lastClassDays === 999
                      ? (lang === 'zh' ? '从未' : 'Never')
                      : `${selectedStudent.lastClassDays} ${lang === 'zh' ? '天前' : 'days ago'}`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{lang === 'zh' ? '周均课时' : 'Avg/Week'}</span>
                  <span className="font-medium text-gray-900">{selectedStudent.avgClassesPerWeek}</span>
                </div>
                {selectedStudent.predictedChurnDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">{lang === 'zh' ? '预计流失日期' : 'Predicted Churn'}</span>
                    <span className="font-medium text-red-600">
                      {format(parseISO(selectedStudent.predictedChurnDate), 'M月d日')}
                    </span>
                  </div>
                )}
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-indigo-900">{lang === 'zh' ? '建议行动' : 'Suggested Action'}</p>
                    <p className="text-sm text-indigo-700 mt-1">{selectedStudent.suggestedAction}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    showToast(lang === 'zh' ? '已添加到跟进列表' : 'Added to follow-up list', 'success');
                    setSelectedStudent(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                  {lang === 'zh' ? '添加跟进' : 'Add Follow-up'}
                </button>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  {lang === 'zh' ? '关闭' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
