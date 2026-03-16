import React, { useMemo } from 'react';
import { Clock, User, MapPin, Calendar, Loader2 } from 'lucide-react';
import { Language, Course } from '../types';
import { useTranslation } from '../i18n';
import { useCourses } from '../contexts/AppContext';
import { parseISO, format, differenceInMinutes, differenceInHours, differenceInDays, isAfter, isToday, isTomorrow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStudentByUser } from '../hooks/useStudentByUser';

interface ParentScheduleProps {
  lang: Language;
  studentId?: string;
}

function getTimeUntil(dateStr: string, timeStr: string): { value: number; unit: string; urgent: boolean } {
  const now = new Date();
  const classDate = parseISO(dateStr);
  const [hours, minutes] = timeStr.split(':').map(Number);
  classDate.setHours(hours, minutes, 0, 0);
  
  const diffMinutes = differenceInMinutes(classDate, now);
  
  if (diffMinutes < 0) {
    return { value: 0, unit: '已开始', urgent: false };
  }
  
  if (diffMinutes < 60) {
    return { value: diffMinutes, unit: '分钟', urgent: diffMinutes <= 30 };
  }
  
  if (diffMinutes < 24 * 60) {
    return { value: Math.floor(diffMinutes / 60), unit: '小时', urgent: false };
  }
  
  return { value: differenceInDays(classDate, now), unit: '天', urgent: false };
}

function formatDateLabel(dateStr: string, lang: Language): string {
  const date = parseISO(dateStr);
  
  if (isToday(date)) {
    return lang === 'zh' ? '今天' : 'Today';
  }
  
  if (isTomorrow(date)) {
    return lang === 'zh' ? '明天' : 'Tomorrow';
  }
  
  return format(date, lang === 'zh' ? 'M月d日 EEEE' : 'MMM d, EEEE', { locale: lang === 'zh' ? zhCN : undefined });
}

export default function ParentSchedule({ lang, studentId }: ParentScheduleProps) {
  const { t } = useTranslation(lang);
  const { student, loading: studentLoading } = useStudentByUser();
  const { courses, loading: coursesLoading } = useCourses();

  const upcomingCourses = useMemo(() => {
    if (!student) return [];
    
    const now = new Date();
    
    return courses
      .filter(c => c.studentId === student.id && c.status === 'scheduled')
      .filter(c => {
        const courseDate = parseISO(c.date);
        const [hours, minutes] = c.endTime.split(':').map(Number);
        courseDate.setHours(hours, minutes, 0, 0);
        return isAfter(courseDate, now);
      })
      .sort((a, b) => {
        const dateA = parseISO(a.date);
        const dateB = parseISO(b.date);
        const [hA, mA] = a.startTime.split(':').map(Number);
        const [hB, mB] = b.startTime.split(':').map(Number);
        dateA.setHours(hA, mA, 0, 0);
        dateB.setHours(hB, mB, 0, 0);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  }, [courses, student]);

  if (studentLoading || coursesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-24">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{lang === 'zh' ? '未找到学员信息' : 'Student not found'}</p>
          <p className="text-sm text-gray-400 mt-1">
            {lang === 'zh' ? '请联系教务老师绑定学员账号' : 'Please contact the school to bind your account'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-24">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            {lang === 'zh' ? `${student.name} 的课程` : `${student.name}'s Classes`}
          </h1>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
            {student.remainingHours} {t('hrs')}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="px-2 py-1 bg-gray-100 rounded-md">{student.level}</span>
          <span>·</span>
          <span>{upcomingCourses.length} {lang === 'zh' ? '节待上课程' : 'upcoming classes'}</span>
        </div>
      </div>

      {upcomingCourses.length > 0 ? (
        <div className="space-y-3">
          {upcomingCourses.map((course, index) => {
            const timeUntil = getTimeUntil(course.date, course.startTime);
            const dateLabel = formatDateLabel(course.date, lang);
            
            return (
              <div 
                key={course.id} 
                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all ${
                  timeUntil.urgent ? 'border-orange-300 bg-orange-50' : 'border-gray-100'
                } ${index === 0 ? 'ring-2 ring-orange-200' : ''}`}
              >
                {index === 0 && (
                  <div className="flex items-center justify-center mb-3">
                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                      timeUntil.urgent 
                        ? 'bg-orange-500 text-white animate-pulse' 
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {lang === 'zh' ? `还有 ${timeUntil.value} ${timeUntil.unit}上课` : `${timeUntil.value} ${timeUntil.unit} until class`}
                    </div>
                  </div>
                )}
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-16 text-center">
                    <div className="text-xs text-gray-500 mb-1">{dateLabel}</div>
                    <div className="text-2xl font-bold text-gray-900">{course.startTime}</div>
                    <div className="text-xs text-gray-400">- {course.endTime}</div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg truncate">{course.title}</h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{course.teacherName}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{course.room}</span>
                      </div>
                    </div>
                  </div>
                  
                  {index !== 0 && (
                    <div className="flex-shrink-0 text-right">
                      <div className="text-lg font-bold text-gray-700">{timeUntil.value}</div>
                      <div className="text-xs text-gray-500">{timeUntil.unit}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('noUpcomingClasses')}</p>
          <p className="text-sm text-gray-400 mt-1">
            {lang === 'zh' ? '请联系教务老师安排课程' : 'Please contact the school to schedule classes'}
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center">
          <Clock className="w-4 h-4 mr-2 text-orange-500" />
          {lang === 'zh' ? '温馨提示' : 'Tips'}
        </h2>
        <ul className="text-sm text-gray-600 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-orange-500 mt-0.5">•</span>
            <span>{lang === 'zh' ? '请提前10分钟到达教室' : 'Please arrive 10 minutes early'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 mt-0.5">•</span>
            <span>{lang === 'zh' ? '如需请假请提前24小时联系教务' : 'Please notify 24 hours in advance for leave'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-500 mt-0.5">•</span>
            <span>{lang === 'zh' ? '剩余课时不足时请及时续费' : 'Please renew when hours are low'}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
