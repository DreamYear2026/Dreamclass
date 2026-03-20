import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Filter,
  MessageSquare
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useToast } from './Toast';
import { format, parseISO } from 'date-fns';

interface ApprovalRequest {
  id: string;
  type: 'leave' | 'expense' | 'material' | 'schedule_change' | 'other';
  typeName: string;
  applicantId: string;
  applicantName: string;
  applicantRole: 'teacher' | 'staff' | 'parent';
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
  attachments?: string[];
}

const generateMockApprovalRequests = (): ApprovalRequest[] => {
  const now = new Date();
  
  return [
    {
      id: '1',
      type: 'leave',
      typeName: '请假申请',
      applicantId: 't1',
      applicantName: '张老师',
      applicantRole: 'teacher',
      title: '病假申请',
      content: '因身体不适，申请3月20日-3月22日病假，共3天。已安排好代课教师。',
      status: 'pending',
      priority: 'high',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      type: 'expense',
      typeName: '费用报销',
      applicantId: 't2',
      applicantName: '李老师',
      applicantRole: 'teacher',
      title: '教材采购报销',
      content: '购买钢琴教材10套，共计¥1500，已附发票。',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      attachments: ['发票.jpg']
    },
    {
      id: '3',
      type: 'schedule_change',
      typeName: '调课申请',
      applicantId: 't3',
      applicantName: '王老师',
      applicantRole: 'teacher',
      title: '课程时间调整',
      content: '因个人原因，申请将周三下午的课程调整到周四下午。',
      status: 'approved',
      priority: 'medium',
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      reviewedAt: new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString(),
      reviewedBy: '管理员',
      reviewNote: '已确认，调整成功。'
    },
    {
      id: '4',
      type: 'material',
      typeName: '物资申请',
      applicantId: 's1',
      applicantName: '前台小陈',
      applicantRole: 'staff',
      title: '办公用品采购',
      content: '申请采购打印纸5箱、签字笔50支、文件夹20个。',
      status: 'pending',
      priority: 'low',
      createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '5',
      type: 'leave',
      typeName: '请假申请',
      applicantId: 't4',
      applicantName: '赵老师',
      applicantRole: 'teacher',
      title: '年假申请',
      content: '申请4月1日-4月5日年假，共5天。',
      status: 'rejected',
      priority: 'medium',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      reviewedBy: '管理员',
      reviewNote: '该时段已有其他教师请假，请调整时间。'
    }
  ];
};

export default function ApprovalCenter({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { showToast } = useToast();

  const [requests, setRequests] = useState<ApprovalRequest[]>(generateMockApprovalRequests);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const filteredRequests = useMemo(() => {
    if (filterStatus === 'all') return requests;
    return requests.filter(r => r.status === filterStatus);
  }, [requests, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length
    };
  }, [requests]);

  const approveRequest = (id: string) => {
    setRequests(prev => prev.map(r => 
      r.id === id ? { 
        ...r, 
        status: 'approved' as const, 
        reviewedAt: new Date().toISOString(),
        reviewedBy: '管理员',
        reviewNote 
      } : r
    ));
    showToast(lang === 'zh' ? '已通过' : 'Approved', 'success');
    setReviewNote('');
    setExpandedRequest(null);
  };

  const rejectRequest = (id: string) => {
    if (!reviewNote.trim()) {
      showToast(lang === 'zh' ? '请填写拒绝原因' : 'Please provide rejection reason', 'error');
      return;
    }
    setRequests(prev => prev.map(r => 
      r.id === id ? { 
        ...r, 
        status: 'rejected' as const, 
        reviewedAt: new Date().toISOString(),
        reviewedBy: '管理员',
        reviewNote 
      } : r
    ));
    showToast(lang === 'zh' ? '已拒绝' : 'Rejected', 'success');
    setReviewNote('');
    setExpandedRequest(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {lang === 'zh' ? '待审批' : 'Pending'}
          </span>
        );
      case 'approved':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {lang === 'zh' ? '已通过' : 'Approved'}
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            {lang === 'zh' ? '已拒绝' : 'Rejected'}
          </span>
        );
      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'leave':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'expense':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'material':
        return <FileText className="w-5 h-5 text-purple-600" />;
      case 'schedule_change':
        return <Clock className="w-5 h-5 text-amber-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case 'leave':
        return 'bg-blue-50';
      case 'expense':
        return 'bg-green-50';
      case 'material':
        return 'bg-purple-50';
      case 'schedule_change':
        return 'bg-amber-50';
      default:
        return 'bg-gray-50';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-indigo-500" />
          {lang === 'zh' ? '审批中心' : 'Approval Center'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {lang === 'zh' ? '处理各类审批申请' : 'Process approval requests'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '总申请' : 'Total'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '待审批' : 'Pending'}</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '已通过' : 'Approved'}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.approved}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '已拒绝' : 'Rejected'}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              filterStatus === status
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? (lang === 'zh' ? '全部' : 'All') :
             status === 'pending' ? (lang === 'zh' ? '待审批' : 'Pending') :
             status === 'approved' ? (lang === 'zh' ? '已通过' : 'Approved') :
             (lang === 'zh' ? '已拒绝' : 'Rejected')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredRequests.map(request => (
            <div key={request.id} className="hover:bg-gray-50 transition">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedRequest(expandedRequest === request.id ? null : request.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${getTypeBg(request.type)} flex items-center justify-center`}>
                    {getTypeIcon(request.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500">{request.typeName}</span>
                      {request.priority === 'high' && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs rounded-full">
                          {lang === 'zh' ? '紧急' : 'Urgent'}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900">{request.title}</p>
                    <p className="text-sm text-gray-500">
                      {request.applicantName} · {format(parseISO(request.createdAt), 'yyyy-MM-dd HH:mm')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {getStatusBadge(request.status)}
                  <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                    {expandedRequest === request.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedRequest === request.id && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  <div className="mt-4 space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-700">{request.content}</p>
                    </div>

                    {request.attachments && request.attachments.length > 0 && (
                      <div className="flex gap-2">
                        {request.attachments.map((att, i) => (
                          <div key={i} className="px-3 py-2 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {att}
                          </div>
                        ))}
                      </div>
                    )}

                    {request.status !== 'pending' && (
                      <div className={`p-4 rounded-xl ${
                        request.status === 'approved' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {request.status === 'approved' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={`font-medium ${
                            request.status === 'approved' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {request.reviewedBy} · {request.reviewedAt && format(parseISO(request.reviewedAt), 'yyyy-MM-dd HH:mm')}
                          </span>
                        </div>
                        {request.reviewNote && (
                          <p className="text-sm text-gray-600">{request.reviewNote}</p>
                        )}
                      </div>
                    )}

                    {request.status === 'pending' && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {lang === 'zh' ? '审批意见' : 'Review Note'}
                          </label>
                          <textarea
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={lang === 'zh' ? '请输入审批意见（拒绝时必填）' : 'Enter review note (required for rejection)'}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => rejectRequest(request.id)}
                            className="flex-1 px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            {lang === 'zh' ? '拒绝' : 'Reject'}
                          </button>
                          <button
                            onClick={() => approveRequest(request.id)}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {lang === 'zh' ? '通过' : 'Approve'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {filteredRequests.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardCheck className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">
                {lang === 'zh' ? '暂无审批申请' : 'No approval requests'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
