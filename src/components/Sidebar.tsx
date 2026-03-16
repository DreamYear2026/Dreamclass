import React, { useState } from 'react';
import { Home, Users, Calendar, MessageSquare, Settings, BarChart2, BarChart3, BookOpen, GraduationCap, User, Star, DollarSign, Building2, AlertTriangle, Award, TrendingUp, ClipboardList, Bell, Trophy, Music, CalendarDays, ChevronLeft, ChevronRight, Sparkles, CheckSquare, FolderOpen, UserPlus, FileText, Clock, Database } from 'lucide-react';
import { Role, Language } from '../types';
import { useTranslation } from '../i18n';

interface SidebarProps {
  role: Role;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lang: Language;
}

export default function Sidebar({ role, activeTab, setActiveTab, lang }: SidebarProps) {
  const { t } = useTranslation(lang);
  const [collapsed, setCollapsed] = useState(false);

  const adminLinks = [
    { id: 'overview', label: t('navHome'), icon: <Home className="w-5 h-5" />, group: 'main' },
    { id: 'students', label: t('navStudents'), icon: <Users className="w-5 h-5" />, group: 'management' },
    { id: 'teachers', label: t('manageTeachers'), icon: <GraduationCap className="w-5 h-5" />, group: 'management' },
    { id: 'teacher-performance', label: lang === 'zh' ? '教师绩效' : 'Performance', icon: <Award className="w-5 h-5" />, group: 'management' },
    { id: 'campuses', label: lang === 'zh' ? '校区管理' : 'Campuses', icon: <Building2 className="w-5 h-5" />, group: 'management' },
    { id: 'leads', label: lang === 'zh' ? '线索管理' : 'Leads', icon: <UserPlus className="w-5 h-5" />, group: 'management' },
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
    { id: 'backup-restore', label: lang === 'zh' ? '数据备份' : 'Backup', icon: <Database className="w-5 h-5" />, group: 'resources' },
    { id: 'settings', label: lang === 'zh' ? '系统设置' : 'Settings', icon: <Settings className="w-5 h-5" />, group: 'account' },
  ];

  const parentLinks = [
    { id: 'overview', label: t('navHome'), icon: <Home className="w-5 h-5" />, group: 'main' },
    { id: 'homework', label: lang === 'zh' ? '作业中心' : 'Homework', icon: <ClipboardList className="w-5 h-5" />, group: 'main' },
    { id: 'messages', label: lang === 'zh' ? '课堂反馈' : 'Feedback', icon: <Star className="w-5 h-5" />, group: 'main' },
    { id: 'profile', label: t('navProfile'), icon: <User className="w-5 h-5" />, group: 'account' },
  ];

  const teacherLinks = [
    { id: 'overview', label: t('navHome'), icon: <Home className="w-5 h-5" />, group: 'main' },
    { id: 'feedback', label: lang === 'zh' ? '课堂点评' : 'Reviews', icon: <Star className="w-5 h-5" />, group: 'main' },
    { id: 'messages', label: lang === 'zh' ? '消息中心' : 'Messages', icon: <MessageSquare className="w-5 h-5" />, group: 'main' },
    { id: 'homework', label: lang === 'zh' ? '作业中心' : 'Homework', icon: <ClipboardList className="w-5 h-5" />, group: 'tools' },
    { id: 'student-progress', label: lang === 'zh' ? '学员进度' : 'Progress', icon: <TrendingUp className="w-5 h-5" />, group: 'tools' },
    { id: 'portfolio', label: lang === 'zh' ? '作品集' : 'Portfolio', icon: <FolderOpen className="w-5 h-5" />, group: 'tools' },
    { id: 'leave-requests', label: lang === 'zh' ? '请假申请' : 'Leave', icon: <FileText className="w-5 h-5" />, group: 'tools' },
    { id: 'materials', label: t('navMaterials'), icon: <BookOpen className="w-5 h-5" />, group: 'tools' },
    { id: 'profile', label: t('navProfile'), icon: <User className="w-5 h-5" />, group: 'account' },
  ];

  const links = role === 'admin' ? adminLinks : role === 'teacher' ? teacherLinks : parentLinks;
  
  const groupedLinks = links.reduce((acc, link) => {
    if (!acc[link.group]) acc[link.group] = [];
    acc[link.group].push(link);
    return acc;
  }, {} as Record<string, typeof links>);

  const groupLabels: Record<string, string> = {
    main: lang === 'zh' ? '主页' : 'Main',
    management: lang === 'zh' ? '人员管理' : 'Management',
    teaching: lang === 'zh' ? '教学管理' : 'Teaching',
    tools: lang === 'zh' ? '工具中心' : 'Tools',
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

  const theme = themeColors[role];

  return (
    <div className={`hidden md:flex flex-col bg-white border-r border-gray-100 h-[calc(100vh-4rem)] sticky top-16 transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 bg-gradient-to-r ${theme.accent} bg-clip-text text-transparent`} />
            <span className="text-sm font-semibold text-gray-700">
              {lang === 'zh' ? '功能导航' : 'Navigation'}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3">
        {Object.entries(groupedLinks).map(([group, groupLinks]) => (
          <div key={group} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {groupLabels[group] || group}
              </p>
            )}
            <div className="space-y-1">
              {groupLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  aria-label={link.label}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 btn-press ${
                    activeTab === link.id 
                      ? theme.active
                      : `text-gray-600 ${theme.hover}`
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? link.label : undefined}
                >
                  <span className={`flex-shrink-0 ${activeTab === link.id ? '' : 'opacity-70'}`}>
                    {link.icon}
                  </span>
                  {!collapsed && <span className="truncate">{link.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-gray-100">
        <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all duration-200 btn-press ${collapsed ? 'justify-center' : ''}`}>
          <Settings className="w-5 h-5 opacity-70" />
          {!collapsed && <span>{t('navSettings')}</span>}
        </button>
      </div>
    </div>
  );
}
