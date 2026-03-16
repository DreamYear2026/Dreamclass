import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Phone, Loader2, Download, ArrowUp, ArrowDown, ChevronRight, Clock, User, Users, AlertTriangle, BookOpen, TrendingUp, Filter, MoreVertical, CheckSquare, Square, X, Save, MessageSquare, DollarSign, Upload, FileText, Sparkles, Star, Heart } from 'lucide-react';
import { Language, Student } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useCourses, useCampuses } from '../contexts/AppContext';
import { useToast } from './Toast';
import StudentForm from './StudentForm';
import StudentDetail from './StudentDetail';
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/export';
import { parseCSV, parseExcel, downloadTemplate, ImportResult } from '../utils/import';
import { api } from '../services/api';
import Pagination from './Pagination';
import { TableSkeleton, StatCardSkeleton, Skeleton } from './Skeleton';
import FloatingActionButton from './FloatingActionButton';
import BottomSheet from './BottomSheet';
import { useDebounce } from '../hooks/useDebounce';
import { format, parseISO, isAfter, subDays } from 'date-fns';

type SortField = 'name' | 'level' | 'remainingHours' | 'age';
type SortOrder = 'asc' | 'desc';

interface StudentsPageProps {
  lang: Language;
  initialHoursFilter?: string;
}

