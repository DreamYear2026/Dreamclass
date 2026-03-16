import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserPlus, Search, Edit2, Trash2, Shield, Key, Eye, EyeOff, Loader2, Sparkles, Heart, Star, ChevronRight, Check, X } from 'lucide-react';
import { Language, User } from '../types';
import { useToast } from './Toast';
import { api } from '../services/api';

interface UserManagementProps {
  lang: Language;
}

const roleConfig = {
  admin: { label: '管理员', color: 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white', icon: Shield },
  teacher: { label: '教师', color: 'bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white', icon: Users },
  parent: { label: '家长', color: 'bg-gradient-to-r from-[#A29BFE] to-[#B8B3FF] text-white', icon: Users },
};

const permissionOptions = [
  { id: 'students', label: '学员管理', description: '查看、添加、编辑、删除学员信息' },
  { id: 'teachers', label: '教师管理', description: '查看、添加、编辑、删除教师信息' },
  { id: 'schedule', label: '课程安排', description: '安排、调整、取消课程' },
  { id: 'finance', label: '财务管理', description: '查看财务报表、收支记录' },
  { id: 'messages', label: '消息通知', description: '发送系统通知、群发消息' },
  { id: 'settings', label: '系统设置', description: '修改系统配置、级别管理' },
  { id: 'reports', label: '数据报表', description: '查看数据分析、导出报表' },
  { id: 'materials', label: '教学资源', description: '上传、管理教学资料' },
];

export default function UserManagement({ lang }: UserManagementProps) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'teacher' as 'admin' | 'teacher' | 'parent',
    permissions: [] as string[],
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      showToast(lang === 'zh' ? '加载用户失败' : 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const handleAddUser = async () => {
    if (!formData.username.trim() || !formData.password.trim() || !formData.name.trim()) {
      showToast(lang === 'zh' ? '请填写完整信息' : 'Please fill all fields', 'error');
      return;
    }

    try {
      await api.addUser({
        username: formData.username,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        permissions: formData.permissions,
      });
      showToast(lang === 'zh' ? '用户添加成功' : 'User added successfully', 'success');
      setShowForm(false);
      resetForm();
      loadUsers();
    } catch (error) {
      showToast(lang === 'zh' ? '添加失败' : 'Failed to add user', 'error');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    if (!formData.name.trim()) {
      showToast(lang === 'zh' ? '请填写姓名' : 'Please enter name', 'error');
      return;
    }

    try {
      await api.updateUser(editingUser.id, {
        name: formData.name,
        role: formData.role,
        permissions: formData.permissions,
        ...(formData.password ? { password: formData.password } : {}),
      });
      showToast(lang === 'zh' ? '用户更新成功' : 'User updated successfully', 'success');
      setShowForm(false);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (error) {
      showToast(lang === 'zh' ? '更新失败' : 'Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(lang === 'zh' ? '确定要删除该用户吗？' : 'Are you sure to delete this user?')) return;

    try {
      await api.deleteUser(userId);
      showToast(lang === 'zh' ? '用户删除成功' : 'User deleted successfully', 'success');
      loadUsers();
    } catch (error) {
      showToast(lang === 'zh' ? '删除失败' : 'Failed to delete user', 'error');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      name: user.name,
      role: user.role,
      permissions: user.permissions || [],
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      name: '',
      role: 'teacher',
      permissions: [],
    });
  };

  const togglePermission = (permissionId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-[#FF6B6B] animate-spin mx-auto" />
            <Sparkles className="w-6 h-6 text-[#FFE66D] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="mt-4 text-gray-500">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            {lang === 'zh' ? '用户管理' : 'User Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Heart className="w-4 h-4 text-[#FF6B6B]" />
            {lang === 'zh' ? '管理教师和家长账号及权限' : 'Manage teacher and parent accounts'}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingUser(null);
            setShowForm(true);
          }}
          className="w-full sm:w-auto bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white px-4 py-2.5 rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 shadow-md shadow-[#FF6B6B]/30"
        >
          <UserPlus className="w-4 h-4" />
          {lang === 'zh' ? '添加用户' : 'Add User'}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '搜索用户名或姓名...' : 'Search username or name...'}
            />
          </div>
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 hover:border-gray-200 transition-all"
          >
            <option value="all">{lang === 'zh' ? '全部角色' : 'All Roles'}</option>
            <option value="admin">{lang === 'zh' ? '管理员' : 'Admin'}</option>
            <option value="teacher">{lang === 'zh' ? '教师' : 'Teacher'}</option>
            <option value="parent">{lang === 'zh' ? '家长' : 'Parent'}</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredUsers.map(user => {
            const RoleIcon = roleConfig[user.role].icon;
            return (
              <div
                key={user.id}
                className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:shadow-md transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl ${roleConfig[user.role].color} flex items-center justify-center shadow-md`}>
                  <RoleIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 truncate">{user.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleConfig[user.role].color}`}>
                      {roleConfig[user.role].label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">@{user.username}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#4ECDC4] transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-[#FF6B6B] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{lang === 'zh' ? '暂无用户数据' : 'No users found'}</p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {editingUser ? (lang === 'zh' ? '编辑用户' : 'Edit User') : (lang === 'zh' ? '添加用户' : 'Add User')}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {editingUser ? (lang === 'zh' ? '修改用户信息和权限' : 'Update user info and permissions') : (lang === 'zh' ? '创建新的用户账号' : 'Create a new user account')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-gradient-to-br from-[#FF6B6B]/5 to-[#FF8E8E]/5 rounded-2xl p-4 border border-[#FF6B6B]/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-lg flex items-center justify-center">
                    <Key className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">{lang === 'zh' ? '账号信息' : 'Account Info'}</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {lang === 'zh' ? '用户名' : 'Username'}
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      disabled={!!editingUser}
                      className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 hover:border-gray-200 transition-all disabled:bg-gray-50 disabled:text-gray-500"
                      placeholder={lang === 'zh' ? '请输入用户名' : 'Enter username'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {lang === 'zh' ? '密码' : 'Password'}
                      {editingUser && <span className="text-xs text-gray-400 ml-2">({lang === 'zh' ? '留空则不修改' : 'Leave empty to keep'})</span>}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 pr-12 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 hover:border-gray-200 transition-all"
                        placeholder={lang === 'zh' ? '请输入密码' : 'Enter password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {lang === 'zh' ? '姓名' : 'Name'}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 hover:border-gray-200 transition-all"
                      placeholder={lang === 'zh' ? '请输入姓名' : 'Enter name'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {lang === 'zh' ? '角色' : 'Role'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(roleConfig).map(([role, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setFormData({ ...formData, role: role as any })}
                            className={`p-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1 ${
                              formData.role === role
                                ? config.color + ' shadow-md'
                                : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-200'
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#4ECDC4]/5 to-[#7EDDD6]/5 rounded-2xl p-4 border border-[#4ECDC4]/10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] rounded-lg flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900">{lang === 'zh' ? '权限设置' : 'Permissions'}</h3>
                </div>
                
                <div className="space-y-2">
                  {permissionOptions.map(permission => (
                    <button
                      key={permission.id}
                      type="button"
                      onClick={() => togglePermission(permission.id)}
                      className={`w-full p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                        formData.permissions.includes(permission.id)
                          ? 'bg-gradient-to-r from-[#4ECDC4]/10 to-[#7EDDD6]/10 border border-[#4ECDC4]/30'
                          : 'bg-white border border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        formData.permissions.includes(permission.id)
                          ? 'bg-[#4ECDC4] text-white'
                          : 'bg-gray-100'
                      }`}>
                        {formData.permissions.includes(permission.id) && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{permission.label}</p>
                        <p className="text-xs text-gray-500">{permission.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2 pb-20 md:pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={editingUser ? handleUpdateUser : handleAddUser}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white font-medium hover:shadow-lg hover:shadow-[#4ECDC4]/30 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {editingUser ? (lang === 'zh' ? '保存修改' : 'Save Changes') : (lang === 'zh' ? '添加用户' : 'Add User')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
