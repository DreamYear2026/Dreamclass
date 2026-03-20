import React, { useState, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Send,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Save
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useToast } from './Toast';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'system' | 'activity' | 'maintenance' | 'promotion';
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'published' | 'expired';
  targetAudience: 'all' | 'teachers' | 'parents' | 'staff';
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  viewCount: number;
}

const generateMockAnnouncements = (): Announcement[] => {
  const now = new Date();
  
  return [
    {
      id: '1',
      title: '系统升级通知',
      content: '系统将于本周六22:00-23:00进行升级维护，届时系统将暂停服务，请提前做好安排。',
      type: 'system',
      priority: 'high',
      status: 'published',
      targetAudience: 'all',
      publishedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      viewCount: 156
    },
    {
      id: '2',
      title: '春季音乐会报名开始',
      content: '一年一度的春季音乐会即将举行，欢迎所有学员踊跃报名参加，展示学习成果！',
      type: 'activity',
      priority: 'medium',
      status: 'published',
      targetAudience: 'parents',
      publishedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: 89
    },
    {
      id: '3',
      title: '教师培训通知',
      content: '本周五下午将进行教学技能培训，请所有教师准时参加。',
      type: 'system',
      priority: 'medium',
      status: 'published',
      targetAudience: 'teachers',
      publishedAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: 45
    },
    {
      id: '4',
      title: '五一假期安排',
      content: '五一假期期间课程安排调整通知，请查看详细课表。',
      type: 'system',
      priority: 'high',
      status: 'draft',
      targetAudience: 'all',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: 0
    },
    {
      id: '5',
      title: '新课程上线优惠',
      content: '新学期报名优惠活动，老学员推荐新学员可享受8折优惠！',
      type: 'promotion',
      priority: 'low',
      status: 'expired',
      targetAudience: 'all',
      publishedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      viewCount: 234
    }
  ];
};

