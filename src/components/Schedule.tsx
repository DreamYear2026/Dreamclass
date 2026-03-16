import React, { useState, useMemo, useCallback } from 'react';
import { Role, Language, Course } from '../types';
import { useTranslation } from '../i18n';
import { format, isSameDay, isToday, isAfter, parseISO, startOfWeek, addDays, subWeeks, addWeeks, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { 
  ChevronLeft, ChevronRight, Plus, Download, Loader2, 
  Calendar, Clock, User, MapPin, 
  Check, Search, Grid, List, CalendarDays, GripVertical, Sparkles,
  Play, Pause, ArrowRight, Timer, BookOpen, Star, X
} from 'lucide-react';
import { useCourses, useStudents, useTeachers } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { exportToCSV } from '../utils/export';
import CourseForm from './CourseForm';
import SmartScheduler from './SmartScheduler';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';
import { api } from '../services/api';

const getLocale = (lang: Language) => lang === 'zh' ? zhCN : enUS;

const formatDateLocalized = (date: Date, lang: Language, formatStr: string) => {
  return format(date, formatStr, { locale: getLocale(lang) });
};

const getDateFormat = (lang: Language, type: 'full' | 'short' | 'range') => {
  if (lang === 'zh') {
    switch (type) {
      case 'full': return 'yyyy年M月d日 EEEE';
      case 'short': return 'M月d日';
      case 'range': return 'M月d日';
    }
  }
  switch (type) {
    case 'full': return 'EEEE, MMMM d, yyyy';
    case 'short': return 'MMM d';
    case 'range': return 'MMM d';
  }
};

interface ScheduleProps {
  role: Role;
  lang: Language;
  studentId?: string;
}

const statusConfig = {
  scheduled: { 
    color: 'bg-gradient-to-r from-[#4ECDC4]/10 to-[#4ECDC4]/5 text-[#4ECDC4] border-l-4 border-[#4ECDC4]', 
    bg: 'bg-[#4ECDC4]',
    dot: 'bg-[#4ECDC4]',
    label: '已安排',
    gradient: 'from-[#4ECDC4] to-[#7EDDD6]'
  },
  completed: { 
    color: 'bg-gradient-to-r from-[#95E1A3]/10 to-[#95E1A3]/5 text-[#95E1A3] border-l-4 border-[#95E1A3]', 
    bg: 'bg-[#95E1A3]',
    dot: 'bg-[#95E1A3]',
    label: '已完成',
    gradient: 'from-[#95E1A3] to-[#7DD389]'
  },
  cancelled: { 
    color: 'bg-gradient-to-r from-[#FF6B6B]/10 to-[#FF6B6B]/5 text-[#FF6B6B] border-l-4 border-[#FF6B6B]', 
    bg: 'bg-[#FF6B6B]',
    dot: 'bg-[#FF6B6B]',
    label: '已取消',
    gradient: 'from-[#FF6B6B] to-[#FF8E8E]'
  },
};

export default function Schedule({ role, lang, studentId }: ScheduleProps) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { courses, loading, addCourse, updateCourse, updateCourseStatus, deleteCourse } = useCourses();
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { showToast } = useToast();
  
  const [view, setView] = useState<'week' | 'day' | 'list' | 'month' | 'modern'>(
    role === 'teacher' ? 'modern' : 'week'
  );
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showSmartScheduler, setShowSmartScheduler] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCourseDetail, setShowCourseDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);

  const effectiveStudentId = studentId || user?.id;

  const filteredCourses = useMemo(() => {
    let result = courses;
    
    if (role !== 'admin') {
      if (role === 'teacher') {
        result = result.filter(c => c.teacherId === user?.id);
      } else if (effectiveStudentId) {
        result = result.filter(c => c.studentId === effectiveStudentId);
      }
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.studentName.toLowerCase().includes(query) ||
        c.teacherName.toLowerCase().includes(query) ||
        c.room.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [courses, role, user?.id, effectiveStudentId, searchQuery]);

  const startDate = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const endDate = useMemo(() => addDays(startDate, 6), [startDate]);

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);
  const monthEnd = useMemo(() => endOfMonth(currentDate), [currentDate]);
  
  const monthDays = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const firstDayOfWeek = getDay(monthStart);
    const prefixDays = Array.from({ length: (firstDayOfWeek + 6) % 7 }).map((_, i) => 
      addDays(monthStart, -((firstDayOfWeek + 6) % 7) + i)
    );
    const lastDayOfWeek = getDay(monthEnd);
    const suffixDays = Array.from({ length: (7 - lastDayOfWeek) % 7 }).map((_, i) => 
      addDays(monthEnd, i + 1)
    );
    return [...prefixDays, ...days, ...suffixDays];
  }, [monthStart, monthEnd]);

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }).map((_, i) => addDays(startDate, i)),
    [startDate]
  );

  const hours = useMemo(() => 
    Array.from({ length: 14 }).map((_, i) => i + 8),
  []);

  const displayedCourses = useMemo(() => {
    return filteredCourses.filter(course => {
      const courseDate = parseISO(course.date);
      const dateMatch = view === 'day' 
        ? isSameDay(courseDate, currentDate)
        : courseDate >= startDate && courseDate <= endDate;
      
      const statusMatch = statusFilter === 'all' || course.status === statusFilter;
      
      return dateMatch && statusMatch;
    });
  }, [filteredCourses, view, currentDate, startDate, endDate, statusFilter]);

  const getCoursesForDayAndHour = useCallback((date: Date, hour: number) => {
    return displayedCourses.filter(course => {
      const courseDate = parseISO(course.date);
      const courseHour = parseInt(course.startTime.split(':')[0], 10);
      return isSameDay(courseDate, date) && courseHour === hour;
    });
  }, [displayedCourses]);

  const nextDate = useCallback(() => {
    if (view === 'day') setCurrentDate(prev => addDays(prev, 1));
    else if (view === 'month') setCurrentDate(prev => addMonths(prev, 1));
    else setCurrentDate(prev => addWeeks(prev, 1));
  }, [view]);

  const prevDate = useCallback(() => {
    if (view === 'day') setCurrentDate(prev => addDays(prev, -1));
    else if (view === 'month') setCurrentDate(prev => subMonths(prev, 1));
    else setCurrentDate(prev => subWeeks(prev, 1));
  }, [view]);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleExportSchedule = () => {
    const exportData = displayedCourses.map(c => ({
      date: c.date,
      time: `${c.startTime} - ${c.endTime}`,
      title: c.title,
      student: c.studentName,
      teacher: c.teacherName,
      room: c.room,
      status: c.status,
    }));
    exportToCSV(exportData, 'schedule');
    showToast('课表导出成功', 'success');
  };

  const handleAddCourse = async (data: Omit<Course, 'id' | 'status'>) => {
    await addCourse(data);
    showToast('课程添加成功', 'success');
    setShowCourseForm(false);
  };

  const handleStatusChange = async (courseId: string, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      await updateCourseStatus(courseId, newStatus);
      showToast('状态更新成功', 'success');
      setSelectedCourse(prev => prev ? { ...prev, status: newStatus } : null);
    } catch (error) {
      showToast('状态更新失败', 'error');
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;
    try {
      await deleteCourse(selectedCourse.id);
      showToast('课程已删除', 'success');
      setShowCourseDetail(false);
      setShowDeleteConfirm(false);
      setSelectedCourse(null);
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, course: Course) => {
    setDraggedCourse(course);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', course.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetDate: Date, targetHour?: number) => {
    e.preventDefault();
    if (!draggedCourse) return;

    const newDate = format(targetDate, 'yyyy-MM-dd');
    const startTime = targetHour ? `${targetHour.toString().padStart(2, '0')}:00` : draggedCourse.startTime;
    const endHour = targetHour ? targetHour + 1 : parseInt(draggedCourse.endTime.split(':')[0], 10);
    const endTime = targetHour ? `${endHour.toString().padStart(2, '0')}:00` : draggedCourse.endTime;

    try {
      await updateCourse(draggedCourse.id, {
        date: newDate,
        startTime,
        endTime,
      });
      showToast('课程已移动', 'success');
    } catch (error) {
      showToast('移动失败', 'error');
    } finally {
      setDraggedCourse(null);
    }
  }, [draggedCourse, updateCourse, showToast]);

  const handleDragEnd = useCallback(() => {
    setDraggedCourse(null);
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    const todayCourses = filteredCourses.filter(c => isSameDay(parseISO(c.date), today));
    const upcomingCourses = filteredCourses.filter(c => 
      isAfter(parseISO(c.date), today) && c.status === 'scheduled'
    );
    const completedCourses = filteredCourses.filter(c => c.status === 'completed');
    
    return {
      today: todayCourses.length,
      upcoming: upcomingCourses.length,
      completed: completedCourses.length,
      total: filteredCourses.length,
    };
  }, [filteredCourses]);

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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent">
            {t('scheduleTitle')}
          </h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-[#FFE66D]" />
            {lang === 'zh' ? '管理您的课程安排' : 'Manage your class schedule'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {role === 'admin' && (
            <>
              <button 
                onClick={() => setShowSmartScheduler(true)}
                className="flex-1 lg:flex-none bg-gradient-to-r from-violet-500 to-purple-600 text-white px-5 py-2.5 rounded-xl hover:from-violet-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center shadow-lg shadow-purple-500/25 font-medium"
              >
                <Sparkles className="w-4 h-4 mr-2" /> 智能排课
              </button>
              <button 
                onClick={() => setShowCourseForm(true)}
                className="flex-1 lg:flex-none bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all duration-200 flex items-center justify-center shadow-lg shadow-gray-900/25 font-medium"
              >
                <Plus className="w-4 h-4 mr-2" /> 添加课程
              </button>
            </>
          )}
          
          <div className="relative flex-1 lg:flex-none lg:w-52">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索课程..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-gray-50/50"
            />
          </div>
          
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">全部状态</option>
            <option value="scheduled">已安排</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          
          <button 
            onClick={handleExportSchedule}
            className="p-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 bg-white"
            title="导出课表"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-sm font-medium text-white/80">今日课程</p>
            <p className="text-3xl font-bold mt-1">{stats.today}</p>
          </div>
          <CalendarDays className="absolute bottom-3 right-3 w-8 h-8 text-white/20" />
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-sm font-medium text-white/80">待上课程</p>
            <p className="text-3xl font-bold mt-1">{stats.upcoming}</p>
          </div>
          <Clock className="absolute bottom-3 right-3 w-8 h-8 text-white/20" />
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-sm font-medium text-white/80">已完成</p>
            <p className="text-3xl font-bold mt-1">{stats.completed}</p>
          </div>
          <Check className="absolute bottom-3 right-3 w-8 h-8 text-white/20" />
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <p className="text-sm font-medium text-white/80">总课程数</p>
            <p className="text-3xl font-bold mt-1">{stats.total}</p>
          </div>
          <Grid className="absolute bottom-3 right-3 w-8 h-8 text-white/20" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2">
            <button 
              onClick={prevDate} 
              className="p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="min-w-[180px] text-center">
              <h2 className="text-lg font-bold text-gray-900">
                {view === 'month' 
                  ? formatDateLocalized(currentDate, lang, lang === 'zh' ? 'yyyy年M月' : 'MMMM yyyy')
                  : view === 'day' 
                  ? formatDateLocalized(currentDate, lang, getDateFormat(lang, 'full'))
                  : `${formatDateLocalized(startDate, lang, getDateFormat(lang, 'range'))} - ${formatDateLocalized(endDate, lang, getDateFormat(lang, 'range'))}`
                }
              </h2>
            </div>
            <button 
              onClick={nextDate} 
              className="p-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200"
            >
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            <button 
              onClick={goToToday} 
              className="ml-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
            >
              今天
            </button>
          </div>

          <div className="flex items-center bg-gray-100/80 backdrop-blur-sm rounded-xl p-1 gap-1">
            {role === 'teacher' && (
              <button 
                onClick={() => setView('modern')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  view === 'modern' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                今日
              </button>
            )}
            <button 
              onClick={() => setView('week')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                view === 'week' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              周
            </button>
            <button 
              onClick={() => setView('day')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                view === 'day' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              日
            </button>
            <button 
              onClick={() => setView('list')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                view === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
              }`}
            >
              列表
            </button>
            {role === 'admin' && (
              <button 
                onClick={() => setView('month')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  view === 'month' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                }`}
              >
                月
              </button>
            )}
          </div>
        </div>

        {view === 'modern' && role === 'teacher' && (
          <ModernTimelineView 
            courses={filteredCourses}
            lang={lang}
            onCourseClick={(course) => {
              setSelectedCourse(course);
              setShowCourseDetail(true);
            }}
          />
        )}

        {view === 'week' && (
          <WeekView 
            weekDays={weekDays} 
            hours={hours} 
            role={role} 
            getCoursesForDayAndHour={getCoursesForDayAndHour}
            onCourseClick={(course) => {
              setSelectedCourse(course);
              setShowCourseDetail(true);
            }}
            onAddCourse={() => setShowCourseForm(true)}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            draggedCourse={draggedCourse}
          />
        )}

        {view === 'month' && (
          <MonthView 
            monthDays={monthDays}
            currentDate={currentDate}
            filteredCourses={filteredCourses}
            role={role}
            onCourseClick={(course) => {
              setSelectedCourse(course);
              setShowCourseDetail(true);
            }}
            onAddCourse={() => setShowCourseForm(true)}
            onDayClick={(date) => {
              setCurrentDate(date);
              setView('day');
            }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            draggedCourse={draggedCourse}
          />
        )}

        {view === 'day' && (
          <DayView 
            currentDate={currentDate}
            hours={hours} 
            role={role} 
            getCoursesForDayAndHour={getCoursesForDayAndHour}
            onCourseClick={(course) => {
              setSelectedCourse(course);
              setShowCourseDetail(true);
            }}
            onAddCourse={() => setShowCourseForm(true)}
          />
        )}

        {view === 'list' && (
          <ListView 
            displayedCourses={displayedCourses}
            role={role}
            onCourseClick={(course) => {
              setSelectedCourse(course);
              setShowCourseDetail(true);
            }}
          />
        )}
      </div>

      {showCourseForm && (
        <CourseForm
          onClose={() => setShowCourseForm(false)}
          onSave={handleAddCourse}
        />
      )}

      {showSmartScheduler && (
        <SmartScheduler
          onClose={() => setShowSmartScheduler(false)}
          onSchedule={handleAddCourse}
        />
      )}

      {showCourseDetail && selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          role={role}
          onClose={() => {
            setShowCourseDetail(false);
            setSelectedCourse(null);
          }}
          onStatusChange={handleStatusChange}
          onDelete={() => setShowDeleteConfirm(true)}
        />
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteCourse}
          title="删除课程"
          message={`确定要删除 "${selectedCourse?.title}" 这节课吗？此操作无法撤销。`}
          confirmText="删除"
          type="danger"
        />
      )}
    </div>
  );
}

