import React, { useState, useMemo, useEffect } from 'react';
import { X, Sparkles, Clock, User, MapPin, AlertTriangle, Check, Calendar, ChevronLeft, ChevronRight, Loader2, Zap, Copy, Calendar as CalendarIcon, TrendingUp, Layers } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, isAfter, isBefore, isToday, parseISO, isSameDay, isSameMonth, isWithinInterval, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStudents, useTeachers, useCourses } from '../contexts/AppContext';
import { api } from '../services/api';
import { useToast } from './Toast';

interface SmartSchedulerProps {
  onClose: () => void;
  onSchedule: (data: any) => Promise<void>;
}

interface TimeSlot {
  date: Date;
  hour: number;
  score: number;
  conflicts: string[];
  teacherAvailable: boolean;
  roomAvailable: boolean;
  studentAvailable: boolean;
  isHoliday: boolean;
}

interface ScheduleTemplate {
  id: string;
  name: string;
  title: string;
  teacherId: string;
  studentIds: string[];
  preferredDays: number[];
  preferredTimeStart: number;
  preferredTimeEnd: number;
  duration: number;
  room: string;
}

export default function SmartScheduler({ onClose, onSchedule }: SmartSchedulerProps) {
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { courses } = useCourses();
  const { showToast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    studentId: '',
    teacherId: '',
    preferredDays: [] as number[],
    preferredTimeStart: 9,
    preferredTimeEnd: 18,
    duration: 60,
    weeks: 1,
  });

  const [recommendedSlots, setRecommendedSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [useTemplate, setUseTemplate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  
  const holidays = useMemo(() => {
    const year = new Date().getFullYear();
    return [
      `${year}-01-01`,
      `${year}-02-14`,
      `${year}-03-08`,
      `${year}-05-01`,
      `${year}-06-01`,
      `${year}-10-01`,
      `${year}-12-25`,
      `${year + 1}-01-01`,
    ];
  }, []);
  
  const isHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    return holidays.includes(dateStr);
  };
  
  const scheduleTemplates: ScheduleTemplate[] = [
    {
      id: 'template1',
      name: '钢琴常规课程',
      title: '钢琴一对一',
      teacherId: '',
      studentIds: [],
      preferredDays: [1, 3, 5],
      preferredTimeStart: 16,
      preferredTimeEnd: 20,
      duration: 60,
      room: '琴房 1',
    },
    {
      id: 'template2',
      name: '周末舞蹈课程',
      title: '舞蹈集体课',
      teacherId: '',
      studentIds: [],
      preferredDays: [6, 7],
      preferredTimeStart: 10,
      preferredTimeEnd: 16,
      duration: 90,
      room: '舞蹈室',
    },
    {
      id: 'template3',
      name: '美术创意课程',
      title: '美术课',
      teacherId: '',
      studentIds: [],
      preferredDays: [2, 4, 6],
      preferredTimeStart: 14,
      preferredTimeEnd: 18,
      duration: 60,
      room: '美术室',
    },
  ];

  const activeTeachers = teachers.filter(t => t.status === 'active');
  const selectedStudent = students.find(s => s.id === formData.studentId);
  const selectedTeacher = activeTeachers.find(t => t.id === formData.teacherId);

  const analyzeAndRecommend = async () => {
    if (!formData.studentId || !formData.teacherId) {
      showToast('请选择学员和教师', 'error');
      return;
    }

    setAnalyzing(true);
    setStep(2);

    try {
      const allCourses = await api.getCourses();
      const slots: TimeSlot[] = [];
      
      for (let week = 0; week < Math.min(formData.weeks, 4); week++) {
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const date = addWeeks(addDays(currentWeekStart, dayOffset), week);
          const dayOfWeek = date.getDay();
          const holidayFlag = isHoliday(date);
          
          if (formData.preferredDays.length > 0 && !formData.preferredDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
            continue;
          }

          for (let hour = formData.preferredTimeStart; hour < formData.preferredTimeEnd; hour++) {
            const dateStr = format(date, 'yyyy-MM-dd');
            const startTime = `${String(hour).padStart(2, '0')}:00`;
            const endTime = `${String(hour + 1).padStart(2, '0')}:00`;
            
            const conflicts: string[] = [];
            let score = 100;
            
            if (holidayFlag) {
              conflicts.push('该日期为节假日');
              score -= 80;
            }
            
            const teacherConflict = allCourses.find(c => 
              c.date === dateStr &&
              c.teacherId === formData.teacherId &&
              c.startTime < endTime &&
              c.endTime > startTime
            );
            
            const studentConflict = allCourses.find(c => 
              c.date === dateStr &&
              c.studentId === formData.studentId &&
              c.startTime < endTime &&
              c.endTime > startTime
            );
            
            const roomConflicts = allCourses.filter(c => 
              c.date === dateStr &&
              c.startTime < endTime &&
              c.endTime > startTime
            );
            const occupiedRooms = new Set(roomConflicts.map(c => c.room));
            
            if (teacherConflict) {
              conflicts.push(`教师已有课程: ${teacherConflict.title}`);
              score -= 50;
            }
            
            if (studentConflict) {
              conflicts.push(`学员已有课程: ${studentConflict.title}`);
              score -= 50;
            }
            
            if (hour >= 10 && hour <= 11) score += 10;
            if (hour >= 14 && hour <= 16) score += 15;
            if (hour >= 19 && hour <= 20) score += 5;
            
            if (dayOfWeek === 6 || dayOfWeek === 0) score += 20;
            
            if (isToday(date)) score -= 30;
            if (isBefore(date, new Date())) score = 0;
            
            if (score > 0) {
              slots.push({
                date,
                hour,
                score,
                conflicts,
                teacherAvailable: !teacherConflict,
                roomAvailable: occupiedRooms.size < 10,
                studentAvailable: !studentConflict,
                isHoliday: holidayFlag,
              });
            }
          }
        }
      }

      slots.sort((a, b) => b.score - a.score);
      setRecommendedSlots(slots.slice(0, 20));
      
      if (slots.length === 0) {
        showToast('未找到合适的空闲时间段，请调整筛选条件', 'warning');
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      showToast('分析失败，请重试', 'error');
    } finally {
      setAnalyzing(false);
    }
  };
  
  const applyTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      ...formData,
      title: template.title,
      preferredDays: template.preferredDays,
      preferredTimeStart: template.preferredTimeStart,
      preferredTimeEnd: template.preferredTimeEnd,
      duration: template.duration,
    });
    setUseTemplate(false);
    showToast('已应用模板', 'success');
  };

  const handleSchedule = async () => {
    if (!selectedSlot) return;

    setLoading(true);
    try {
      const courseData = {
        title: formData.title || `${selectedStudent?.name} - ${selectedTeacher?.name} 课程`,
        date: format(selectedSlot.date, 'yyyy-MM-dd'),
        startTime: `${String(selectedSlot.hour).padStart(2, '0')}:00`,
        endTime: `${String(selectedSlot.hour + 1).padStart(2, '0')}:00`,
        teacherId: formData.teacherId,
        teacherName: selectedTeacher?.name || '',
        studentId: formData.studentId,
        studentName: selectedStudent?.name || '',
        room: 'Room 101',
      };

      await onSchedule(courseData);
      showToast('课程安排成功', 'success');
      onClose();
    } catch (error) {
      showToast('安排失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const weekDays = useMemo(() => 
    Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const getSlotForDay = (day: Date) => {
    return recommendedSlots.filter(slot => isSameDay(slot.date, day));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-500 to-purple-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI 智能排课助手</h2>
              <p className="text-sm text-white/80">自动分析冲突，推荐最优时间</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-indigo-50 rounded-xl p-4 flex items-start gap-3">
                <Zap className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-indigo-700">
                  <p className="font-medium mb-1">智能排课说明</p>
                  <p>系统将自动分析教师和学员的时间安排，检测三方冲突（教师、学员、教室）并推荐最佳上课时间。</p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setUseTemplate(!useTemplate)}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-900">使用批量排课模板</span>
                  </div>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                    useTemplate ? 'bg-purple-600 border-purple-600' : 'border-gray-300'
                  }`}>
                    {useTemplate && <Check className="w-3 h-3 text-white" />}
                  </span>
                </button>
                
                {useTemplate && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <p className="text-sm text-gray-600 mb-3">选择一个模板快速配置：</p>
                    <div className="grid gap-2">
                      {scheduleTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          className="p-3 border border-gray-200 rounded-lg text-left hover:border-purple-300 hover:bg-purple-50 transition flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900">{template.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {template.preferredDays.map(d => ['一', '二', '三', '四', '五', '六', '日'][d - 1]).join('、')} · {template.preferredTimeStart}:00-{template.preferredTimeEnd}:00
                            </p>
                          </div>
                          <Copy className="w-4 h-4 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">课程名称</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="可选，默认使用学员-教师名称"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">课程时长</label>
                  <select
                    value={formData.duration}
                    onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={30}>30 分钟</option>
                    <option value={60}>60 分钟</option>
                    <option value={90}>90 分钟</option>
                    <option value={120}>120 分钟</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">学员 *</label>
                  <select
                    value={formData.studentId}
                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">选择学员</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">教师 *</label>
                  <select
                    value={formData.teacherId}
                    onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">选择教师</option>
                    {activeTeachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} - {t.specialization}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">偏好上课日期</label>
                <div className="flex flex-wrap gap-2">
                  {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const dayNum = i + 1;
                        const newDays = formData.preferredDays.includes(dayNum)
                          ? formData.preferredDays.filter(d => d !== dayNum)
                          : [...formData.preferredDays, dayNum];
                        setFormData({ ...formData, preferredDays: newDays });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                        formData.preferredDays.includes(i + 1)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">不选择则表示任意日期都可以</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">偏好上课时间</label>
                <div className="flex items-center gap-4">
                  <select
                    value={formData.preferredTimeStart}
                    onChange={e => setFormData({ ...formData, preferredTimeStart: parseInt(e.target.value) })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 14 }).map((_, i) => (
                      <option key={i} value={i + 8}>{i + 8}:00</option>
                    ))}
                  </select>
                  <span className="text-gray-500">至</span>
                  <select
                    value={formData.preferredTimeEnd}
                    onChange={e => setFormData({ ...formData, preferredTimeEnd: parseInt(e.target.value) })}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 14 }).map((_, i) => (
                      <option key={i} value={i + 9}>{i + 9}:00</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排课周数</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={formData.weeks}
                  onChange={e => setFormData({ ...formData, weeks: parseInt(e.target.value) || 1 })}
                  className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-500 ml-2">周</span>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                  <p className="text-gray-600">正在分析最优时间...</p>
                  <p className="text-sm text-gray-400 mt-1">检测教师和学员时间冲突</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentWeekStart(prev => addWeeks(prev, -1))}
                        className="p-2 rounded-lg hover:bg-gray-100 transition"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="font-medium text-gray-900">
                        {format(currentWeekStart, 'M月d日')} - {format(addDays(currentWeekStart, 6), 'M月d日')}
                      </span>
                      <button
                        onClick={() => setCurrentWeekStart(prev => addWeeks(prev, 1))}
                        className="p-2 rounded-lg hover:bg-gray-100 transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      onClick={() => setStep(1)}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      修改条件
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day, i) => (
                      <div key={i} className="text-center">
                        <p className="text-xs text-gray-500 mb-1">
                          {format(day, 'EEE', { locale: zhCN })}
                        </p>
                        <p className={`text-sm font-medium ${isToday(day) ? 'text-indigo-600' : 'text-gray-900'}`}>
                          {format(day, 'd')}
                        </p>
                      </div>
                    ))}
                  </div>

                  {recommendedSlots.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        推荐时间 (按匹配度排序)
                      </h3>
                      <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                        {recommendedSlots.map((slot, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 rounded-xl border-2 text-left transition ${
                              selectedSlot === slot
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    slot.score >= 80 ? 'bg-green-100 text-green-600' :
                                    slot.score >= 50 ? 'bg-amber-100 text-amber-600' :
                                    'bg-red-100 text-red-600'
                                  }`}>
                                  <span className="text-sm font-bold">{slot.score}</span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 flex items-center gap-2">
                                    {format(slot.date, 'M月d日 EEEE', { locale: zhCN })}
                                    {slot.isHoliday && (
                                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                        节假日
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {slot.hour}:00 - {slot.hour + 1}:00
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {slot.teacherAvailable && slot.studentAvailable && !slot.isHoliday ? (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    推荐
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    注意
                                  </span>
                                )}
                              </div>
                            </div>
                            {slot.conflicts.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                {slot.conflicts.map((conflict, j) => (
                                  <p key={j} className="text-xs text-amber-600 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {conflict}
                                  </p>
                                ))}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>未找到合适的时间段</p>
                      <p className="text-sm mt-1">请尝试调整筛选条件</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={analyzeAndRecommend}
                disabled={!formData.studentId || !formData.teacherId}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                开始分析
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                上一步
              </button>
              <button
                onClick={handleSchedule}
                disabled={!selectedSlot || loading}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    安排中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    确认安排
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
