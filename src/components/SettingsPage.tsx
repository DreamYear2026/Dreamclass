import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2, Save, X, BookOpen, Building2, Sparkles, Heart, Check, ChevronRight } from 'lucide-react';
import { Language } from '../types';
import { useToast } from './Toast';

interface SystemSettings {
  levels: string[];
  statuses: { value: string; label: string; color: string }[];
  tags: string[];
}

const defaultSettings: SystemSettings = {
  levels: ['入门', '初级', '中级', '高级', '精通', '一级', '二级', '三级', '四级', '五级', '六级'],
  statuses: [
    { value: 'active', label: '在读', color: '#95E1A3' },
    { value: 'paused', label: '暂停', color: '#FFE66D' },
    { value: 'graduated', label: '毕业', color: '#4ECDC4' },
    { value: 'transferred', label: '转校', color: '#A29BFE' },
  ],
  tags: ['钢琴', '舞蹈', '美术', '声乐', '吉他', '小提琴'],
};

export default function SettingsPage({ lang }: { lang: Language }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'levels' | 'statuses' | 'tags'>('levels');
  
  const [newLevel, setNewLevel] = useState('');
  const [newTag, setTag] = useState('');
  const [editingStatus, setEditingStatus] = useState<number | null>(null);
  const [statusForm, setStatusForm] = useState({ value: '', label: '', color: '#95E1A3' });

  useEffect(() => {
    const saved = localStorage.getItem('systemSettings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }, []);

  const saveSettings = async (newSettings: SystemSettings) => {
    setLoading(true);
    try {
      localStorage.setItem('systemSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      showToast(lang === 'zh' ? '设置已保存' : 'Settings saved', 'success');
    } catch (error) {
      showToast(lang === 'zh' ? '保存失败' : 'Failed to save', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLevel = () => {
    if (!newLevel.trim()) return;
    if (settings.levels.includes(newLevel.trim())) {
      showToast(lang === 'zh' ? '该级别已存在' : 'Level already exists', 'error');
      return;
    }
    saveSettings({ ...settings, levels: [...settings.levels, newLevel.trim()] });
    setNewLevel('');
  };

  const handleRemoveLevel = (level: string) => {
    saveSettings({ ...settings, levels: settings.levels.filter(l => l !== level) });
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (settings.tags.includes(newTag.trim())) {
      showToast(lang === 'zh' ? '该标签已存在' : 'Tag already exists', 'error');
      return;
    }
    saveSettings({ ...settings, tags: [...settings.tags, newTag.trim()] });
    setTag('');
  };

  const handleRemoveTag = (tag: string) => {
    saveSettings({ ...settings, tags: settings.tags.filter(t => t !== tag) });
  };

  const handleAddStatus = () => {
    if (!statusForm.value.trim() || !statusForm.label.trim()) {
      showToast(lang === 'zh' ? '请填写完整信息' : 'Please fill all fields', 'error');
      return;
    }
    if (settings.statuses.some(s => s.value === statusForm.value)) {
      showToast(lang === 'zh' ? '该状态值已存在' : 'Status value already exists', 'error');
      return;
    }
    saveSettings({ ...settings, statuses: [...settings.statuses, { ...statusForm }] });
    setStatusForm({ value: '', label: '', color: '#95E1A3' });
  };

  const handleUpdateStatus = (index: number) => {
    const newStatuses = [...settings.statuses];
    newStatuses[index] = { ...statusForm };
    saveSettings({ ...settings, statuses: newStatuses });
    setEditingStatus(null);
    setStatusForm({ value: '', label: '', color: '#95E1A3' });
  };

  const handleRemoveStatus = (index: number) => {
    if (settings.statuses.length <= 1) {
      showToast(lang === 'zh' ? '至少保留一个状态' : 'Keep at least one status', 'error');
      return;
    }
    saveSettings({ ...settings, statuses: settings.statuses.filter((_, i) => i !== index) });
  };

  const colorOptions = [
    { color: '#FF6B6B', name: '珊瑚红' },
    { color: '#4ECDC4', name: '青绿色' },
    { color: '#95E1A3', name: '浅绿色' },
    { color: '#FFE66D', name: '明黄色' },
    { color: '#A29BFE', name: '淡紫色' },
    { color: '#FD79A8', name: '粉红色' },
    { color: '#74B9FF', name: '天蓝色' },
    { color: '#FFB347', name: '橙色' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#A29BFE] to-[#FD79A8] bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            {lang === 'zh' ? '系统设置' : 'System Settings'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Heart className="w-4 h-4 text-[#FF6B6B]" />
            {lang === 'zh' ? '自定义学习级别、学员状态和标签' : 'Customize levels, statuses and tags'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'levels', label: lang === 'zh' ? '学习级别' : 'Levels', icon: <BookOpen className="w-4 h-4" />, emoji: '📚' },
          { id: 'statuses', label: lang === 'zh' ? '学员状态' : 'Statuses', icon: <Settings className="w-4 h-4" />, emoji: '⚙️' },
          { id: 'tags', label: lang === 'zh' ? '标签管理' : 'Tags', icon: <Sparkles className="w-4 h-4" />, emoji: '🏷️' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#A29BFE] to-[#B8B3FF] text-white shadow-lg shadow-[#A29BFE]/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'levels' && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 animate-slide-in">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{lang === 'zh' ? '学习级别管理' : 'Level Management'}</h2>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '添加或删除学员学习级别选项' : 'Add or remove student level options'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {settings.levels.map((level, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#4ECDC4]/10 to-[#7EDDD6]/10 rounded-xl border border-[#4ECDC4]/20 group"
              >
                <span className="font-medium text-gray-700">{level}</span>
                <button
                  onClick={() => handleRemoveLevel(level)}
                  className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newLevel}
              onChange={e => setNewLevel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddLevel()}
              className="flex-1 px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '输入新级别名称' : 'Enter new level name'}
            />
            <button
              onClick={handleAddLevel}
              disabled={!newLevel.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {lang === 'zh' ? '添加' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'statuses' && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 animate-slide-in">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#95E1A3] to-[#7DD389] rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{lang === 'zh' ? '学员状态管理' : 'Status Management'}</h2>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '自定义学员状态选项和颜色' : 'Customize student status options and colors'}</p>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {settings.statuses.map((status, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100"
              >
                {editingStatus === index ? (
                  <>
                    <input
                      type="text"
                      value={statusForm.value}
                      onChange={e => setStatusForm({ ...statusForm, value: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-24"
                      placeholder="value"
                    />
                    <input
                      type="text"
                      value={statusForm.label}
                      onChange={e => setStatusForm({ ...statusForm, label: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1"
                      placeholder={lang === 'zh' ? '显示名称' : 'Display name'}
                    />
                    <div className="flex gap-1">
                      {colorOptions.map(c => (
                        <button
                          key={c.color}
                          onClick={() => setStatusForm({ ...statusForm, color: c.color })}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${
                            statusForm.color === c.color ? 'border-gray-800 scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c.color }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => handleUpdateStatus(index)}
                      className="p-2 bg-[#95E1A3] text-white rounded-lg hover:bg-opacity-80 transition"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingStatus(null);
                        setStatusForm({ value: '', label: '', color: '#95E1A3' });
                      }}
                      className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: status.color }}
                    >
                      {status.label.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{status.label}</p>
                      <p className="text-xs text-gray-500">值: {status.value}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingStatus(index);
                        setStatusForm({ value: status.value, label: status.label, color: status.color });
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveStatus(index)}
                      className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {editingStatus === null && (
            <div className="p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-dashed border-gray-200">
              <p className="text-sm text-gray-500 mb-3">{lang === 'zh' ? '添加新状态' : 'Add new status'}</p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={statusForm.value}
                  onChange={e => setStatusForm({ ...statusForm, value: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-24"
                  placeholder="value"
                />
                <input
                  type="text"
                  value={statusForm.label}
                  onChange={e => setStatusForm({ ...statusForm, label: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm flex-1"
                  placeholder={lang === 'zh' ? '显示名称' : 'Display name'}
                />
                <div className="flex gap-1">
                  {colorOptions.map(c => (
                    <button
                      key={c.color}
                      onClick={() => setStatusForm({ ...statusForm, color: c.color })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        statusForm.color === c.color ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
                <button
                  onClick={handleAddStatus}
                  disabled={!statusForm.value.trim() || !statusForm.label.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-[#95E1A3] to-[#7DD389] text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {lang === 'zh' ? '添加' : 'Add'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 animate-slide-in">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFE66D] to-[#FFB347] rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gray-800" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">{lang === 'zh' ? '标签管理' : 'Tag Management'}</h2>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '管理学员标签，用于分类和筛选' : 'Manage student tags for categorization'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {settings.tags.map((tag, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FFE66D]/20 to-[#FFB347]/20 rounded-xl border border-[#FFE66D]/30 group"
              >
                <span className="font-medium text-amber-800">{tag}</span>
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="p-1 rounded-lg hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={e => setTag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              className="flex-1 px-4 py-3 border-2 border-gray-100 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FFE66D]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '输入新标签名称' : 'Enter new tag name'}
            />
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="px-6 py-3 bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-gray-800 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {lang === 'zh' ? '添加' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-[#A29BFE]/10 to-[#FD79A8]/10 rounded-2xl p-5 border border-[#A29BFE]/20">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-[#A29BFE]" />
          <h3 className="font-bold text-gray-900">{lang === 'zh' ? '校区管理' : 'Campus Management'}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          {lang === 'zh' 
            ? '校区管理已移至专门的校区管理页面，您可以在侧边栏的"人员管理"分组中找到它。' 
            : 'Campus management has been moved to a dedicated page. You can find it in the "Management" section of the sidebar.'}
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: { tab: 'campuses' } }))}
          className="flex items-center gap-2 text-sm text-[#A29BFE] hover:text-[#FD79A8] transition-colors"
        >
          {lang === 'zh' ? '前往校区管理' : 'Go to Campus Management'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function getSystemSettings(): SystemSettings {
  const saved = localStorage.getItem('systemSettings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse settings:', e);
    }
  }
  return defaultSettings;
}