export default function AnnouncementCenter({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { showToast } = useToast();

  const [announcements, setAnnouncements] = useState<Announcement[]>(generateMockAnnouncements);
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft' | 'expired'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const filteredAnnouncements = useMemo(() => {
    if (filterStatus === 'all') return announcements;
    return announcements.filter(a => a.status === filterStatus);
  }, [announcements, filterStatus]);

  const stats = useMemo(() => {
    return {
      total: announcements.length,
      published: announcements.filter(a => a.status === 'published').length,
      draft: announcements.filter(a => a.status === 'draft').length,
      totalViews: announcements.reduce((sum, a) => sum + a.viewCount, 0)
    };
  }, [announcements]);

  const publishAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.map(a => 
      a.id === id ? { ...a, status: 'published' as const, publishedAt: new Date().toISOString() } : a
    ));
    showToast(lang === 'zh' ? '公告已发布' : 'Announcement published', 'success');
  };

  const deleteAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    showToast(lang === 'zh' ? '公告已删除' : 'Announcement deleted', 'success');
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      system: 'bg-blue-100 text-blue-700',
      activity: 'bg-green-100 text-green-700',
      maintenance: 'bg-amber-100 text-amber-700',
      promotion: 'bg-purple-100 text-purple-700'
    };
    const labels: Record<string, string> = {
      system: lang === 'zh' ? '系统' : 'System',
      activity: lang === 'zh' ? '活动' : 'Activity',
      maintenance: lang === 'zh' ? '维护' : 'Maintenance',
      promotion: lang === 'zh' ? '推广' : 'Promotion'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[type] || 'bg-gray-100 text-gray-700'}`}>
        {labels[type] || type}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      draft: 'bg-gray-100 text-gray-700',
      expired: 'bg-red-100 text-red-700'
    };
    const labels: Record<string, string> = {
      published: lang === 'zh' ? '已发布' : 'Published',
      draft: lang === 'zh' ? '草稿' : 'Draft',
      expired: lang === 'zh' ? '已过期' : 'Expired'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'high') {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          {lang === 'zh' ? '重要' : 'High'}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-500" />
            {lang === 'zh' ? '系统公告中心' : 'Announcement Center'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '发布和管理系统公告' : 'Publish and manage system announcements'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAnnouncement(null);
            setShowForm(true);
          }}
          className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{lang === 'zh' ? '发布公告' : 'New'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '总公告数' : 'Total'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '已发布' : 'Published'}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.published}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '草稿' : 'Drafts'}</p>
              <p className="text-2xl font-bold text-gray-600 mt-1">{stats.draft}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <Edit2 className="w-5 h-5 text-gray-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '总浏览量' : 'Views'}</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{stats.totalViews}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['all', 'published', 'draft', 'expired'] as const).map(status => (
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
             status === 'published' ? (lang === 'zh' ? '已发布' : 'Published') :
             status === 'draft' ? (lang === 'zh' ? '草稿' : 'Draft') :
             (lang === 'zh' ? '已过期' : 'Expired')}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {filteredAnnouncements.map(announcement => (
            <div key={announcement.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {getTypeBadge(announcement.type)}
                    {getStatusBadge(announcement.status)}
                    {getPriorityBadge(announcement.priority)}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{announcement.content}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {announcement.publishedAt 
                        ? format(parseISO(announcement.publishedAt), 'yyyy-MM-dd HH:mm')
                        : (lang === 'zh' ? '未发布' : 'Not published')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {announcement.targetAudience === 'all' ? (lang === 'zh' ? '所有人' : 'All') :
                       announcement.targetAudience === 'teachers' ? (lang === 'zh' ? '教师' : 'Teachers') :
                       announcement.targetAudience === 'parents' ? (lang === 'zh' ? '家长' : 'Parents') :
                       (lang === 'zh' ? '员工' : 'Staff')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {announcement.viewCount}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {announcement.status === 'draft' && (
                    <button
                      onClick={() => publishAnnouncement(announcement.id)}
                      className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                      title={lang === 'zh' ? '发布' : 'Publish'}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setEditingAnnouncement(announcement);
                      setShowForm(true);
                    }}
                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                    title={lang === 'zh' ? '编辑' : 'Edit'}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAnnouncement(announcement.id)}
                    className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                    title={lang === 'zh' ? '删除' : 'Delete'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {filteredAnnouncements.length === 0 && (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">
                {lang === 'zh' ? '暂无公告' : 'No announcements'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {editingAnnouncement ? (lang === 'zh' ? '编辑公告' : 'Edit Announcement') : (lang === 'zh' ? '发布公告' : 'New Announcement')}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingAnnouncement(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '标题' : 'Title'}
                </label>
                <input
                  type="text"
                  defaultValue={editingAnnouncement?.title || ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={lang === 'zh' ? '请输入标题' : 'Enter title'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '内容' : 'Content'}
                </label>
                <textarea
                  defaultValue={editingAnnouncement?.content || ''}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={lang === 'zh' ? '请输入内容' : 'Enter content'}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '类型' : 'Type'}
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="system">{lang === 'zh' ? '系统通知' : 'System'}</option>
                    <option value="activity">{lang === 'zh' ? '活动通知' : 'Activity'}</option>
                    <option value="maintenance">{lang === 'zh' ? '维护通知' : 'Maintenance'}</option>
                    <option value="promotion">{lang === 'zh' ? '推广通知' : 'Promotion'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '优先级' : 'Priority'}
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="low">{lang === 'zh' ? '低' : 'Low'}</option>
                    <option value="medium">{lang === 'zh' ? '中' : 'Medium'}</option>
                    <option value="high">{lang === 'zh' ? '高' : 'High'}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {lang === 'zh' ? '目标受众' : 'Target Audience'}
                </label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="all">{lang === 'zh' ? '所有人' : 'All'}</option>
                  <option value="teachers">{lang === 'zh' ? '仅教师' : 'Teachers Only'}</option>
                  <option value="parents">{lang === 'zh' ? '仅家长' : 'Parents Only'}</option>
                  <option value="staff">{lang === 'zh' ? '仅员工' : 'Staff Only'}</option>
                </select>
              </div>
              <div className="pt-4 flex gap-2">
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingAnnouncement(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    showToast(lang === 'zh' ? '保存成功' : 'Saved successfully', 'success');
                    setShowForm(false);
                    setEditingAnnouncement(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {lang === 'zh' ? '保存' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
