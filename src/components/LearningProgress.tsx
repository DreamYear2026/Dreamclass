import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Target, Award, Clock, BookOpen, ChevronRight, Loader2, BarChart2, Lightbulb, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Language, Feedback, SkillRatings, Student } from '../types';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useStudentByUser } from '../hooks/useStudentByUser';
import { parseISO, format, subMonths, isAfter } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface LearningProgressProps {
  lang: Language;
  studentId?: string;
}

const SKILL_CONFIG: Record<keyof SkillRatings, { zh: string; en: string; icon: string; color: string; description: { zh: string; en: string } }> = {
  pitch: { 
    zh: '音准', 
    en: 'Pitch', 
    icon: '🎵', 
    color: 'from-blue-500 to-cyan-500',
    description: { zh: '音高准确性，包括音程关系和调性把握', en: 'Pitch accuracy, intervals and tonality' }
  },
  rhythm: { 
    zh: '节奏', 
    en: 'Rhythm', 
    icon: '🥁', 
    color: 'from-orange-500 to-amber-500',
    description: { zh: '节拍稳定性，节奏型和速度控制', en: 'Beat stability, rhythm patterns and tempo' }
  },
  technique: { 
    zh: '技巧', 
    en: 'Technique', 
    icon: '🎹', 
    color: 'from-purple-500 to-violet-500',
    description: { zh: '演奏技巧，包括指法、触键和力度控制', en: 'Playing technique, fingering and dynamics' }
  },
  expression: { 
    zh: '表现力', 
    en: 'Expression', 
    icon: '🎭', 
    color: 'from-pink-500 to-rose-500',
    description: { zh: '音乐表现力，情感表达和乐句处理', en: 'Musical expression and phrasing' }
  },
  theory: { 
    zh: '乐理', 
    en: 'Theory', 
    icon: '📚', 
    color: 'from-emerald-500 to-teal-500',
    description: { zh: '乐理知识，包括和声、曲式和音乐术语', en: 'Music theory, harmony and terminology' }
  },
  sightReading: { 
    zh: '视奏', 
    en: 'Sight Reading', 
    icon: '👁️', 
    color: 'from-indigo-500 to-blue-500',
    description: { zh: '视奏能力，包括识谱速度和准确性', en: 'Sight reading speed and accuracy' }
  },
};

const LEVEL_LABELS = [
  { zh: '入门', en: 'Beginner', min: 0, max: 1.5 },
  { zh: '基础', en: 'Basic', min: 1.5, max: 2.5 },
  { zh: '进阶', en: 'Intermediate', min: 2.5, max: 3.5 },
  { zh: '熟练', en: 'Proficient', min: 3.5, max: 4.5 },
  { zh: '精通', en: 'Advanced', min: 4.5, max: 5 },
];

