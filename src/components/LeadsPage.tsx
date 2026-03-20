import React, { useState, useEffect, useMemo } from 'react';
import { Users, Phone, Calendar, Plus, Loader2, Mail, Clock, CheckCircle, X, MessageSquare, Tag, UserPlus, TrendingUp } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useToast } from './Toast';
import BottomSheet from './BottomSheet';
import { format, parseISO, differenceInDays } from 'date-fns';
import { apiRequest } from '../services/api';

interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'trial' | 'converted' | 'lost';
  notes: string;
  createdAt: string;
  nextFollowUp?: string;
  trialDate?: string;
  studentId?: string;
}

const sources = [
  { id: 'wechat', nameZh: '微信', nameEn: 'WeChat' },
  { id: 'referral', nameZh: '转介绍', nameEn: 'Referral' },
  { id: 'website', nameZh: '官网', nameEn: 'Website' },
  { id: 'offline', nameZh: '线下', nameEn: 'Offline' },
  { id: 'other', nameZh: '其他', nameEn: 'Other' },
];

const statusConfig = [
  { id: 'new', nameZh: '新线索', nameEn: 'New', color: 'bg-blue-100 text-blue-700' },
  { id: 'contacted', nameZh: '已联系', nameEn: 'Contacted', color: 'bg-amber-100 text-amber-700' },
  { id: 'trial', nameZh: '试听课', nameEn: 'Trial', color: 'bg-purple-100 text-purple-700' },
  { id: 'converted', nameZh: '已转化', nameEn: 'Converted', color: 'bg-green-100 text-green-700' },
  { id: 'lost', nameZh: '已流失', nameEn: 'Lost', color: 'bg-red-100 text-red-700' },
];

