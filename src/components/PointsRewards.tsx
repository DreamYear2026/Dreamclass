import React, { useState, useMemo } from 'react';
import { Trophy, Star, Gift, Crown, Flame, Zap, Award, Medal, Diamond, Coins, ChevronRight, Lock, Check, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useCourses } from '../contexts/AppContext';
import { useToast } from './Toast';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  points: number;
  category: 'learning' | 'social' | 'streak' | 'special';
  requirement: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  total?: number;
}

interface RewardItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  category: 'discount' | 'gift' | 'experience' | 'badge';
  available: boolean;
  claimed: boolean;
}

const achievements: Achievement[] = [
  {
    id: 'a1',
    name: '初露锋芒',
    description: '完成第一节课',
    icon: <Star className="w-6 h-6" />,
    points: 50,
    category: 'learning',
    requirement: '完成1节课',
    unlocked: true,
    unlockedAt: subDays(new Date(), 30).toISOString(),
  },
  {
    id: 'a2',
    name: '勤奋学员',
    description: '累计完成10节课',
    icon: <Medal className="w-6 h-6" />,
    points: 100,
    category: 'learning',
    requirement: '完成10节课',
    unlocked: true,
    unlockedAt: subDays(new Date(), 15).toISOString(),
    progress: 10,
    total: 10,
  },
  {
    id: 'a3',
    name: '学习达人',
    description: '累计完成50节课',
    icon: <Award className="w-6 h-6" />,
    points: 300,
    category: 'learning',
    requirement: '完成50节课',
    unlocked: false,
    progress: 23,
    total: 50,
  },
  {
    id: 'a4',
    name: '坚持不懈',
    description: '连续7天打卡学习',
    icon: <Flame className="w-6 h-6" />,
    points: 150,
    category: 'streak',
    requirement: '连续7天学习',
    unlocked: true,
    unlockedAt: subDays(new Date(), 10).toISOString(),
  },
  {
    id: 'a5',
    name: '月度之星',
    description: '连续30天打卡学习',
    icon: <Crown className="w-6 h-6" />,
    points: 500,
    category: 'streak',
    requirement: '连续30天学习',
    unlocked: false,
    progress: 12,
    total: 30,
  },
  {
    id: 'a6',
    name: '作业达人',
    description: '完成20次作业并获得90分以上',
    icon: <Trophy className="w-6 h-6" />,
    points: 200,
    category: 'learning',
    requirement: '20次高分作业',
    unlocked: false,
    progress: 8,
    total: 20,
  },
  {
    id: 'a7',
    name: '社交达人',
    description: '分享5次学习成果到作品墙',
    icon: <Diamond className="w-6 h-6" />,
    points: 250,
    category: 'social',
    requirement: '分享5次作品',
    unlocked: false,
    progress: 2,
    total: 5,
  },
  {
    id: 'a8',
    name: '完美表现',
    description: '获得10次满分作业',
    icon: <Sparkles className="w-6 h-6" />,
    points: 400,
    category: 'special',
    requirement: '10次满分作业',
    unlocked: false,
    progress: 3,
    total: 10,
  },
];

const rewardItems: RewardItem[] = [
  {
    id: 'r1',
    name: '9折续费券',
    description: '续费时享受9折优惠',
    icon: '🎫',
    points: 500,
    category: 'discount',
    available: true,
    claimed: false,
  },
  {
    id: 'r2',
    name: '免费体验课',
    description: '获得一节免费体验课',
    icon: '🎁',
    points: 300,
    category: 'experience',
    available: true,
    claimed: false,
  },
  {
    id: 'r3',
    name: '精美琴谱夹',
    description: '精美琴谱夹一个',
    icon: '📚',
    points: 200,
    category: 'gift',
    available: true,
    claimed: false,
  },
  {
    id: 'r4',
    name: '定制徽章',
    description: '专属定制学习徽章',
    icon: '🏅',
    points: 150,
    category: 'badge',
    available: true,
    claimed: false,
  },
  {
    id: 'r5',
    name: '8折续费券',
    description: '续费时享受8折优惠',
    icon: '🎫',
    points: 1000,
    category: 'discount',
    available: true,
    claimed: false,
  },
  {
    id: 'r6',
    name: '名师一对一',
    description: '名师一对一指导课',
    icon: '👨‍🏫',
    points: 800,
    category: 'experience',
    available: true,
    claimed: false,
  },
];

