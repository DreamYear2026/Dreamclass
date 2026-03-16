import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, FileText, Check, X, AlertCircle, Loader2, Plus, ChevronRight } from 'lucide-react';
import { Language, LeaveRequest, Course } from '../types';
import { useTranslation } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import { useCourses, useStudents } from '../contexts/AppContext';
import { useStudentByUser } from '../hooks/useStudentByUser';
import { api } from '../services/api';
import { useToast } from './Toast';
import { parseISO, format, isAfter, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import BottomSheet from './BottomSheet';

export default function LeaveRequests({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { user } = useAuth();
  const { courses } = useCourses();
  const { students } = useStudents();
  const { student: myStudent } = useStudentByUser();
  const { showToast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    type: 'leave' as 'leave' | 'reschedule',
    reason: '',
    preferredDate: '',
    preferredTime: '',
  });

  useEffect(() => {
    fetchLeaveRequests();
  }, []);

  const fetchLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leave-requests', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setLeaveRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const myCourses = useMemo(() => {
    if (!user) return [];
    
    if (user.role === 'parent' && myStudent) {
      return courses
        .filter(c => c.studentId === myStudent.id && c.status === 'scheduled')
        .filter(c => {
          const courseDate = parseISO(c.date);
          return isAfter(courseDate, new Date()) || isToday(courseDate);
        })
        .sort((a, b) => {
          const dateA = parseISO(a.date);
          const dateB = parseISO(b.date);
          return dateA.getTime() - dateB.getTime();
        });
    }
    
    if (user.role === 'admin') {
      return courses.filter(c => c.status === 'scheduled');
    }
    
    return [];
  }, [courses, user, myStudent]);

  const filteredRequests = useMemo(() => {
    if (user?.role === 'parent' && myStudent) {
      return leaveRequests.filter(r => r.studentId === myStudent.id);
    }
    return leaveRequests;
  }, [leaveRequests, user, myStudent]);

  const handleSubmit = async () => {
    if (!selectedCourse) {
      showToast(lang === 'zh' ? '请选择课程' : 'Please select a course', 'error');
      return;
    }
    if (!formData.reason.trim()) {
      showToast(lang === 'zh' ? '请填写原因' : 'Please enter a reason', 'error');
      return;
    }
    if (formData.type === 'reschedule' && (!formData.preferredDate || !formData.preferredTime)) {
      showToast(lang === 'zh' ? '请填写期望的调课时间' : 'Please enter preferred time', 'error');
      return;
    }

    try {
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          courseId: selectedCourse.id,
          studentId: selectedCourse.studentId,
          studentName: selectedCourse.studentName,
          type: formData.type,
          reason: formData.reason,
          preferredDate: formData.preferredDate || null,
          preferredTime: formData.preferredTime || null,
        }),
      });

      if (response.ok) {
        showToast(lang === 'zh' ? '申请已提交' : 'Request submitted', 'success');
        setShowForm(false);
        setSelectedCourse(null);
        setFormData({ type: 'leave', reason: '', preferredDate: '', preferredTime: '' });
        fetchLeaveRequests();
      } else {
        showToast(lang === 'zh' ? '提交失败' : 'Failed to submit', 'error');
      }
    } catch (error) {
      showToast(lang === 'zh' ? '提交失败' : 'Failed to submit', 'error');
    }
  };

  const handleProcess = async (id: string, status: 'approved' | 'rejected', response?: string) => {
    try {
      const res = await fetch(`/api/leave-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, response }),
      });

      if (res.ok) {
        showToast(lang === 'zh' ? '已处理' : 'Processed', 'success');
        fetchLeaveRequests();
      }
    } catch (error) {
      showToast(lang === 'zh' ? '处理失败' : 'Failed to process', 'error');
    }
  };

  const getStatusBadge = (status: LeaveRequest['status']) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{lang === 'zh' ? '待处理' : 'Pending'}</span>;
      case 'approved':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{lang === 'zh' ? '已通过' : 'Approved'}</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">{lang === 'zh' ? '已拒绝' : 'Rejected'}</span>;
    }
  };

  const getTypeBadge = (type: LeaveRequest['type']) => {
    return type === 'leave' 
      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{lang === 'zh' ? '请假' : 'Leave'}</span>
      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">{lang === 'zh' ? '调课' : 'Reschedule'}</span>;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  const isParent = user?.role === 'parent';
  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {lang === 'zh' ? '请假调课' : 'Leave Requests'}
        </h1>
        {isParent && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {lang === 'zh' ? '申请' : 'Apply'}
          </button>
        )}
      </div>

      {isParent && myStudent && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white">
          <p className="text-sm text-white/80">{lang === 'zh' ? '学员' : 'Student'}</p>
          <p className="font-bold text-lg">{myStudent.name}</p>
        </div>
      )}

      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{lang === 'zh' ? '暂无申请记录' : 'No requests'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => {
            const course = courses.find(c => c.id === request.courseId);
            
            return (
              <div key={request.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(request.type)}
                    {getStatusBadge(request.status)}
                  </div>
                  <span className="text-xs text-gray-400">
                    {format(parseISO(request.requestDate), lang === 'zh' ? 'M月d日' : 'MMM d')}
                  </span>
                </div>

                {course && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{course.date}</span>
                      <Clock className="w-4 h-4 ml-2" />
                      <span>{course.startTime} - {course.endTime}</span>
                    </div>
                    <p className="font-medium text-gray-900 mt-1">{course.title}</p>
                  </div>
                )}

                <p className="text-sm text-gray-700">{request.reason}</p>

                {request.type === 'reschedule' && request.preferredDate && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                    {lang === 'zh' ? '期望时间' : 'Preferred'}: {request.preferredDate} {request.preferredTime}
                  </div>
                )}

                {request.response && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-lg text-sm text-gray-600">
                    {lang === 'zh' ? '回复' : 'Response'}: {request.response}
                  </div>
                )}

                {isAdmin && request.status === 'pending' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleProcess(request.id, 'approved')}
                      className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      {lang === 'zh' ? '通过' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleProcess(request.id, 'rejected')}
                      className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      {lang === 'zh' ? '拒绝' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setSelectedCourse(null);
        }}
        title={lang === 'zh' ? '申请请假/调课' : 'Apply for Leave/Reschedule'}
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '申请类型' : 'Type'}
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormData({ ...formData, type: 'leave' })}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${
                  formData.type === 'leave'
                    ? 'border-orange-600 bg-orange-50 text-orange-600'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {lang === 'zh' ? '请假' : 'Leave'}
              </button>
              <button
                onClick={() => setFormData({ ...formData, type: 'reschedule' })}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition ${
                  formData.type === 'reschedule'
                    ? 'border-orange-600 bg-orange-50 text-orange-600'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                {lang === 'zh' ? '调课' : 'Reschedule'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '选择课程' : 'Select Course'} *
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {myCourses.map(course => (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedCourse?.id === course.id
                      ? 'border-orange-600 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{course.title}</p>
                      <p className="text-xs text-gray-500">{course.date} {course.startTime}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
              {myCourses.length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  {lang === 'zh' ? '暂无可申请的课程' : 'No courses available'}
                </p>
              )}
            </div>
          </div>

          {formData.type === 'reschedule' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {lang === 'zh' ? '期望日期' : 'Preferred Date'} *
                </label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={e => setFormData({ ...formData, preferredDate: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {lang === 'zh' ? '期望时间' : 'Preferred Time'} *
                </label>
                <input
                  type="time"
                  value={formData.preferredTime}
                  onChange={e => setFormData({ ...formData, preferredTime: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '原因' : 'Reason'} *
            </label>
            <textarea
              value={formData.reason}
              onChange={e => setFormData({ ...formData, reason: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[80px]"
              placeholder={lang === 'zh' ? '请说明请假/调课原因...' : 'Enter reason...'}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowForm(false);
                setSelectedCourse(null);
              }}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 rounded-xl bg-orange-600 text-white font-medium"
            >
              {lang === 'zh' ? '提交申请' : 'Submit'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
