import React, { useState, useEffect } from 'react';
import { Home, Users, Calendar, MessageSquare, Settings, BarChart2, BarChart3, BookOpen, GraduationCap, User, Star, DollarSign, Building2, AlertTriangle, Award, TrendingUp, ClipboardList, Bell, Trophy, Music, CalendarDays, ChevronDown, ChevronRight, Sparkles, CheckSquare, FolderOpen, FileText, Database, Megaphone, Brain, Shield, Activity, TrendingUp as TrendingUpIcon, CreditCard, X, Search, Pin, PinOff, Menu } from 'lucide-react';
import { Role, Language } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';

interface MobileSideNavProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
}

export default function MobileSideNav({ isOpen, onClose, role, activeTab, setActiveTab, lang }: MobileSideNavProps) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const isAdminRole = role === 'admin' || role === 'super_admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [recentTabs, setRecentTabs] = useState<string[]>([]);
  const [pinnedTabs, setPinnedTabs] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const adminLinks = [
    { id: 'overview', label: t('navHome'), icon: <Home className="w-5 h-5" />, group: 'main' },
    { id: 'announcements', label: lang === 'zh' ? '系统公告' : 'Announcements', icon: <Megaphone className="w-5 h-5" />, group: 'main' },
    { id: 'approvals', label: lang === 'zh' ? '审批中心' : 'Approvals', icon: <ClipboardList className="w-5 h-5" />, group: 'main' },
    { id: 'registration', label: lang === 'zh' ? '报名续课' : 'Registration', icon: <BookOpen className="w-5 h-5" />, group: 'main' },
    { id: 'user-management', label: lang === 'zh' ? '用户管理' : 'User Management', icon: <Shield className="w-5 h-5" />, group: 'management' },
    { id: 'students', label: t('navStudents'), icon: <Users className="w-5 h-5" />, group: 'management' },
    { id: 'teachers', label: t('manageTeachers'), icon: <GraduationCap className="w-5 h-5" />, group: 'management' },
    { id: 'teacher-performance', label: lang === 'zh' ? '教师绩效' : 'Performance', icon: <Award className="w-5 h-5" />, group: 'management' },
    { id: 'campuses', label: lang === 'zh' ? '校区管理' : 'Campuses', icon: <Building2 className="w-5 h-5" />, group: 'management' },
    { id: 'marketing', label: lang === 'zh' ? '营销中心' : 'Marketing', icon: <Megaphone className="w-5 h-5" />, group: 'management' },
    { id: 'leave-requests', label: lang === 'zh' ? '请假管理' : 'Leave', icon: <FileText className="w-5 h-5" />, group: 'management' },
    { id: 'schedule', label: t('navSchedule'), icon: <Calendar className="w-5 h-5" />, group: 'teaching' },
    { id: 'checkin', label: lang === 'zh' ? '签到管理' : 'Check-in', icon: <CheckSquare className="w-5 h-5" />, group: 'teaching' },
    { id: 'homework', label: lang === 'zh' ? '作业中心' : 'Homework', icon: <ClipboardList className="w-5 h-5" />, group: 'teaching' },
    { id: 'learning-progress', label: lang === 'zh' ? '学习轨迹' : 'Progress', icon: <TrendingUp className="w-5 h-5" />, group: 'teaching' },
    { id: 'student-progress', label: lang === 'zh' ? '学员进度' : 'Student Progress', icon: <BarChart2 className="w-5 h-5" />, group: 'teaching' },
    { id: 'portfolio', label: lang === 'zh' ? '作品集' : 'Portfolio', icon: <FolderOpen className="w-5 h-5" />, group: 'teaching' },
    { id: 'finance', label: lang === 'zh' ? '财务管理' : 'Finance', icon: <DollarSign className="w-5 h-5" />, group: 'business' },
    { id: 'retention', label: lang === 'zh' ? '续费预警' : 'Retention', icon: <AlertTriangle className="w-5 h-5" />, group: 'business' },
    { id: 'messages', label: lang === 'zh' ? '家校沟通' : 'Messages', icon: <MessageSquare className="w-5 h-5" />, group: 'communication' },
    { id: 'reminders', label: lang === 'zh' ? '智能提醒' : 'Reminders', icon: <Bell className="w-5 h-5" />, group: 'communication' },
    { id: 'points', label: lang === 'zh' ? '积分奖励' : 'Rewards', icon: <Trophy className="w-5 h-5" />, group: 'engagement' },
    { id: 'exams', label: lang === 'zh' ? '考级管理' : 'Exams', icon: <Music className="w-5 h-5" />, group: 'engagement' },
    { id: 'events', label: lang === 'zh' ? '活动管理' : 'Events', icon: <CalendarDays className="w-5 h-5" />, group: 'engagement' },
    { id: 'dashboard', label: lang === 'zh' ? '数据大屏' : 'Dashboard', icon: <BarChart3 className="w-5 h-5" />, group: 'analytics' },
    { id: 'analytics', label: lang === 'zh' ? '数据分析' : 'Analytics', icon: <BarChart2 className="w-5 h-5" />, group: 'analytics' },
    { id: 'reports', label: t('navReports'), icon: <BarChart3 className="w-5 h-5" />, group: 'analytics' },
    { id: 'materials', label: t('navMaterials'), icon: <BookOpen className="w-5 h-5" />, group: 'resources' },
    { id: 'operation-logs', label: lang === 'zh' ? '操作日志' : 'Logs', icon: <Activity className="w-5 h-5" />, group: 'resources' },
    { id: 'backup-restore', label: lang === 'zh' ? '数据备份' : 'Backup', icon: <Database className="w-5 h-5" />, group: 'resources' },
    { id: 'ai-assistant', label: lang === 'zh' ? 'AI智能助手' : 'AI Assistant', icon: <Brain className="w-5 h-5" />, group: 'analytics' },
    { id: 'student-analytics', label: lang === 'zh' ? '学员画像分析' : 'Student Analytics', icon: <TrendingUpIcon className="w-5 h-5" />, group: 'analytics' },
    { id: 'salary-management', label: lang === 'zh' ? '工资管理' : 'Salary Management', icon: <DollarSign className="w-5 h-5" />, group: 'business' },
    { id: 'settings', label: lang === 'zh' ? '系统设置' : 'Settings', icon: <Settings className="w-5 h-5" />, group: 'account' },
  ];

  const parentLinks = [
    { id: 'overview', label: t('navHome'), icon: <Home className="w-5 h-5" />, group: 'main' },
    { id: 'parent-notifications', label: lang === 'zh' ? '通知中心' : 'Notifications', icon: <Bell className="w-5 h-5" />, group: 'main' },
    { id: 'homework', label: lang === 'zh' ? '作业中心' : 'Homework', icon: <ClipboardList className="w-5 h-5" />, group: 'main' },
    { id: 'messages', label: lang === 'zh' ? '课堂反馈' : 'Feedback', icon: <Star className="w-5 h-5" />, group: 'main' },
    { id: 'growth', label: lang === 'zh' ? '成长档案' : 'Growth Profile', icon: <Award className="w-5 h-5" />, group: 'personal' },
    { id: 'payments', label: lang === 'zh' ? '缴费记录' : 'Payments', icon: <CreditCard className="w-5 h-5" />, group: 'personal' },
    { id: 'ai-assistant', label: lang === 'zh' ? 'AI助手' : 'AI Assistant', icon: <Brain className="w-5 h-5" />, group: 'personal' },
    { id: 'profile', label: t('navProfile'), icon: <User className="w-5 h-5" />, group: 'account' },
  ];

  const teacherLinks = [
    { id: 'overview', label: t('navHome'), icon: <Home className="w-5 h-5" />, group: 'main' },
    { id: 'notifications', label: lang === 'zh' ? '通知中心' : 'Notifications', icon: <Bell className="w-5 h-5" />, group: 'main' },
    { id: 'feedback', label: lang === 'zh' ? '课堂点评' : 'Reviews', icon: <Star className="w-5 h-5" />, group: 'main' },
    { id: 'messages', label: lang === 'zh' ? '消息中心' : 'Messages', icon: <MessageSquare className="w-5 h-5" />, group: 'main' },
    { id: 'my-performance', label: lang === 'zh' ? '我的绩效' : 'Performance', icon: <TrendingUp className="w-5 h-5" />, group: 'personal' },
    { id: 'my-salary', label: lang === 'zh' ? '我的工资' : 'Salary', icon: <DollarSign className="w-5 h-5" />, group: 'personal' },
    { id: 'ai-assistant', label: lang === 'zh' ? 'AI助手' : 'AI Assistant', icon: <Brain className="w-5 h-5" />, group: 'personal' },
    { id: 'homework', label: lang === 'zh' ? '作业中心' : 'Homework', icon: <ClipboardList className="w-5 h-5" />, group: 'tools' },
    { id: 'student-progress', label: lang === 'zh' ? '学员进度' : 'Progress', icon: <TrendingUp className="w-5 h-5" />, group: 'tools' },
    { id: 'portfolio', label: lang === 'zh' ? '作品集' : 'Portfolio', icon: <FolderOpen className="w-5 h-5" />, group: 'tools' },
    { id: 'leave-requests', label: lang === 'zh' ? '请假申请' : 'Leave', icon: <FileText className="w-5 h-5" />, group: 'tools' },
    { id: 'materials', label: t('navMaterials'), icon: <BookOpen className="w-5 h-5" />, group: 'tools' },
    { id: 'profile', label: t('navProfile'), icon: <User className="w-5 h-5" />, group: 'account' },
  ];

  const links = isAdminRole ? adminLinks : role === 'teacher' ? teacherLinks : parentLinks;
  
  const groupedLinks = links.reduce((acc, link) => {
    if (!acc[link.group]) acc[link.group] = [];
    acc[link.group].push(link);
    return acc;
  }, {} as Record<string, typeof adminLinks>);

  const groupLabels: Record<string, string> = {
    main: lang === 'zh' ? '主页' : 'Main',
    management: lang === 'zh' ? '人员管理' : 'Management',
    teaching: lang === 'zh' ? '教学管理' : 'Teaching',
    tools: lang === 'zh' ? '工具中心' : 'Tools',
    personal: lang === 'zh' ? '个人中心' : 'Personal',
    business: lang === 'zh' ? '经营管理' : 'Business',
    communication: lang === 'zh' ? '沟通中心' : 'Communication',
    engagement: lang === 'zh' ? '学员互动' : 'Engagement',
    analytics: lang === 'zh' ? '数据分析' : 'Analytics',
    resources: lang === 'zh' ? '教学资源' : 'Resources',
    account: lang === 'zh' ? '账户' : 'Account',
  };

  const themeColors = {
    admin: {
      active: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30',
      hover: 'hover:bg-indigo-50 hover:text-indigo-600',
      border: 'border-indigo-200',
      accent: 'from-indigo-500 to-purple-500',
    },
    teacher: {
      active: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30',
      hover: 'hover:bg-blue-50 hover:text-blue-600',
      border: 'border-blue-200',
      accent: 'from-blue-500 to-cyan-500',
    },
    parent: {
      active: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30',
      hover: 'hover:bg-orange-50 hover:text-orange-600',
      border: 'border-orange-200',
      accent: 'from-orange-500 to-amber-500',
    },
  };

  const theme = themeColors[isAdminRole ? 'admin' : role];

  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    try {
      const storageKey = `dreamyear_mobile_recent_tabs_${role}_${user?.id || 'anonymous'}`;
      const stored = localStorage.getItem(storageKey);
      setRecentTabs(stored ? JSON.parse(stored) : []);
    } catch {
      setRecentTabs([]);
    }
  }, [isOpen, role, user?.id]);

  useEffect(() => {
    try {
      const storageKey = `dreamyear_mobile_pinned_tabs_${role}_${user?.id || 'anonymous'}`;
      const stored = localStorage.getItem(storageKey);
      setPinnedTabs(stored ? JSON.parse(stored) : []);
    } catch {
      setPinnedTabs([]);
    }
  }, [isOpen, role, user?.id]);

  useEffect(() => {
    if (!activeTab) return;
    setRecentTabs((prev) => {
      const next = [activeTab, ...prev.filter((tab) => tab !== activeTab)].slice(0, 8);
      try {
        const storageKey = `dreamyear_mobile_recent_tabs_${role}_${user?.id || 'anonymous'}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  }, [activeTab, role, user?.id]);

  const togglePinnedTab = (tabId: string) => {
    setPinnedTabs((prev) => {
      const next = prev.includes(tabId)
        ? prev.filter((tab) => tab !== tabId)
        : [tabId, ...prev].slice(0, 8);
      try {
        const storageKey = `dreamyear_mobile_pinned_tabs_${role}_${user?.id || 'anonymous'}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const keyword = searchQuery.trim().toLowerCase();
  const allItems = links;
  const itemMap = new Map(allItems.map((item) => [item.id, item]));
  
  const pinnedItems = pinnedTabs
    .map((tabId) => itemMap.get(tabId))
    .filter((item): item is { id: string; label: string; icon: React.ReactNode } =>
      !!item && item.label.toLowerCase().includes(keyword)
    );

  const pinnedIdSet = new Set(pinnedItems.map((item) => item.id));
  
  const recentItems = recentTabs
    .map((tabId) => itemMap.get(tabId))
    .filter((item): item is { id: string; label: string; icon: React.ReactNode } =>
      !!item && item.label.toLowerCase().includes(keyword) && !pinnedIdSet.has(item.id)
    );

  const filteredGroups = Object.entries(groupedLinks)
    .map(([group, groupLinks]) => ({
      group,
      items: groupLinks.filter((item) => 
        item.label.toLowerCase().includes(keyword) && !pinnedIdSet.has(item.id)
      ),
    }))
    .filter((group) => group.items.length > 0);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
    setSearchQuery('');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${theme.accent} flex items-center justify-center`}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">
              {lang === 'zh' ? '功能导航' : 'Navigation'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pb-8">
          {/* Search */}
          <div className="relative mb-5">
            <Search className="w-4.5 h-4.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'zh' ? '搜索功能...' : 'Search...'}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 focus:bg-white transition-all"
            />
          </div>

          {/* Pinned Items */}
          {pinnedItems.length > 0 && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mb-3 uppercase tracking-wide">
                <Pin className="w-4 h-4" />
                <span>{lang === 'zh' ? '固定常用' : 'Pinned'}</span>
              </h3>
              <div className="space-y-2">
                {pinnedItems.map((item) => (
                  <div
                    key={`pinned-${item.id}`}
                    className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all relative overflow-hidden ${
                      activeTab === item.id 
                        ? theme.active + ' shadow-md' 
                        : 'bg-gradient-to-r from-gray-50 to-white border-gray-100 text-gray-700 hover:shadow-md hover:border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => handleTabClick(item.id)}
                      className="flex items-center gap-3 flex-1 text-left"
                    >
                      {item.icon}
                      <span className="truncate font-medium">{item.label}</span>
                    </button>
                    <button
                      onClick={() => togglePinnedTab(item.id)}
                      className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all flex-shrink-0 mr-1"
                    >
                      <PinOff className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Groups */}
          {filteredGroups.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-8">
              {lang === 'zh' ? '没有匹配的功能' : 'No matching features'}
            </div>
          ) : (
            filteredGroups.map((groupObj) => {
              const group = groupObj.group;
              const groupLinks = groupObj.items;
              const groupKey = `${role}-${group}`;
              const expanded = keyword ? true : !!expandedGroups[groupKey];
              
              return (
                <div key={group} className="mb-4">
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center justify-between text-sm font-bold text-gray-600 px-2 py-2.5 rounded-xl hover:bg-gray-50 transition-all"
                  >
                    <span>{groupLabels[group] || group}</span>
                    <div className={`transform transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                      <ChevronDown className="w-4.5 h-4.5 text-gray-400" />
                    </div>
                  </button>
                  {expanded && (
                    <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                      {groupLinks.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all relative overflow-hidden ${
                            activeTab === item.id 
                              ? theme.active + ' shadow-md' 
                              : 'bg-gradient-to-r from-gray-50 to-white border-gray-100 text-gray-700 hover:shadow-md hover:border-gray-200'
                          }`}
                        >
                          <button
                            onClick={() => handleTabClick(item.id)}
                            className="flex items-center gap-2.5 flex-1 text-left"
                          >
                            {item.icon}
                            <span className="truncate font-medium">{item.label}</span>
                          </button>
                          <button
                            onClick={() => togglePinnedTab(item.id)}
                            className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all flex-shrink-0 mr-1"
                          >
                            {pinnedTabs.includes(item.id) ? (
                              <PinOff className="w-4 h-4" />
                            ) : (
                              <Pin className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
