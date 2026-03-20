import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Award, AlertTriangle, Target, BarChart3, Users, DollarSign, Calendar, Star, Zap, BookOpen, User, Activity, TrendingDown, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { Language, Student, Course, Teacher, Payment, Feedback } from '../types';
import { useStudents, useCourses, useTeachers } from '../contexts/AppContext';
import { 
  generateStudentProfile, 
  predictRetention, 
  predictRevenue, 
  analyzeCourseHotspots,
  StudentProfile,
  RetentionPrediction,
  RevenuePrediction,
  CourseHotspot
} from '../utils/aiAnalytics';

interface StudentAnalyticsProps {
  lang: Language;
}

export default function StudentAnalytics({ lang }: StudentAnalyticsProps) {
  const { students } = useStudents();
  const { courses } = useCourses();
  const { teachers } = useTeachers();
  
  const [activeTab, setActiveTab] = useState<'profiles' | 'retention' | 'revenue' | 'courses'>('profiles');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [studentProfiles, setStudentProfiles] = useState<StudentProfile[]>([]);
  const [retentionPredictions, setRetentionPredictions] = useState<RetentionPrediction[]>([]);
  const [revenuePrediction, setRevenuePrediction] = useState<RevenuePrediction | null>(null);
  const [courseHotspots, setCourseHotspots] = useState<CourseHotspot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyzeData();
  }, [students, courses, teachers]);

  const analyzeData = () => {
    setLoading(true);
    
    const mockPayments: Payment[] = [];
    const mockFeedbacks: Feedback[] = [];
    
    const profiles = students.map(student => 
      generateStudentProfile(student, courses, mockFeedbacks, mockPayments)
    );
    setStudentProfiles(profiles);
    
    const retention = predictRetention(students, mockPayments, courses);
    setRetentionPredictions(retention);
    
    const revenue = predictRevenue(mockPayments);
    setRevenuePrediction(revenue);
    
    const hotspots = analyzeCourseHotspots(courses, teachers);
    setCourseHotspots(hotspots);
    
    setLoading(false);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUpIcon className="w-4 h-4 text-emerald-600" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving': return lang === 'zh' ? '进步中' : 'Improving';
      case 'declining': return lang === 'zh' ? '退步中' : 'Declining';
      default: return lang === 'zh' ? '稳定' : 'Stable';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">{lang === 'zh' ? 'AI分析中...' : 'AI Analyzing...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Brain className="w-7 h-7" />
            {lang === 'zh' ? 'AI智能分析' : 'AI Analytics'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '基于数据的智能洞察和预测' : 'Data-driven insights and predictions'}
          </p>
        </div>
        <button
          onClick={analyzeData}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
        >
          <Zap className="w-4 h-4" />
          {lang === 'zh' ? '重新分析' : 'Refresh Analysis'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'profiles', icon: <User className="w-4 h-4" />, label: lang === 'zh' ? '学员画像' : 'Student Profiles' },
          { id: 'retention', icon: <Target className="w-4 h-4" />, label: lang === 'zh' ? '续费预测' : 'Retention Prediction' },
          { id: 'revenue', icon: <DollarSign className="w-4 h-4" />, label: lang === 'zh' ? '营收预测' : 'Revenue Forecast' },
          { id: 'courses', icon: <BookOpen className="w-4 h-4" />, label: lang === 'zh' ? '课程热度' : 'Course Hotspots' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profiles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studentProfiles.map(profile => (
            <div
              key={profile.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition cursor-pointer"
              onClick={() => setSelectedStudent(profile.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {profile.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                    <p className="text-sm text-gray-500">{profile.level} · {profile.age}岁</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(profile.retentionRisk)}`}>
                  {profile.retentionRisk === 'high' ? (lang === 'zh' ? '高风险' : 'High Risk') :
                   profile.retentionRisk === 'medium' ? (lang === 'zh' ? '中风险' : 'Medium Risk') :
                   (lang === 'zh' ? '低风险' : 'Low Risk')}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    {lang === 'zh' ? '学习投入' : 'Engagement'}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{ width: `${profile.engagementScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{profile.engagementScore}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{lang === 'zh' ? '进度趋势' : 'Progress:'}</span>
                  <div className="flex items-center gap-1">
                    {getTrendIcon(profile.progressTrend)}
                    <span className="text-sm font-medium">{getTrendLabel(profile.progressTrend)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {lang === 'zh' ? '出勤率' : 'Attendance'}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {Math.round(profile.attendanceRate * 100)}%
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">{lang === 'zh' ? '优势' : 'Strengths'}</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.strengths.slice(0, 3).map((strength, i) => (
                      <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs">
                        {strength}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-2">{lang === 'zh' ? '推荐课程' : 'Recommended'}</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.recommendedCourses.slice(0, 2).map((course, i) => (
                      <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                        {course}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'retention' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-5 border border-red-100">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600">{lang === 'zh' ? '高风险学员' : 'High Risk'}</p>
                  <p className="text-2xl font-bold text-red-600">
                    {retentionPredictions.filter(p => p.riskLevel === 'high').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-5 border border-amber-100">
              <div className="flex items-center gap-3 mb-3">
                <Target className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="text-sm text-gray-600">{lang === 'zh' ? '中风险学员' : 'Medium Risk'}</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {retentionPredictions.filter(p => p.riskLevel === 'medium').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
              <div className="flex items-center gap-3 mb-3">
                <Star className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-600">{lang === 'zh' ? '低风险学员' : 'Low Risk'}</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {retentionPredictions.filter(p => p.riskLevel === 'low').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === 'zh' ? '学员' : 'Student'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === 'zh' ? '风险等级' : 'Risk'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === 'zh' ? '风险分数' : 'Score'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === 'zh' ? '影响因素' : 'Factors'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {lang === 'zh' ? '建议措施' : 'Actions'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {retentionPredictions.map((prediction) => {
                    const student = students.find(s => s.id === prediction.studentId);
                    return (
                      <tr key={prediction.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                              {student?.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{student?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(prediction.riskLevel)}`}>
                            {prediction.riskLevel === 'high' ? (lang === 'zh' ? '高' : 'High') :
                             prediction.riskLevel === 'medium' ? (lang === 'zh' ? '中' : 'Medium') :
                             (lang === 'zh' ? '低' : 'Low')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  prediction.riskScore >= 60 ? 'bg-red-500' :
                                  prediction.riskScore >= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${prediction.riskScore}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{prediction.riskScore}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {prediction.contributingFactors.slice(0, 2).map((factor, i) => (
                              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                                {factor}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {prediction.recommendedActions.slice(0, 2).map((action, i) => (
                              <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs">
                                {action}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenue' && revenuePrediction && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">
                  {lang === 'zh' ? '预测周期' : 'Forecast Period'}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  ¥{revenuePrediction.predictedRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 mt-2">{revenuePrediction.period}</p>
              </div>
              <div className="text-right">
                <div className={`flex items-center gap-1 text-lg font-bold ${
                  revenuePrediction.trend === 'increasing' ? 'text-emerald-600' :
                  revenuePrediction.trend === 'decreasing' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {revenuePrediction.trend === 'increasing' ? <TrendingUp className="w-5 h-5" /> :
                   revenuePrediction.trend === 'decreasing' ? <TrendingDown className="w-5 h-5" /> :
                   <Activity className="w-5 h-5" />}
                  {revenuePrediction.growthRate > 0 ? '+' : ''}{(revenuePrediction.growthRate * 100).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-500">
                  {revenuePrediction.trend === 'increasing' ? (lang === 'zh' ? '增长趋势' : 'Growing') :
                   revenuePrediction.trend === 'decreasing' ? (lang === 'zh' ? '下降趋势' : 'Declining') :
                   (lang === 'zh' ? '稳定' : 'Stable')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-blue-600" />
                <h4 className="font-medium text-gray-900">{lang === 'zh' ? '新学员收入' : 'New Students'}</h4>
              </div>
              <p className="text-2xl font-bold text-blue-600">¥{revenuePrediction.breakdown.newStudents.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-6 h-6 text-emerald-600" />
                <h4 className="font-medium text-gray-900">{lang === 'zh' ? '续费收入' : 'Renewals'}</h4>
              </div>
              <p className="text-2xl font-bold text-emerald-600">¥{revenuePrediction.breakdown.renewals.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                <h4 className="font-medium text-gray-900">{lang === 'zh' ? '增值服务' : 'Upsells'}</h4>
              </div>
              <p className="text-2xl font-bold text-purple-600">¥{revenuePrediction.breakdown.upsells.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {lang === 'zh' ? '季节性因素' : 'Seasonal Factors'}
            </h4>
            <div className="flex flex-wrap gap-2">
              {revenuePrediction.seasonalFactors.map((factor, i) => (
                <span key={i} className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm">
                  {factor}
                </span>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-3">
              {lang === 'zh' ? '预测置信度' : 'Confidence'}: {(revenuePrediction.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courseHotspots.map((hotspot, index) => (
              <div key={hotspot.courseId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {index === 0 && <Zap className="w-5 h-5 text-yellow-500" />}
                      <h3 className="font-semibold text-gray-900">{hotspot.courseName}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      hotspot.demandTrend === 'rising' ? 'bg-emerald-50 text-emerald-700' :
                      hotspot.demandTrend === 'falling' ? 'bg-red-50 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {hotspot.demandTrend === 'rising' ? <TrendingUpIcon className="w-3 h-3" /> :
                       hotspot.demandTrend === 'falling' ? <TrendingDown className="w-3 h-3" /> :
                       <Activity className="w-3 h-3" />}
                      {hotspot.demandTrend === 'rising' ? (lang === 'zh' ? '需求上升' : 'Rising') :
                       hotspot.demandTrend === 'falling' ? (lang === 'zh' ? '需求下降' : 'Falling') :
                       (lang === 'zh' ? '需求稳定' : 'Stable')}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {hotspot.hotScore}
                    </p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '热度' : 'Hot Score'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {lang === 'zh' ? '候补人数' : 'Waitlist'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{hotspot.waitlistCount}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Award className="w-4 h-4" />
                      {lang === 'zh' ? '完课率' : 'Completion'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{(hotspot.completionRate * 100).toFixed(0)}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      {lang === 'zh' ? '满意度' : 'Satisfaction'}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{hotspot.satisfactionScore}/100</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {lang === 'zh' ? '建议定价' : 'Optimal Price'}
                    </span>
                    <span className="text-sm font-medium text-emerald-600">¥{hotspot.optimalPricing}</span>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{lang === 'zh' ? '推荐容量' : 'Recommended Capacity'}</span>
                      <span className="text-sm font-medium text-gray-700">{hotspot.recommendedCapacity}人</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
