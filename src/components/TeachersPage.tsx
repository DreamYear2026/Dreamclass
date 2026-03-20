import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Mail, Loader2 } from 'lucide-react';
import { Language, Teacher } from '../types';
import { useTranslation } from '../i18n';
import { useCampuses, useTeachers } from '../contexts/AppContext';
import { useToast } from './Toast';
import TeacherForm from './TeacherForm';

type TeacherFormData = Partial<Teacher> & {
  username?: string;
  password?: string;
};

export default function TeachersPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { teachers, loading, addTeacher, updateTeacher, deleteTeacher } = useTeachers();
  const { selectedCampusId } = useCampuses();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const handleAddTeacher = useCallback(async (data: TeacherFormData) => {
    await addTeacher(data);
    showToast('教师添加成功', 'success');
  }, [addTeacher, showToast]);

  const handleUpdateTeacher = useCallback(async (id: string, data: TeacherFormData) => {
    await updateTeacher(id, data);
    showToast('教师信息更新成功', 'success');
  }, [updateTeacher, showToast]);

  const handleDeleteTeacher = useCallback(async (id: string) => {
    if (confirm('确定要删除这位教师吗？')) {
      await deleteTeacher(id);
      showToast('教师已删除', 'success');
    }
  }, [deleteTeacher, showToast]);

  const handleToggleStatus = useCallback(async (teacher: Teacher) => {
    const newStatus = teacher.status === 'active' ? 'inactive' : 'active';
    await updateTeacher(teacher.id, { status: newStatus });
    showToast(`教师已${newStatus === 'active' ? '启用' : '停用'}`, 'success');
  }, [updateTeacher, showToast]);

  const filteredTeachers = useMemo(() => teachers.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  ), [teachers, searchQuery]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h1 className="text-2xl font-bold text-gray-900">{t('manageTeachers')}</h1>
        <button
          onClick={() => {
            setEditingTeacher(null);
            setShowForm(true);
          }}
          className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center justify-center shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> {t('addTeacher')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索教师..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {filteredTeachers.map(teacher => (
            <div
              key={teacher.id}
              className={`p-4 rounded-xl border transition ${
                teacher.status === 'active' ? 'border-gray-100 bg-white' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={teacher.avatar || `https://picsum.photos/seed/${teacher.id}/100/100`}
                    alt={teacher.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900">{teacher.name}</h3>
                    <p className="text-sm text-indigo-600">{teacher.specialization}</p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    teacher.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {teacher.status === 'active' ? '在职' : '离职'}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                {teacher.phone && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    {teacher.phone}
                  </p>
                )}
                {teacher.email && (
                  <p className="text-sm text-gray-600 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    {teacher.email}
                  </p>
                )}
                {teacher.username && (
                  <p className="text-xs text-gray-500">账号：{teacher.username}</p>
                )}
              </div>

              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => handleToggleStatus(teacher)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition ${
                    teacher.status === 'active'
                      ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  }`}
                >
                  {teacher.status === 'active' ? '停用' : '启用'}
                </button>
                <button
                  onClick={() => {
                    setEditingTeacher(teacher);
                    setShowForm(true);
                  }}
                  className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                >
                  <Edit2 className="w-3 h-3 inline mr-1" /> 编辑
                </button>
                <button
                  onClick={() => handleDeleteTeacher(teacher.id)}
                  className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                >
                  <Trash2 className="w-3 h-3 inline mr-1" /> 删除
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTeachers.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? '没有找到匹配的教师' : '暂无教师数据'}
          </div>
        )}
      </div>

      {showForm && (
        <TeacherForm
          teacher={editingTeacher || undefined}
          onClose={() => {
            setShowForm(false);
            setEditingTeacher(null);
          }}
          onSave={async (data) => {
            if (editingTeacher) {
              await handleUpdateTeacher(editingTeacher.id, data);
            } else {
              await handleAddTeacher(data);
            }
          }}
        />
      )}
    </div>
  );
}
