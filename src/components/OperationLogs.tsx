import React, { useState, useEffect, useMemo } from 'react';
import { Clock, User, Shield, Search, Filter, Download, Trash2, Eye, X, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { Language } from '../types';
import { useToast } from './Toast';

interface OperationLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
  status: 'success' | 'warning' | 'error';
}

const mockLogs: OperationLog[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    userId: 'admin1',
    userName: '系统管理员',
    userRole: 'admin',
    action: '添加学员',
    module: '学员管理',
    details: '添加了新学员：张三',
    status: 'success',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    userId: 'teacher1',
    userName: '李老师',
    userRole: 'teacher',
    action: '安排课程',
    module: '课程管理',
    details: '为学员王五安排了钢琴课程',
    status: 'success',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    userId: 'admin1',
    userName: '系统管理员',
    userRole: 'admin',
    action: '修改权限',
    module: '权限管理',
    details: '修改了教师王老师的权限配置',
    status: 'warning',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    userId: 'teacher2',
    userName: '张老师',
    userRole: 'teacher',
    action: '登录失败',
    module: '系统',
    details: '密码错误，尝试登录失败',
    status: 'error',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    userId: 'admin1',
    userName: '系统管理员',
    userRole: 'admin',
    action: '数据备份',
    module: '系统',
    details: '创建了系统数据备份',
    status: 'success',
  },
];

const modules = ['全部', '学员管理', '教师管理', '课程管理', '财务管理', '权限管理', '系统'];
const statuses = ['全部', '成功', '警告', '错误'];

