import React, { useState } from 'react';
import { Music, User, Lock, Eye, EyeOff, Loader2, Sparkles, Star, Heart } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';

interface LoginPageProps {
  lang: Language;
  onLangChange: (lang: Language) => void;
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function LoginPage({ lang, onLangChange, onLogin }: LoginPageProps) {
  const { t } = useTranslation(lang);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError(lang === 'zh' ? '请输入用户名和密码' : 'Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.message || (lang === 'zh' ? '登录失败' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FF6B6B] via-[#FF8E8E] to-[#4ECDC4] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-10 left-10 animate-float">
        <Star className="w-8 h-8 text-[#FFE66D] fill-[#FFE66D] opacity-80" />
      </div>
      <div className="absolute top-20 right-20 animate-float" style={{ animationDelay: '1s' }}>
        <Heart className="w-6 h-6 text-white fill-white opacity-60" />
      </div>
      <div className="absolute bottom-20 left-20 animate-float" style={{ animationDelay: '2s' }}>
        <Sparkles className="w-7 h-7 text-[#FFE66D] opacity-70" />
      </div>
      <div className="absolute bottom-10 right-10 animate-float" style={{ animationDelay: '0.5s' }}>
        <Star className="w-5 h-5 text-white fill-white opacity-50" />
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl p-8 transform hover:scale-[1.01] transition-transform duration-300">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-2xl mb-4 shadow-lg transform -rotate-3 hover:rotate-0 transition-transform duration-300">
              <Music className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">
              {lang === 'zh' ? '梦年艺术' : 'Dream Year Art'}
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              {lang === 'zh' ? '让学习更快乐' : 'Make Learning Fun'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center animate-scale-in">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1 text-[#FF6B6B]" />
                {lang === 'zh' ? '用户名' : 'Username'}
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-[#FF6B6B] focus:ring-4 focus:ring-[#FF6B6B]/10 transition-all duration-200 bg-gray-50/50"
                placeholder={lang === 'zh' ? '请输入用户名' : 'Enter username'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="w-4 h-4 inline mr-1 text-[#4ECDC4]" />
                {lang === 'zh' ? '密码' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 border-2 border-gray-100 rounded-xl focus:outline-none focus:border-[#4ECDC4] focus:ring-4 focus:ring-[#4ECDC4]/10 transition-all duration-200 bg-gray-50/50 pr-12"
                  placeholder={lang === 'zh' ? '请输入密码' : 'Enter password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#4ECDC4] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white rounded-xl hover:from-[#E85555] hover:to-[#FF6B6B] transition-all duration-300 font-semibold text-lg shadow-lg shadow-[#FF6B6B]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {lang === 'zh' ? '登录中...' : 'Logging in...'}
                </>
              ) : (
                lang === 'zh' ? '登 录' : 'Login'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-center text-sm text-gray-400 mb-3">
              {lang === 'zh' ? '演示账号' : 'Demo Accounts'}
            </p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => { setUsername('admin'); setPassword('123456'); }}
                className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all text-center group"
              >
                <div className="w-8 h-8 bg-purple-500 rounded-lg mx-auto mb-1 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-sm">A</span>
                </div>
                <p className="font-medium text-gray-700 text-xs">{lang === 'zh' ? '管理员' : 'Admin'}</p>
              </button>
              <button
                onClick={() => { setUsername('teacher1'); setPassword('123456'); }}
                className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all text-center group"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-lg mx-auto mb-1 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-sm">T</span>
                </div>
                <p className="font-medium text-gray-700 text-xs">{lang === 'zh' ? '教师' : 'Teacher'}</p>
              </button>
              <button
                onClick={() => { setUsername('parent1'); setPassword('123456'); }}
                className="p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all text-center group"
              >
                <div className="w-8 h-8 bg-orange-500 rounded-lg mx-auto mb-1 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-white text-sm">P</span>
                </div>
                <p className="font-medium text-gray-700 text-xs">{lang === 'zh' ? '家长' : 'Parent'}</p>
              </button>
            </div>
            <p className="text-center text-xs text-gray-400 mt-2">
              {lang === 'zh' ? '密码: 123456' : 'Password: 123456'}
            </p>
          </div>

          <div className="mt-6 flex justify-center space-x-4">
            <button
              onClick={() => onLangChange('zh')}
              className={`text-sm px-4 py-1.5 rounded-full transition-all ${
                lang === 'zh' 
                  ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white font-medium shadow-md' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              中文
            </button>
            <button
              onClick={() => onLangChange('en')}
              className={`text-sm px-4 py-1.5 rounded-full transition-all ${
                lang === 'en' 
                  ? 'bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white font-medium shadow-md' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <p className="text-center text-white/80 text-sm mt-6 font-medium">
          © 2026 {lang === 'zh' ? '梦年艺术' : 'Dream Year Art'} All rights reserved.
        </p>
      </div>
    </div>
  );
}
