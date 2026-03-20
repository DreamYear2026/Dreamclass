import React, { useState, useMemo } from 'react';
import {
  Award,
  TrendingUp,
  Calendar,
  Star,
  BookOpen,
  Target,
  Trophy,
  Medal,
  Heart,
  Camera,
  FileText,
  Download,
  ChevronRight
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useStudents, useCourses, useFeedbacks } from '../contexts/AppContext';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, isWithinInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, AreaChart, Area } from 'recharts';
import { exportToExcel } from '../utils/export';

interface GrowthMilestone {
  id: string;
  date: string;
  type: 'level' | 'award' | 'skill' | 'activity';
  title: string;
  description: string;
  icon: string;
}

interface LearningRecord {
  month: string;
  courses: number;
  hours: number;
  rating: number;
  progress: number;
}

export default function StudentGrowthProfile({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { students } = useStudents();
  const { courses } = useCourses();
  const { feedbacks } = useFeedbacks();

  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'records'>('overview');

  const student = useMemo(() => {
    if (!students.length) return undefined;
    if (!user) return undefined;
    return students.find((s) => s.userId === user.id);
  }, [students, user]);

  const studentCourses = useMemo(() => {
    if (!student) return [];
    return courses.filter(c => c.studentId === student.id);
  }, [courses, student]);

  const studentFeedbacks = useMemo(() => {
    if (!student) return [];
    return feedbacks.filter(f => f.studentId === student.id);
  }, [feedbacks, student]);

  const growthData = useMemo(() => {
    const completedCourses = studentCourses.filter(c => c.status === 'completed');
    const avgRating = studentFeedbacks.length > 0
      ? studentFeedbacks.reduce((sum, f) => sum + f.rating, 0) / studentFeedbacks.length
      : 0;

    const totalHours = completedCourses.length;
    const daysSinceEnrollment = student?.enrollmentDate 
      ? differenceInDays(new Date(), parseISO(student.enrollmentDate))
      : 0;

    return {
      totalCourses: completedCourses.length,
      totalHours,
      avgRating,
      daysSinceEnrollment,
      currentLevel: student?.level || '初级',
      nextLevel: '中级',
      progressToNext: 65
    };
  }, [studentCourses, studentFeedbacks, student]);

  const milestones: GrowthMilestone[] = useMemo(() => {
    if (!student) return [];
    
    const ms: GrowthMilestone[] = [
      {
        id: '1',
        date: student.enrollmentDate || new Date().toISOString(),
        type: 'level',
        title: lang === 'zh' ? '入学' : 'Enrollment',
        description: lang === 'zh' ? `加入${student.name}大家庭` : `Joined ${student.name}'s learning journey`,
        icon: '🎉'
      },
      {
        id: '2',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'skill',
        title: lang === 'zh' ? '掌握基础技能' : 'Mastered Basic Skills',
        description: lang === 'zh' ? '完成基础课程学习' : 'Completed basic course learning',
        icon: '⭐'
      },
      {
        id: '3',
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'award',
        title: lang === 'zh' ? '获得"学习之星"称号' : 'Earned "Star Learner" Badge',
        description: lang === 'zh' ? '连续打卡30天' : '30-day learning streak',
        icon: '🏆'
      },
      {
        id: '4',
        date: new Date().toISOString(),
        type: 'level',
        title: lang === 'zh' ? '晋升中级' : 'Promoted to Intermediate',
        description: lang === 'zh' ? '技能水平达到中级标准' : 'Skills reached intermediate level',
        icon: '🎯'
      }
    ];

    return ms;
  }, [student, lang]);

  const learningRecords: LearningRecord[] = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthCourses = studentCourses.filter(c => {
        const courseDate = parseISO(c.date);
        return isWithinInterval(courseDate, { start: monthStart, end: monthEnd }) && c.status === 'completed';
      });

      const monthFeedbacks = studentFeedbacks.filter(f => {
        const feedbackDate = parseISO(f.date);
        return isWithinInterval(feedbackDate, { start: monthStart, end: monthEnd });
      });

      const avgRating = monthFeedbacks.length > 0
        ? monthFeedbacks.reduce((sum, f) => sum + f.rating, 0) / monthFeedbacks.length
        : 0;

      return {
        month: format(month, lang === 'zh' ? 'M月' : 'MMM'),
        courses: monthCourses.length,
        hours: monthCourses.length,
        rating: Number(avgRating.toFixed(1)),
        progress: Math.floor(Math.random() * 20) + 80
      };
    });
  }, [studentCourses, studentFeedbacks, lang]);

  const radarData = useMemo(() => {
    return [
      { subject: lang === 'zh' ? '基础技能' : 'Basics', A: 85, fullMark: 100 },
      { subject: lang === 'zh' ? '创造力' : 'Creativity', A: 78, fullMark: 100 },
      { subject: lang === 'zh' ? '专注力' : 'Focus', A: 92, fullMark: 100 },
      { subject: lang === 'zh' ? '表达能力' : 'Expression', A: 88, fullMark: 100 },
      { subject: lang === 'zh' ? '团队协作' : 'Teamwork', A: 75, fullMark: 100 },
    ];
  }, [lang]);

  const exportGrowthData = () => {
    const exportData = [{
      '学员姓名': student?.name,
      '当前级别': growthData.currentLevel,
      '学习天数': growthData.daysSinceEnrollment,
      '完成课程': growthData.totalCourses,
      '总课时': growthData.totalHours,
      '平均评分': growthData.avgRating.toFixed(1),
      '导出日期': format(new Date(), 'yyyy-MM-dd')
    }];
    exportToExcel(exportData, `成长档案_${student?.name}_${format(new Date(), 'yyyy年MM月')}`, '成长数据');
  };

  if (!student) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <p className="text-gray-500">{lang === 'zh' ? '暂无学员信息' : 'No student information'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6 text-orange-500" />
            {lang === 'zh' ? '成长档案' : 'Growth Profile'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '记录学员成长点滴' : 'Record student growth moments'}
          </p>
        </div>
        <button
          onClick={exportGrowthData}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">{lang === 'zh' ? '导出' : 'Export'}</span>
        </button>
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">
            {student.avatar || '👤'}
          </div>
          <div>
            <h2 className="text-xl font-bold">{student.name}</h2>
            <p className="text-white/80">{lang === 'zh' ? `${student.age}岁 · ${student.level}` : `${student.age} years old · ${student.level}`}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-sm text-white/80">{lang === 'zh' ? '学习天数' : 'Days'}</p>
            <p className="text-2xl font-bold">{growthData.daysSinceEnrollment}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-sm text-white/80">{lang === 'zh' ? '完成课程' : 'Courses'}</p>
            <p className="text-2xl font-bold">{growthData.totalCourses}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-sm text-white/80">{lang === 'zh' ? '总课时' : 'Hours'}</p>
            <p className="text-2xl font-bold">{growthData.totalHours}</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3">
            <p className="text-sm text-white/80">{lang === 'zh' ? '平均评分' : 'Rating'}</p>
            <p className="text-2xl font-bold">{growthData.avgRating.toFixed(1)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'overview' 
              ? 'bg-orange-100 text-orange-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {lang === 'zh' ? '成长概览' : 'Overview'}
        </button>
        <button
          onClick={() => setActiveTab('milestones')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'milestones' 
              ? 'bg-orange-100 text-orange-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {lang === 'zh' ? '成长里程碑' : 'Milestones'}
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'records' 
              ? 'bg-orange-100 text-orange-700' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {lang === 'zh' ? '学习记录' : 'Records'}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                {lang === 'zh' ? '学习趋势' : 'Learning Trend'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={learningRecords}>
                    <defs>
                      <linearGradient id="colorCourses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="courses" stroke="#F97316" strokeWidth={3} fillOpacity={1} fill="url(#colorCourses)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                {lang === 'zh' ? '能力雷达' : 'Skills Radar'}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name={lang === 'zh' ? '能力值' : 'Skill'}
                      dataKey="A"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Medal className="w-5 h-5 text-amber-600" />
              {lang === 'zh' ? '最近成就' : 'Recent Achievements'}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: '🏆', title: lang === 'zh' ? '学习之星' : 'Star Learner', date: '2026-03-01' },
                { icon: '⭐', title: lang === 'zh' ? '连续打卡30天' : '30-Day Streak', date: '2026-02-15' },
                { icon: '🎯', title: lang === 'zh' ? '技能达标' : 'Skill Master', date: '2026-02-01' },
                { icon: '💪', title: lang === 'zh' ? '进步最快' : 'Fast Progress', date: '2026-01-20' }
              ].map((achievement, index) => (
                <div key={index} className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <p className="font-medium text-gray-900 text-sm">{achievement.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{achievement.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-2xl">
                    {milestone.icon}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className="w-0.5 h-full bg-orange-200 my-2" />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900">{milestone.title}</h4>
                    <span className="text-xs text-gray-500">
                      {format(parseISO(milestone.date), 'yyyy-MM-dd')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{milestone.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '月份' : 'Month'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '课程数' : 'Courses'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '课时' : 'Hours'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '评分' : 'Rating'}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '进度' : 'Progress'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {learningRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.month}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.courses}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.hours}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="text-gray-900">{record.rating}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                            style={{ width: `${record.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{record.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
