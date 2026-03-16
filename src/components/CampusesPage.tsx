import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Users, BookOpen, Phone, MapPin, Loader2, X, Check } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useToast } from './Toast';
import { format } from 'date-fns';

interface Campus {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface CampusStats {
  students: number;
  teachers: number;
  courses: number;
}

export default function CampusesPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { showToast } = useToast();
  
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampus, setEditingCampus] = useState<Campus | null>(null);
  const [campusStats, setCampusStats] = useState<Record<string, CampusStats>>({});
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
  });

  useEffect(() => {
    fetchCampuses();
  }, []);

  const fetchCampuses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/campuses', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCampuses(data);
        
        const statsPromises = data.map(async (campus: Campus) => {
          const statsRes = await fetch(`/api/campuses/${campus.id}/stats`, { credentials: 'include' });
          if (statsRes.ok) {
            return { id: campus.id, stats: await statsRes.json() };
          }
          return { id: campus.id, stats: { students: 0, teachers: 0, courses: 0 } };
        });
        
        const statsResults = await Promise.all(statsPromises);
        const statsMap: Record<string, CampusStats> = {};
        statsResults.forEach(({ id, stats }) => {
          statsMap[id] = stats;
        });
        setCampusStats(statsMap);
      }
    } catch (error) {
      console.error('Failed to fetch campuses:', error);
      showToast(lang === 'zh' ? '获取校区失败' : 'Failed to fetch campuses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast(lang === 'zh' ? '请输入校区名称' : 'Please enter campus name', 'error');
      return;
    }

    try {
      if (editingCampus) {
        const res = await fetch(`/api/campuses/${editingCampus.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        
        if (res.ok) {
          showToast(lang === 'zh' ? '校区更新成功' : 'Campus updated', 'success');
          fetchCampuses();
          setShowForm(false);
          setEditingCampus(null);
          setFormData({ name: '', address: '', phone: '' });
        } else {
          const error = await res.json();
          showToast(error.error || 'Update failed', 'error');
        }
      } else {
        const res = await fetch('/api/campuses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        });
        
        if (res.ok) {
          showToast(lang === 'zh' ? '校区创建成功' : 'Campus created', 'success');
          fetchCampuses();
          setShowForm(false);
          setFormData({ name: '', address: '', phone: '' });
        } else {
          const error = await res.json();
          showToast(error.error || 'Creation failed', 'error');
        }
      }
    } catch (error) {
      showToast(lang === 'zh' ? '操作失败' : 'Operation failed', 'error');
    }
  };

  const handleEdit = (campus: Campus) => {
    setEditingCampus(campus);
    setFormData({
      name: campus.name,
      address: campus.address,
      phone: campus.phone,
    });
    setShowForm(true);
  };

  const handleDelete = async (campus: Campus) => {
    if (!confirm(lang === 'zh' ? `确定要删除 "${campus.name}" 吗？` : `Are you sure to delete "${campus.name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/campuses/${campus.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (res.ok) {
        showToast(lang === 'zh' ? '校区已删除' : 'Campus deleted', 'success');
        fetchCampuses();
      } else {
        const error = await res.json();
        showToast(error.error || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast(lang === 'zh' ? '删除失败' : 'Delete failed', 'error');
    }
  };

  const handleToggleStatus = async (campus: Campus) => {
    const newStatus = campus.status === 'active' ? 'inactive' : 'active';
    
    try {
      const res = await fetch(`/api/campuses/${campus.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (res.ok) {
        showToast(lang === 'zh' ? '状态已更新' : 'Status updated', 'success');
        fetchCampuses();
      }
    } catch (error) {
      showToast(lang === 'zh' ? '更新失败' : 'Update failed', 'error');
    }
  };

  const activeCampuses = campuses.filter(c => c.status === 'active');
  const inactiveCampuses = campuses.filter(c => c.status === 'inactive');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {lang === 'zh' ? '校区管理' : 'Campus Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? `${activeCampuses.length} 个活跃校区` : `${activeCampuses.length} active campuses`}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCampus(null);
            setFormData({ name: '', address: '', phone: '' });
            setShowForm(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {lang === 'zh' ? '添加校区' : 'Add Campus'}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{activeCampuses.length}</p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '活跃校区' : 'Active Campuses'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(campusStats).reduce((sum, s) => sum + s.students, 0)}
              </p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '总学员' : 'Total Students'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Object.values(campusStats).reduce((sum, s) => sum + s.teachers, 0)}
              </p>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '总教师' : 'Total Teachers'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {lang === 'zh' ? '校区列表' : 'Campus List'}
        </h2>
        
        {activeCampuses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{lang === 'zh' ? '暂无校区' : 'No campuses yet'}</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              {lang === 'zh' ? '添加第一个校区' : 'Add your first campus'}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {activeCampuses.map(campus => (
              <div key={campus.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                      {campus.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{campus.name}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {lang === 'zh' ? '活跃' : 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(campus)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(campus)}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      title={lang === 'zh' ? '停用' : 'Deactivate'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(campus)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm text-gray-600">
                  {campus.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{campus.address}</span>
                    </div>
                  )}
                  {campus.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{campus.phone}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{campusStats[campus.id]?.students || 0}</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '学员' : 'Students'}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{campusStats[campus.id]?.teachers || 0}</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '教师' : 'Teachers'}</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900">{campusStats[campus.id]?.courses || 0}</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '课程' : 'Courses'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {inactiveCampuses.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 mb-3">
              {lang === 'zh' ? '已停用校区' : 'Inactive Campuses'}
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {inactiveCampuses.map(campus => (
                <div key={campus.id} className="bg-gray-50 rounded-2xl p-5 border border-gray-200 opacity-75">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-300 flex items-center justify-center text-white font-bold">
                        {campus.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-600">{campus.name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                          {lang === 'zh' ? '已停用' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleStatus(campus)}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                      title={lang === 'zh' ? '启用' : 'Activate'}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowForm(false)} />
            
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingCampus 
                  ? (lang === 'zh' ? '编辑校区' : 'Edit Campus')
                  : (lang === 'zh' ? '添加校区' : 'Add Campus')
                }
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '校区名称' : 'Campus Name'} *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={lang === 'zh' ? '例如：总部校区' : 'e.g., Main Campus'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '地址' : 'Address'}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={lang === 'zh' ? '详细地址' : 'Full address'}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '联系电话' : 'Phone'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="010-88888888"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                  >
                    {editingCampus 
                      ? (lang === 'zh' ? '更新' : 'Update')
                      : (lang === 'zh' ? '创建' : 'Create')
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