function WeekView({ weekDays, hours, role, getCoursesForDayAndHour, onCourseClick, onAddCourse, onDragStart, onDragOver, onDrop, onDragEnd, draggedCourse }: {
  weekDays: Date[];
  hours: number[];
  role: Role;
  getCoursesForDayAndHour: (date: Date, hour: number) => Course[];
  onCourseClick: (course: Course) => void;
  onAddCourse: () => void;
  onDragStart: (e: React.DragEvent, course: Course) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, date: Date, hour: number) => void;
  onDragEnd: () => void;
  draggedCourse: Course | null;
}) {
  return (
    <div className="flex flex-col h-[500px]">
      <div className="grid grid-cols-8 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
        <div className="p-3 text-center border-r border-gray-100">
          <Clock className="w-4 h-4 text-gray-400 mx-auto" />
        </div>
        {weekDays.map((day, i) => (
          <div 
            key={i} 
            className={`p-3 text-center border-r border-gray-100 last:border-r-0 transition-colors ${
              isToday(day) ? 'bg-gradient-to-b from-indigo-100/50 to-indigo-50/30' : ''
            }`}
          >
            <p className={`text-xs font-medium uppercase tracking-wide ${isToday(day) ? 'text-indigo-600' : 'text-gray-400'}`}>
              {format(day, 'EEE', { locale: zhCN })}
            </p>
            <p className={`text-xl font-bold mt-1 ${isToday(day) ? 'text-indigo-600' : 'text-gray-700'}`}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-8">
          <div className="border-r border-gray-100 bg-gray-50/30">
            {hours.map(hour => (
              <div key={hour} className="h-20 border-b border-gray-50 p-2 text-right">
                <span className="text-xs text-gray-400 font-medium">{hour}:00</span>
              </div>
            ))}
          </div>

          {weekDays.map((day, dayIdx) => (
            <div key={dayIdx} className="border-r border-gray-100 last:border-r-0 relative">
              {hours.map(hour => {
                const dayCourses = getCoursesForDayAndHour(day, hour);
                const hasConflict = dayCourses.length > 1;
                const isDropTarget = draggedCourse !== null;
                
                return (
                  <div 
                    key={hour} 
                    className="h-20 border-b border-gray-50 p-1.5 relative group"
                    onDragOver={onDragOver}
                    onDrop={(e) => onDrop(e, day, hour)}
                  >
                    {dayCourses.length > 0 ? (
                      <div className={`h-full flex ${hasConflict ? 'gap-0.5' : ''}`}>
                        {dayCourses.map((course, idx) => (
                          <div 
                            key={course.id}
                            draggable={role === 'admin'}
                            onDragStart={(e) => onDragStart(e, course)}
                            onDragEnd={onDragEnd}
                            onClick={() => onCourseClick(course)}
                            className={`flex-1 rounded-lg p-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:z-10 ${
                              statusConfig[course.status].color
                            } ${hasConflict ? 'text-[10px]' : ''} ${
                              draggedCourse?.id === course.id ? 'opacity-40 scale-95' : ''
                            } ${role === 'admin' ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            style={{ maxWidth: hasConflict ? `${100 / dayCourses.length}%` : '100%' }}
                          >
                            <div className="flex items-center gap-1">
                              {role === 'admin' && <GripVertical className="w-3 h-3 opacity-40 flex-shrink-0" />}
                              <p className="font-semibold truncate text-xs flex-1">{course.title}</p>
                            </div>
                            <p className="text-[10px] opacity-60 truncate mt-0.5">
                              {course.startTime}-{course.endTime}
                            </p>
                            {!hasConflict && (
                              <p className="text-[10px] font-medium truncate mt-0.5 opacity-80">
                                {role === 'admin' ? course.studentName : course.teacherName}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      role === 'admin' && (
                        <div 
                          onClick={onAddCourse}
                          className={`absolute inset-1.5 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer flex items-center justify-center ${
                            isDropTarget 
                              ? 'border-indigo-400 bg-indigo-50/80' 
                              : 'border-gray-200 opacity-0 group-hover:opacity-100 hover:border-indigo-300 hover:bg-indigo-50/50'
                          }`}
                        >
                          <Plus className={`w-4 h-4 ${isDropTarget ? 'text-indigo-400' : 'text-gray-400'}`} />
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DayView({ currentDate, hours, role, getCoursesForDayAndHour, onCourseClick, onAddCourse }: {
  currentDate: Date;
  hours: number[];
  role: Role;
  getCoursesForDayAndHour: (date: Date, hour: number) => Course[];
  onCourseClick: (course: Course) => void;
  onAddCourse: () => void;
}) {
  const currentHour = new Date().getHours();
  
  return (
    <div className="flex flex-col h-[500px]">
      <div className="p-5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/70 uppercase tracking-wide">
              {format(currentDate, 'EEEE', { locale: zhCN })}
            </p>
            <p className="text-3xl font-bold mt-1">
              {format(currentDate, 'M月d日')}
            </p>
          </div>
          <div className="text-right bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
            <p className="text-sm text-white/80">课程数量</p>
            <p className="text-2xl font-bold">
              {hours.reduce((sum, hour) => sum + getCoursesForDayAndHour(currentDate, hour).length, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {isToday(currentDate) && (
          <div 
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${(currentHour - 8) * 80 + 40}px` }}
          >
            <div className="flex items-center">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
              <div className="flex-1 h-0.5 bg-gradient-to-r from-red-500 to-transparent" />
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-[60px_1fr]">
          <div className="border-r border-gray-100 bg-gray-50/30">
            {hours.map(hour => (
              <div key={hour} className="h-20 border-b border-gray-50 p-2 text-right">
                <span className="text-xs text-gray-400 font-medium">{hour}:00</span>
              </div>
            ))}
          </div>

          <div className="relative">
            {hours.map(hour => {
              const hourCourses = getCoursesForDayAndHour(currentDate, hour);
              
              return (
                <div key={hour} className="h-20 border-b border-gray-50 p-2 relative group">
                  {hourCourses.map((course, idx) => (
                    <div 
                      key={course.id}
                      onClick={() => onCourseClick(course)}
                      className={`absolute top-2 bottom-2 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-xl hover:scale-[1.02] hover:z-10 ${
                        statusConfig[course.status].color
                      }`}
                      style={{
                        left: hourCourses.length > 1 ? `${(idx * 100) / hourCourses.length}%` : '8px',
                        right: hourCourses.length > 1 ? `${((hourCourses.length - idx - 1) * 100) / hourCourses.length}%` : '8px',
                        marginLeft: idx > 0 ? '4px' : '0',
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <p className="font-semibold truncate">{course.title}</p>
                        <span className={`ml-2 w-2.5 h-2.5 rounded-full ${statusConfig[course.status].dot}`} />
                      </div>
                      <p className="text-xs mt-1.5 opacity-60 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {course.startTime} - {course.endTime}
                      </p>
                      <div className="flex items-center mt-2 gap-3 text-xs opacity-70">
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {role === 'admin' ? course.studentName : course.teacherName}
                        </span>
                        <span className="flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {course.room}
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {hourCourses.length === 0 && role === 'admin' && (
                    <div 
                      onClick={onAddCourse}
                      className="absolute inset-2 rounded-xl border-2 border-dashed border-gray-200 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 flex items-center justify-center"
                    >
                      <Plus className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({ displayedCourses, role, onCourseClick }: {
  displayedCourses: Course[];
  role: Role;
  onCourseClick: (course: Course) => void;
}) {
  const sortedCourses = [...displayedCourses].sort((a, b) => 
    new Date(`${a.date}T${a.startTime}`).getTime() - new Date(`${b.date}T${a.startTime}`).getTime()
  );

  const groupedCourses = sortedCourses.reduce((groups, course) => {
    const date = course.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(course);
    return groups;
  }, {} as Record<string, Course[]>);

  return (
    <div className="max-h-[500px] overflow-y-auto">
      {Object.keys(groupedCourses).length === 0 ? (
        <div className="p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium">暂无课程安排</p>
          <p className="text-sm text-gray-400 mt-1">点击上方添加课程按钮创建新课程</p>
        </div>
      ) : (
        Object.entries(groupedCourses).map(([date, courses]) => (
          <div key={date}>
            <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-100 sticky top-0 backdrop-blur-sm">
              <p className="text-sm font-semibold text-gray-600">
                {format(parseISO(date), 'M月d日 EEEE', { locale: zhCN })}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {courses.map(course => (
                <div 
                  key={course.id}
                  onClick={() => onCourseClick(course)}
                  className="p-4 hover:bg-gray-50/80 cursor-pointer transition-all duration-200 flex items-center gap-4 group"
                >
                  <div className={`w-1.5 h-14 rounded-full bg-gradient-to-b ${statusConfig[course.status].gradient}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{course.title}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[course.status].color}`}>
                        {statusConfig[course.status].label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        {course.startTime} - {course.endTime}
                      </span>
                      <span className="flex items-center">
                        <User className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        {role === 'admin' ? course.studentName : course.teacherName}
                      </span>
                      <span className="flex items-center">
                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-gray-400" />
                        {course.room}
                      </span>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MonthView({ monthDays, currentDate, filteredCourses, role, onCourseClick, onAddCourse, onDayClick, onDragStart, onDragOver, onDrop, onDragEnd, draggedCourse }: {
  monthDays: Date[];
  currentDate: Date;
  filteredCourses: Course[];
  role: Role;
  onCourseClick: (course: Course) => void;
  onAddCourse: () => void;
  onDayClick: (date: Date) => void;
  onDragStart: (e: React.DragEvent, course: Course) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, date: Date) => void;
  onDragEnd: () => void;
  draggedCourse: Course | null;
}) {
  const weekDayLabels = ['一', '二', '三', '四', '五', '六', '日'];
  
  const getCoursesForDay = (date: Date) => {
    return filteredCourses.filter(course => {
      const courseDate = parseISO(course.date);
      return isSameDay(courseDate, date);
    });
  };

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-100">
        {weekDayLabels.map((label, i) => (
          <div 
            key={i} 
            className={`p-3 text-center text-sm font-medium border-r border-gray-100 last:border-r-0 ${
              i >= 5 ? 'text-red-400' : 'text-gray-500'
            }`}
          >
            {label}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 flex-1">
        {monthDays.map((day, i) => {
          const dayCourses = getCoursesForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isWeekend = i % 7 >= 5;
          const isDropTarget = draggedCourse !== null;
          
          return (
            <div 
              key={i}
              onClick={() => onDayClick(day)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, day)}
              className={`min-h-[100px] border-r border-b border-gray-100 p-2 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                !isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'
              } ${isToday(day) ? 'bg-gradient-to-b from-indigo-50/80 to-indigo-50/30' : ''} ${
                isDropTarget && isCurrentMonth ? 'ring-2 ring-indigo-300 ring-inset bg-indigo-50/50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-sm font-medium ${
                  !isCurrentMonth ? 'text-gray-300' 
                  : isToday(day) ? 'w-7 h-7 flex items-center justify-center rounded-full bg-indigo-500 text-white font-bold'
                  : isWeekend ? 'text-red-400'
                  : 'text-gray-700'
                }`}>
                  {format(day, 'd')}
                </span>
                {dayCourses.length > 0 && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{dayCourses.length}</span>
                )}
              </div>
              
              <div className="space-y-1">
                {dayCourses.slice(0, 3).map(course => (
                  <div 
                    key={course.id}
                    draggable={role === 'admin'}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      onDragStart(e, course);
                    }}
                    onDragEnd={onDragEnd}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCourseClick(course);
                    }}
                    className={`text-xs p-1.5 rounded-lg truncate cursor-pointer transition-all duration-150 hover:shadow-md flex items-center gap-1 ${
                      statusConfig[course.status].color
                    } ${draggedCourse?.id === course.id ? 'opacity-40 scale-95' : ''} ${
                      role === 'admin' ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                  >
                    {role === 'admin' && <GripVertical className="w-2 h-2 opacity-40 flex-shrink-0" />}
                    <span className="font-medium flex-shrink-0">{course.startTime}</span>
                    <span className="truncate">{course.title}</span>
                  </div>
                ))}
                {dayCourses.length > 3 && (
                  <div className="text-xs text-indigo-500 text-center font-medium py-1">
                    +{dayCourses.length - 3} 更多
                  </div>
                )}
                {dayCourses.length === 0 && isCurrentMonth && role === 'admin' && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCourse();
                    }}
                    className={`text-xs text-center py-2 transition-all duration-200 ${
                      isDropTarget 
                        ? 'text-indigo-500 opacity-100' 
                        : 'text-gray-300 opacity-0 hover:opacity-100'
                    }`}
                  >
                    <Plus className="w-3 h-3 inline" /> 添加
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CourseDetailModal({ course, role, onClose, onStatusChange, onDelete }: {
  course: Course;
  role: Role;
  onClose: () => void;
  onStatusChange: (courseId: string, status: 'scheduled' | 'completed' | 'cancelled') => void;
  onDelete: () => void;
}) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackHomework, setFeedbackHomework] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) {
      showToast('请填写反馈内容', 'error');
      return;
    }

    try {
      setSubmittingFeedback(true);
      await api.addFeedback({
        courseId: course.id,
        studentId: course.studentId,
        teacherId: user?.id || '',
        content: feedbackContent,
        homework: feedbackHomework,
        rating: feedbackRating,
      });
      showToast('反馈添加成功', 'success');
      setShowFeedbackForm(false);
      setFeedbackContent('');
      setFeedbackHomework('');
      setFeedbackRating(5);
    } catch (error) {
      showToast('添加反馈失败', 'error');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
          <div className={`h-2 bg-gradient-to-r ${statusConfig[course.status].gradient}`} />
          
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{course.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {format(parseISO(course.date), 'yyyy年M月d日 EEEE', { locale: zhCN })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig[course.status].color}`}>
                  {statusConfig[course.status].label}
                </span>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">时间</p>
                  <p className="font-semibold text-gray-900">{course.startTime} - {course.endTime}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{role === 'admin' ? '学员' : '教师'}</p>
                  <p className="font-semibold text-gray-900">
                    {role === 'admin' ? course.studentName : course.teacherName}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">教室</p>
                  <p className="font-semibold text-gray-900">{course.room}</p>
                </div>
              </div>
            </div>

            {role === 'teacher' && !showFeedbackForm && (
              <button
                onClick={() => setShowFeedbackForm(true)}
                className="mt-6 w-full py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all duration-200 shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
              >
                <Star className="w-4 h-4" />
                添加课堂点评
              </button>
            )}

            {showFeedbackForm && (
              <div className="mt-6 space-y-4 border-t border-gray-100 pt-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  课堂点评
                </h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">评分</label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setFeedbackRating(i + 1)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-7 h-7 ${i < feedbackRating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">反馈内容 *</label>
                  <textarea
                    value={feedbackContent}
                    onChange={e => setFeedbackContent(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[100px]"
                    placeholder="描述学员的学习表现..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">课后作业</label>
                  <textarea
                    value={feedbackHomework}
                    onChange={e => setFeedbackHomework(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[80px]"
                    placeholder="布置课后作业..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowFeedbackForm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmitFeedback}
                    disabled={submittingFeedback}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submittingFeedback ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    提交
                  </button>
                </div>
              </div>
            )}

            {role === 'admin' && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-gray-700">更改状态</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['scheduled', 'completed', 'cancelled'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => onStatusChange(course.id, status)}
                      className={`py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        course.status === status
                          ? `bg-gradient-to-r ${statusConfig[status].gradient} text-white shadow-lg`
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {statusConfig[status].label}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={onDelete}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-200 mt-4"
                >
                  删除课程
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="mt-6 w-full py-3 rounded-xl text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-all duration-200"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModernTimelineView({ courses, lang, onCourseClick }: {
  courses: Course[];
  lang: Language;
  onCourseClick: (course: Course) => void;
}) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  const todayCourses = useMemo(() => {
    return courses
      .filter(c => c.date === todayStr && c.status !== 'cancelled')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [courses, todayStr]);

  const upcomingCourses = useMemo(() => {
    return courses
      .filter(c => c.date > todayStr && c.status === 'scheduled')
      .sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))
      .slice(0, 5);
  }, [courses, todayStr]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [today]);

  const weekCourses = useMemo(() => {
    return weekDays.map(day => ({
      date: day,
      dayCourses: courses.filter(c => c.date === format(day, 'yyyy-MM-dd') && c.status !== 'cancelled')
    }));
  }, [courses, weekDays]);

  const currentTime = new Date();
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimePercent = ((currentHour - 8) * 60 + currentMinute) / (14 * 60) * 100;

  const getCourseStatus = (course: Course) => {
    if (course.status === 'completed') return 'completed';
    if (course.date === todayStr) {
      const [endHour, endMin] = course.endTime.split(':').map(Number);
      const endMinutes = endHour * 60 + endMin;
      const nowMinutes = currentHour * 60 + currentMinute;
      if (nowMinutes > endMinutes) return 'completed';
      
      const [startHour, startMin] = course.startTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      if (nowMinutes >= startMinutes && nowMinutes <= endMinutes) return 'ongoing';
    }
    return 'upcoming';
  };

  const nextCourse = todayCourses.find(c => {
    const [startHour] = c.startTime.split(':').map(Number);
    return startHour >= currentHour;
  });

  return (
    <div className="p-6 space-y-6">
      {/* 今日概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 当前状态卡片 */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <p className="text-white/70 text-sm">今天是</p>
                <p className="text-xl font-bold">{format(today, 'M月d日 EEEE', { locale: zhCN })}</p>
              </div>
            </div>

            {nextCourse ? (
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-white/80">
                    {getCourseStatus(nextCourse) === 'ongoing' ? '正在进行' : '即将开始'}
                  </span>
                </div>
                <p className="text-2xl font-bold mb-1">{nextCourse.title}</p>
                <div className="flex items-center gap-4 text-white/80 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {nextCourse.startTime} - {nextCourse.endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {nextCourse.studentName}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {nextCourse.room}
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
                <p className="text-lg text-white/80">今日课程已全部结束 🎉</p>
              </div>
            )}

            <div className="flex items-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{todayCourses.length}</p>
                <p className="text-sm text-white/70">今日课程</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-3xl font-bold">{todayCourses.filter(c => getCourseStatus(c) === 'completed').length}</p>
                <p className="text-sm text-white/70">已完成</p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center">
                <p className="text-3xl font-bold">{todayCourses.filter(c => getCourseStatus(c) === 'ongoing' || getCourseStatus(c) === 'upcoming').length}</p>
                <p className="text-sm text-white/70">待进行</p>
              </div>
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">快速导航</h3>
            <div className="space-y-2">
              {upcomingCourses.slice(0, 3).map((course, idx) => (
                <button
                  key={course.id}
                  onClick={() => onCourseClick(course)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 text-left group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{course.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(course.date), 'M/d')} · {course.startTime}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 今日时间线 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">今日课程时间线</h3>
        </div>
        
        <div className="p-5">
          {todayCourses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">今日暂无课程安排</p>
              <p className="text-sm text-gray-400 mt-1">享受您的休息时间吧！</p>
            </div>
          ) : (
            <div className="relative">
              {/* 时间线 */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-100" />
              
              {/* 当前时间指示器 */}
              {isToday(today) && currentTimePercent >= 0 && currentTimePercent <= 100 && (
                <div 
                  className="absolute left-6 right-0 z-10 pointer-events-none"
                  style={{ top: `${currentTimePercent}%` }}
                >
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-lg shadow-red-500/30" />
                    <div className="flex-1 h-0.5 bg-red-500" />
                    <span className="ml-2 text-xs font-medium text-red-500 bg-white px-2 py-0.5 rounded-full shadow-sm">
                      现在 {currentHour}:{currentMinute.toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {todayCourses.map((course, idx) => {
                  const status = getCourseStatus(course);
                  const [startHour] = course.startTime.split(':').map(Number);
                  const topPosition = ((startHour - 8) / 14) * 100;
                  
                  return (
                    <button
                      key={course.id}
                      onClick={() => onCourseClick(course)}
                      className={`relative w-full flex items-start gap-4 p-4 rounded-xl transition-all duration-200 hover:shadow-lg group ${
                        status === 'completed' 
                          ? 'bg-gray-50 opacity-60' 
                          : status === 'ongoing'
                          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 ring-2 ring-indigo-200'
                          : 'bg-white border border-gray-100 hover:border-indigo-200'
                      }`}
                    >
                      {/* 时间节点 */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          status === 'completed' 
                            ? 'bg-gray-300 border-gray-300' 
                            : status === 'ongoing'
                            ? 'bg-indigo-500 border-indigo-500 animate-pulse'
                            : 'bg-white border-indigo-300'
                        }`} />
                        <span className="text-xs text-gray-500 mt-1 font-medium">{course.startTime}</span>
                      </div>

                      {/* 课程内容 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-semibold truncate ${
                            status === 'ongoing' ? 'text-indigo-600' : 'text-gray-900'
                          }`}>
                            {course.title}
                          </p>
                          {status === 'ongoing' && (
                            <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs font-medium rounded-full animate-pulse">
                              进行中
                            </span>
                          )}
                          {status === 'completed' && (
                            <Check className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {course.startTime} - {course.endTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {course.studentName}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {course.room}
                          </span>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 本周概览 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">本周课程</h3>
        </div>
        
        <div className="grid grid-cols-7 divide-x divide-gray-100">
          {weekCourses.map(({ date, dayCourses }, idx) => {
            const isTodayDate = isToday(date);
            const isWeekend = idx >= 5;
            
            return (
              <div 
                key={idx}
                className={`p-4 ${isTodayDate ? 'bg-indigo-50/50' : ''} ${isWeekend ? 'bg-gray-50/30' : ''}`}
              >
                <div className="text-center mb-3">
                  <p className={`text-xs font-medium ${isTodayDate ? 'text-indigo-600' : isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                    {format(date, 'EEE', { locale: zhCN })}
                  </p>
                  <p className={`text-lg font-bold mt-1 ${
                    isTodayDate 
                      ? 'w-8 h-8 flex items-center justify-center rounded-full bg-indigo-500 text-white mx-auto' 
                      : isWeekend ? 'text-red-400' 
                      : 'text-gray-700'
                  }`}>
                    {format(date, 'd')}
                  </p>
                </div>
                
                <div className="space-y-1">
                  {dayCourses.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-xs text-gray-300">无课程</p>
                    </div>
                  ) : (
                    dayCourses.slice(0, 3).map(course => (
                      <button
                        key={course.id}
                        onClick={() => onCourseClick(course)}
                        className={`w-full text-left p-2 rounded-lg text-xs transition-all duration-150 hover:shadow-md ${
                          course.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-indigo-50 text-indigo-700'
                        }`}
                      >
                        <p className="font-medium truncate">{course.title}</p>
                        <p className="text-[10px] opacity-70">{course.startTime}</p>
                      </button>
                    ))
                  )}
                  {dayCourses.length > 3 && (
                    <p className="text-xs text-center text-gray-400 py-1">
                      +{dayCourses.length - 3} 更多
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