export default function LearningProgress({ lang, studentId }: LearningProgressProps) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { student: myStudent } = useStudentByUser();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<keyof SkillRatings | null>(null);

  const targetStudentId = studentId || myStudent?.id;

  useEffect(() => {
    const fetchData = async () => {
      if (!targetStudentId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const allFeedbacks = await api.getFeedbacks();
        const studentFeedbacks = allFeedbacks.filter(f => f.studentId === targetStudentId);
        setFeedbacks(studentFeedbacks);
      } catch (error) {
        console.error('Failed to fetch feedbacks:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [targetStudentId]);

  const skillProgress = useMemo(() => {
    const progress: Record<keyof SkillRatings, { 
      current: number; 
      average: number; 
      trend: number; 
      history: { date: string; value: number }[];
      sessions: number;
    }> = {
      pitch: { current: 0, average: 0, trend: 0, history: [], sessions: 0 },
      rhythm: { current: 0, average: 0, trend: 0, history: [], sessions: 0 },
      technique: { current: 0, average: 0, trend: 0, history: [], sessions: 0 },
      expression: { current: 0, average: 0, trend: 0, history: [], sessions: 0 },
      theory: { current: 0, average: 0, trend: 0, history: [], sessions: 0 },
      sightReading: { current: 0, average: 0, trend: 0, history: [], sessions: 0 },
    };

    const feedbacksWithSkills = feedbacks.filter(f => f.skillRatings);
    if (feedbacksWithSkills.length === 0) return progress;

    (Object.keys(SKILL_CONFIG) as (keyof SkillRatings)[]).forEach(skill => {
      const ratings: { date: string; value: number }[] = [];
      
      feedbacksWithSkills.forEach(f => {
        if (f.skillRatings && f.skillRatings[skill] !== undefined) {
          ratings.push({
            date: f.date,
            value: f.skillRatings[skill],
          });
        }
      });

      if (ratings.length > 0) {
        ratings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        const current = ratings[ratings.length - 1].value;
        const average = ratings.reduce((sum, r) => sum + r.value, 0) / ratings.length;
        
        let trend = 0;
        if (ratings.length >= 2) {
          const recent = ratings.slice(-3);
          const older = ratings.slice(0, -3);
          if (older.length > 0) {
            const recentAvg = recent.reduce((sum, r) => sum + r.value, 0) / recent.length;
            const olderAvg = older.reduce((sum, r) => sum + r.value, 0) / older.length;
            trend = recentAvg - olderAvg;
          } else if (ratings.length >= 2) {
            trend = ratings[ratings.length - 1].value - ratings[0].value;
          }
        }

        progress[skill] = {
          current,
          average: Math.round(average * 10) / 10,
          trend: Math.round(trend * 10) / 10,
          history: ratings,
          sessions: ratings.length,
        };
      }
    });

    return progress;
  }, [feedbacks]);

  const overallProgress = useMemo(() => {
    const skills = Object.keys(SKILL_CONFIG) as (keyof SkillRatings)[];
    const validSkills = skills.filter(s => skillProgress[s].sessions > 0);
    
    if (validSkills.length === 0) return 0;
    
    const total = validSkills.reduce((sum, s) => sum + skillProgress[s].average, 0);
    return Math.round((total / validSkills.length) * 20);
  }, [skillProgress]);

  const getLevelLabel = (value: number) => {
    const level = LEVEL_LABELS.find(l => value >= l.min && value < l.max) || LEVEL_LABELS[LEVEL_LABELS.length - 1];
    return lang === 'zh' ? level.zh : level.en;
  };

  const getImprovementSuggestions = () => {
    const suggestions: { skill: keyof SkillRatings; suggestion: string }[] = [];
    const skills = Object.keys(SKILL_CONFIG) as (keyof SkillRatings)[];
    
    const weakestSkill = skills
      .filter(s => skillProgress[s].sessions > 0)
      .sort((a, b) => skillProgress[a].average - skillProgress[b].average)[0];
    
    if (weakestSkill) {
      const config = SKILL_CONFIG[weakestSkill];
      suggestions.push({
        skill: weakestSkill,
        suggestion: lang === 'zh' 
          ? `建议加强${config.zh}练习，这是目前最需要提升的技能`
          : `Focus on improving ${config.en}, this is the skill that needs the most work`,
      });
    }

    const decliningSkill = skills
      .filter(s => skillProgress[s].sessions >= 3 && skillProgress[s].trend < -0.3)
      .sort((a, b) => skillProgress[a].trend - skillProgress[b].trend)[0];
    
    if (decliningSkill) {
      const config = SKILL_CONFIG[decliningSkill];
      suggestions.push({
        skill: decliningSkill,
        suggestion: lang === 'zh'
          ? `${config.zh}近期有所下滑，建议复习巩固基础知识`
          : `${config.en} has declined recently, review and consolidate basics`,
      });
    }

    if (suggestions.length === 0) {
      const strongestSkill = skills
        .filter(s => skillProgress[s].sessions > 0)
        .sort((a, b) => skillProgress[b].average - skillProgress[a].average)[0];
      
      if (strongestSkill) {
        const config = SKILL_CONFIG[strongestSkill];
        suggestions.push({
          skill: strongestSkill,
          suggestion: lang === 'zh'
            ? `${config.zh}表现优秀，可以尝试更高级的曲目和技巧`
            : `Excellent ${config.en}, try more advanced pieces and techniques`,
        });
      }
    }

    return suggestions;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const hasData = Object.values(skillProgress).some(s => s.sessions > 0);

  if (!hasData) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            {lang === 'zh' ? '学习轨迹' : 'Learning Progress'}
          </h1>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-10 h-10 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">
            {lang === 'zh' ? '暂无学习轨迹数据' : 'No learning progress data yet'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {lang === 'zh' 
              ? '完成课程并获得点评后，这里将展示您的技能成长轨迹' 
              : 'After completing courses and receiving reviews, your skill progress will be shown here'}
          </p>
        </div>
      </div>
    );
  }

  const suggestions = getImprovementSuggestions();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {lang === 'zh' ? '学习轨迹' : 'Learning Progress'}
        </h1>
        <div className="text-sm text-gray-500">
          {lang === 'zh' ? '基于' : 'Based on'} {feedbacks.filter(f => f.skillRatings).length} {lang === 'zh' ? '次课堂点评' : 'class reviews'}
        </div>
      </div>

      {/* Overall Progress Card */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-white/70">{lang === 'zh' ? '综合能力评分' : 'Overall Score'}</p>
            <p className="text-5xl font-bold mt-1">{overallProgress}</p>
            <p className="text-sm text-white/80 mt-2">{getLevelLabel(overallProgress / 20)}</p>
          </div>
          <div className="text-right">
            <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
              <Award className="w-10 h-10 text-white/80" />
            </div>
          </div>
        </div>
      </div>

      {/* Skill Radar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">{lang === 'zh' ? '技能雷达图' : 'Skill Radar'}</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(Object.keys(SKILL_CONFIG) as (keyof SkillRatings)[]).map(skill => {
            const config = SKILL_CONFIG[skill];
            const progress = skillProgress[skill];
            const percentage = progress.sessions > 0 ? (progress.average / 5) * 100 : 0;
            
            return (
              <button
                key={skill}
                onClick={() => progress.sessions > 0 && setSelectedSkill(skill)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  progress.sessions > 0 
                    ? 'border-gray-200 hover:border-indigo-300 hover:shadow-md cursor-pointer' 
                    : 'border-gray-100 opacity-50 cursor-default'
                }`}
                disabled={progress.sessions === 0}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{config.icon}</span>
                  <span className="font-medium text-gray-900">{lang === 'zh' ? config.zh : config.en}</span>
                </div>
                
                {progress.sessions > 0 ? (
                  <>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div 
                        className={`h-full bg-gradient-to-r ${config.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">{progress.average.toFixed(1)}/5</span>
                      <span className={`flex items-center gap-0.5 ${
                        progress.trend > 0 ? 'text-emerald-600' : 
                        progress.trend < 0 ? 'text-red-500' : 'text-gray-400'
                      }`}>
                        {progress.trend > 0 ? <ArrowUp className="w-3 h-3" /> : 
                         progress.trend < 0 ? <ArrowDown className="w-3 h-3" /> : 
                         <Minus className="w-3 h-3" />}
                        {Math.abs(progress.trend).toFixed(1)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">{lang === 'zh' ? '暂无数据' : 'No data'}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Improvement Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-900">{lang === 'zh' ? '成长建议' : 'Growth Suggestions'}</h3>
          </div>
          <div className="space-y-2">
            {suggestions.map((s, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                <span>{SKILL_CONFIG[s.skill].icon}</span>
                <span>{s.suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Progress */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">{lang === 'zh' ? '近期学习记录' : 'Recent Learning Records'}</h2>
        
        <div className="space-y-3">
          {feedbacks
            .filter(f => f.skillRatings)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(feedback => (
              <div key={feedback.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <p className="text-xs text-gray-500">{format(parseISO(feedback.date), 'M/d')}</p>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(SKILL_CONFIG) as (keyof SkillRatings)[]).map(skill => {
                      if (!feedback.skillRatings?.[skill]) return null;
                      const config = SKILL_CONFIG[skill];
                      return (
                        <span 
                          key={skill}
                          className="px-2 py-0.5 bg-white rounded text-xs flex items-center gap-1"
                        >
                          <span>{config.icon}</span>
                          <span className="font-medium">{feedback.skillRatings![skill]}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-gray-900">{feedback.rating}</span>
                  <span className="text-xs text-gray-400">/5</span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedSkill(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className={`p-6 bg-gradient-to-r ${SKILL_CONFIG[selectedSkill].color} text-white rounded-t-2xl`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{SKILL_CONFIG[selectedSkill].icon}</span>
                <div>
                  <h3 className="text-xl font-bold">{lang === 'zh' ? SKILL_CONFIG[selectedSkill].zh : SKILL_CONFIG[selectedSkill].en}</h3>
                  <p className="text-sm text-white/80">{getLevelLabel(skillProgress[selectedSkill].average)}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{skillProgress[selectedSkill].average.toFixed(1)}</p>
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '平均分' : 'Average'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-2xl font-bold text-gray-900">{skillProgress[selectedSkill].current}</p>
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '最新' : 'Latest'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className={`text-2xl font-bold ${
                    skillProgress[selectedSkill].trend > 0 ? 'text-emerald-600' : 
                    skillProgress[selectedSkill].trend < 0 ? 'text-red-500' : 'text-gray-900'
                  }`}>
                    {skillProgress[selectedSkill].trend > 0 ? '+' : ''}{skillProgress[selectedSkill].trend.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '趋势' : 'Trend'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '技能说明' : 'Description'}</h4>
                <p className="text-sm text-gray-600">
                  {lang === 'zh' ? SKILL_CONFIG[selectedSkill].description.zh : SKILL_CONFIG[selectedSkill].description.en}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '历史记录' : 'History'}</h4>
                <div className="space-y-2">
                  {skillProgress[selectedSkill].history.slice(-10).reverse().map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-500">{format(parseISO(entry.date), 'M月d日')}</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(level => (
                          <div
                            key={level}
                            className={`w-2 h-2 rounded-full ${
                              level <= entry.value ? 'bg-indigo-500' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedSkill(null)}
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition"
              >
                {lang === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