export default function LeadsPage({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { showToast } = useToast();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filter, setFilter] = useState<'all' | Lead['status']>('all');
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    source: 'wechat',
    notes: '',
  status: 'new' as Lead['status'],
  trialDate: '',
  nextFollowUp: '',
  trialTime: '',
  trialTeacherId: '',
  trialCourse: '',
  trialNotes: '',
  trialStatus: 'scheduled' as 'scheduled' | 'completed' | 'cancelled',
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await apiRequest<Lead[]>('/api/leads');
      setLeads(data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (filter !== 'all') {
      result = result.filter(l => l.status === filter);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, filter]);

  const stats = useMemo(() => {
    return {
      total: leads.length,
      new: leads.filter(l => l.status === 'new').length,
      trial: leads.filter(l => l.status === 'trial').length,
      converted: leads.filter(l => l.status === 'converted').length,
      conversionRate: leads.length > 0 
        ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1)
        : 0,
    };
  }, [leads]);

  const handleAddLead = async () => {
    if (!newLead.name.trim() || !newLead.phone.trim()) {
      showToast(lang === 'zh' ? '请填写姓名和电话' : 'Please enter name and phone', 'error');
      return;
    }

    try {
      await apiRequest<Lead>('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLead,
          createdAt: new Date().toISOString(),
        }),
      });

      showToast(lang === 'zh' ? '线索已添加' : 'Lead added', 'success');
      setShowForm(false);
      setNewLead({
        name: '',
        phone: '',
        source: 'wechat',
        notes: '',
        status: 'new',
        trialDate: '',
        nextFollowUp: '',
        trialTime: '',
        trialTeacherId: '',
        trialCourse: '',
        trialNotes: '',
        trialStatus: 'scheduled',
      });
      fetchLeads();
    } catch (error) {
      showToast(lang === 'zh' ? '添加失败' : 'Failed to add', 'error');
    }
  };

  const handleUpdateStatus = async (id: string, status: Lead['status']) => {
    try {
      await apiRequest<Lead>(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      showToast(lang === 'zh' ? '状态已更新' : 'Status updated', 'success');
      fetchLeads();
    } catch (error) {
      showToast(lang === 'zh' ? '更新失败' : 'Failed to update', 'error');
    }
  };

  const handleScheduleTrial = async () => {
    if (!selectedLead || !newLead.trialDate || !newLead.trialTime) {
      showToast(lang === 'zh' ? '请选择试听时间' : 'Please select trial time', 'error');
      return;
    }

    try {
      await apiRequest<Lead>(`/api/leads/${selectedLead.id}/trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trialDate: newLead.trialDate,
          trialTime: newLead.trialTime,
          trialTeacherId: newLead.trialTeacherId,
          trialCourse: newLead.trialCourse,
          trialNotes: newLead.trialNotes,
        }),
      });

      showToast(lang === 'zh' ? '试听课已安排' : 'Trial scheduled', 'success');
      setShowDetail(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      showToast(lang === 'zh' ? '安排失败' : 'Failed to schedule', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          {lang === 'zh' ? '招生管理' : 'Admissions'}
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {lang === 'zh' ? '添加线索' : 'Add Lead'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '总线索' : 'Total Leads'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.new}</p>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '新线索' : 'New Leads'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.trial}</p>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '试听课' : 'Trial Classes'}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.conversionRate}%</p>
              <p className="text-xs text-gray-500">{lang === 'zh' ? '转化率' : 'Conversion Rate'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
            filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {lang === 'zh' ? '全部' : 'All'}
        </button>
        {statusConfig.map(s => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id as Lead['status'])}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              filter === s.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {lang === 'zh' ? s.nameZh : s.nameEn}
          </button>
        ))}
      </div>

      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{lang === 'zh' ? '暂无线索' : 'No leads yet'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeads.map(lead => {
            const statusInfo = statusConfig.find(s => s.id === lead.status);
            const sourceInfo = sources.find(s => s.id === lead.source);
            const daysSinceCreated = differenceInDays(new Date(), parseISO(lead.createdAt));

            return (
              <div
                key={lead.id}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 cursor-pointer hover:border-indigo-200 transition"
                onClick={() => {
                  setSelectedLead(lead);
                  setShowDetail(true);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo?.color}`}>
                      {lang === 'zh' ? statusInfo?.nameZh : statusInfo?.nameEn}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      {lang === 'zh' ? sourceInfo?.nameZh : sourceInfo?.nameEn}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {daysSinceCreated === 0 
                      ? (lang === 'zh' ? '今天' : 'Today')
                      : `${daysSinceCreated} ${lang === 'zh' ? '天前' : 'days ago'}`
                    }
                  </span>
                </div>

                <h3 className="font-bold text-gray-900">{lead.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{lead.phone}</p>

                {lead.notes && (
                  <p className="text-sm text-gray-500 mt-2 line-clamp-2">{lead.notes}</p>
                )}

                {lead.nextFollowUp && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <Clock className="w-3 h-3" />
                    {lang === 'zh' ? `下次跟进: ${lead.nextFollowUp}` : `Next follow-up: ${lead.nextFollowUp}`}
                  </div>
                )}

                {lead.trialDate && lead.status === 'trial' && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
                    <Calendar className="w-3 h-3" />
                    {lang === 'zh' ? `试听课: ${lead.trialDate}` : `Trial: ${lead.trialDate}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <BottomSheet
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={lang === 'zh' ? '添加线索' : 'Add Lead'}
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {lang === 'zh' ? '姓名' : 'Name'} *
              </label>
              <input
                type="text"
                value={newLead.name}
                onChange={e => setNewLead({ ...newLead, name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={lang === 'zh' ? '学员姓名' : 'Student name'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {lang === 'zh' ? '电话' : 'Phone'} *
              </label>
              <input
                type="tel"
                value={newLead.phone}
                onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="138-0000-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '来源' : 'Source'}
            </label>
            <select
              value={newLead.source}
              onChange={e => setNewLead({ ...newLead, source: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {sources.map(s => (
                <option key={s.id} value={s.id}>
                  {lang === 'zh' ? s.nameZh : s.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {lang === 'zh' ? '备注' : 'Notes'}
            </label>
            <textarea
              value={newLead.notes}
              onChange={e => setNewLead({ ...newLead, notes: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
              placeholder={lang === 'zh' ? '备注信息...' : 'Notes...'}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={handleAddLead}
              className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-medium"
            >
              {lang === 'zh' ? '保存' : 'Save'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false);
          setSelectedLead(null);
        }}
        title={lang === 'zh' ? '线索详情' : 'Lead Details'}
      >
        {selectedLead && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">{selectedLead.name}</h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                statusConfig.find(s => s.id === selectedLead.status)?.color
              }`}>
                {lang === 'zh' 
                  ? statusConfig.find(s => s.id === selectedLead.status)?.nameZh 
                  : statusConfig.find(s => s.id === selectedLead.status)?.nameEn}
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{selectedLead.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {lang === 'zh' 
                    ? sources.find(s => s.id === selectedLead.source)?.nameZh 
                    : sources.find(s => s.id === selectedLead.source)?.nameEn}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">
                  {format(parseISO(selectedLead.createdAt), lang === 'zh' ? 'yyyy年M月d日' : 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {selectedLead.notes && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm text-gray-600">{selectedLead.notes}</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">{lang === 'zh' ? '更新状态' : 'Update Status'}</p>
              <div className="flex flex-wrap gap-2">
                {statusConfig.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleUpdateStatus(selectedLead.id, s.id as Lead['status'])}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      selectedLead.status === s.id 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {lang === 'zh' ? s.nameZh : s.nameEn}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowDetail(false);
                  setSelectedLead(null);
                }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium"
              >
                {lang === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