export default function StudentsPage({ lang, initialHoursFilter }: StudentsPageProps) {
  const { t } = useTranslation(lang);
  const { students, loading, refreshStudents, addStudent, updateStudent } = useStudents();
  const { courses } = useCourses();
  const { campuses } = useCampuses();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [levelFilter, setLevelFilter] = useState('all');
  const [hoursFilter, setHoursFilter] = useState(() => {
    const savedFilter = localStorage.getItem('studentsHoursFilter');
    if (savedFilter) {
      localStorage.removeItem('studentsHoursFilter');
      return savedFilter;
    }
    return initialHoursFilter || 'all';
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('remainingHours');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [showBatchHoursModal, setShowBatchHoursModal] = useState(false);
  const [batchHoursAdjustment, setBatchHoursAdjustment] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const levels = useMemo(() => {
    const levelSet = new Set(students.map(s => s.level));
    return ['all', ...Array.from(levelSet)];
  }, [students]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    students.forEach(s => s.tags?.forEach(t => tagSet.add(t)));
    return ['all', ...Array.from(tagSet)];
  }, [students]);

  const statuses = [
    { value: 'all', label: '全部状态' },
    { value: 'active', label: '在读' },
    { value: 'paused', label: '暂停' },
    { value: 'graduated', label: '毕业' },
    { value: 'transferred', label: '转校' },
  ];

  const filteredStudents = useMemo(() => {
    let filtered = students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        s.parentName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        s.parentPhone.includes(debouncedSearchQuery);
      const matchesLevel = levelFilter === 'all' || s.level === levelFilter;
      const matchesStatus = statusFilter === 'all' || (s.status || 'active') === statusFilter;
      const matchesTag = tagFilter === 'all' || (s.tags?.includes(tagFilter) || false);
      let matchesHours = true;
      if (hoursFilter === 'low') matchesHours = s.remainingHours < 5;
      else if (hoursFilter === 'medium') matchesHours = s.remainingHours >= 5 && s.remainingHours < 15;
      else if (hoursFilter === 'high') matchesHours = s.remainingHours >= 15;
      return matchesSearch && matchesLevel && matchesStatus && matchesTag && matchesHours;
    });

    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN');
          break;
        case 'level':
          const levelOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
          comparison = (levelOrder[a.level as keyof typeof levelOrder] || 0) - (levelOrder[b.level as keyof typeof levelOrder] || 0);
          break;
        case 'remainingHours':
          comparison = a.remainingHours - b.remainingHours;
          break;
        case 'age':
          comparison = a.age - b.age;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [students, debouncedSearchQuery, levelFilter, hoursFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 inline ml-1" /> : <ArrowDown className="w-3 h-3 inline ml-1" />;
  };

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredStudents.length / pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredStudents.length, currentPage, totalPages]);

  useEffect(() => {
    setShowBatchActions(selectedIds.size > 0);
  }, [selectedIds]);

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedStudents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedStudents.map(s => s.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleAddStudent = async (data: Omit<Student, 'id'>) => {
    await addStudent(data);
    showToast('学员添加成功', 'success');
  };

  const handleUpdateStudent = async (id: string, data: Partial<Student>) => {
    await updateStudent(id, data);
    showToast('学员信息更新成功', 'success');
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm('确定要删除这位学员吗？此操作将同时删除该学员的所有相关数据（课程、考勤、反馈、缴费记录）。')) {
      try {
        await api.deleteStudent(id);
        await refreshStudents();
        showToast('学员已删除', 'success');
      } catch (error) {
        showToast('删除失败', 'error');
      }
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`确定要删除选中的 ${selectedIds.size} 位学员吗？此操作不可撤销。`)) {
      try {
        for (const id of selectedIds) {
          await api.deleteStudent(id);
        }
        await refreshStudents();
        setSelectedIds(new Set());
        showToast(`已删除 ${selectedIds.size} 位学员`, 'success');
      } catch (error) {
        showToast('批量删除失败', 'error');
      }
    }
  };

  const handleBatchAdjustHours = async () => {
    if (selectedIds.size === 0 || batchHoursAdjustment === 0) return;
    try {
      for (const id of selectedIds) {
        const student = students.find(s => s.id === id);
        if (student) {
          const newHours = Math.max(0, student.remainingHours + batchHoursAdjustment);
          await updateStudent(id, { remainingHours: newHours });
        }
      }
      setSelectedIds(new Set());
      setShowBatchHoursModal(false);
      setBatchHoursAdjustment(0);
      showToast(`已为 ${selectedIds.size} 位学员${batchHoursAdjustment > 0 ? '增加' : '减少'}课时`, 'success');
    } catch (error) {
      showToast('批量调整课时失败', 'error');
    }
  };

  const prepareExportData = () => {
    return selectedIds.size > 0 
      ? filteredStudents.filter(s => selectedIds.has(s.id))
      : filteredStudents;
  };

  const handleExport = () => {
    setShowExportModal(true);
  };

  const handleExportCSV = () => {
    const exportData = prepareExportData();
    const csvData = exportData.map(s => ({
      '学员姓名': s.name,
      '年龄': s.age,
      '级别': s.level,
      '家长姓名': s.parentName,
      '联系电话': s.parentPhone,
      '剩余课时': s.remainingHours,
      '状态': s.status || 'active',
      '标签': s.tags?.join(', ') || '',
      '创建时间': s.createdAt || ''
    }));
    exportToCSV(csvData, '学员数据');
    showToast(`已导出 ${exportData.length} 位学员数据`, 'success');
    setShowExportModal(false);
  };

  const handleExportExcel = () => {
    const exportData = prepareExportData();
    const excelData = exportData.map(s => ({
      '学员姓名': s.name,
      '年龄': s.age,
      '级别': s.level,
      '家长姓名': s.parentName,
      '联系电话': s.parentPhone,
      '剩余课时': s.remainingHours,
      '状态': s.status || 'active',
      '标签': s.tags?.join(', ') || '',
      '创建时间': s.createdAt || ''
    }));
    exportToExcel(excelData, '学员数据', '学员列表');
    showToast(`已导出 ${exportData.length} 位学员数据`, 'success');
    setShowExportModal(false);
  };

  const handleExportPDF = () => {
    const exportData = prepareExportData();
    exportToPDF({
      title: '学员数据报告',
      subtitle: `共 ${exportData.length} 位学员`,
      filename: '学员数据报告',
      orientation: 'landscape',
      columns: [
        { header: '学员姓名', dataKey: 'name', width: 40 },
        { header: '年龄', dataKey: 'age', width: 20 },
        { header: '级别', dataKey: 'level', width: 40 },
        { header: '家长姓名', dataKey: 'parentName', width: 40 },
        { header: '联系电话', dataKey: 'parentPhone', width: 45 },
        { header: '剩余课时', dataKey: 'remainingHours', width: 30 },
        { header: '状态', dataKey: 'status', width: 25 },
      ],
      data: exportData.map(s => ({
        name: s.name,
        age: s.age,
        level: s.level,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        remainingHours: s.remainingHours,
        status: s.status || 'active'
      }))
    });
    showToast(`已导出 ${exportData.length} 位学员数据`, 'success');
    setShowExportModal(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      let result: ImportResult;

      if (file.name.endsWith('.csv')) {
        result = await parseCSV(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        result = await parseExcel(file);
      } else {
        throw new Error('请选择 CSV 或 Excel 文件');
      }

      setImportResult(result);
      showToast(`解析完成：成功 ${result.success.length} 条，失败 ${result.errors.length} 条`, result.errors.length === 0 ? 'success' : 'warning');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '文件解析失败', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!importResult || importResult.success.length === 0) return;

    try {
      setImporting(true);
      for (const student of importResult.success) {
        await addStudent(student);
      }
      showToast(`成功导入 ${importResult.success.length} 位学员`, 'success');
      setShowImportModal(false);
      setImportResult(null);
    } catch (error) {
      showToast('导入失败，请重试', 'error');
    } finally {
      setImporting(false);
    }
  };

  const getRecentActiveStudents = () => {
    const sevenDaysAgo = subDays(new Date(), 7);
    return students.filter(s => {
      const studentCourses = courses.filter(c => c.studentId === s.id && c.status === 'completed');
      return studentCourses.some(c => isAfter(parseISO(c.date), sevenDaysAgo));
    }).length;
  };

  const stats = useMemo(() => ({
    total: students.length,
    lowHours: students.filter(s => s.remainingHours < 5).length,
    recentActive: getRecentActiveStudents(),
    beginner: students.filter(s => s.level === 'Beginner').length,
    intermediate: students.filter(s => s.level === 'Intermediate').length,
    advanced: students.filter(s => s.level === 'Advanced').length,
  }), [students, courses]);

  if (selectedStudentId) {
    return <StudentDetail studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} lang={lang} />;
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <Skeleton height={32} width={150} />
          <Skeleton height={40} width={120} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100">
          <TableSkeleton rows={5} columns={5} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20 md:pb-6 animate-fade-in">
      <div className="flex justify-between items-center gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent truncate flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            {t('navStudents')}
          </h1>
          <p className="text-sm text-gray-400 mt-1">{lang === 'zh' ? '管理学员信息和课程安排' : 'Manage student info and schedules'}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50 transition flex items-center justify-center shadow-sm text-sm"
          >
            <Upload className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">导入</span>
          </button>
          <button
            onClick={handleExport}
            className="bg-white border border-gray-200 text-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50 transition flex items-center justify-center shadow-sm text-sm"
          >
            <Download className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">导出</span>
          </button>
          <button
            onClick={() => {
              setEditingStudent(null);
              setShowForm(true);
            }}
            className="bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white px-3 sm:px-4 py-2 rounded-xl hover:from-[#E85555] hover:to-[#FF6B6B] transition flex items-center justify-center shadow-lg shadow-[#FF6B6B]/30 text-sm"
          >
            <Plus className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">{t('addStudent')}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl md:rounded-2xl p-3 md:p-5 text-white shadow-lg shadow-indigo-500/20">
          <div className="hidden md:block absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs md:text-sm font-medium text-white/80">学员</p>
            <p className="text-xl md:text-3xl font-bold mt-0.5 md:mt-1">{stats.total}</p>
          </div>
          <Users className="hidden md:block absolute bottom-3 right-3 w-8 h-8 text-white/20" />
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-orange-500 rounded-xl md:rounded-2xl p-3 md:p-5 text-white shadow-lg shadow-red-500/20">
          <div className="hidden md:block absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs md:text-sm font-medium text-white/80">不足</p>
            <p className="text-xl md:text-3xl font-bold mt-0.5 md:mt-1">{stats.lowHours}</p>
          </div>
          <AlertTriangle className="hidden md:block absolute bottom-3 right-3 w-8 h-8 text-white/20" />
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl md:rounded-2xl p-3 md:p-5 text-white shadow-lg shadow-emerald-500/20">
          <div className="hidden md:block absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs md:text-sm font-medium text-white/80">活跃</p>
            <p className="text-xl md:text-3xl font-bold mt-0.5 md:mt-1">{stats.recentActive}</p>
          </div>
          <TrendingUp className="hidden md:block absolute bottom-3 right-3 w-8 h-8 text-white/20" />
        </div>
        
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl md:rounded-2xl p-3 md:p-5 text-white shadow-lg shadow-purple-500/20">
          <div className="hidden md:block absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-xs md:text-sm font-medium text-white/80">级别</p>
            <div className="flex items-center gap-1 md:gap-2 mt-0.5 md:mt-1 text-xs md:text-sm">
              <span>{stats.beginner}初</span>
              <span>{stats.intermediate}中</span>
              <span>{stats.advanced}高</span>
            </div>
          </div>
          <BookOpen className="hidden md:block absolute bottom-3 right-3 w-8 h-8 text-white/20" />
        </div>
      </div>

      {/* Batch Actions Bar */}
      {showBatchActions && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckSquare className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium text-indigo-900 truncate">已选{selectedIds.size}人</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setShowBatchHoursModal(true)}
              className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-50 transition flex items-center gap-1"
            >
              <Clock className="w-3.5 h-3.5" /> <span className="hidden sm:inline">调整</span>课时
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">批量</span>删除
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 hover:bg-indigo-100 rounded-lg transition"
            >
              <X className="w-4 h-4 text-indigo-600" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Search & Filter */}
      <div className="sm:hidden">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchStudents')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border transition ${
              levelFilter !== 'all' || hoursFilter !== 'all' 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
        
        {showFilters && (
          <div className="bg-white rounded-xl border border-gray-100 p-3 mt-2 space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1.5">级别</p>
              <div className="flex flex-wrap gap-1.5">
                {['all', 'Beginner', 'Intermediate', 'Advanced'].map(level => (
                  <button
                    key={level}
                    onClick={() => { setLevelFilter(level); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      levelFilter === level 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {level === 'all' ? '全部' : level}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">状态</p>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map(s => (
                  <button
                    key={s.value}
                    onClick={() => { setStatusFilter(s.value); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      statusFilter === s.value 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {allTags.length > 1 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">标签</p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => { setTagFilter(tag); }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                        tagFilter === tag 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tag === 'all' ? '全部' : tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">课时</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'all', label: '全部' },
                  { value: 'low', label: '<5' },
                  { value: 'medium', label: '5-15' },
                  { value: 'high', label: '≥15' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setHoursFilter(opt.value); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      hoursFilter === opt.value 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowFilters(false)}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
            >
              应用筛选
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hidden md:block">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('searchStudents')}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">全部级别</option>
              {levels.filter(l => l !== 'all').map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {statuses.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {allTags.length > 1 && (
              <select
                value={tagFilter}
                onChange={e => setTagFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag === 'all' ? '全部标签' : tag}</option>
                ))}
              </select>
            )}
            <select
              value={hoursFilter}
              onChange={e => setHoursFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">全部课时</option>
              <option value="low">课时不足(&lt;5)</option>
              <option value="medium">课时适中(5-15)</option>
              <option value="high">课时充足(≥15)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm">
                <th className="p-4 font-medium w-12">
                  <button onClick={handleSelectAll} className="p-1 hover:bg-gray-100 rounded">
                    {selectedIds.size === paginatedStudents.length && paginatedStudents.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="p-4 font-medium cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
                  {t('student')} <SortIcon field="name" />
                </th>
                <th className="p-4 font-medium cursor-pointer hover:bg-gray-100" onClick={() => handleSort('level')}>
                  {t('level')} <SortIcon field="level" />
                </th>
                <th className="p-4 font-medium">{t('parentContact')}</th>
                <th className="p-4 font-medium cursor-pointer hover:bg-gray-100" onClick={() => handleSort('remainingHours')}>
                  {t('hoursLeft')} <SortIcon field="remainingHours" />
                </th>
                <th className="p-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedStudents.map(student => (
                <tr key={student.id} className={`hover:bg-gray-50 transition ${selectedIds.has(student.id) ? 'bg-indigo-50/50' : ''}`}>
                  <td className="p-4">
                    <button onClick={() => handleSelectOne(student.id)} className="p-1 hover:bg-gray-100 rounded">
                      {selectedIds.has(student.id) ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setSelectedStudentId(student.id)}>
                      <img src={student.avatar} alt={student.name} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.age} {t('yrs')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      student.level === 'Advanced' ? 'bg-purple-100 text-purple-800' :
                      student.level === 'Intermediate' ? 'bg-blue-100 text-blue-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {student.level}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-gray-900">{student.parentName}</p>
                    <p className="text-xs text-gray-500 flex items-center mt-1">
                      <Phone className="w-3 h-3 mr-1" /> {student.parentPhone}
                    </p>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.remainingHours < 5 ? 'bg-red-100 text-red-800' : 
                        student.remainingHours < 15 ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {student.remainingHours} {t('hrs')}
                      </span>
                      {student.remainingHours < 5 && (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="课时不足" />
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setSelectedStudentId(student.id)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
                        title="查看详情"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingStudent(student);
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(student.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredStudents.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />

        {filteredStudents.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">
              {searchQuery || levelFilter !== 'all' || hoursFilter !== 'all' ? '没有找到匹配的学员' : '暂无学员数据'}
            </p>
            <p className="text-sm text-gray-400 mt-1">点击右上方按钮添加新学员</p>
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {paginatedStudents.map(student => (
          <div 
            key={student.id} 
            className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
              selectedIds.has(student.id) ? 'border-indigo-300 bg-indigo-50/30' : 'border-gray-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => handleSelectOne(student.id)} className="mt-1">
                  {selectedIds.has(student.id) ? (
                    <CheckSquare className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <img src={student.avatar} alt={student.name} className="w-12 h-12 rounded-full" referrerPolicy="no-referrer" />
                <div onClick={() => setSelectedStudentId(student.id)} className="cursor-pointer">
                  <p className="font-bold text-gray-900">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.age}岁 · {student.level}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setEditingStudent(student);
                    setShowForm(true);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => handleDeleteStudent(student.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                </button>
                <button
                  onClick={() => setSelectedStudentId(student.id)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between pl-8 gap-2">
              <div className="flex items-center text-xs text-gray-500 min-w-0 flex-1">
                <User className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{student.parentName}</span>
                <span className="mx-1.5 flex-shrink-0">·</span>
                <Phone className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{student.parentPhone}</span>
              </div>
              <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                student.remainingHours < 5 ? 'bg-red-100 text-red-700' : 
                student.remainingHours < 15 ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {student.remainingHours}节
              </div>
            </div>
          </div>
        ))}
        
        {paginatedStudents.length > 0 && (
          <div className="flex justify-center items-center space-x-2 py-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium disabled:opacity-50"
            >
              上一页
            </button>
            <span className="text-sm text-gray-500 font-medium">{currentPage} / {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        )}

        {filteredStudents.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">
              {searchQuery || levelFilter !== 'all' || hoursFilter !== 'all' ? '没有找到匹配的学员' : '暂无学员数据'}
            </p>
          </div>
        )}
      </div>

      {/* Student Form */}
      {showForm && (
        <>
          <div className="hidden md:block">
            <StudentForm
              student={editingStudent || undefined}
              onClose={() => {
                setShowForm(false);
                setEditingStudent(null);
              }}
              onSave={async (data) => {
                if (editingStudent) {
                  await handleUpdateStudent(editingStudent.id, data);
                } else {
                  await handleAddStudent(data as Omit<Student, 'id'>);
                }
              }}
              campuses={campuses}
            />
          </div>
          <div className="md:hidden">
            <BottomSheet
              isOpen={showForm}
              onClose={() => {
                setShowForm(false);
                setEditingStudent(null);
              }}
              title={editingStudent ? '编辑学员' : '添加学员'}
            >
              <div className="p-4">
                <StudentForm
                  student={editingStudent || undefined}
                  onClose={() => {
                    setShowForm(false);
                    setEditingStudent(null);
                  }}
                  onSave={async (data) => {
                    if (editingStudent) {
                      await handleUpdateStudent(editingStudent.id, data);
                    } else {
                      await handleAddStudent(data as Omit<Student, 'id'>);
                    }
                    setShowForm(false);
                    setEditingStudent(null);
                  }}
                  inline
                  campuses={campuses}
                />
              </div>
            </BottomSheet>
          </div>
        </>
      )}

      {/* Batch Hours Modal */}
      {showBatchHoursModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBatchHoursModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">批量调整课时</h3>
            <p className="text-sm text-gray-500 mb-4">为选中的 {selectedIds.size} 位学员调整课时</p>
            
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setBatchHoursAdjustment(prev => prev - 1)}
                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
              >
                <span className="text-xl font-bold text-gray-600">-</span>
              </button>
              <input
                type="number"
                value={batchHoursAdjustment}
                onChange={e => setBatchHoursAdjustment(parseInt(e.target.value) || 0)}
                className="flex-1 text-center py-3 text-2xl font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={() => setBatchHoursAdjustment(prev => prev + 1)}
                className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
              >
                <span className="text-xl font-bold text-gray-600">+</span>
              </button>
            </div>
            
            <div className="flex gap-2 mb-4">
              {[-5, -1, 1, 5, 10].map(val => (
                <button
                  key={val}
                  onClick={() => setBatchHoursAdjustment(val)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    batchHoursAdjustment === val
                      ? 'bg-indigo-600 text-white'
                      : val > 0
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowBatchHoursModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleBatchAdjustHours}
                disabled={batchHoursAdjustment === 0}
                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认调整
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => {
            setShowImportModal(false);
            setImportResult(null);
          }} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">批量导入学员</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {!importResult ? (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">选择文件导入</h4>
                    <p className="text-sm text-gray-500 mb-4">支持 CSV 和 Excel 格式文件</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                      >
                        {importing ? (
                          <>
                            <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                            解析中...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 inline mr-2" />
                            选择文件
                          </>
                        )}
                      </button>
                      <button
                        onClick={downloadTemplate}
                        className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                      >
                        下载模板
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-gray-900">{importResult.total}</p>
                      <p className="text-sm text-gray-500">总计</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{importResult.success.length}</p>
                      <p className="text-sm text-emerald-600">成功</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
                      <p className="text-sm text-red-600">失败</p>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="border border-red-200 rounded-xl overflow-hidden">
                      <div className="bg-red-50 px-4 py-2 border-b border-red-200">
                        <h5 className="font-medium text-red-800">错误列表</h5>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">行号</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">错误信息</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {importResult.errors.map((err, i) => (
                              <tr key={i}>
                                <td className="px-4 py-2 text-gray-600">{err.row}</td>
                                <td className="px-4 py-2 text-red-600">{err.error}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setImportResult(null);
                      }}
                      className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
                    >
                      重新选择
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={importResult.success.length === 0 || importing}
                      className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                          导入中...
                        </>
                      ) : (
                        `确认导入 ${importResult.success.length} 位`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">导出学员数据</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                即将导出 {prepareExportData().length} 位学员数据，请选择导出格式：
              </p>
              <button
                onClick={handleExportCSV}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">CSV 格式</p>
                  <p className="text-xs text-gray-500">适合用 Excel 打开编辑</p>
                </div>
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">Excel 格式</p>
                  <p className="text-xs text-gray-500">适合数据分析和报表</p>
                </div>
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-red-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">PDF 格式</p>
                  <p className="text-xs text-gray-500">适合打印和存档</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