export default function OperationLogs({ lang }: { lang: Language }) {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<OperationLog[]>(mockLogs);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('全部');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [selectedLog, setSelectedLog] = useState<OperationLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesModule = moduleFilter === '全部' || log.module === moduleFilter;
      
      const statusMap: Record<string, OperationLog['status'][]> = {
        '全部': ['success', 'warning', 'error'],
        '成功': ['success'],
        '警告': ['warning'],
        '错误': ['error'],
      };
      const matchesStatus = statusMap[statusFilter].includes(log.status);
      
      return matchesSearch && matchesModule && matchesStatus;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, searchQuery, moduleFilter, statusFilter]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusConfig = (status: OperationLog['status']) => {
    switch (status) {
      case 'success':
        return { color: 'bg-green-100 text-green-700', icon: CheckCircle };
      case 'warning':
        return { color: 'bg-amber-100 text-amber-700', icon: AlertTriangle };
      case 'error':
        return { color: 'bg-red-100 text-red-700', icon: AlertTriangle };
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white';
      case 'teacher':
        return 'bg-gradient-to-r from-[#4ECDC4] to-[#7EDDD6] text-white';
      case 'parent':
        return 'bg-gradient-to-r from-[#A29BFE] to-[#B8B3FF] text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleDeleteLog = (logId: string) => {
    if (!confirm(lang === 'zh' ? '确定要删除这条日志吗？' : 'Are you sure to delete this log?')) return;
    setLogs(logs.filter(log => log.id !== logId));
    showToast(lang === 'zh' ? '日志删除成功' : 'Log deleted successfully', 'success');
  };

  const handleClearAllLogs = () => {
    if (!confirm(lang === 'zh' ? '确定要清空所有日志吗？此操作不可撤销！' : 'Are you sure to clear all logs? This action cannot be undone!')) return;
    setLogs([]);
    showToast(lang === 'zh' ? '日志已清空' : 'Logs cleared', 'success');
  };

  const handleExportLogs = () => {
    const exportData = logs.map(log => ({
      '时间': formatTime(log.timestamp),
      '用户': log.userName,
      '角色': log.userRole,
      '操作': log.action,
      '模块': log.module,
      '详情': log.details,
      '状态': log.status,
    }));
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `operation-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast(lang === 'zh' ? '日志导出成功' : 'Logs exported successfully', 'success');
  };

  const stats = useMemo(() => {
    return {
      total: logs.length,
      today: logs.filter(log => {
        const logDate = new Date(log.timestamp);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
      }).length,
      success: logs.filter(log => log.status === 'success').length,
      warning: logs.filter(log => log.status === 'warning').length,
      error: logs.filter(log => log.status === 'error').length,
    };
  }, [logs]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#A29BFE] to-[#FD79A8] bg-clip-text text-transparent flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#A29BFE]" />
            {lang === 'zh' ? '操作日志' : 'Operation Logs'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '记录所有系统操作和数据访问' : 'Record all system operations and data access'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportLogs}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            {lang === 'zh' ? '导出' : 'Export'}
          </button>
          <button
            onClick={handleClearAllLogs}
            className="px-4 py-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {lang === 'zh' ? '清空' : 'Clear'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '总日志数' : 'Total'}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-blue-600">{stats.today}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '今日' : 'Today'}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-green-600">{stats.success}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '成功' : 'Success'}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-amber-600">{stats.warning}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '警告' : 'Warning'}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-2xl font-bold text-red-600">{stats.error}</p>
          <p className="text-xs text-gray-500">{lang === 'zh' ? '错误' : 'Error'}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A29BFE]/20 hover:border-gray-200 transition-all"
              placeholder={lang === 'zh' ? '搜索用户名、操作或详情...' : 'Search user, action or details...'}
            />
          </div>
          <select
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A29BFE]/20 hover:border-gray-200 transition-all"
          >
            {modules.map(module => (
              <option key={module} value={module}>{module}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-3 border-2 border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A29BFE]/20 hover:border-gray-200 transition-all"
          >
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {filteredLogs.map(log => {
            const statusConfig = getStatusConfig(log.status);
            const StatusIcon = statusConfig.icon;
            return (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl ${statusConfig.color} flex items-center justify-center flex-shrink-0`}>
                  <StatusIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(log.userRole)}`}>
                      {log.userRole === 'admin' ? '管理员' : log.userRole === 'teacher' ? '教师' : '家长'}
                    </span>
                    <span className="font-medium text-gray-900">{log.userName}</span>
                    <span className="text-gray-400">·</span>
                    <span className="font-semibold text-gray-700">{log.action}</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-sm text-gray-500">{log.module}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-1">{log.details}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(log.timestamp)}</span>
                    {log.ipAddress && (
                      <>
                        <span>·</span>
                        <span>IP: {log.ipAddress}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedLog(log);
                      setShowDetail(true);
                    }}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-[#4ECDC4] transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteLog(log.id)}
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-[#FF6B6B] transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredLogs.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{lang === 'zh' ? '暂无日志数据' : 'No logs found'}</p>
            </div>
          )}
        </div>
      </div>

      {showDetail && selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDetail(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{lang === 'zh' ? '日志详情' : 'Log Detail'}</h3>
              <button
                onClick={() => setShowDetail(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '时间' : 'Time'}</p>
                  <p className="font-medium text-gray-900">{formatTime(selectedLog.timestamp)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '用户' : 'User'}</p>
                  <p className="font-medium text-gray-900">{selectedLog.userName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '角色' : 'Role'}</p>
                  <p className="font-medium text-gray-900">
                    {selectedLog.userRole === 'admin' ? '管理员' : selectedLog.userRole === 'teacher' ? '教师' : '家长'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '模块' : 'Module'}</p>
                  <p className="font-medium text-gray-900">{selectedLog.module}</p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{lang === 'zh' ? '操作' : 'Action'}</p>
                <p className="font-medium text-gray-900">{selectedLog.action}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">{lang === 'zh' ? '详情' : 'Details'}</p>
                <p className="text-gray-900">{selectedLog.details}</p>
              </div>
              {selectedLog.ipAddress && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">{lang === 'zh' ? 'IP地址' : 'IP Address'}</p>
                  <p className="font-medium text-gray-900">{selectedLog.ipAddress}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
