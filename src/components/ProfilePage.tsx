import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, Mail, Phone, Lock, Save, Loader2, 
  Calendar, Clock, Award, 
  Shield, Settings, LogOut,
  Users, Check, X, ChevronRight, Edit2, Bell, Moon, Sun, Globe, HelpCircle, FileText, Sparkles, Heart, Star, Camera, Zap
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useStudents, useCourses, useTeachers } from '../contexts/AppContext';
import { useToast } from './Toast';
import { api } from '../services/api';
import { format, parseISO } from 'date-fns';
import { PASSWORD_MIN_LENGTH } from '../config/constants';
import BottomSheet from './BottomSheet';

const PREFERENCES_KEY = 'dreamyear_preferences';

const loadPreferences = (): { emailNotifications: boolean; smsNotifications: boolean; language: Language; darkMode: boolean } => {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
  }
  return { emailNotifications: true, smsNotifications: false, language: 'zh' as Language, darkMode: false };
};

const savePreferences = (prefs: { emailNotifications: boolean; smsNotifications: boolean; language: Language; darkMode: boolean }) => {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
  } catch {
  }
};

function checkPasswordStrength(password: string): { score: number; label: string; color: string; checks: { label: string; passed: boolean }[] } {
  const checks = [
    { label: '至少 6 个字符', passed: password.length >= 6 },
    { label: '包含大写字母', passed: /[A-Z]/.test(password) },
    { label: '包含小写字母', passed: /[a-z]/.test(password) },
    { label: '包含数字', passed: /[0-9]/.test(password) },
    { label: '包含特殊字符', passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];
  
  const score = checks.filter(c => c.passed).length;
  
  let label: string;
  let color: string;
  
  if (score <= 2) {
    label = '弱';
    color = 'bg-[#FF6B6B]';
  } else if (score <= 3) {
    label = '中等';
    color = 'bg-[#FFE66D]';
  } else if (score <= 4) {
    label = '强';
    color = 'bg-[#4ECDC4]';
  } else {
    label = '非常强';
    color = 'bg-[#95E1A3]';
  }
  
  return { score, label, color, checks };
}

export default function ProfilePage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user, logout, refreshUser } = useAuth();
  const { students } = useStudents();
  const { courses } = useCourses();
  const { teachers } = useTeachers();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'password' | 'preferences' | 'account'>('password');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState(loadPreferences);

  const passwordStrength = useMemo(() => checkPasswordStrength(passwordData.newPassword), [passwordData.newPassword]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatar: user?.avatar || '',
    });
  }, [user]);

  const handleAvatarFile = async (file: File) => {
    setLoading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body, credentials: 'include' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setFormData((prev) => ({ ...prev, avatar: data.url }));
      showToast(lang === 'zh' ? '头像已上传' : 'Avatar uploaded', 'success');
    } catch (error: any) {
      showToast(error.message || (lang === 'zh' ? '上传失败' : 'Upload failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!formData.name.trim()) {
      showToast(lang === 'zh' ? '姓名不能为空' : 'Name cannot be empty', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.updateCurrentUser(formData);
      await refreshUser();
      showToast(lang === 'zh' ? '个人信息更新成功' : 'Profile updated successfully', 'success');
      setShowEditProfile(false);
    } catch (error: any) {
      showToast(error.message || (lang === 'zh' ? '更新失败' : 'Update failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      showToast(lang === 'zh' ? '请填写完整密码信息' : 'Please fill all password fields', 'error');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast(lang === 'zh' ? '两次输入的新密码不一致' : 'Passwords do not match', 'error');
      return;
    }
    if (passwordData.newPassword.length < PASSWORD_MIN_LENGTH) {
      showToast(lang === 'zh' ? `密码长度至少 ${PASSWORD_MIN_LENGTH} 位` : `Password must be at least ${PASSWORD_MIN_LENGTH} characters`, 'error');
      return;
    }
    if (passwordStrength.score < 3) {
      showToast(lang === 'zh' ? '密码强度不足，请设置更强的密码' : 'Password is too weak', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast(lang === 'zh' ? '密码修改成功' : 'Password changed successfully', 'success');
    } catch (error: any) {
      showToast(error.message || (lang === 'zh' ? '修改失败' : 'Failed to change password'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return lang === 'zh' ? '管理员' : 'Admin';
      case 'teacher': return lang === 'zh' ? '教师' : 'Teacher';
      case 'parent': return lang === 'zh' ? '家长' : 'Parent';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white';
      case 'teacher': return 'bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white';
      case 'parent': return 'bg-gradient-to-r from-[#A29BFE] to-[#B8B3FF] text-white';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleGradient = (role: string) => {
    switch (role) {
      case 'admin': return 'from-[#FF6B6B] to-[#FF8E8E]';
      case 'teacher': return 'from-[#4ECDC4] to-[#7EDDD6]';
      case 'parent': return 'from-[#A29BFE] to-[#B8B3FF]';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  const userStats = () => {
    if (!user) return null;
    
    switch (user.role) {
      case 'admin':
        return {
          items: [
            { label: lang === 'zh' ? '学员总数' : 'Students', value: students.length, icon: Users, color: 'from-[#FF6B6B] to-[#FF8E8E]' },
            { label: lang === 'zh' ? '教师总数' : 'Teachers', value: teachers.filter(t => t.status === 'active').length, icon: User, color: 'from-[#4ECDC4] to-[#7EDDD6]' },
            { label: lang === 'zh' ? '本月课程' : 'Classes', value: courses.filter(c => {
              const courseDate = parseISO(c.date);
              const now = new Date();
              return courseDate.getMonth() === now.getMonth() && courseDate.getFullYear() === now.getFullYear();
            }).length, icon: Calendar, color: 'from-[#A29BFE] to-[#B8B3FF]' },
          ]
        };
      case 'teacher':
        const teacherCourses = courses.filter(c => c.teacherId === user.id);
        return {
          items: [
            { label: lang === 'zh' ? '我的学生' : 'Students', value: new Set(teacherCourses.map(c => c.studentId)).size, icon: Users, color: 'from-[#4ECDC4] to-[#7EDDD6]' },
            { label: lang === 'zh' ? '本周课程' : 'Classes', value: teacherCourses.filter(c => {
              const courseDate = parseISO(c.date);
              const now = new Date();
              const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
              const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
              return courseDate >= weekStart && courseDate <= weekEnd;
            }).length, icon: Calendar, color: 'from-[#FFE66D] to-[#FFB347]' },
            { label: lang === 'zh' ? '已完成' : 'Completed', value: teacherCourses.filter(c => c.status === 'completed').length, icon: Award, color: 'from-[#95E1A3] to-[#7DD389]' },
          ]
        };
      case 'parent':
        return { items: [] };
      default:
        return { items: [] };
    }
  };

  const stats = userStats();

  const menuItems = [
    { 
      icon: User, 
      label: lang === 'zh' ? '个人资料' : 'Profile', 
      description: lang === 'zh' ? '编辑姓名、邮箱、电话' : 'Edit name, email, phone',
      color: 'from-[#FF6B6B] to-[#FF8E8E]',
      onClick: () => setShowEditProfile(true)
    },
    { 
      icon: Lock, 
      label: lang === 'zh' ? '修改密码' : 'Change Password', 
      description: lang === 'zh' ? '更新账户密码' : 'Update your password',
      color: 'from-[#4ECDC4] to-[#7EDDD6]',
      onClick: () => { setSettingsTab('password'); setShowSettings(true); }
    },
    { 
      icon: Bell, 
      label: lang === 'zh' ? '通知设置' : 'Notifications', 
      description: lang === 'zh' ? '管理通知偏好' : 'Manage notification preferences',
      color: 'from-[#FFE66D] to-[#FFB347]',
      onClick: () => { setSettingsTab('preferences'); setShowSettings(true); }
    },
    { 
      icon: Globe, 
      label: lang === 'zh' ? '语言设置' : 'Language', 
      description: lang === 'zh' ? '切换界面语言' : 'Change interface language',
      color: 'from-[#A29BFE] to-[#B8B3FF]',
      onClick: () => { setSettingsTab('preferences'); setShowSettings(true); }
    },
    { 
      icon: Shield, 
      label: lang === 'zh' ? '账户安全' : 'Account Security', 
      description: lang === 'zh' ? '查看账户信息' : 'View account details',
      color: 'from-[#FD79A8] to-[#FFB8D0]',
      onClick: () => { setSettingsTab('account'); setShowSettings(true); }
    },
    { 
      icon: HelpCircle, 
      label: lang === 'zh' ? '帮助中心' : 'Help Center', 
      description: lang === 'zh' ? '常见问题解答' : 'FAQ and support',
      color: 'from-[#74B9FF] to-[#A8E6CF]',
      onClick: () => setShowHelpCenter(true)
    },
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        <div className={`bg-gradient-to-br ${getRoleGradient(user?.role || '')} h-32 md:h-40 relative`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setShowEditProfile(true)}
              className="p-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition"
            >
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="absolute -bottom-14 left-1/2 transform -translate-x-1/2">
            <div className="relative">
              <div className="w-28 h-28 md:w-32 md:h-32 bg-white rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-28 h-28 md:w-32 md:h-32 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-[#95E1A3] rounded-full border-2 border-white flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-18 px-6 pb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
              {user?.name}
              <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            </h2>
            <p className="text-sm text-gray-500 mt-1">@{user?.username}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user?.role || '')}`}>
                {getRoleName(user?.role || '')}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-[#95E1A3]/10 text-[#95E1A3]">
                <Zap className="w-3.5 h-3.5" />
                {lang === 'zh' ? '在线' : 'Online'}
              </span>
            </div>
          </div>

          {stats && stats.items.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {stats.items.map((stat, index) => (
                <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 text-center border border-gray-100 hover:shadow-md transition">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-2 shadow-lg`}>
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl hover:shadow-md transition-all active:scale-[0.98] border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md`}>
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={logout}
              className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF8E8E]/10 rounded-2xl hover:from-[#FF6B6B]/20 hover:to-[#FF8E8E]/20 transition-all active:scale-[0.98] border border-[#FF6B6B]/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center shadow-md">
                  <LogOut className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-[#FF6B6B]">{lang === 'zh' ? '退出登录' : 'Log Out'}</div>
                  <div className="text-xs text-[#FF6B6B]/60">{lang === 'zh' ? '退出当前账户' : 'Sign out of your account'}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#FF6B6B]/60" />
            </button>
          </div>
        </div>
      </div>

      <BottomSheet
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        title={lang === 'zh' ? '编辑个人资料' : 'Edit Profile'}
      >
        <div className="p-5 space-y-5">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt={formData.name}
                    className="w-16 h-16 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-xl font-bold text-gray-500">{formData.name?.charAt(0) || 'U'}</span>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '头像' : 'Avatar'}</label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-all">
                    {lang === 'zh' ? '选择图片' : 'Choose'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarFile(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <button
                    onClick={() => setFormData((prev) => ({ ...prev, avatar: '' }))}
                    className="px-3 py-2 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
                  >
                    {lang === 'zh' ? '移除' : 'Remove'}
                  </button>
                </div>
                {formData.avatar && <p className="mt-2 text-xs text-gray-500 break-all">{formData.avatar}</p>}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#FF6B6B]/5 to-[#FF8E8E]/5 rounded-2xl p-4 border border-[#FF6B6B]/10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              {lang === 'zh' ? '姓名' : 'Name'}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '请输入姓名' : 'Enter your name'}
            />
          </div>

          <div className="bg-gradient-to-br from-[#4ECDC4]/5 to-[#7EDDD6]/5 rounded-2xl p-4 border border-[#4ECDC4]/10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-1" />
              {lang === 'zh' ? '邮箱' : 'Email'}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '请输入邮箱' : 'Enter your email'}
            />
          </div>

          <div className="bg-gradient-to-br from-[#A29BFE]/5 to-[#B8B3FF]/5 rounded-2xl p-4 border border-[#A29BFE]/10">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              {lang === 'zh' ? '电话' : 'Phone'}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A29BFE]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '请输入电话' : 'Enter your phone'}
            />
          </div>

          <div className="flex gap-3 pt-2 pb-20 md:pb-2">
            <button
              onClick={() => setShowEditProfile(false)}
              className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleUpdateProfile}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-[#FF6B6B]/30 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {lang === 'zh' ? '保存中...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {lang === 'zh' ? '保存' : 'Save'}
                </>
              )}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title={lang === 'zh' ? '设置' : 'Settings'}
      >
        <div className="p-5">
          <div className="flex gap-2 bg-gray-100 rounded-xl p-1 mb-5">
            {[
              { id: 'password', label: lang === 'zh' ? '密码' : 'Password', icon: Lock },
              { id: 'preferences', label: lang === 'zh' ? '偏好' : 'Preferences', icon: Bell },
              { id: 'account', label: lang === 'zh' ? '账户' : 'Account', icon: Shield },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id as any)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  settingsTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {settingsTab === 'password' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-[#FFE66D]/10 to-[#FFB347]/10 rounded-2xl p-4 border border-[#FFE66D]/20">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {lang === 'zh' ? '密码长度至少 6 位，建议包含大小写字母、数字和特殊字符' : 'Password must be at least 6 characters with mixed case, numbers, and symbols'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {lang === 'zh' ? '当前密码' : 'Current Password'}
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/20 hover:border-gray-200 transition-all"
                  placeholder={lang === 'zh' ? '请输入当前密码' : 'Enter current password'}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {lang === 'zh' ? '新密码' : 'New Password'}
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/20 hover:border-gray-200 transition-all"
                  placeholder={lang === 'zh' ? '请输入新密码' : 'Enter new password'}
                />
                {passwordData.newPassword && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 rounded-full ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-12">{passwordStrength.label}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {passwordStrength.checks.map((check, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs">
                          {check.passed ? (
                            <Check className="w-3.5 h-3.5 text-[#4ECDC4]" />
                          ) : (
                            <X className="w-3.5 h-3.5 text-gray-300" />
                          )}
                          <span className={check.passed ? 'text-[#4ECDC4]' : 'text-gray-400'}>
                            {check.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {lang === 'zh' ? '确认新密码' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/20 hover:border-gray-200 transition-all"
                  placeholder={lang === 'zh' ? '请再次输入新密码' : 'Confirm new password'}
                />
              </div>
              
              <button
                onClick={handleChangePassword}
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-[#4ECDC4]/30 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {lang === 'zh' ? '修改中...' : 'Changing...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {lang === 'zh' ? '修改密码' : 'Change Password'}
                  </>
                )}
              </button>
            </div>
          )}

          {settingsTab === 'preferences' && (
            <div className="space-y-5">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#FFE66D]" />
                  {lang === 'zh' ? '通知设置' : 'Notification Settings'}
                </h4>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl cursor-pointer hover:shadow-md transition border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">{lang === 'zh' ? '邮件通知' : 'Email Notifications'}</div>
                        <div className="text-xs text-gray-500">{lang === 'zh' ? '接收课程提醒' : 'Receive class reminders'}</div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications}
                        onChange={e => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-12 h-7 rounded-full transition-colors ${preferences.emailNotifications ? 'bg-[#4ECDC4]' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${preferences.emailNotifications ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl cursor-pointer hover:shadow-md transition border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] flex items-center justify-center">
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-700">{lang === 'zh' ? '短信通知' : 'SMS Notifications'}</div>
                        <div className="text-xs text-gray-500">{lang === 'zh' ? '接收重要提醒' : 'Receive important alerts'}</div>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={preferences.smsNotifications}
                        onChange={e => setPreferences({ ...preferences, smsNotifications: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-12 h-7 rounded-full transition-colors ${preferences.smsNotifications ? 'bg-[#4ECDC4]' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${preferences.smsNotifications ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#A29BFE]" />
                  {lang === 'zh' ? '语言设置' : 'Language Settings'}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPreferences({ ...preferences, language: 'zh' })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      preferences.language === 'zh'
                        ? 'border-[#A29BFE] bg-gradient-to-br from-[#A29BFE]/10 to-[#B8B3FF]/10 text-[#A29BFE]'
                        : 'border-gray-100 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">🇨🇳</span>
                    <span className="text-sm font-medium">中文</span>
                  </button>
                  <button
                    onClick={() => setPreferences({ ...preferences, language: 'en' })}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      preferences.language === 'en'
                        ? 'border-[#A29BFE] bg-gradient-to-br from-[#A29BFE]/10 to-[#B8B3FF]/10 text-[#A29BFE]'
                        : 'border-gray-100 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">🇺🇸</span>
                    <span className="text-sm font-medium">English</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'account' && (
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500">@{user?.username}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">{lang === 'zh' ? '账户 ID' : 'Account ID'}</span>
                    <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{user?.id?.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">{lang === 'zh' ? '用户名' : 'Username'}</span>
                    <span className="text-sm text-gray-900">{user?.username}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">{lang === 'zh' ? '角色' : 'Role'}</span>
                    <span className={`text-sm px-3 py-0.5 rounded-full ${getRoleColor(user?.role || '')}`}>
                      {getRoleName(user?.role || '')}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">{lang === 'zh' ? '注册时间' : 'Registered'}</span>
                    <span className="text-sm text-gray-900">2024-01-01</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-gray-500">{lang === 'zh' ? '最后登录' : 'Last Login'}</span>
                    <span className="text-sm text-gray-900">{lang === 'zh' ? '今天' : 'Today'} {format(new Date(), 'HH:mm')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showHelpCenter}
        onClose={() => setShowHelpCenter(false)}
        title={lang === 'zh' ? '帮助中心' : 'Help Center'}
      >
        <div className="p-5 space-y-4">
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#74B9FF]" />
              {lang === 'zh' ? '常见问题' : 'Frequently Asked Questions'}
            </h3>
            
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">{lang === 'zh' ? '如何添加新学员？' : 'How to add a new student?'}</h4>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '前往学员管理页面，点击右上角的「添加学员」按钮，填写学员信息后保存即可。' : 'Go to the Students page, click the "Add Student" button in the top right corner, fill in the student information and save.'}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">{lang === 'zh' ? '如何办理报名续课？' : 'How to handle registration and renewal?'}</h4>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '前往办理报名续课页面，选择学员和课程，填写相关信息后即可办理。' : 'Go to the Registration page, select the student and course, fill in the relevant information and process.'}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">{lang === 'zh' ? '如何修改个人信息？' : 'How to update personal information?'}</h4>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '在当前页面点击「个人资料」，可以编辑您的姓名、邮箱和电话号码。' : 'Click "Profile" on this page to edit your name, email, and phone number.'}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">{lang === 'zh' ? '数据会自动保存吗？' : 'Is data automatically saved?'}</h4>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '是的，您的数据会自动保存到本地存储中，刷新页面后数据不会丢失。' : 'Yes, your data is automatically saved to local storage and will not be lost after refreshing the page.'}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 border border-gray-100">
                <h4 className="font-medium text-gray-900 mb-2">{lang === 'zh' ? '如何联系客服？' : 'How to contact customer service?'}</h4>
                <p className="text-sm text-gray-600">{lang === 'zh' ? '如有任何问题，请通过邮箱 support@dreamyear.com 联系我们。' : 'If you have any questions, please contact us at support@dreamyear.com.'}</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="bg-gradient-to-br from-[#74B9FF]/10 to-[#A8E6CF]/10 rounded-2xl p-4 border border-[#74B9FF]/20">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#74B9FF] to-[#A8E6CF] flex items-center justify-center flex-shrink-0">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">{lang === 'zh' ? '感谢使用 DreamYear' : 'Thank you for using DreamYear'}</h4>
                  <p className="text-sm text-gray-600">{lang === 'zh' ? '我们致力于为您提供最好的教育管理体验。' : 'We are committed to providing you with the best educational management experience.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
