import React, { useState } from 'react';
import { X, User, Phone, Mail, BookOpen, School } from 'lucide-react';
import { Teacher } from '../types';
import { useAppData } from '../contexts/AppContext';

type TeacherFormData = Partial<Teacher> & {
  username?: string;
  password?: string;
};

interface TeacherFormProps {
  teacher?: Teacher;
  onClose: () => void;
  onSave: (data: TeacherFormData) => Promise<void>;
}

const specializations = ['Piano', 'Violin', 'Guitar', 'Voice', 'Music Theory', 'Drums', 'Flute'];

export default function TeacherForm({ teacher, onClose, onSave }: TeacherFormProps) {
  const { campuses, selectedCampusId } = useAppData();
  const [formData, setFormData] = useState({
    name: teacher?.name || '',
    phone: teacher?.phone || '',
    email: teacher?.email || '',
    specialization: teacher?.specialization || 'Piano',
    status: teacher?.status || 'active',
    campusId: teacher?.campusId || selectedCampusId || '',
    username: teacher?.username || '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = '请输入教师姓名';
    if (formData.phone && !/^[\d\-]+$/.test(formData.phone)) newErrors.phone = '电话格式不正确';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '邮箱格式不正确';
    }
    if (formData.username && (!teacher?.userId || !teacher?.username) && !formData.password) {
      newErrors.password = '设置账号时必须填写密码';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSave({ ...formData, username: formData.username?.trim() });
      onClose();
    } catch (error) {
      setErrors({ submit: '保存失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto my-6">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {teacher ? '编辑教师' : '添加教师'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {errors.submit}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="w-4 h-4 inline mr-1" />
              教师姓名 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="请输入教师姓名"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline mr-1" />
              联系电话
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.phone ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="例如: 138-0013-8000"
            />
            {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="w-4 h-4 inline mr-1" />
              电子邮箱
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.email ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="例如: teacher@pianoedu.com"
            />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <School className="w-4 h-4 inline mr-1" />
              所属校区
            </label>
            <select
              value={formData.campusId}
              onChange={e => setFormData({ ...formData, campusId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">未分配校区</option>
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <BookOpen className="w-4 h-4 inline mr-1" />
              专业方向
            </label>
            <select
              value={formData.specialization}
              onChange={e => setFormData({ ...formData, specialization: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {specializations.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">教师账号</label>
            <input
              type="text"
              value={formData.username}
              onChange={e => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="不填写则不绑定账号"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {teacher?.userId && teacher?.username ? '重置密码（可选）' : '账号密码（设置账号时必填）'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.password ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="请输入密码"
            />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
          </div>

          {teacher && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="active">在职</option>
                <option value="inactive">离职</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
