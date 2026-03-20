import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MobileSideNav from './components/MobileSideNav';
import LoginPage from './components/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { Role, Language, User } from './types';
import { useTranslation } from './i18n';
import { Home, Calendar, MessageSquare, User as UserIcon, Loader2, Users, BarChart2, BookOpen, GraduationCap, Bell, DollarSign, TrendingUp, ClipboardList, Settings, Megaphone, Brain, TrendingUp as TrendingUpIcon, Search, Pin, PinOff, ChevronDown, ChevronRight, LayoutGrid, Menu } from 'lucide-react';
import { AppDataProvider } from './contexts/AppContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const ParentDashboard = lazy(() => import('./components/ParentDashboard'));
const TeacherDashboard = lazy(() => import('./components/TeacherDashboard'));
const Schedule = lazy(() => import('./components/Schedule'));
const ParentSchedule = lazy(() => import('./components/ParentSchedule'));
const ClassReviews = lazy(() => import('./components/ClassReviews'));
const FinancePage = lazy(() => import('./components/FinancePage'));
const CampusesPage = lazy(() => import('./components/CampusesPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const RetentionAlerts = lazy(() => import('./components/RetentionAlerts'));
const TeacherPerformancePage = lazy(() => import('./components/TeacherPerformancePage'));
const LearningProgress = lazy(() => import('./components/LearningProgress'));
const EnhancedMessageCenter = lazy(() => import('./components/EnhancedMessageCenter'));
const HomeworkPage = lazy(() => import('./components/HomeworkPage'));
const SmartReminders = lazy(() => import('./components/SmartReminders'));
const PointsRewards = lazy(() => import('./components/PointsRewards'));
const ExamManagement = lazy(() => import('./components/ExamManagement'));
const EventManagement = lazy(() => import('./components/EventManagement'));
const DataDashboard = lazy(() => import('./components/DataDashboard'));
const Reports = lazy(() => import('./components/Reports'));
const TeachersPage = lazy(() => import('./components/TeachersPage'));
const StudentsPage = lazy(() => import('./components/StudentsPage'));
const FeedbackPage = lazy(() => import('./components/FeedbackPage'));
const MaterialsPage = lazy(() => import('./components/MaterialsPage'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage'));
const CheckInPage = lazy(() => import('./components/CheckInPage'));
const PortfolioPage = lazy(() => import('./components/PortfolioPage'));
const LeadsPage = lazy(() => import('./components/LeadsPage'));
const StudentProgressPage = lazy(() => import('./components/StudentProgressPage'));
const LeaveRequests = lazy(() => import('./components/LeaveRequests'));
const BackupRestore = lazy(() => import('./components/BackupRestore'));
const OperationLogs = lazy(() => import('./components/OperationLogs'));
const MarketingSystem = lazy(() => import('./components/MarketingSystem'));
const AIAssistant = lazy(() => import('./components/AIAssistant'));
const StudentAnalytics = lazy(() => import('./components/StudentAnalytics'));
const SalaryManagement = lazy(() => import('./components/SalaryManagement'));
const TeacherSalaryView = lazy(() => import('./components/TeacherSalaryView'));
const TeacherPerformanceView = lazy(() => import('./components/TeacherPerformanceView'));
const TeacherNotificationCenter = lazy(() => import('./components/TeacherNotificationCenter'));
const ParentPaymentRecords = lazy(() => import('./components/ParentPaymentRecords'));
const StudentGrowthProfile = lazy(() => import('./components/StudentGrowthProfile'));
const ParentNotificationCenter = lazy(() => import('./components/ParentNotificationCenter'));
const AnnouncementCenter = lazy(() => import('./components/AnnouncementCenter'));
const ApprovalCenter = lazy(() => import('./components/ApprovalCenter'));
const RegistrationPage = lazy(() => import('./components/RegistrationPage'));

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
  </div>
);

function AppContent() {
  const { user, logout } = useAuth();
  const [role, setRole] = useState<Role>(user?.role || 'admin');
  const [lang, setLang] = useState<Language>('zh');
  const [activeTab, setActiveTab] = useState(role === 'parent' ? 'overview' : 'overview');
  const [messageTargetTeacherId, setMessageTargetTeacherId] = useState<string | null>(null);
  const [mobileAdminQuery, setMobileAdminQuery] = useState('');
  const [mobileTeacherQuery, setMobileTeacherQuery] = useState('');
  const [mobileParentQuery, setMobileParentQuery] = useState('');
  const [mobileRecentTabs, setMobileRecentTabs] = useState<string[]>([]);
  const [mobilePinnedTabs, setMobilePinnedTabs] = useState<string[]>([]);
  const [mobileNavExpanded, setMobileNavExpanded] = useState(false);
  const [mobileGroupExpanded, setMobileGroupExpanded] = useState<Record<string, boolean>>({});
  const [showMobileSideNav, setShowMobileSideNav] = useState(false);
  const { t } = useTranslation(lang);
  const isAdminRole = role === 'admin' || role === 'super_admin';
  const appRole: Role = role === 'super_admin' ? 'admin' : role;
  const mobileAdminGroups = [
    {
      title: '主页',
      items: [
        { id: 'overview', label: '首页', icon: <Home className="w-4 h-4" /> },
        { id: 'announcements', label: '系统公告', icon: <Megaphone className="w-4 h-4" /> },
        { id: 'approvals', label: '审批中心', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'registration', label: '报名续课', icon: <BookOpen className="w-4 h-4" /> },
      ],
    },
    {
      title: '人员管理',
      items: [
        { id: 'user-management', label: '用户管理', icon: <Settings className="w-4 h-4" /> },
        { id: 'students', label: '学员管理', icon: <Users className="w-4 h-4" /> },
        { id: 'teachers', label: '教师管理', icon: <GraduationCap className="w-4 h-4" /> },
        { id: 'teacher-performance', label: '教师绩效', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'campuses', label: '校区管理', icon: <Calendar className="w-4 h-4" /> },
      ],
    },
    {
      title: '教学业务',
      items: [
        { id: 'schedule', label: '课程安排', icon: <Calendar className="w-4 h-4" /> },
        { id: 'checkin', label: '签到管理', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'homework', label: '作业中心', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'learning-progress', label: '学习轨迹', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'student-progress', label: '学员进度', icon: <BarChart2 className="w-4 h-4" /> },
        { id: 'portfolio', label: '作品集', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'leave-requests', label: '请假管理', icon: <ClipboardList className="w-4 h-4" /> },
      ],
    },
    {
      title: '经营分析',
      items: [
        { id: 'finance', label: '财务管理', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'retention', label: '续费预警', icon: <Bell className="w-4 h-4" /> },
        { id: 'marketing', label: '营销中心', icon: <Megaphone className="w-4 h-4" /> },
        { id: 'dashboard', label: '数据大屏', icon: <BarChart2 className="w-4 h-4" /> },
        { id: 'analytics', label: '数据分析', icon: <TrendingUpIcon className="w-4 h-4" /> },
        { id: 'reports', label: '报表中心', icon: <BarChart2 className="w-4 h-4" /> },
        { id: 'student-analytics', label: '学员画像', icon: <Users className="w-4 h-4" /> },
        { id: 'salary-management', label: '工资管理', icon: <DollarSign className="w-4 h-4" /> },
      ],
    },
    {
      title: '沟通资源',
      items: [
        { id: 'messages', label: '家校沟通', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'reminders', label: '智能提醒', icon: <Bell className="w-4 h-4" /> },
        { id: 'points', label: '积分奖励', icon: <Users className="w-4 h-4" /> },
        { id: 'exams', label: '考级管理', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'events', label: '活动管理', icon: <Calendar className="w-4 h-4" /> },
        { id: 'materials', label: '教学资料', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'backup-restore', label: '数据备份', icon: <Settings className="w-4 h-4" /> },
        { id: 'operation-logs', label: '操作日志', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];
  const mobileTeacherGroups = [
    {
      title: '主页',
      items: [
        { id: 'overview', label: '首页', icon: <Home className="w-4 h-4" /> },
        { id: 'notifications', label: '通知中心', icon: <Bell className="w-4 h-4" /> },
        { id: 'feedback', label: '课堂点评', icon: <MessageSquare className="w-4 h-4" /> },
        { id: 'messages', label: '消息中心', icon: <MessageSquare className="w-4 h-4" /> },
      ],
    },
    {
      title: '个人中心',
      items: [
        { id: 'my-performance', label: '我的绩效', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'my-salary', label: '我的工资', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'profile', label: '我的资料', icon: <UserIcon className="w-4 h-4" /> },
      ],
    },
    {
      title: '教学工具',
      items: [
        { id: 'homework', label: '作业中心', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'student-progress', label: '学员进度', icon: <BarChart2 className="w-4 h-4" /> },
        { id: 'portfolio', label: '作品集', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'leave-requests', label: '请假申请', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'materials', label: '教学资料', icon: <BookOpen className="w-4 h-4" /> },
        { id: 'ai-assistant', label: 'AI助手', icon: <Brain className="w-4 h-4" /> },
      ],
    },
  ];
  const mobileParentGroups = [
    {
      title: '主页',
      items: [
        { id: 'overview', label: '首页', icon: <Home className="w-4 h-4" /> },
        { id: 'parent-notifications', label: '通知中心', icon: <Bell className="w-4 h-4" /> },
        { id: 'homework', label: '作业中心', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'messages', label: '课堂反馈', icon: <MessageSquare className="w-4 h-4" /> },
      ],
    },
    {
      title: '成长记录',
      items: [
        { id: 'growth', label: '成长档案', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'payments', label: '缴费记录', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'ai-assistant', label: 'AI助手', icon: <Brain className="w-4 h-4" /> },
        { id: 'profile', label: '我的资料', icon: <UserIcon className="w-4 h-4" /> },
      ],
    },
  ];

  useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user?.role]);

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
        if (e.detail.tab === 'messages') {
          setMessageTargetTeacherId(e.detail.teacherId || null);
        }
      }
    };
    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, []);

  useEffect(() => {
    try {
      const storageKey = `dreamyear_mobile_recent_tabs_${appRole}_${user?.id || 'anonymous'}`;
      const stored = localStorage.getItem(storageKey);
      setMobileRecentTabs(stored ? JSON.parse(stored) : []);
    } catch {
      setMobileRecentTabs([]);
    }
  }, [appRole, user?.id]);

  useEffect(() => {
    try {
      const storageKey = `dreamyear_mobile_pinned_tabs_${appRole}_${user?.id || 'anonymous'}`;
      const stored = localStorage.getItem(storageKey);
      setMobilePinnedTabs(stored ? JSON.parse(stored) : []);
    } catch {
      setMobilePinnedTabs([]);
    }
  }, [appRole, user?.id]);

  useEffect(() => {
    if (!activeTab) return;
    setMobileRecentTabs((prev) => {
      const next = [activeTab, ...prev.filter((tab) => tab !== activeTab)].slice(0, 8);
      try {
        const storageKey = `dreamyear_mobile_recent_tabs_${appRole}_${user?.id || 'anonymous'}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  }, [activeTab, appRole, user?.id]);

  const toggleMobilePinnedTab = (tabId: string) => {
    setMobilePinnedTabs((prev) => {
      const next = prev.includes(tabId)
        ? prev.filter((tab) => tab !== tabId)
        : [tabId, ...prev].slice(0, 8);
      try {
        const storageKey = `dreamyear_mobile_pinned_tabs_${appRole}_${user?.id || 'anonymous'}`;
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
      }
      return next;
    });
  };

  const toggleMobileGroup = (groupKey: string) => {
    setMobileGroupExpanded((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  const renderMobileMenuContent = (
    groups: Array<{ title: string; items: Array<{ id: string; label: string; icon: React.ReactNode }> }>,
    query: string,
    onQueryChange: (value: string) => void,
    closeMenu: () => void,
    activeClass: string,
    recentTabs: string[],
    pinnedTabs: string[]
  ) => {
    const keyword = query.trim().toLowerCase();
    const allItems = groups.flatMap((group) => group.items);
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
    const filteredGroups = groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(keyword) && !pinnedIdSet.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);

    return (
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="搜索功能..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-transparent rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-100"
          />
        </div>
        {pinnedItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500">固定常用</h3>
            <div className="grid grid-cols-1 gap-2">
              {pinnedItems.map((item) => (
                <div
                  key={`pinned-${item.id}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition ${
                    activeTab === item.id ? activeClass : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <button
                    onClick={() => {
                      setActiveTab(item.id);
                      closeMenu();
                      onQueryChange('');
                    }}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </button>
                  <button
                    onClick={() => toggleMobilePinnedTab(item.id)}
                    className="p-1 rounded text-gray-500 hover:bg-gray-100"
                  >
                    <PinOff className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {recentItems.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500">最近使用</h3>
            <div className="grid grid-cols-2 gap-2">
              {recentItems.map((item) => (
                <button
                  key={`recent-${item.id}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    closeMenu();
                    onQueryChange('');
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition ${
                    activeTab === item.id ? activeClass : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {filteredGroups.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-6">没有匹配的功能</div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              {(() => {
                const groupKey = `${appRole}-${group.title}`;
                const expanded = keyword ? true : !!mobileGroupExpanded[groupKey];
                return (
                  <>
                    <button
                      onClick={() => toggleMobileGroup(groupKey)}
                      className="w-full flex items-center justify-between text-xs font-semibold text-gray-500 px-1 py-1"
                    >
                      <span>{group.title}</span>
                      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {expanded && (
                      <div className="grid grid-cols-2 gap-2">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition ${
                              activeTab === item.id ? activeClass : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <button
                              onClick={() => {
                                setActiveTab(item.id);
                                closeMenu();
                                onQueryChange('');
                              }}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              {item.icon}
                              <span className="truncate">{item.label}</span>
                            </button>
                            <button
                              onClick={() => toggleMobilePinnedTab(item.id)}
                              className="p-1 rounded text-gray-500 hover:bg-gray-100"
                            >
                              {pinnedTabs.includes(item.id) ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        if (isAdminRole) return <AdminDashboard lang={lang} />;
        if (role === 'teacher') return <TeacherDashboard lang={lang} />;
        return <ParentDashboard lang={lang} studentId={user?.id} />;
      case 'schedule':
        if (appRole === 'parent') return <ParentSchedule lang={lang} studentId={user?.id} />;
        return <Schedule role={appRole} lang={lang} studentId={user?.id} />;
      case 'feedback':
        return <ClassReviews lang={lang} />;
      case 'messages':
        return <EnhancedMessageCenter lang={lang} initialTeacherId={messageTargetTeacherId || undefined} />;
      case 'finance':
        return <FinancePage lang={lang} />;
      case 'campuses':
        return <CampusesPage lang={lang} />;
      case 'settings':
        return <SettingsPage lang={lang} />;
      case 'user-management':
        return <UserManagement lang={lang} />;
      case 'retention':
        return <RetentionAlerts lang={lang} />;
      case 'reports':
        return <Reports lang={lang} />;
      case 'students':
        return <StudentsPage lang={lang} />;
      case 'teachers':
        return <TeachersPage lang={lang} />;
      case 'teacher-performance':
        return <TeacherPerformancePage lang={lang} />;
      case 'learning-progress':
        return <LearningProgress lang={lang} studentId={appRole === 'parent' ? user?.id : undefined} />;
      case 'homework':
        return <HomeworkPage lang={lang} />;
      case 'reminders':
        return <SmartReminders lang={lang} />;
      case 'points':
        return <PointsRewards lang={lang} />;
      case 'exams':
        return <ExamManagement lang={lang} />;
      case 'events':
        return <EventManagement lang={lang} />;
      case 'dashboard':
        return <DataDashboard lang={lang} />;
      case 'materials':
        return <MaterialsPage lang={lang} />;
      case 'profile':
        return <ProfilePage lang={lang} />;
      case 'analytics':
        return <AnalyticsPage lang={lang} />;
      case 'checkin':
        return <CheckInPage lang={lang} />;
      case 'portfolio':
        return <PortfolioPage lang={lang} />;
      case 'leads':
        return <LeadsPage lang={lang} />;
      case 'student-progress':
        return <StudentProgressPage lang={lang} />;
      case 'leave-requests':
        return <LeaveRequests lang={lang} />;
      case 'backup-restore':
        return <BackupRestore />;
      case 'operation-logs':
        return <OperationLogs lang={lang} />;
      case 'marketing':
        return <MarketingSystem lang={lang} />;
      case 'ai-assistant':
        return <AIAssistant lang={lang} />;
      case 'student-analytics':
        return <StudentAnalytics lang={lang} />;
      case 'salary-management':
        return <SalaryManagement lang={lang} />;
      case 'my-salary':
        return <TeacherSalaryView lang={lang} />;
      case 'my-performance':
        return <TeacherPerformanceView lang={lang} />;
      case 'notifications':
        return <TeacherNotificationCenter lang={lang} />;
      case 'payments':
        return <ParentPaymentRecords lang={lang} />;
      case 'growth':
        return <StudentGrowthProfile lang={lang} />;
      case 'parent-notifications':
        return <ParentNotificationCenter lang={lang} />;
      case 'announcements':
        return <AnnouncementCenter lang={lang} />;
      case 'approvals':
        return <ApprovalCenter lang={lang} />;
      case 'registration':
        return <RegistrationPage lang={lang} />;
      default:
        if (isAdminRole) return <AdminDashboard lang={lang} />;
        if (role === 'teacher') return <TeacherDashboard lang={lang} />;
        return <ParentSchedule lang={lang} studentId={user?.id} />;
    }
  }, [activeTab, role, lang, user?.id, isAdminRole, appRole]);

  const currentNavGroups = isAdminRole ? mobileAdminGroups : role === 'teacher' ? mobileTeacherGroups : mobileParentGroups;
  const currentNavQuery = isAdminRole ? mobileAdminQuery : role === 'teacher' ? mobileTeacherQuery : mobileParentQuery;
  const setCurrentNavQuery = isAdminRole ? setMobileAdminQuery : role === 'teacher' ? setMobileTeacherQuery : setMobileParentQuery;
  const currentNavCount = currentNavGroups.reduce((total, group) => total + group.items.length, 0);
  const currentNavLabelMap = new Map(currentNavGroups.flatMap((group) => group.items.map((item) => [item.id, item.label])));
  const collapsedRecentLabels = mobileRecentTabs
    .map((tabId) => currentNavLabelMap.get(tabId))
    .filter((label): label is string => !!label)
    .slice(0, 2);
  const currentActiveClass = isAdminRole
    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
    : role === 'teacher'
      ? 'bg-blue-50 border-blue-200 text-blue-700'
      : 'bg-orange-50 border-orange-200 text-orange-700';

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <Header 
        role={appRole} 
        lang={lang}
        onMenuClick={() => setShowMobileSideNav(true)}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={appRole} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
        
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      
      <MobileSideNav
        isOpen={showMobileSideNav}
        onClose={() => setShowMobileSideNav(false)}
        role={appRole}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
      />
      
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-40 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {isAdminRole ? (
            <>
              <MobileNavItem icon={<Home className="w-5 h-5" />} label="首页" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} color="indigo" />
              <MobileNavItem icon={<Megaphone className="w-5 h-5" />} label="营销" active={activeTab === 'marketing'} onClick={() => setActiveTab('marketing')} color="indigo" />
              <MobileNavItem icon={<Brain className="w-5 h-5" />} label="AI" active={activeTab === 'ai-assistant'} onClick={() => setActiveTab('ai-assistant')} color="indigo" />
              <MobileNavItem icon={<UserIcon className="w-5 h-5" />} label="我的" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} color="indigo" />
            </>
          ) : role === 'teacher' ? (
            <>
              <MobileNavItem icon={<Home className="w-5 h-5" />} label="首页" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} color="blue" />
              <MobileNavItem icon={<ClipboardList className="w-5 h-5" />} label="作业" active={activeTab === 'homework'} onClick={() => setActiveTab('homework')} color="blue" />
              <MobileNavItem icon={<Bell className="w-5 h-5" />} label="通知" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} color="blue" />
              <MobileNavItem icon={<UserIcon className="w-5 h-5" />} label="我的" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} color="blue" />
            </>
          ) : (
            <>
              <MobileNavItem icon={<Home className="w-5 h-5" />} label="首页" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} color="orange" />
              <MobileNavItem icon={<ClipboardList className="w-5 h-5" />} label="作业" active={activeTab === 'homework'} onClick={() => setActiveTab('homework')} color="orange" />
              <MobileNavItem icon={<Bell className="w-5 h-5" />} label="通知" active={activeTab === 'parent-notifications'} onClick={() => setActiveTab('parent-notifications')} color="orange" />
              <MobileNavItem icon={<UserIcon className="w-5 h-5" />} label="我的" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} color="orange" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MobileNavItem({ 
  icon, 
  label, 
  active, 
  onClick, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  color: 'indigo' | 'blue' | 'orange';
}) {
  const colorClasses = {
    indigo: active ? 'text-indigo-600 bg-indigo-50' : 'text-gray-500',
    blue: active ? 'text-blue-600 bg-blue-50' : 'text-gray-500',
    orange: active ? 'text-orange-600 bg-orange-50' : 'text-gray-500',
  };

  return (
    <button 
      className={`flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 ${colorClasses[color]}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );
}

function AppRoot() {
  const { user, loading, login } = useAuth();
  const [lang, setLang] = useState<Language>('zh');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage lang={lang} onLangChange={setLang} onLogin={login} />;
  }

  return <AppContent />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppDataProvider>
          <AppRoot />
        </AppDataProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
