import React, { useState, useEffect } from 'react';
import { X, User, Phone, BookOpen, Plus, Tag, Building, Clock, Sparkles, Heart, Star } from 'lucide-react';
import { Student, Campus } from '../types';
import { getSystemSettings } from './SettingsPage';

interface StudentFormProps {
  student?: Student;
  onClose: () => void;
  onSave: (data: Omit<Student, 'id'>) => Promise<void>;
  inline?: boolean;
  campuses?: Campus[];
}

export default function StudentForm({ student, onClose, onSave, inline = false, campuses = [] }: StudentFormProps) {
  const systemSettings = getSystemSettings();
  
  const levelGroups = [
    { name: '基础级别', levels: systemSettings.levels.filter(l => ['入门', '初级', 'Beginner'].includes(l) || l.includes('基础') || l.includes('初')) },
    { name: '进阶级别', levels: systemSettings.levels.filter(l => ['进阶', '中级', 'Intermediate'].includes(l) || l.includes('进阶') || l.includes('中')) },
    { name: '高级级别', levels: systemSettings.levels.filter(l => ['精通', '高级', 'Advanced'].includes(l) || l.includes('高级') || l.includes('精通')) },
    { name: '考级级别', levels: systemSettings.levels.filter(l => ['一级', '二级', '三级', '四级', '五级', '六级'].includes(l) || l.includes('级')) },
  ].filter(g => g.levels.length > 0);

  const statuses = systemSettings.statuses.map(s => ({
    value: s.value as 'active' | 'paused' | 'graduated' | 'transferred',
    label: s.label,
    color: `bg-[${s.color}] text-white`
  }));
  const [formData, setFormData] = useState({
    name: student?.name || '',
    age: student?.age || 8,
    level: student?.level || 'Beginner',
    parentName: student?.parentName || '',
    parentPhone: student?.parentPhone || '',
    remainingHours: student?.remainingHours || 10,
    status: student?.status || 'active' as const,
    tags: student?.tags || [],
    campusId: student?.campusId || '',
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showLevelSelector, setShowLevelSelector] = useState(false);

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
    if (formData.remainingHours < 0) newErrors.remainingHours = '课时数不能为负数';
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.submit && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-center gap-2">
          <X className="w-4 h-4" />
          {errors.submit}
        </div>
      )}

      {/* 学员基本信息 */}
      <div className="bg-gradient-to-br from-[#FF6B6B]/5 to-[#FF8E8E]/5 rounded-2xl p-5 border border-[#FF6B6B]/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-lg flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900">学员信息</h3>
          <Sparkles className="w-4 h-4 text-[#FFE66D] ml-auto" />
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              学员姓名 <span className="text-[#FF6B6B]">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 transition-all ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
              placeholder="请输入学员姓名"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><X className="w-3 h-3" />{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">年龄</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.age}
                  onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 transition-all ${
                    errors.age ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                  min={3}
                  max={18}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">岁</span>
              </div>
              {errors.age && <p className="text-xs text-red-500 mt-1.5">{errors.age}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">初始课时</label>
              <div className="relative">
                <input
                  type="number"
                  value={formData.remainingHours}
                  onChange={e => setFormData({ ...formData, remainingHours: parseInt(e.target.value) || 0 })}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6B6B]/20 transition-all ${
                    errors.remainingHours ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'
                  }`}
                  min={0}
                />
                <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
              {errors.remainingHours && <p className="text-xs text-red-500 mt-1.5">{errors.remainingHours}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* 学习级别 */}
      <div className="bg-gradient-to-br from-[#4ECDC4]/5 to-[#7EDDD6]/5 rounded-2xl p-5 border border-[#4ECDC4]/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900">学习级别</h3>
        </div>
        
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLevelSelector(!showLevelSelector)}
            className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl text-left flex items-center justify-between hover:border-gray-200 transition-all"
          >
            <span className={formData.level ? 'text-gray-900' : 'text-gray-400'}>
              {formData.level || '选择级别'}
            </span>
            <X className={`w-4 h-4 text-gray-400 transition-transform ${showLevelSelector ? 'rotate-45' : ''}`} />
          </button>
          
          {showLevelSelector && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-10 p-4 animate-scale-in">
              {levelGroups.map(group => (
                <div key={group.name} className="mb-4 last:mb-0">
                  <p className="text-xs text-gray-500 mb-2 font-medium">{group.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.levels.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, level });
                          setShowLevelSelector(false);
                        }}
                        className={`px-3 py-1.5 text-sm rounded-xl transition-all ${
                          formData.level === level
                            ? 'bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white shadow-md'
                            : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 状态和校区 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-[#95E1A3]/5 to-[#7DD389]/5 rounded-2xl p-5 border border-[#95E1A3]/10">
          <label className="block text-sm font-medium text-gray-700 mb-3">学员状态</label>
          <div className="space-y-2">
            {statuses.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setFormData({ ...formData, status: s.value })}
                className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  formData.status === s.value ? s.color + ' shadow-md' : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#A29BFE]/5 to-[#B8B3FF]/5 rounded-2xl p-5 border border-[#A29BFE]/10">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            <Building className="w-4 h-4 inline mr-1" />
            所属校区
          </label>
          <select
            value={formData.campusId}
            onChange={e => setFormData({ ...formData, campusId: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A29BFE]/20 hover:border-gray-200 transition-all"
          >
            <option value="">无校区</option>
            {campuses.map(campus => (
              <option key={campus.id} value={campus.id}>{campus.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 标签 */}
      <div className="bg-gradient-to-br from-[#FFE66D]/5 to-[#FFB347]/5 rounded-2xl p-5 border border-[#FFE66D]/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FFE66D] to-[#FFB347] rounded-lg flex items-center justify-center">
            <Tag className="w-4 h-4 text-gray-800" />
          </div>
          <h3 className="font-bold text-gray-900">标签</h3>
        </div>
        
        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#FFE66D]/20 to-[#FFB347]/20 text-amber-800 rounded-full text-sm font-medium"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-600 transition-colors"
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
            className="flex-1 px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFE66D]/20 hover:border-gray-200 transition-all"
            placeholder="输入标签后按回车添加"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-3 bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-gray-800 rounded-xl hover:shadow-lg transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 家长信息 */}
      <div className="bg-gradient-to-br from-[#FD79A8]/5 to-[#FFB8D0]/5 rounded-2xl p-5 border border-[#FD79A8]/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-[#FD79A8] to-[#FFB8D0] rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-gray-900">家长信息</h3>
          <Star className="w-4 h-4 text-[#FFE66D] ml-auto" />
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              家长姓名 <span className="text-[#FD79A8]">*</span>
            </label>
            <input
              type="text"
              value={formData.parentName}
              onChange={e => setFormData({ ...formData, parentName: e.target.value })}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FD79A8]/20 transition-all ${
                errors.parentName ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
              placeholder="请输入家长姓名"
            />
            {errors.parentName && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><X className="w-3 h-3" />{errors.parentName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              联系电话 <span className="text-[#FD79A8]">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={formData.parentPhone}
                onChange={e => setFormData({ ...formData, parentPhone: e.target.value })}
                className={`w-full px-4 py-3 pl-11 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FD79A8]/20 transition-all ${
                  errors.parentPhone ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
                placeholder="例如: 138-0013-8000"
              />
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            {errors.parentPhone && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><X className="w-3 h-3" />{errors.parentPhone}</p>}
          </div>
        </div>
      </div>

      {/* 提交按钮 */}
      <div className="flex gap-3 pt-2 pb-20 md:pb-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-all"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-[#FF6B6B]/30 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              保存
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {student ? '编辑学员' : '添加学员'}
              </h2>
              <p className="text-xs text-gray-500">
                {student ? '修改学员信息' : '填写学员基本信息'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          {formContent}
        </div>
      </div>
    </div>
  );
}
