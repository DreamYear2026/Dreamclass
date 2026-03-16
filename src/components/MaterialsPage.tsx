import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Video, Music, Download, Upload, Search, Folder, Trash2, Loader2, Sparkles, Heart, Eye, X } from 'lucide-react';
import { Language, Material } from '../types';
import { useTranslation } from '../i18n';
import { useToast } from './Toast';
import { api } from '../services/api';

const typeIcons = {
  pdf: FileText,
  video: Video,
  audio: Music,
  sheet: Music,
};

const typeColors = {
  pdf: 'bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] text-white',
  video: 'bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] text-white',
  audio: 'bg-gradient-to-br from-[#A29BFE] to-[#B8B3FF] text-white',
  sheet: 'bg-gradient-to-br from-[#95E1A3] to-[#7DD389] text-white',
};

export default function MaterialsPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { showToast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newMaterial, setNewMaterial] = useState({
    title: '',
    type: 'pdf' as 'pdf' | 'video' | 'audio' | 'sheet',
    category: '教材',
    level: 'Beginner',
    description: '',
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await api.getMaterials();
      setMaterials(data);
    } catch (error) {
      showToast('获取资料列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const categories = useMemo(() => {
    const cats = new Set(materials.map(m => m.category));
    return ['all', ...Array.from(cats)];
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || m.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, categoryFilter]);

  const handleUpload = async () => {
    if (!newMaterial.title.trim()) {
      showToast('请输入资料标题', 'error');
      return;
    }

    setUploading(true);
    try {
      await api.addMaterial({
        title: newMaterial.title,
        type: newMaterial.type,
        category: newMaterial.category,
        level: newMaterial.level,
        description: newMaterial.description,
        filename: `${newMaterial.title.toLowerCase().replace(/\s+/g, '_')}.${newMaterial.type === 'pdf' ? 'pdf' : newMaterial.type === 'video' ? 'mp4' : newMaterial.type === 'audio' ? 'mp3' : 'pdf'}`,
        size: '0 MB',
        uploadedBy: 'admin',
      });
      
      await fetchMaterials();
      setShowUploadModal(false);
      setNewMaterial({
        title: '',
        type: 'pdf',
        category: '教材',
        level: 'Beginner',
        description: '',
      });
      showToast('资料上传成功', 'success');
    } catch (error) {
      showToast('上传失败', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (material: Material) => {
    showToast(`开始下载: ${material.title}`, 'success');
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个资料吗？')) {
      try {
        await api.deleteMaterial(id);
        await fetchMaterials();
        showToast('资料已删除', 'success');
      } catch (error) {
        showToast('删除失败', 'error');
      }
    }
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            {t('navMaterials')}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Heart className="w-4 h-4 text-[#FF6B6B]" />
            {lang === 'zh' ? '管理教学资料和课程资源' : 'Manage teaching materials and resources'}
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white px-4 py-2.5 rounded-xl hover:from-[#E85555] hover:to-[#FF6B6B] transition flex items-center justify-center shadow-lg shadow-[#FF6B6B]/30"
        >
          <Upload className="w-4 h-4 mr-2" /> {lang === 'zh' ? '上传资料' : 'Upload'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  categoryFilter === cat
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {cat === 'all' ? '全部' : cat}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索资料..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMaterials.map(material => {
          const Icon = typeIcons[material.type];
          return (
            <div key={material.id} className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${typeColors[material.type]} shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleDownload(material)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#4ECDC4] transition"
                    title={lang === 'zh' ? '下载' : 'Download'}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(material.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#FF6B6B] transition"
                    title={lang === 'zh' ? '删除' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="mt-4 font-bold text-gray-900 line-clamp-1">{material.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{material.description}</p>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100">
                  {material.level}
                </span>
                <span>{material.size}</span>
              </div>

              <div className="mt-2 text-xs text-gray-400">
                上传于 {material.uploadDate}
              </div>
            </div>
          );
        })}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
          <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>暂无学习资料</p>
        </div>
      )}

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">上传学习资料</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-indigo-400 transition cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">点击或拖拽文件到此处上传</p>
                <p className="text-xs text-gray-400 mt-1">支持 PDF, MP4, MP3, 图片等格式</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">资料标题 *</label>
                <input
                  type="text"
                  value={newMaterial.title}
                  onChange={e => setNewMaterial({ ...newMaterial, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="输入资料标题"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                  <select
                    value={newMaterial.type}
                    onChange={e => setNewMaterial({ ...newMaterial, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="video">视频</option>
                    <option value="audio">音频</option>
                    <option value="sheet">乐谱</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                  <select
                    value={newMaterial.category}
                    onChange={e => setNewMaterial({ ...newMaterial, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>教材</option>
                    <option>视频</option>
                    <option>乐谱</option>
                    <option>音频</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">级别</label>
                <select
                  value={newMaterial.level}
                  onChange={e => setNewMaterial({ ...newMaterial, level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newMaterial.description}
                  onChange={e => setNewMaterial({ ...newMaterial, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[60px]"
                  placeholder="简要描述资料内容..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? '上传中...' : '上传'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
