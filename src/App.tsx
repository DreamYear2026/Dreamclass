import React, { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import LoginPage from './components/LoginPage';
import ErrorBoundary from './components/ErrorBoundary';
import { Role, Language, User } from './types';
import { useTranslation } from './i18n';
import { Home, Calendar, MessageSquare, User as UserIcon, Loader2, Users, BarChart2, BookOpen, GraduationCap, Star, DollarSign, TrendingUp, ClipboardList, Settings } from 'lucide-react';
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
  const { t } = useTranslation(lang);

  useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user?.role]);

  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab);
      }
    };
    window.addEventListener('navigate', handleNavigate as EventListener);
    return () => window.removeEventListener('navigate', handleNavigate as EventListener);
  }, []);

  const renderContent = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        if (role === 'admin') return <AdminDashboard lang={lang} />;
        if (role === 'teacher') return <TeacherDashboard lang={lang} />;
        return <ParentDashboard lang={lang} studentId={user?.id} />;
      case 'schedule':
        if (role === 'parent') return <ParentSchedule lang={lang} studentId={user?.id} />;
        return <Schedule role={role} lang={lang} studentId={user?.id} />;
      case 'feedback':
        return <ClassReviews lang={lang} />;
      case 'messages':
        return <EnhancedMessageCenter lang={lang} />;
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
        return <LearningProgress lang={lang} studentId={role === 'parent' ? user?.id : undefined} />;
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
      default:
        if (role === 'admin') return <AdminDashboard lang={lang} />;
        if (role === 'teacher') return <TeacherDashboard lang={lang} />;
        return <ParentSchedule lang={lang} studentId={user?.id} />;
    }
  }, [activeTab, role, lang, user?.id]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 flex flex-col">
      <Header 
        role={role} 
        lang={lang} 
        userName={user?.name}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={role} activeTab={activeTab} setActiveTab={setActiveTab} lang={lang} />
        
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <ErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
              {renderContent()}
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 z-40 pb-safe">
        <div className="flex justify-around items-center h-16 px-2">
          {role === 'admin' ? (
            <>
              <MobileNavItem icon={<Home className="w-5 h-5" />} label="首页" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} color="indigo" />
              <MobileNavItem icon={<Settings className="w-5 h-5" />} label="管理" active={activeTab === 'user-management'} onClick={() => setActiveTab('user-management')} color="indigo" />
              <MobileNavItem icon={<DollarSign className="w-5 h-5" />} label="财务" active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} color="indigo" />
              <MobileNavItem icon={<UserIcon className="w-5 h-5" />} label="我的" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} color="indigo" />
            </>
          ) : role === 'teacher' ? (
            <>
              <MobileNavItem icon={<Home className="w-5 h-5" />} label="首页" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} color="blue" />
              <MobileNavItem icon={<ClipboardList className="w-5 h-5" />} label="作业" active={activeTab === 'homework'} onClick={() => setActiveTab('homework')} color="blue" />
              <MobileNavItem icon={<TrendingUp className="w-5 h-5" />} label="进度" active={activeTab === 'student-progress'} onClick={() => setActiveTab('student-progress')} color="blue" />
              <MobileNavItem icon={<UserIcon className="w-5 h-5" />} label="我的" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} color="blue" />
            </>
          ) : (
            <>
              <MobileNavItem icon={<Home className="w-5 h-5" />} label="首页" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} color="orange" />
              <MobileNavItem icon={<ClipboardList className="w-5 h-5" />} label="作业" active={activeTab === 'homework'} onClick={() => setActiveTab('homework')} color="orange" />
              <MobileNavItem icon={<Star className="w-5 h-5" />} label="反馈" active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} color="orange" />
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
