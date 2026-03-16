import React from 'react';
import { Role, Language } from '../types';
import { useTranslation } from '../i18n';
import NotificationCenter from './NotificationCenter';

interface HeaderProps {
  role: Role;
  lang: Language;
  userName?: string;
}

export default function Header({ role, lang, userName }: HeaderProps) {
  const { t } = useTranslation(lang);

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return '管理员';
      case 'teacher': return '教师';
      case 'parent': return '家长';
      default: return '';
    }
  };

  return (
    <header className="bg-white border-b border-gray-100 h-14 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-lg">P</span>
        </div>
        <div className="hidden sm:block">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">{t('appName')}</h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <NotificationCenter lang={lang} />

        <div className="flex items-center space-x-2 pl-3 border-l border-gray-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
            {userName?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">{userName || getRoleLabel()}</p>
            <p className="text-xs text-gray-400">{getRoleLabel()}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