const levelConfig = [
  { level: 1, name: '新手学员', minPoints: 0, icon: '🌱' },
  { level: 2, name: '初级学员', minPoints: 100, icon: '🌿' },
  { level: 3, name: '中级学员', minPoints: 300, icon: '🌳' },
  { level: 4, name: '高级学员', minPoints: 600, icon: '⭐' },
  { level: 5, name: '金牌学员', minPoints: 1000, icon: '🌟' },
  { level: 6, name: '钻石学员', minPoints: 1500, icon: '💎' },
  { level: 7, name: '大师学员', minPoints: 2500, icon: '👑' },
];

export default function PointsRewards({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students } = useStudents();
  const { courses } = useCourses();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'rewards' | 'history'>('overview');
  const [userPoints] = useState(680);
  const [streak] = useState(12);
  const [rewards, setRewards] = useState(rewardItems);

  const currentLevel = useMemo(() => {
    let level = levelConfig[0];
    for (const l of levelConfig) {
      if (userPoints >= l.minPoints) level = l;
    }
    return level;
  }, [userPoints]);

  const nextLevel = useMemo(() => {
    const currentIndex = levelConfig.findIndex(l => l.level === currentLevel.level);
    return currentIndex < levelConfig.length - 1 ? levelConfig[currentIndex + 1] : null;
  }, [currentLevel]);

  const progressToNextLevel = useMemo(() => {
    if (!nextLevel) return 100;
    const currentLevelPoints = currentLevel.minPoints;
    const nextLevelPoints = nextLevel.minPoints;
    const progress = ((userPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
    return Math.min(progress, 100);
  }, [userPoints, currentLevel, nextLevel]);

  const stats = useMemo(() => ({
    totalPoints: userPoints,
    achievements: achievements.filter(a => a.unlocked).length,
    totalAchievements: achievements.length,
    streak,
    rewardsClaimed: rewards.filter(r => r.claimed).length,
  }), [userPoints, streak, rewards]);

  const handleClaimReward = (reward: RewardItem) => {
    if (userPoints < reward.points) {
      showToast(lang === 'zh' ? '积分不足' : 'Not enough points', 'error');
      return;
    }
    
    setRewards(prev => prev.map(r => 
      r.id === reward.id ? { ...r, claimed: true } : r
    ));
    showToast(lang === 'zh' ? `已兑换 ${reward.name}` : `Claimed ${reward.name}`, 'success');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'learning': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'streak': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'social': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'special': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRewardCategoryColor = (category: string) => {
    switch (category) {
      case 'discount': return 'bg-red-50 border-red-200';
      case 'gift': return 'bg-purple-50 border-purple-200';
      case 'experience': return 'bg-blue-50 border-blue-200';
      case 'badge': return 'bg-amber-50 border-amber-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            {lang === 'zh' ? '积分奖励' : 'Points & Rewards'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '游戏化学习，激励成长' : 'Gamified learning experience'}
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">
              {currentLevel.icon}
            </div>
            <div>
              <p className="text-white/80 text-sm">{lang === 'zh' ? '当前等级' : 'Current Level'}</p>
              <h2 className="text-2xl font-bold">{currentLevel.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Coins className="w-4 h-4" />
                <span className="font-medium">{userPoints} {lang === 'zh' ? '积分' : 'Points'}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
              <Flame className="w-5 h-5 text-orange-300" />
              <span className="font-bold">{streak} {lang === 'zh' ? '天连续学习' : 'day streak'}</span>
            </div>
          </div>
        </div>
        
        {nextLevel && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span>{lang === 'zh' ? '距离下一等级' : 'Progress to next level'}</span>
              <span>{nextLevel.name}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progressToNextLevel}%` }}
              />
            </div>
            <p className="text-xs text-white/70 mt-1">
              {lang === 'zh' 
                ? `还需 ${nextLevel.minPoints - userPoints} 积分升级`
                : `${nextLevel.minPoints - userPoints} points to next level`
              }
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '成就解锁' : 'Achievements'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.achievements}/{stats.totalAchievements}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '连续学习' : 'Streak'}</p>
              <p className="text-xl font-bold text-gray-900">{streak} {lang === 'zh' ? '天' : 'days'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '已兑换' : 'Claimed'}</p>
              <p className="text-xl font-bold text-gray-900">{stats.rewardsClaimed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '本月积分' : 'This Month'}</p>
              <p className="text-xl font-bold text-gray-900">+{stats.totalPoints}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', label: lang === 'zh' ? '总览' : 'Overview', icon: <TrendingUp className="w-4 h-4" /> },
          { id: 'achievements', label: lang === 'zh' ? '成就' : 'Achievements', icon: <Award className="w-4 h-4" /> },
          { id: 'rewards', label: lang === 'zh' ? '奖励商城' : 'Rewards', icon: <Gift className="w-4 h-4" /> },
          { id: 'history', label: lang === 'zh' ? '积分记录' : 'History', icon: <Coins className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              {lang === 'zh' ? '最近成就' : 'Recent Achievements'}
            </h3>
            <div className="space-y-3">
              {achievements.filter(a => a.unlocked).slice(0, 3).map(achievement => (
                <div key={achievement.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryColor(achievement.category)}`}>
                    {achievement.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{achievement.name}</p>
                    <p className="text-xs text-gray-500">{achievement.description}</p>
                  </div>
                  <span className="text-sm font-bold text-amber-600">+{achievement.points}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-600" />
              {lang === 'zh' ? '进行中' : 'In Progress'}
            </h3>
            <div className="space-y-3">
              {achievements.filter(a => !a.unlocked && a.progress).slice(0, 3).map(achievement => (
                <div key={achievement.id} className="p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(achievement.category)} opacity-60`}>
                        {achievement.icon}
                      </div>
                      <span className="font-medium text-gray-700">{achievement.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{achievement.progress}/{achievement.total}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${((achievement.progress || 0) / (achievement.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="grid md:grid-cols-2 gap-4">
          {achievements.map(achievement => (
            <div 
              key={achievement.id} 
              className={`bg-white rounded-2xl shadow-sm border p-4 transition ${
                achievement.unlocked ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  achievement.unlocked ? getCategoryColor(achievement.category) : 'bg-gray-100 text-gray-400'
                }`}>
                  {achievement.unlocked ? achievement.icon : <Lock className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{achievement.name}</h3>
                    {achievement.unlocked && <Check className="w-4 h-4 text-green-600" />}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{achievement.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(achievement.category)}`}>
                      {achievement.category === 'learning' ? (lang === 'zh' ? '学习' : 'Learning') :
                       achievement.category === 'streak' ? (lang === 'zh' ? '坚持' : 'Streak') :
                       achievement.category === 'social' ? (lang === 'zh' ? '社交' : 'Social') :
                       (lang === 'zh' ? '特殊' : 'Special')}
                    </span>
                    <span className="text-sm font-bold text-amber-600">+{achievement.points} {lang === 'zh' ? '积分' : 'pts'}</span>
                  </div>
                  
                  {!achievement.unlocked && achievement.progress !== undefined && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{achievement.requirement}</span>
                        <span>{achievement.progress}/{achievement.total}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${(achievement.progress / (achievement.total || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="text-xs text-gray-400 mt-2">
                      {lang === 'zh' ? '解锁于' : 'Unlocked'} {format(parseISO(achievement.unlockedAt), 'yyyy-MM-dd')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="grid md:grid-cols-3 gap-4">
          {rewards.map(reward => (
            <div 
              key={reward.id} 
              className={`bg-white rounded-2xl shadow-sm border p-4 ${getRewardCategoryColor(reward.category)}`}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-white mx-auto flex items-center justify-center text-3xl shadow-sm mb-3">
                  {reward.icon}
                </div>
                <h3 className="font-semibold text-gray-900">{reward.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{reward.description}</p>
                <div className="flex items-center justify-center gap-1 mt-3">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-amber-600">{reward.points}</span>
                </div>
                <button
                  onClick={() => handleClaimReward(reward)}
                  disabled={reward.claimed || userPoints < reward.points}
                  className={`w-full mt-4 py-2 rounded-xl font-medium transition ${
                    reward.claimed 
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : userPoints >= reward.points
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {reward.claimed 
                    ? (lang === 'zh' ? '已兑换' : 'Claimed')
                    : userPoints >= reward.points
                    ? (lang === 'zh' ? '立即兑换' : 'Claim Now')
                    : (lang === 'zh' ? '积分不足' : 'Not enough points')
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="space-y-3">
            {[
              { type: 'earn', desc: lang === 'zh' ? '完成课程' : 'Completed class', points: 20, time: '今天 10:30' },
              { type: 'earn', desc: lang === 'zh' ? '作业满分' : 'Perfect homework', points: 30, time: '昨天 15:20' },
              { type: 'earn', desc: lang === 'zh' ? '连续学习奖励' : 'Streak bonus', points: 50, time: '昨天 08:00' },
              { type: 'spend', desc: lang === 'zh' ? '兑换9折券' : 'Claimed discount', points: -500, time: '3天前' },
              { type: 'earn', desc: lang === 'zh' ? '成就解锁：勤奋学员' : 'Achievement unlocked', points: 100, time: '5天前' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.type === 'earn' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {item.type === 'earn' ? <Zap className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.desc}</p>
                    <p className="text-xs text-gray-500">{item.time}</p>
                  </div>
                </div>
                <span className={`font-bold ${item.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {item.points > 0 ? '+' : ''}{item.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
