import React, { useState, lazy, Suspense } from 'react';
import { Role, Language } from '../types';
import { useTranslation } from '../i18n';
import { Search, Loader2, MapPin, Menu } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { useCampuses } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

const GlobalSearch = lazy(() => import('./GlobalSearch'));

interface HeaderProps {
  role: Role;
  lang: Language;
  onMenuClick?: () => void;
}

export default function Header({ role, lang, onMenuClick }: HeaderProps) {
  const { t } = useTranslation(lang);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const { campuses, selectedCampusId } = useCampuses();
  const { user } = useAuth();

  const currentCampus = campuses.find((c) => c.id === selectedCampusId) || campuses[0];

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return '管理员';
      case 'teacher': return '教师';
      case 'parent': return '家长';
      default: return '';
    }
  };

  const LoadingFallback = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Loader2 className="w-8 h-8 text-white animate-spin" />
    </div>
  );

  const navigateToTab = (tab: string) => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { tab } }));
  };

  return (
    <>
      <header className="bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => navigateToTab('overview')}
            className="flex items-center gap-3 min-w-0 rounded-xl px-1 py-1 hover:bg-gray-50 transition"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 text-left">
              <h1 className="text-sm md:text-base font-bold text-gray-900 tracking-tight truncate">
                {currentCampus?.name || t('appName')}
              </h1>
              <p className="text-[11px] text-gray-400 truncate hidden sm:block">{t('appName')}</p>
            </div>
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl transition text-gray-500"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">{lang === 'zh' ? '搜索...' : 'Search...'}</span>
          </button>
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <NotificationCenter lang={lang} />

          <button
            onClick={() => navigateToTab('profile')}
            className="flex items-center space-x-2 pl-3 border-l border-gray-100 rounded-xl pr-1 py-1 hover:bg-gray-50 transition"
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-900">{user?.name || getRoleLabel()}</p>
              <p className="text-xs text-gray-400">{getRoleLabel()}</p>
            </div>
          </button>
        </div>
      </header>

      {showGlobalSearch && (
        <Suspense fallback={<LoadingFallback />}>
          <GlobalSearch lang={lang} onClose={() => setShowGlobalSearch(false)} />
        </Suspense>
      )}
    </>
  );
}
