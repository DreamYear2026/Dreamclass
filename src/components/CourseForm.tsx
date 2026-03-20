import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, User, BookOpen, MapPin, Repeat, Sparkles, Heart, Star, ChevronRight } from 'lucide-react';
import { Course, Role } from '../types';
import { api } from '../services/api';
import { addWeeks, parseISO, format } from 'date-fns';
import { useStudents, useTeachers } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import DatePicker from './DatePicker';

interface CourseFormProps {
  course?: Course;
  role?: Role;
  onClose: () => void;
  onSave: (course: Omit<Course, 'id'>) => Promise<void>;
}

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const roomOptions = ['琴房 1', '琴房 2', '琴房 3', '琴房 4', '琴房 5', '舞蹈室', '美术室', '声乐室'];

export default function CourseForm({ course, role, onClose, onSave }: CourseFormProps) {
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { user } = useAuth();
  const firstStudent = students[0];
  const firstTeacher = role === 'teacher' 
    ? teachers.find(t => t.id === user?.id) 
    : teachers.find(t => t.status === 'active');
  const isTeacher = role === 'teacher';

  const [formData, setFormData] = useState({
    title: course?.title || '',
    date: course?.date ? parseISO(course.date) : new Date(),
    startTime: course?.startTime ? parseTime(course.startTime) : { hour: 10, minute: 0 },
    endTime: course?.endTime ? parseTime(course.endTime) : { hour: 11, minute: 0 },
    teacherId: course?.teacherId || firstTeacher?.id || '',
    teacherName: course?.teacherName || firstTeacher?.name || '',
    studentId: course?.studentId || firstStudent?.id || '',
    studentName: course?.studentName || firstStudent?.name || '',
    room: course?.room || '琴房 1'
  });
  const [repeat, setRepeat] = useState('none');
  const [weeks, setWeeks] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showRoomSelector, setShowRoomSelector] = useState(false);
  const [showTimeSelector, setShowTimeSelector] = useState(false);

  function parseTime(timeStr: string) {
    const [hour, minute] = timeStr.split(':').map(Number);
    return { hour, minute };
  }

  const selectedStudent = useMemo(() => 
    students.find(s => s.id === formData.studentId),
    [students, formData.studentId]
  );

  const selectedTeacher = useMemo(() =>
    teachers.find(t => t.id === formData.teacherId),
    [teachers, formData.teacherId]
  );

  const handleStudentChange = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    setFormData(prev => ({
      ...prev,
      studentId,
      studentName: student?.name || ''
    }));
  };

  const handleTeacherChange = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    setFormData(prev => ({
      ...prev,
      teacherId,
      teacherName: teacher?.name || ''
    }));
  };

  const handleTimeSlotClick = (time: string) => {
    const [hour, minute] = time.split(':').map(Number);
    setFormData(prev => ({
      ...prev,
      startTime: { hour, minute },
      endTime: { hour: hour + 1, minute }
    }));
    setShowTimeSelector(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = '请输入课程名称';
    if (!formData.studentId) newErrors.studentId = '请选择学员';
    if (!formData.teacherId) newErrors.teacherId = '请选择教师';
    if (!formData.room.trim()) newErrors.room = '请选择教室';
    
    const startTotal = formData.startTime.hour * 60 + formData.startTime.minute;
    const endTotal = formData.endTime.hour * 60 + formData.endTime.minute;
    if (endTotal <= startTotal) newErrors.endTime = '结束时间必须晚于开始时间';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const allCourses = await api.getCourses();
      const coursesToCreate = [];
      
      const dateStr = format(formData.date, 'yyyy-MM-dd');
      const startTimeStr = `${String(formData.startTime.hour).padStart(2, '0')}:${String(formData.startTime.minute).padStart(2, '0')}`;
      const endTimeStr = `${String(formData.endTime.hour).padStart(2, '0')}:${String(formData.endTime.minute).padStart(2, '0')}`;

      for (let i = 0; i < (repeat === 'weekly' ? weeks : 1); i++) {
        const currentDate = format(addWeeks(formData.date, i), 'yyyy-MM-dd');
        const courseData = {
          title: formData.title,
          date: currentDate,
          startTime: startTimeStr,
          endTime: endTimeStr,
          teacherId: formData.teacherId,
          teacherName: formData.teacherName,
          studentId: formData.studentId,
          studentName: formData.studentName,
          room: formData.room,
          campusId: selectedStudent?.campusId || null,
          status: 'scheduled'
        };

        const hasTimeConflict = (start1: string, end1: string, start2: string, end2: string) => {
          return start1 < end2 && end1 > start2;
        };

        const roomConflict = allCourses.find(c => 
          c.id !== course?.id &&
          c.date === currentDate &&
          c.room === formData.room &&
          hasTimeConflict(startTimeStr, endTimeStr, c.startTime, c.endTime)
        );

        if (roomConflict) {
          setErrors({ submit: `${currentDate} 在 ${formData.room} 该时间段已被占用` });
          setLoading(false);
          return;
        }

        const teacherConflict = allCourses.find(c => 
          c.id !== course?.id &&
          c.date === currentDate &&
          c.teacherId === formData.teacherId &&
          hasTimeConflict(startTimeStr, endTimeStr, c.startTime, c.endTime)
        );

        if (teacherConflict) {
          setErrors({ submit: `${currentDate} 教师 ${formData.teacherName} 该时间段已有其他课程` });
          setLoading(false);
          return;
        }

        const studentConflict = allCourses.find(c => 
          c.id !== course?.id &&
          c.date === currentDate &&
          c.studentId === formData.studentId &&
          hasTimeConflict(startTimeStr, endTimeStr, c.startTime, c.endTime)
        );

        if (studentConflict) {
          setErrors({ submit: `${currentDate} 学员 ${formData.studentName} 该时间段已有其他课程` });
          setLoading(false);
          return;
        }
        coursesToCreate.push(courseData);
      }

      if (course && repeat === 'none') {
        await api.updateCourse(course.id, coursesToCreate[0]);
      } else {
        await api.addCoursesBatch(coursesToCreate);
      }
      
      await onSave(coursesToCreate[0]);
      onClose();
    } catch (error) {
      setErrors({ submit: '保存失败，请重试' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {course ? '编辑课程' : '安排课程'}
              </h2>
              <p className="text-xs text-gray-500">
                {course ? '修改课程信息' : '创建新的课程安排'}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-center gap-2">
              <X className="w-4 h-4" />
              {errors.submit}
            </div>
          )}

          {/* 课程名称 */}
          <div className="bg-gradient-to-br from-[#4ECDC4]/5 to-[#7EDDD6]/5 rounded-2xl p-4 border border-[#4ECDC4]/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#4ECDC4] to-[#7EDDD6] rounded-lg flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">课程信息</h3>
            </div>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4ECDC4]/20 transition-all ${
                errors.title ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'
              }`}
              placeholder="例如：钢琴一对一课程"
            />
            {errors.title && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><X className="w-3 h-3" />{errors.title}</p>}
          </div>

          {/* 日期和时间 */}
          <div className="bg-gradient-to-br from-[#FF6B6B]/5 to-[#FF8E8E]/5 rounded-2xl p-4 border border-[#FF6B6B]/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">日期和时间</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">上课日期</label>
                <DatePicker
                  value={formData.date}
                  onChange={(date) => setFormData({...formData, date})}
                  showTime
                  hour={formData.startTime.hour}
                  minute={formData.startTime.minute}
                  onTimeChange={(hour, minute) => setFormData({
                    ...formData, 
                    startTime: { hour, minute },
                    endTime: { hour: hour + 1, minute }
                  })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">开始时间</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTimeSelector(!showTimeSelector)}
                      className="w-full px-4 py-3 border-2 border-gray-100 bg-white rounded-xl text-left flex items-center justify-between hover:border-gray-200 transition-all"
                    >
                      <span className="font-medium">
                        {String(formData.startTime.hour).padStart(2, '0')}:{String(formData.startTime.minute).padStart(2, '0')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                    {showTimeSelector && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-10 p-3 animate-scale-in max-h-60 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map(time => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => handleTimeSlotClick(time)}
                              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                                `${String(formData.startTime.hour).padStart(2, '0')}:${String(formData.startTime.minute).padStart(2, '0')}` === time
                                  ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white shadow-md'
                                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">结束时间</label>
                  <div className="px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-700">
                      {String(formData.endTime.hour).padStart(2, '0')}:{String(formData.endTime.minute).padStart(2, '0')}
                    </span>
                  </div>
                  {errors.endTime && <p className="text-xs text-red-500 mt-1">{errors.endTime}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* 教室选择 */}
          <div className="bg-gradient-to-br from-[#A29BFE]/5 to-[#B8B3FF]/5 rounded-2xl p-4 border border-[#A29BFE]/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#A29BFE] to-[#B8B3FF] rounded-lg flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-gray-900">教室</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {roomOptions.map(room => (
                <button
                  key={room}
                  type="button"
                  onClick={() => setFormData({...formData, room})}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    formData.room === room
                      ? 'bg-gradient-to-r from-[#A29BFE] to-[#B8B3FF] text-white shadow-md'
                      : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  {room}
                </button>
              ))}
            </div>
            {errors.room && <p className="text-xs text-red-500 mt-2">{errors.room}</p>}
          </div>

          {/* 学员和教师 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-[#95E1A3]/5 to-[#7DD389]/5 rounded-2xl p-4 border border-[#95E1A3]/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#95E1A3] to-[#7DD389] rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">学员</h3>
              </div>
              <select
                value={formData.studentId}
                onChange={e => handleStudentChange(e.target.value)}
                className={`w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#95E1A3]/20 text-sm ${
                  errors.studentId ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                <option value="">选择学员</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
              {errors.studentId && <p className="text-xs text-red-500 mt-1">{errors.studentId}</p>}
            </div>

            <div className="bg-gradient-to-br from-[#FD79A8]/5 to-[#FFB8D0]/5 rounded-2xl p-4 border border-[#FD79A8]/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#FD79A8] to-[#FFB8D0] rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">教师</h3>
              </div>
              {isTeacher ? (
                <div className={`w-full px-3 py-2.5 border-2 border-gray-100 bg-gray-50 rounded-xl text-sm`}>
                  <span className="font-medium">{formData.teacherName}</span>
                </div>
              ) : (
                <>
                  <select
                    value={formData.teacherId}
                    onChange={e => handleTeacherChange(e.target.value)}
                    className={`w-full px-3 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FD79A8]/20 text-sm ${
                      errors.teacherId ? 'border-red-300 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <option value="">选择教师</option>
                    {teachers.filter(t => t.status === 'active').map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                    ))}
                  </select>
                  {errors.teacherId && <p className="text-xs text-red-500 mt-1">{errors.teacherId}</p>}
                </>
              )}
            </div>
          </div>

          {/* 重复设置 */}
          {!course && (
            <div className="bg-gradient-to-br from-[#FFE66D]/5 to-[#FFB347]/5 rounded-2xl p-4 border border-[#FFE66D]/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#FFE66D] to-[#FFB347] rounded-lg flex items-center justify-center">
                  <Repeat className="w-4 h-4 text-gray-800" />
                </div>
                <h3 className="font-bold text-gray-900">重复设置</h3>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRepeat('none')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    repeat === 'none'
                      ? 'bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-gray-800 shadow-md'
                      : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  不重复
                </button>
                <button
                  type="button"
                  onClick={() => setRepeat('weekly')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    repeat === 'weekly'
                      ? 'bg-gradient-to-r from-[#FFE66D] to-[#FFB347] text-gray-800 shadow-md'
                      : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  每周重复
                </button>
              </div>

              {repeat === 'weekly' && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-sm text-gray-600">连续</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={weeks}
                    onChange={e => setWeeks(parseInt(e.target.value) || 1)}
                    className="w-16 px-3 py-2 border-2 border-gray-100 bg-white rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-[#FFE66D]/20"
                  />
                  <span className="text-sm text-gray-600">周</span>
                </div>
              )}
            </div>
          )}

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
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white font-medium disabled:opacity-50 hover:shadow-lg hover:shadow-[#4ECDC4]/30 transition-all flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}
