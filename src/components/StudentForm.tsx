import React, { useState } from 'react';
import { X, User, Phone, Sparkles, ChevronDown, Calendar, MapPin, Tag, Heart } from 'lucide-react';
import { Student, Campus } from '../types';

interface StudentFormProps {
  student?: Student;
  onClose: () => void;
  onSave: (data: Omit<Student, 'id'>) => Promise<void>;
  inline?: boolean;
  campuses?: Campus[];
}

export default function StudentForm({ student, onClose, onSave, inline = false, campuses = [] }: StudentFormProps) {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    age: student?.age || 8,
    level: student?.level || 'Beginner',
    parentName: student?.parentName || '',
    parentPhone: student?.parentPhone || '',
    remainingHours: 0,
    status: student?.status || 'active' as const,
    tags: student?.tags || [],
    campusId: student?.campusId || '',
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = '请输入学员姓名';
    if (!formData.parentName.trim()) newErrors.parentName = '请输入家长姓名';
    if (!formData.parentPhone.trim()) newErrors.parentPhone = '请输入联系电话';
    else if (!/^[\d\-]+$/.test(formData.parentPhone)) newErrors.parentPhone = '电话格式不正确';
    if (formData.age < 3 || formData.age > 18) newErrors.age = '年龄应在 3-18 岁之间';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      setErrors({ submit: '保存失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.submit && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-center gap-2">
          <X className="w-4 h-4" />
          {errors.submit}
        </div>
      )}

      {/* 学员信息卡片 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">学员信息</span>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                学员姓名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm transition-all ${
                  errors.name 
                    ? 'border-red-200 bg-red-50 focus:border-red-400 focus:bg-white' 
                    : 'border-gray-100 bg-gray-50 focus:border-indigo-300 focus:bg-white'
                } focus:outline-none`}
                placeholder="请输入学员姓名"
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">年龄</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  className={`w-full px-4 py-3 border-2 rounded-xl text-sm transition-all ${
                    errors.age 
                      ? 'border-red-200 bg-red-50 focus:border-red-400 focus:bg-white' 
                      : 'border-gray-100 bg-gray-50 focus:border-indigo-300 focus:bg-white'
                  } focus:outline-none`}
                  min={3}
                  max={18}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">岁</span>
              </div>
              {errors.age && <p className="text-xs text-red-500 mt-1">{errors.age}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 家长信息卡片 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-amber-400 rounded-lg flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-gray-800 text-sm">家长信息</span>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                家长姓名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.parentName}
                onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                className={`w-full px-4 py-3 border-2 rounded-xl text-sm transition-all ${
                  errors.parentName 
                    ? 'border-red-200 bg-red-50 focus:border-red-400 focus:bg-white' 
                    : 'border-gray-100 bg-gray-50 focus:border-indigo-300 focus:bg-white'
                } focus:outline-none`}
                placeholder="请输入家长姓名"
              />
              {errors.parentName && <p className="text-xs text-red-500 mt-1">{errors.parentName}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                联系电话 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.parentPhone}
                  onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                  className={`w-full px-4 py-3 pl-10 border-2 rounded-xl text-sm transition-all ${
                    errors.parentPhone 
                      ? 'border-red-200 bg-red-50 focus:border-red-400 focus:bg-white' 
                      : 'border-gray-100 bg-gray-50 focus:border-indigo-300 focus:bg-white'
                  } focus:outline-none`}
                  placeholder="138-0013-8000"
                />
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              {errors.parentPhone && <p className="text-xs text-red-500 mt-1">{errors.parentPhone}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 更多选项 */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full py-3 text-sm text-gray-500 flex items-center justify-center gap-1.5 hover:text-gray-700 transition-colors bg-white rounded-2xl shadow-sm"
      >
        <span className="font-medium">{showAdvanced ? '收起更多选项' : '展开更多选项'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      {showAdvanced && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-emerald-50 to-teal-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-emerald-400 to-teal-400 rounded-lg flex items-center justify-center">
                <Tag className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-gray-800 text-sm">扩展信息</span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">学员状态</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as 'active' | 'paused' | 'graduated' | 'transferred' })}
                  className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none"
                >
                  <option value="active">在读</option>
                  <option value="paused">暂停</option>
                  <option value="graduated">毕业</option>
                  <option value="transferred">转校</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">所属校区</label>
                <div className="relative">
                  <select
                    value={formData.campusId}
                    onChange={e => setFormData({ ...formData, campusId: e.target.value })}
                    className="w-full px-4 py-3 pl-10 border-2 border-gray-100 bg-gray-50 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none"
                  >
                    <option value="">无校区</option>
                    {campuses.map(campus => (
                      <option key={campus.id} value={campus.id}>{campus.name}</option>
                    ))}
                  </select>
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">标签</label>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 rounded-full text-xs font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-sm focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
                  placeholder="输入标签后按回车"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部按钮 */}
      <div className="flex gap-3 pt-2 pb-24 md:pb-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold disabled:opacity-50 hover:shadow-xl hover:shadow-indigo-200 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              保存学员
            </>
          )}
        </button>
      </div>
    </form>
  );

  if (inline) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 animate-fade-in">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={onClose}
            className="text-gray-600 text-base font-medium"
          >
            取消
          </button>
          <h1 className="text-base font-bold text-gray-900">
            {student ? '编辑学员' : '添加学员'}
          </h1>
          <div className="w-12" />
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {formContent}
      </div>
    </div>
  );
}
