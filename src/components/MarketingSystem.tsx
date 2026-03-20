import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Phone, Calendar, Plus, Loader2, Mail, Clock, CheckCircle, X, 
  MessageSquare, Tag, UserPlus, TrendingUp, Target, Gift, Share2, 
  BarChart3, PieChart, Zap, Bell, Filter, MoreHorizontal, Award, Megaphone,
  CreditCard, CalendarCheck, Activity, ArrowRight
} from 'lucide-react';
import { Language, Lead, MarketingCampaign, Coupon, Referral, FollowUp, SalesFunnelStage, ChannelStats, Student, Teacher } from '../types';
import { useTranslation } from '../i18n';
import { useToast } from './Toast';
import BottomSheet from './BottomSheet';
import { format, parseISO, differenceInDays, isToday, isTomorrow, isAfter } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart as RePieChart, Pie } from 'recharts';
import { apiRequest } from '../services/api';

type FollowUpFormData = {
  type: FollowUp['type'];
  content: string;
  result: FollowUp['result'];
  scheduledDate?: string;
  markConverted?: boolean;
};

const mockLeads: Lead[] = [
  {
    id: 'l1',
    name: '王小明',
    phone: '138-0001-0001',
    source: 'wechat',
    status: 'new',
    notes: '对钢琴课程很感兴趣',
    createdAt: new Date().toISOString(),
    age: 8,
    assignedTo: 't1',
    assignedName: '张老师',
    tags: ['钢琴', '儿童'],
    followUpCount: 0
  },
  {
    id: 'l2',
    name: '李小红',
    phone: '138-0002-0002',
    source: 'referral',
    status: 'contacted',
    notes: '已联系，约定试听',
    createdAt: parseISO('2026-03-10T10:00:00Z').toISOString(),
    nextFollowUp: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'),
    age: 6,
    lastContacted: new Date().toISOString(),
    followUpCount: 2
  },
  {
    id: 'l3',
    name: '张小华',
    phone: '138-0003-0003',
    source: 'offline',
    status: 'trial',
    notes: '试听课已安排',
    createdAt: parseISO('2026-03-08T14:00:00Z').toISOString(),
    trialDate: format(new Date(Date.now() + 172800000), 'yyyy-MM-dd'),
    age: 10,
    followUpCount: 3
  },
  {
    id: 'l4',
    name: '赵小芳',
    phone: '138-0004-0004',
    source: 'wechat',
    status: 'converted',
    notes: '已报名',
    createdAt: parseISO('2026-03-01T09:00:00Z').toISOString(),
    studentId: 's1',
    age: 7,
    followUpCount: 5
  },
  {
    id: 'l5',
    name: '孙小强',
    phone: '138-0005-0005',
    source: 'website',
    status: 'lost',
    notes: '价格太高',
    createdAt: parseISO('2026-02-20T16:00:00Z').toISOString(),
    age: 9,
    followUpCount: 4
  }
];

const mockCampaigns: MarketingCampaign[] = [
  {
    id: 'c1',
    name: '春季招生特惠',
    type: 'discount',
    status: 'active',
    description: '春季课程9折优惠',
    startDate: '2026-03-01',
    endDate: '2026-04-30',
    targetAudience: '新学员',
    budget: 5000,
    conversionGoal: 50,
    actualConversions: 32,
    createdBy: 'admin',
    createdAt: '2026-02-20T00:00:00Z',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c2',
    name: '好友转介绍',
    type: 'referral',
    status: 'active',
    description: '推荐好友各得2课时',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    targetAudience: '全体学员',
    conversionGoal: 100,
    actualConversions: 45,
    createdBy: 'admin',
    createdAt: '2025-12-15T00:00:00Z',
    updatedAt: new Date().toISOString()
  }
];

const mockCoupons: Coupon[] = [
  {
    id: 'cp1',
    code: 'SPRING2026',
    type: 'percentage',
    value: 10,
    status: 'active',
    validFrom: '2026-03-01',
    validUntil: '2026-04-30',
    usageLimit: 100,
    usedCount: 32,
    campaignId: 'c1',
    createdBy: 'admin',
    createdAt: '2026-02-20T00:00:00Z'
  },
  {
    id: 'cp2',
    code: 'FREETRIAL',
    type: 'free_trial',
    value: 1,
    status: 'active',
    validFrom: '2026-01-01',
    validUntil: '2026-12-31',
    createdBy: 'admin',
    createdAt: '2025-12-15T00:00:00Z'
  }
];

const mockReferrals: Referral[] = [
  {
    id: 'r1',
    referrerId: 's1',
    referrerName: '王小明妈妈',
    referrerPhone: '138-0001-0001',
    referredName: '李小红',
    referredPhone: '138-0002-0002',
    status: 'paid',
    rewardType: 'free_lesson',
    rewardValue: 2,
    rewardClaimed: false,
    leadId: 'l2',
    studentId: 's2',
    createdAt: '2026-03-10T10:00:00Z'
  }
];

const mockFollowUps: FollowUp[] = [
  {
    id: 'f1',
    leadId: 'l2',
    type: 'call',
    content: '已联系，约定试听时间',
    result: 'scheduled',
    scheduledDate: format(new Date(Date.now() + 172800000), 'yyyy-MM-dd'),
    createdBy: 't1',
    createdAt: new Date().toISOString()
  }
];

const sources = [
  { id: 'wechat', nameZh: '微信', nameEn: 'WeChat', icon: '💬' },
  { id: 'referral', nameZh: '转介绍', nameEn: 'Referral', icon: '👥' },
  { id: 'website', nameZh: '官网', nameEn: 'Website', icon: '🌐' },
  { id: 'offline', nameZh: '线下', nameEn: 'Offline', icon: '🏪' },
  { id: 'tiktok', nameZh: '抖音', nameEn: 'TikTok', icon: '🎵' },
  { id: 'other', nameZh: '其他', nameEn: 'Other', icon: '📦' },
];

const statusConfig = [
  { id: 'new', nameZh: '新线索', nameEn: 'New', color: 'bg-blue-500', bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  { id: 'contacted', nameZh: '已联系', nameEn: 'Contacted', color: 'bg-amber-500', bgClass: 'bg-amber-100', textClass: 'text-amber-700' },
  { id: 'trial', nameZh: '试听课', nameEn: 'Trial', color: 'bg-purple-500', bgClass: 'bg-purple-100', textClass: 'text-purple-700' },
  { id: 'converted', nameZh: '已转化', nameEn: 'Converted', color: 'bg-green-500', bgClass: 'bg-green-100', textClass: 'text-green-700' },
  { id: 'lost', nameZh: '已流失', nameEn: 'Lost', color: 'bg-red-500', bgClass: 'bg-red-100', textClass: 'text-red-700' },
];

const campaignTypes = [
  { id: 'discount', nameZh: '折扣优惠', nameEn: 'Discount', icon: '💰' },
  { id: 'referral', nameZh: '转介绍', nameEn: 'Referral', icon: '👥' },
  { id: 'promotion', nameZh: '促销活动', nameEn: 'Promotion', icon: '🎉' },
  { id: 'event', nameZh: '线下活动', nameEn: 'Event', icon: '🎉' },
  { id: 'seasonal', nameZh: '季节性', nameEn: 'Seasonal', icon: '🍂' },
];

export default function MarketingSystem({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'campaigns' | 'coupons' | 'referrals' | 'analytics'>('overview');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [showReferralForm, setShowReferralForm] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showCouponRedeem, setShowCouponRedeem] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [leadFilter, setLeadFilter] = useState<'all' | Lead['status']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFollowUpsTab, setShowFollowUpsTab] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    source: 'wechat',
    notes: '',
    assignedTo: '',
  });
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'discount' as MarketingCampaign['type'],
    status: 'draft' as MarketingCampaign['status'],
    description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
    targetAudience: '',
    budget: '',
    conversionGoal: '',
  });
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percentage' as Coupon['type'],
    value: '',
    status: 'active' as Coupon['status'],
    validFrom: format(new Date(), 'yyyy-MM-dd'),
    validUntil: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
    usageLimit: '',
    campaignId: '',
  });
  const [newReferral, setNewReferral] = useState({
    referrerId: '',
    referredName: '',
    referredPhone: '',
    status: 'pending' as Referral['status'],
    rewardType: 'free_lesson' as Referral['rewardType'],
    rewardValue: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [leadsData, followUpsData, campaignsData, couponsData, referralsData, teachersData, studentsData] = await Promise.all([
          apiRequest<Lead[]>('/api/leads'),
          apiRequest<FollowUp[]>('/api/marketing/follow-ups'),
          apiRequest<MarketingCampaign[]>('/api/marketing/campaigns'),
          apiRequest<Coupon[]>('/api/marketing/coupons'),
          apiRequest<Referral[]>('/api/marketing/referrals'),
          apiRequest<Teacher[]>('/api/teachers'),
          apiRequest<Student[]>('/api/students'),
        ]);

        setLeads(leadsData);
        setFollowUps(followUpsData);
        setCampaigns(campaignsData);
        setCoupons(couponsData);
        setReferrals(referralsData);
        setTeachers(teachersData);
        setStudents(studentsData);
      } catch (error) {
        const msg = error instanceof Error ? error.message : '';
        showToast(msg || (lang === 'zh' ? '营销数据加载失败' : 'Failed to load marketing data'), 'error');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const filteredLeads = useMemo(() => {
    let result = leads;
    if (leadFilter !== 'all') {
      result = result.filter(l => l.status === leadFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(l => 
        l.name.toLowerCase().includes(query) || 
        l.phone.includes(query) ||
        (l.email?.toLowerCase().includes(query))
      );
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, leadFilter, searchQuery]);

  const addFollowUp = async (leadId: string, data: FollowUpFormData) => {
    await apiRequest<FollowUp>(`/api/leads/${leadId}/follow-ups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: data.type,
        content: data.content,
        result: data.result,
        scheduledDate: data.scheduledDate || null,
      }),
    });

    if (data.markConverted) {
      await apiRequest<Lead>(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'converted' }),
      });
    }

    const [leadsData, followUpsData] = await Promise.all([
      apiRequest<Lead[]>('/api/leads'),
      apiRequest<FollowUp[]>('/api/marketing/follow-ups'),
    ]);
    setLeads(leadsData);
    setFollowUps(followUpsData);
    showToast(lang === 'zh' ? '跟进记录已添加' : 'Follow-up added successfully', 'success');
  };

  const redeemCoupon = async (coupon: Coupon) => {
    const result = await apiRequest<{ coupon: Coupon } & Record<string, any>>('/api/marketing/coupons/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: coupon.code }),
    });

    setCoupons(coupons.map((c) => (c.id === coupon.id ? result.coupon : c)));
    showToast(lang === 'zh' ? '优惠券已核销' : 'Coupon redeemed successfully', 'success');
  };

  const completeReferral = async (referralId: string) => {
    const updated = await apiRequest<Referral>(`/api/marketing/referrals/${referralId}/claim`, {
      method: 'POST',
    });
    setReferrals(referrals.map((r) => (r.id === referralId ? updated : r)));
    showToast(lang === 'zh' ? '转介绍已完成，奖励已发放' : 'Referral completed, reward issued', 'success');
  };

  const createLead = async () => {
    if (!newLead.name.trim() || !newLead.phone.trim()) {
      showToast(lang === 'zh' ? '请填写姓名和电话' : 'Please enter name and phone', 'error');
      return;
    }

    const teacher = teachers.find((t) => t.id === newLead.assignedTo);
    await apiRequest<Lead>('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newLead.name.trim(),
        phone: newLead.phone.trim(),
        email: newLead.email.trim() || null,
        age: newLead.age ? Number(newLead.age) : null,
        source: newLead.source,
        status: 'new',
        notes: newLead.notes || '',
        assignedTo: teacher?.id || null,
        assignedName: teacher?.name || null,
      }),
    });

    const leadsData = await apiRequest<Lead[]>('/api/leads');
    setLeads(leadsData);
    setShowLeadForm(false);
    setNewLead({ name: '', phone: '', email: '', age: '', source: 'wechat', notes: '', assignedTo: '' });
    showToast(lang === 'zh' ? '线索已添加' : 'Lead created', 'success');
  };

  const createCampaign = async () => {
    if (!newCampaign.name.trim() || !newCampaign.startDate || !newCampaign.endDate) {
      showToast(lang === 'zh' ? '请填写活动名称和时间' : 'Please fill campaign name and date range', 'error');
      return;
    }

    await apiRequest<MarketingCampaign>('/api/marketing/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newCampaign.name.trim(),
        type: newCampaign.type,
        status: newCampaign.status,
        description: newCampaign.description || '',
        startDate: newCampaign.startDate,
        endDate: newCampaign.endDate,
        targetAudience: newCampaign.targetAudience || null,
        budget: newCampaign.budget ? Number(newCampaign.budget) : null,
        conversionGoal: newCampaign.conversionGoal ? Number(newCampaign.conversionGoal) : null,
      }),
    });

    const campaignsData = await apiRequest<MarketingCampaign[]>('/api/marketing/campaigns');
    setCampaigns(campaignsData);
    setShowCampaignForm(false);
    setNewCampaign({
      name: '',
      type: 'discount',
      status: 'draft',
      description: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
      targetAudience: '',
      budget: '',
      conversionGoal: '',
    });
    showToast(lang === 'zh' ? '活动已创建' : 'Campaign created', 'success');
  };

  const createCoupon = async () => {
    if (!newCoupon.code.trim() || !newCoupon.validFrom || !newCoupon.validUntil || newCoupon.value === '') {
      showToast(lang === 'zh' ? '请填写优惠码、面值与有效期' : 'Please fill code, value and validity dates', 'error');
      return;
    }

    await apiRequest<Coupon>('/api/marketing/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: newCoupon.code.trim(),
        type: newCoupon.type,
        value: Number(newCoupon.value),
        status: newCoupon.status,
        validFrom: newCoupon.validFrom,
        validUntil: newCoupon.validUntil,
        usageLimit: newCoupon.usageLimit ? Number(newCoupon.usageLimit) : null,
        campaignId: newCoupon.campaignId || null,
      }),
    });

    const couponsData = await apiRequest<Coupon[]>('/api/marketing/coupons');
    setCoupons(couponsData);
    setShowCouponForm(false);
    setNewCoupon({
      code: '',
      type: 'percentage',
      value: '',
      status: 'active',
      validFrom: format(new Date(), 'yyyy-MM-dd'),
      validUntil: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
      usageLimit: '',
      campaignId: '',
    });
    showToast(lang === 'zh' ? '优惠券已创建' : 'Coupon created', 'success');
  };

  const createReferral = async () => {
    if (!newReferral.referrerId || !newReferral.referredName.trim() || newReferral.rewardValue === '') {
      showToast(lang === 'zh' ? '请填写推荐人、被推荐人和奖励' : 'Please fill referrer, referred and reward', 'error');
      return;
    }

    const referrer = students.find((s) => s.id === newReferral.referrerId);
    if (!referrer) {
      showToast(lang === 'zh' ? '推荐人不存在' : 'Referrer not found', 'error');
      return;
    }

    await apiRequest<Referral>('/api/marketing/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrerId: referrer.id,
        referrerName: referrer.parentName || referrer.name,
        referrerPhone: referrer.parentPhone || '',
        referredName: newReferral.referredName.trim(),
        referredPhone: newReferral.referredPhone.trim() || null,
        status: newReferral.status,
        rewardType: newReferral.rewardType,
        rewardValue: Number(newReferral.rewardValue),
        rewardClaimed: false,
      }),
    });

    const referralsData = await apiRequest<Referral[]>('/api/marketing/referrals');
    setReferrals(referralsData);
    setShowReferralForm(false);
    setNewReferral({ referrerId: '', referredName: '', referredPhone: '', status: 'pending', rewardType: 'free_lesson', rewardValue: '' });
    showToast(lang === 'zh' ? '转介绍已添加' : 'Referral created', 'success');
  };

  const stats = useMemo(() => {
    return {
      totalLeads: leads.length,
      newLeads: leads.filter(l => l.status === 'new').length,
      trialLeads: leads.filter(l => l.status === 'trial').length,
      convertedLeads: leads.filter(l => l.status === 'converted').length,
      conversionRate: leads.length > 0 
        ? ((leads.filter(l => l.status === 'converted').length / leads.length) * 100).toFixed(1)
        : 0,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
      totalReferrals: referrals.length,
      pendingFollowUps: leads.filter(l => l.nextFollowUp && isToday(parseISO(l.nextFollowUp))).length
    };
  }, [leads, campaigns, referrals]);

  const salesFunnel = useMemo((): SalesFunnelStage[] => [
    { id: 'leads', name: lang === 'zh' ? '线索' : 'Leads', order: 1, leadCount: leads.length, conversionRate: 100, color: '#A29BFE' },
    { id: 'contacted', name: lang === 'zh' ? '已联系' : 'Contacted', order: 2, leadCount: leads.filter(l => l.status === 'contacted' || l.status === 'trial' || l.status === 'converted').length, conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.status !== 'new' && l.status !== 'lost').length / leads.length) * 100) : 0, color: '#4ECDC4' },
    { id: 'trial', name: lang === 'zh' ? '试听课' : 'Trial', order: 3, leadCount: leads.filter(l => l.status === 'trial' || l.status === 'converted').length, conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'trial' || l.status === 'converted').length / leads.length) * 100) : 0, color: '#FFE66D' },
    { id: 'converted', name: lang === 'zh' ? '已转化' : 'Converted', order: 4, leadCount: leads.filter(l => l.status === 'converted').length, conversionRate: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'converted').length / leads.length) * 100) : 0, color: '#95E1A3' }
  ], [leads, lang]);

  const channelStats = useMemo((): ChannelStats[] => {
    const sourceMap = new Map<string, { leadCount: number; convertedCount: number }>();
    
    sources.forEach(s => {
      sourceMap.set(s.id, { leadCount: 0, convertedCount: 0 });
    });

    leads.forEach(lead => {
      const stats = sourceMap.get(lead.source) || { leadCount: 0, convertedCount: 0 };
      stats.leadCount++;
      if (lead.status === 'converted') {
        stats.convertedCount++;
      }
      sourceMap.set(lead.source, stats);
    });

    return Array.from(sourceMap.entries()).map(([source, stats]) => ({
      source,
      leadCount: stats.leadCount,
      convertedCount: stats.convertedCount,
      conversionRate: stats.leadCount > 0 ? Math.round((stats.convertedCount / stats.leadCount) * 100) : 0,
      avgDaysToConvert: 7
    })).filter(s => s.leadCount > 0);
  }, [leads]);

  const weeklyTrend = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        name: format(date, lang === 'zh' ? 'E' : 'EEE', { locale: lang === 'zh' ? zhCN : undefined }),
        newLeads: Math.floor(Math.random() * 5) + 1,
        conversions: Math.floor(Math.random() * 3)
      });
    }
    return days;
  }, [lang]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users className="w-6 h-6" />}
          value={stats.totalLeads}
          label={lang === 'zh' ? '总线索' : 'Total Leads'}
          color="from-blue-500 to-blue-600"
          trend={'+12%'}
        />
        <StatCard 
          icon={<TrendingUp className="w-6 h-6" />}
          value={`${stats.conversionRate}%`}
          label={lang === 'zh' ? '转化率' : 'Conversion Rate'}
          color="from-green-500 to-green-600"
          trend={'+3%'}
        />
        <StatCard 
          icon={<Target className="w-6 h-6" />}
          value={stats.activeCampaigns}
          label={lang === 'zh' ? '活动进行中' : 'Active Campaigns'}
          color="from-purple-500 to-purple-600"
          trend={'+1'}
        />
        <StatCard 
          icon={<Bell className="w-6 h-6" />}
          value={stats.pendingFollowUps}
          label={lang === 'zh' ? '今日跟进' : 'Today\'s Follow-ups'}
          color="from-amber-500 to-amber-600"
          trend={'!'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '7天线索趋势' : '7-Day Lead Trend'}
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrend}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A29BFE" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#A29BFE" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="newLeads" stroke="#A29BFE" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            {lang === 'zh' ? '招生漏斗' : 'Sales Funnel'}
          </h3>
          <div className="space-y-3">
            {salesFunnel.map((stage, index) => (
              <div key={stage.id} className="relative">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                  <span className="text-sm font-bold" style={{ color: stage.color }}>
                    {stage.leadCount} ({stage.conversionRate}%)
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(stage.leadCount / salesFunnel[0].leadCount) * 100}%`, backgroundColor: stage.color }}
                  />
                </div>
                {index < salesFunnel.length - 1 && (
                  <div className="flex justify-center my-1">
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-600" />
            {lang === 'zh' ? '渠道分析' : 'Channel Analysis'}
          </h3>
          <div className="space-y-3">
            {channelStats.map(stat => {
              const sourceInfo = sources.find(s => s.id === stat.source);
              return (
                <div key={stat.source} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{sourceInfo?.icon || '📦'}</span>
                    <div>
                      <p className="font-medium text-gray-900">{lang === 'zh' ? sourceInfo?.nameZh : sourceInfo?.nameEn}</p>
                      <p className="text-xs text-gray-500">{lang === 'zh' ? `${stat.leadCount}个线索` : `${stat.leadCount} leads`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{stat.conversionRate}%</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '转化率' : 'Conversion'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-red-600" />
            {lang === 'zh' ? '待跟进提醒' : 'Pending Follow-ups'}
          </h3>
          <div className="space-y-3">
            {leads.filter(l => l.nextFollowUp).slice(0, 4).map(lead => {
              const isTodayFollowUp = lead.nextFollowUp && isToday(parseISO(lead.nextFollowUp));
              const isTomorrowFollowUp = lead.nextFollowUp && isTomorrow(parseISO(lead.nextFollowUp));
              return (
                <div 
                  key={lead.id} 
                  onClick={() => {
                    setSelectedLead(lead);
                    setShowLeadDetail(true);
                  }}
                  className={`p-4 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${isTodayFollowUp ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{lead.name}</p>
                      <p className="text-sm text-gray-500">{lead.phone}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${isTodayFollowUp ? 'bg-red-500 text-white' : isTomorrowFollowUp ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                        {isTodayFollowUp ? (lang === 'zh' ? '今天' : 'Today') : isTomorrowFollowUp ? (lang === 'zh' ? '明天' : 'Tomorrow') : lang === 'zh' ? '即将' : 'Soon'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLeads = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'zh' ? '搜索线索名称、电话...' : 'Search leads by name, phone...'}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <Users className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFollowUpsTab(!showFollowUpsTab)}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition ${
              showFollowUpsTab ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {lang === 'zh' ? '今日跟进' : 'Today Follow-ups'}
          </button>
          <button
            onClick={() => setShowLeadForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {lang === 'zh' ? '添加线索' : 'Add Lead'}
          </button>
        </div>
      </div>

      {!showFollowUpsTab ? (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setLeadFilter('all')}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                leadFilter === 'all' ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {lang === 'zh' ? '全部' : 'All'}
            </button>
            {statusConfig.map(s => (
              <button
                key={s.id}
                onClick={() => setLeadFilter(s.id as Lead['status'])}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${
                  leadFilter === s.id ? `${s.bgClass} ${s.textClass} shadow-md` : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {lang === 'zh' ? s.nameZh : s.nameEn}
              </button>
            ))}
          </div>

      {filteredLeads.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 shadow-sm border border-gray-100 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">{lang === 'zh' ? '暂无线索' : 'No leads yet'}</p>
          <p className="text-sm text-gray-400 mt-2">{lang === 'zh' ? '点击上方按钮添加第一个线索' : 'Click the button above to add your first lead'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredLeads.map((lead, index) => {
            const statusInfo = statusConfig.find(s => s.id === lead.status);
            const sourceInfo = sources.find(s => s.id === lead.source);
            const daysSinceCreated = differenceInDays(new Date(), parseISO(lead.createdAt));
            const isUrgent = lead.nextFollowUp && isToday(parseISO(lead.nextFollowUp));

            return (
              <div
                key={lead.id}
                onClick={() => {
                  setSelectedLead(lead);
                  setShowLeadDetail(true);
                }}
                className={`bg-white rounded-2xl p-5 shadow-sm border cursor-pointer hover:shadow-lg transition-all active:scale-[0.99] ${isUrgent ? 'border-red-300 bg-red-50/30' : 'border-gray-100'}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{lead.name}</h3>
                      <p className="text-sm text-gray-500">{lead.phone}</p>
                      {lead.age && (
                        <p className="text-xs text-gray-400">{lang === 'zh' ? `${lead.age}岁` : `${lead.age} years old`}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo?.bgClass} ${statusInfo?.textClass}`}>
                        {lang === 'zh' ? statusInfo?.nameZh : statusInfo?.nameEn}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {sourceInfo?.icon} {lang === 'zh' ? sourceInfo?.nameZh : sourceInfo?.nameEn}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {daysSinceCreated === 0 
                        ? (lang === 'zh' ? '今天' : 'Today')
                        : `${daysSinceCreated} ${lang === 'zh' ? '天前' : 'days ago'}`
                      }
                    </span>
                  </div>
                </div>

                {lead.notes && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{lead.notes}</p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {lead.tags && lead.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {lead.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                            {tag}
                          </span>
                        ))}
                        {lead.tags.length > 2 && (
                          <span className="text-xs text-gray-400">+{lead.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                    {lead.followUpCount !== undefined && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {lead.followUpCount}
                      </span>
                    )}
                  </div>
                  
                  {lead.nextFollowUp && (
                    <div className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-red-600' : 'text-amber-600'}`}>
                      <Clock className="w-3 h-3" />
                      {isUrgent ? (lang === 'zh' ? '今日跟进' : 'Follow up today') : lang === 'zh' ? `下次: ${lead.nextFollowUp}` : `Next: ${lead.nextFollowUp}`}
                    </div>
                  )}
                </div>

                {lead.assignedName && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-medium text-blue-700">
                        {lead.assignedName.charAt(0)}
                      </div>
                      <span className="text-xs text-gray-500">{lang === 'zh' ? '负责人' : 'Assigned'}: {lead.assignedName}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
        </>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-red-200 bg-red-50/30">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-gray-900">{lang === 'zh' ? '今日待跟进' : 'Today Follow-ups'}</h3>
            </div>
            {leads.filter(l => l.nextFollowUp && isToday(parseISO(l.nextFollowUp))).length === 0 ? (
              <p className="text-center text-gray-500 py-8">{lang === 'zh' ? '今日暂无线索需要跟进' : 'No follow-ups scheduled for today'}</p>
            ) : (
              <div className="space-y-3">
                {leads.filter(l => l.nextFollowUp && isToday(parseISO(l.nextFollowUp))).map(lead => {
                  const statusInfo = statusConfig.find(s => s.id === lead.status);
                  return (
                    <div 
                      key={lead.id}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-red-200"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-600">
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{lead.name}</p>
                          <p className="text-sm text-gray-500">{lead.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${statusInfo?.bgClass} ${statusInfo?.textClass}`}>
                          {lang === 'zh' ? statusInfo?.nameZh : statusInfo?.nameEn}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowFollowUpForm(true);
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition"
                        >
                          {lang === 'zh' ? '跟进' : 'Follow Up'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderCampaigns = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{lang === 'zh' ? '营销活动' : 'Marketing Campaigns'}</h2>
        <button
          onClick={() => setShowCampaignForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {lang === 'zh' ? '创建活动' : 'New Campaign'}
        </button>
      </div>

      <div className="grid gap-4">
        {campaigns.map(campaign => {
          const typeInfo = campaignTypes.find(t => t.id === campaign.type);
          const isActive = campaign.status === 'active';
          const progress = campaign.conversionGoal ? Math.min(100, (campaign.actualConversions || 0) / campaign.conversionGoal * 100) : 0;
          const roi = campaign.budget && campaign.actualConversions 
            ? ((campaign.actualConversions * 1000) / campaign.budget * 100).toFixed(1) 
            : null;

          return (
            <div key={campaign.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isActive ? 'bg-gradient-to-br from-purple-100 to-pink-100' : 'bg-gray-100'}`}>
                    {typeInfo?.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-500">{lang === 'zh' ? typeInfo?.nameZh : typeInfo?.nameEn}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isActive ? 'bg-green-100 text-green-700' : 
                    campaign.status === 'paused' ? 'bg-amber-100 text-amber-700' : 
                    campaign.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {lang === 'zh' ? (
                      campaign.status === 'active' ? '进行中' : 
                      campaign.status === 'paused' ? '已暂停' : 
                      campaign.status === 'completed' ? '已结束' : '草稿'
                    ) : (
                      campaign.status === 'active' ? 'Active' : 
                      campaign.status === 'paused' ? 'Paused' : 
                      campaign.status === 'completed' ? 'Completed' : 'Draft'
                    )}
                  </span>
                  {isActive && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Activity className="w-3 h-3 animate-pulse" />
                      {lang === 'zh' ? '实时数据' : 'Live'}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{campaign.description}</p>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">{campaign.actualConversions || 0}</p>
                  <p className="text-xs text-gray-500">{lang === 'zh' ? '转化数' : 'Conversions'}</p>
                </div>
                {roi && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{roi}%</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? 'ROI' : 'ROI'}</p>
                  </div>
                )}
                {campaign.budget && (
                  <div className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600">¥{campaign.budget}</p>
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '预算' : 'Budget'}</p>
                  </div>
                )}
              </div>

              {campaign.conversionGoal && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{lang === 'zh' ? '转化目标' : 'Conversion Goal'}</span>
                    <span className="font-medium text-purple-600">{campaign.actualConversions || 0} / {campaign.conversionGoal} ({progress.toFixed(0)}%)</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {campaign.startDate} - {campaign.endDate}
                  </span>
                </div>
                {isActive && (
                  <button 
                    onClick={async () => {
                      try {
                        const updated = await apiRequest<MarketingCampaign>(`/api/marketing/campaigns/${campaign.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ actualConversions: (campaign.actualConversions || 0) + 1 }),
                        });
                        setCampaigns(campaigns.map((c) => (c.id === campaign.id ? updated : c)));
                        showToast(lang === 'zh' ? '数据已更新' : 'Data updated', 'success');
                      } catch (error) {
                        const msg = error instanceof Error ? error.message : '';
                        showToast(msg || (lang === 'zh' ? '更新失败' : 'Update failed'), 'error');
                      }
                    }}
                    className="text-xs px-3 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition"
                  >
                    {lang === 'zh' ? '新增转化' : 'Add Conversion'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCoupons = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{lang === 'zh' ? '优惠券管理' : 'Coupons'}</h2>
        <button
          onClick={() => setShowCouponForm(true)}
          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {lang === 'zh' ? '创建优惠券' : 'New Coupon'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {coupons.map(coupon => {
          const isActive = coupon.status === 'active';
          const usageRate = coupon.usageLimit ? Math.min(100, (coupon.usedCount || 0) / coupon.usageLimit * 100) : 0;

          return (
            <div key={coupon.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm border ${isActive ? 'border-amber-200' : 'border-gray-200'}`}>
              <div className={`p-5 ${isActive ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gray-300'}`}>
                <div className="flex items-center justify-between text-white">
                  <div>
                    <p className="text-sm opacity-90">{lang === 'zh' ? '优惠码' : 'Code'}</p>
                    <p className="text-2xl font-bold font-mono">{coupon.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-bold">
                      {coupon.type === 'percentage' ? `${coupon.value}%` :
                       coupon.type === 'fixed' ? `¥${coupon.value}` :
                       coupon.type === 'free_trial' ? (lang === 'zh' ? '免费试' : 'Free Trial') :
                       lang === 'zh' ? '赠课时' : 'Free Lesson'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isActive ? 'bg-green-100 text-green-700' :
                    coupon.status === 'expired' ? 'bg-red-100 text-red-700' :
                    coupon.status === 'used' ? 'bg-gray-100 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {lang === 'zh' ? (
                      coupon.status === 'active' ? '有效' :
                      coupon.status === 'expired' ? '已过期' :
                      coupon.status === 'used' ? '已用完' : '未激活'
                    ) : (
                      coupon.status === 'active' ? 'Active' :
                      coupon.status === 'expired' ? 'Expired' :
                      coupon.status === 'used' ? 'Used' : 'Inactive'
                    )}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-3">
                  <p className="flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4" />
                    {coupon.validFrom} - {coupon.validUntil}
                  </p>
                  {coupon.usageLimit && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span>{lang === 'zh' ? '使用量' : 'Usage'}</span>
                        <span>{coupon.usedCount || 0} / {coupon.usageLimit}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                          style={{ width: `${usageRate}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {isActive && (
                    <button
                      onClick={() => {
                        setSelectedCoupon(coupon);
                        setShowCouponRedeem(true);
                      }}
                      className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition"
                    >
                      {lang === 'zh' ? '立即核销' : 'Redeem Now'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderReferrals = () => {
    const totalRewards = referrals.reduce((sum, r) => {
      if (r.rewardType === 'free_lesson') return sum + r.rewardValue * 150;
      if (r.rewardType === 'cash') return sum + r.rewardValue;
      return sum;
    }, 0);

    const pendingRewards = referrals.filter(r => r.status === 'paid' && !r.rewardClaimed).length;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-green-600">{referrals.length}</p>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '总转介绍' : 'Total Referrals'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-purple-600">¥{totalRewards}</p>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '总奖励价值' : 'Total Rewards'}</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-amber-600">{pendingRewards}</p>
            <p className="text-sm text-gray-500">{lang === 'zh' ? '待发放' : 'Pending Rewards'}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{lang === 'zh' ? '转介绍记录' : 'Referrals'}</h2>
          <button
            onClick={() => setShowReferralForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {lang === 'zh' ? '添加转介绍' : 'Add Referral'}
          </button>
        </div>

        <div className="grid gap-4">
          {referrals.map(referral => {
            const statusColors = {
              pending: { bg: 'bg-gray-100', text: 'text-gray-700' },
              registered: { bg: 'bg-blue-100', text: 'text-blue-700' },
              paid: { bg: 'bg-purple-100', text: 'text-purple-700' },
              completed: { bg: 'bg-green-100', text: 'text-green-700' }
            };
            const status = statusColors[referral.status];
            const rewardValue = referral.rewardType === 'free_lesson' 
              ? `${referral.rewardValue}课时(¥${referral.rewardValue * 150})`
              : referral.rewardType === 'discount'
              ? `${referral.rewardValue}%折扣`
              : `¥${referral.rewardValue}`;

            return (
              <div key={referral.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-lg font-bold text-blue-700">
                        {referral.referrerName.charAt(0)}
                      </div>
                      <div className="mx-2">
                        <Share2 className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center text-lg font-bold text-purple-700">
                        {referral.referredName.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{referral.referrerName}</p>
                      <p className="text-xs text-gray-500">{referral.referrerPhone}</p>
                      <ArrowRight className="w-4 h-4 text-gray-300 my-1" />
                      <p className="font-medium text-gray-900">{referral.referredName}</p>
                      <p className="text-xs text-gray-500">{referral.referredPhone}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                      {lang === 'zh' ? (
                        referral.status === 'pending' ? '待跟进' :
                        referral.status === 'registered' ? '已登记' :
                        referral.status === 'paid' ? '已付费' : '已完成'
                      ) : (
                        referral.status === 'pending' ? 'Pending' :
                        referral.status === 'registered' ? 'Registered' :
                        referral.status === 'paid' ? 'Paid' : 'Completed'
                      )}
                    </span>
                    {referral.status === 'paid' && !referral.rewardClaimed && (
                      <button
                        onClick={() => completeReferral(referral.id)}
                        className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition"
                      >
                        {lang === 'zh' ? '发放奖励' : 'Issue Reward'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-gray-600">
                      {lang === 'zh' ? '奖励' : 'Reward'}: {rewardValue}
                    </span>
                  </div>
                  {referral.rewardClaimed ? (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      {lang === 'zh' ? '已发放' : 'Claimed'}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">{lang === 'zh' ? '待发放' : 'Pending'}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<TrendingUp className="w-6 h-6" />}
          value={stats.convertedLeads}
          label={lang === 'zh' ? '本月转化' : 'Conversions This Month'}
          color="from-green-500 to-teal-500"
          trend={'+8'}
        />
        <StatCard 
          icon={<Target className="w-6 h-6" />}
          value={`${((stats.convertedLeads / Math.max(stats.totalLeads, 1)) * 100).toFixed(1)}%`}
          label={lang === 'zh' ? '整体转化率' : 'Overall Conversion'}
          color="from-blue-500 to-indigo-500"
          trend={'+2.3%'}
        />
        <StatCard 
          icon={<Award className="w-6 h-6" />}
          value={stats.totalReferrals}
          label={lang === 'zh' ? '转介绍数' : 'Referrals'}
          color="from-purple-500 to-pink-500"
          trend={'+12'}
        />
        <StatCard 
          icon={<Activity className="w-6 h-6" />}
          value='7.2'
          label={lang === 'zh' ? '平均转化天数' : 'Avg Days to Convert'}
          color="from-amber-500 to-orange-500"
          trend={'-1.5'}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">{lang === 'zh' ? '渠道转化对比' : 'Channel Conversion Comparison'}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={channelStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="source" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
                <Bar dataKey="leadCount" name={lang === 'zh' ? '线索数' : 'Leads'} fill="#A29BFE" radius={[4, 4, 0, 0]} />
                <Bar dataKey="convertedCount" name={lang === 'zh' ? '转化数' : 'Converted'} fill="#95E1A3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4">{lang === 'zh' ? '状态分布' : 'Status Distribution'}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={statusConfig.map(s => ({
                    name: lang === 'zh' ? s.nameZh : s.nameEn,
                    value: leads.filter(l => l.status === s.id).length
                  })).filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusConfig.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '12px' }} />
              </RePieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-6 md:p-8">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl -ml-24 -mb-24" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {lang === 'zh' ? '招生营销中心' : 'Marketing Center'}
              </h1>
              <p className="text-white/80 mt-1">
                {lang === 'zh' ? '全方位招生管理，业绩翻倍增长' : 'Comprehensive招生 management for growth'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'overview', icon: BarChart3, labelZh: '概览', labelEn: 'Overview' },
          { id: 'leads', icon: Users, labelZh: '线索管理', labelEn: 'Leads' },
          { id: 'campaigns', icon: Megaphone, labelZh: '营销活动', labelEn: 'Campaigns' },
          { id: 'coupons', icon: Gift, labelZh: '优惠券', labelEn: 'Coupons' },
          { id: 'referrals', icon: Share2, labelZh: '转介绍', labelEn: 'Referrals' },
          { id: 'analytics', icon: Activity, labelZh: '数据分析', labelEn: 'Analytics' },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {lang === 'zh' ? tab.labelZh : tab.labelEn}
            </button>
          );
        })}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'leads' && renderLeads()}
      {activeTab === 'campaigns' && renderCampaigns()}
      {activeTab === 'coupons' && renderCoupons()}
      {activeTab === 'referrals' && renderReferrals()}
      {activeTab === 'analytics' && renderAnalytics()}

      <BottomSheet
        isOpen={showLeadForm}
        onClose={() => {
          setShowLeadForm(false);
          setNewLead({ name: '', phone: '', email: '', age: '', source: 'wechat', notes: '', assignedTo: '' });
        }}
        title={lang === 'zh' ? '添加线索' : 'Add Lead'}
      >
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '姓名' : 'Name'}</label>
            <input
              value={newLead.name}
              onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={lang === 'zh' ? '请输入姓名' : 'Enter name'}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '电话' : 'Phone'}</label>
            <input
              value={newLead.phone}
              onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={lang === 'zh' ? '请输入电话' : 'Enter phone'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '年龄' : 'Age'}</label>
              <input
                type="number"
                value={newLead.age}
                onChange={(e) => setNewLead({ ...newLead, age: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '来源' : 'Source'}</label>
              <select
                value={newLead.source}
                onChange={(e) => setNewLead({ ...newLead, source: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {lang === 'zh' ? s.nameZh : s.nameEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '邮箱' : 'Email'}</label>
            <input
              value={newLead.email}
              onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder={lang === 'zh' ? '可选' : 'Optional'}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '负责人' : 'Assigned'}</label>
            <select
              value={newLead.assignedTo}
              onChange={(e) => setNewLead({ ...newLead, assignedTo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">{lang === 'zh' ? '未指定' : 'Unassigned'}</option>
              {teachers.map((tch) => (
                <option key={tch.id} value={tch.id}>
                  {tch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '备注' : 'Notes'}</label>
            <textarea
              value={newLead.notes}
              onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              placeholder={lang === 'zh' ? '可选' : 'Optional'}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowLeadForm(false);
                setNewLead({ name: '', phone: '', email: '', age: '', source: 'wechat', notes: '', assignedTo: '' });
              }}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={async () => {
                try {
                  await createLead();
                } catch (error) {
                  const msg = error instanceof Error ? error.message : '';
                  showToast(msg || (lang === 'zh' ? '添加失败' : 'Create failed'), 'error');
                }
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg"
            >
              {lang === 'zh' ? '保存' : 'Save'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showCampaignForm}
        onClose={() => setShowCampaignForm(false)}
        title={lang === 'zh' ? '创建活动' : 'New Campaign'}
      >
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '活动名称' : 'Name'}</label>
            <input
              value={newCampaign.name}
              onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '类型' : 'Type'}</label>
              <select
                value={newCampaign.type}
                onChange={(e) => setNewCampaign({ ...newCampaign, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {campaignTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {lang === 'zh' ? ct.nameZh : ct.nameEn}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '状态' : 'Status'}</label>
              <select
                value={newCampaign.status}
                onChange={(e) => setNewCampaign({ ...newCampaign, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="draft">{lang === 'zh' ? '草稿' : 'Draft'}</option>
                <option value="active">{lang === 'zh' ? '进行中' : 'Active'}</option>
                <option value="paused">{lang === 'zh' ? '暂停' : 'Paused'}</option>
                <option value="completed">{lang === 'zh' ? '已结束' : 'Completed'}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '开始日期' : 'Start'}</label>
              <input
                type="date"
                value={newCampaign.startDate}
                onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '结束日期' : 'End'}</label>
              <input
                type="date"
                value={newCampaign.endDate}
                onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '活动说明' : 'Description'}</label>
            <textarea
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '预算' : 'Budget'}</label>
              <input
                type="number"
                value={newCampaign.budget}
                onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '转化目标' : 'Goal'}</label>
              <input
                type="number"
                value={newCampaign.conversionGoal}
                onChange={(e) => setNewCampaign({ ...newCampaign, conversionGoal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCampaignForm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={async () => {
                try {
                  await createCampaign();
                } catch (error) {
                  const msg = error instanceof Error ? error.message : '';
                  showToast(msg || (lang === 'zh' ? '创建失败' : 'Create failed'), 'error');
                }
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg"
            >
              {lang === 'zh' ? '创建' : 'Create'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showCouponForm}
        onClose={() => setShowCouponForm(false)}
        title={lang === 'zh' ? '创建优惠券' : 'New Coupon'}
      >
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '优惠码' : 'Code'}</label>
            <input
              value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '类型' : 'Type'}</label>
              <select
                value={newCoupon.type}
                onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="percentage">{lang === 'zh' ? '折扣(%)' : 'Percentage'}</option>
                <option value="fixed">{lang === 'zh' ? '立减(¥)' : 'Fixed'}</option>
                <option value="free_trial">{lang === 'zh' ? '免费试听' : 'Free Trial'}</option>
                <option value="free_lesson">{lang === 'zh' ? '赠课时' : 'Free Lesson'}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '面值' : 'Value'}</label>
              <input
                type="number"
                value={newCoupon.value}
                onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '开始' : 'Valid From'}</label>
              <input
                type="date"
                value={newCoupon.validFrom}
                onChange={(e) => setNewCoupon({ ...newCoupon, validFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '结束' : 'Valid Until'}</label>
              <input
                type="date"
                value={newCoupon.validUntil}
                onChange={(e) => setNewCoupon({ ...newCoupon, validUntil: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '使用上限' : 'Usage Limit'}</label>
              <input
                type="number"
                value={newCoupon.usageLimit}
                onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '状态' : 'Status'}</label>
              <select
                value={newCoupon.status}
                onChange={(e) => setNewCoupon({ ...newCoupon, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="active">{lang === 'zh' ? '有效' : 'Active'}</option>
                <option value="inactive">{lang === 'zh' ? '未启用' : 'Inactive'}</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '关联活动(可选)' : 'Campaign (Optional)'}</label>
            <select
              value={newCoupon.campaignId}
              onChange={(e) => setNewCoupon({ ...newCoupon, campaignId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="">{lang === 'zh' ? '不关联' : 'None'}</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCouponForm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={async () => {
                try {
                  await createCoupon();
                } catch (error) {
                  const msg = error instanceof Error ? error.message : '';
                  showToast(msg || (lang === 'zh' ? '创建失败' : 'Create failed'), 'error');
                }
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg"
            >
              {lang === 'zh' ? '创建' : 'Create'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showReferralForm}
        onClose={() => setShowReferralForm(false)}
        title={lang === 'zh' ? '添加转介绍' : 'Add Referral'}
      >
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '推荐人(学员)' : 'Referrer (Student)'}</label>
            <select
              value={newReferral.referrerId}
              onChange={(e) => setNewReferral({ ...newReferral, referrerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">{lang === 'zh' ? '请选择' : 'Select'}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '被推荐人姓名' : 'Referred Name'}</label>
              <input
                value={newReferral.referredName}
                onChange={(e) => setNewReferral({ ...newReferral, referredName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '被推荐人电话' : 'Referred Phone'}</label>
              <input
                value={newReferral.referredPhone}
                onChange={(e) => setNewReferral({ ...newReferral, referredPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '奖励类型' : 'Reward Type'}</label>
              <select
                value={newReferral.rewardType}
                onChange={(e) => setNewReferral({ ...newReferral, rewardType: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="free_lesson">{lang === 'zh' ? '赠课时' : 'Free Lesson'}</option>
                <option value="discount">{lang === 'zh' ? '折扣' : 'Discount'}</option>
                <option value="cash">{lang === 'zh' ? '现金' : 'Cash'}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '奖励数值' : 'Reward Value'}</label>
              <input
                type="number"
                value={newReferral.rewardValue}
                onChange={(e) => setNewReferral({ ...newReferral, rewardValue: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{lang === 'zh' ? '状态' : 'Status'}</label>
            <select
              value={newReferral.status}
              onChange={(e) => setNewReferral({ ...newReferral, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="pending">{lang === 'zh' ? '待跟进' : 'Pending'}</option>
              <option value="registered">{lang === 'zh' ? '已登记' : 'Registered'}</option>
              <option value="paid">{lang === 'zh' ? '已付费' : 'Paid'}</option>
              <option value="completed">{lang === 'zh' ? '已完成' : 'Completed'}</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowReferralForm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              {lang === 'zh' ? '取消' : 'Cancel'}
            </button>
            <button
              onClick={async () => {
                try {
                  await createReferral();
                } catch (error) {
                  const msg = error instanceof Error ? error.message : '';
                  showToast(msg || (lang === 'zh' ? '添加失败' : 'Create failed'), 'error');
                }
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg"
            >
              {lang === 'zh' ? '保存' : 'Save'}
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showLeadDetail && selectedLead !== null}
        onClose={() => {
          setShowLeadDetail(false);
          setSelectedLead(null);
        }}
        title={lang === 'zh' ? '线索详情' : 'Lead Details'}
      >
        {selectedLead && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-2xl font-bold text-indigo-600">
                {selectedLead.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedLead.name}</h3>
                <p className="text-gray-500">{selectedLead.phone}</p>
                {selectedLead.age && <p className="text-sm text-gray-400">{lang === 'zh' ? `${selectedLead.age}岁` : `${selectedLead.age} years old`}</p>}
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              {selectedLead.email && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {selectedLead.email}
                </p>
              )}
              {selectedLead.address && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  {selectedLead.address}
                </p>
              )}
              {selectedLead.assignedName && (
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  {lang === 'zh' ? '负责人' : 'Assigned'}: {selectedLead.assignedName}
                </p>
              )}
            </div>

            {selectedLead.notes && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '备注' : 'Notes'}</h4>
                <p className="text-sm text-gray-600">{selectedLead.notes}</p>
              </div>
            )}

            {selectedLead.tags && selectedLead.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedLead.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={showFollowUpForm && selectedLead !== null}
        onClose={() => {
          setShowFollowUpForm(false);
          setSelectedLead(null);
        }}
        title={lang === 'zh' ? '添加跟进记录' : 'Add Follow-up'}
      >
        {selectedLead && (
          <FollowUpForm 
            lead={selectedLead} 
            onSubmit={async (data) => {
              try {
                await addFollowUp(selectedLead.id, data);
                setShowFollowUpForm(false);
                setSelectedLead(null);
              } catch (error) {
                const msg = error instanceof Error ? error.message : '';
                showToast(msg || (lang === 'zh' ? '保存失败' : 'Save failed'), 'error');
              }
            }}
            onCancel={() => {
              setShowFollowUpForm(false);
              setSelectedLead(null);
            }}
            lang={lang}
          />
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={showCouponRedeem && selectedCoupon !== null}
        onClose={() => {
          setShowCouponRedeem(false);
          setSelectedCoupon(null);
        }}
        title={lang === 'zh' ? '核销优惠券' : 'Redeem Coupon'}
      >
        {selectedCoupon && (
          <div className="p-4 space-y-4">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-4 text-white">
              <p className="text-sm opacity-90">{lang === 'zh' ? '优惠码' : 'Code'}</p>
              <p className="text-3xl font-bold font-mono">{selectedCoupon.code}</p>
              <p className="text-xl mt-2">
                {selectedCoupon.type === 'percentage' ? `${selectedCoupon.value}%` :
                 selectedCoupon.type === 'fixed' ? `¥${selectedCoupon.value}` :
                 selectedCoupon.type === 'free_trial' ? (lang === 'zh' ? '免费试' : 'Free Trial') :
                 lang === 'zh' ? '赠课时' : 'Free Lesson'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">{lang === 'zh' ? '确认核销此优惠券？' : 'Confirm to redeem this coupon?'}</p>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowCouponRedeem(false);
                    setSelectedCoupon(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  {lang === 'zh' ? '取消' : 'Cancel'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      await redeemCoupon(selectedCoupon);
                      setShowCouponRedeem(false);
                      setSelectedCoupon(null);
                    } catch (error) {
                      const msg = error instanceof Error ? error.message : '';
                      showToast(msg || (lang === 'zh' ? '核销失败' : 'Redeem failed'), 'error');
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg"
                >
                  {lang === 'zh' ? '确认核销' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function FollowUpForm({ 
  lead, 
  onSubmit, 
  onCancel,
  lang 
}: { 
  lead: Lead; 
  onSubmit: (data: FollowUpFormData) => void;
  onCancel: () => void;
  lang: Language;
}) {
  const [type, setType] = useState<FollowUp['type']>('call');
  const [content, setContent] = useState('');
  const [result, setResult] = useState<FollowUp['result']>('scheduled');
  const [nextDate, setNextDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'));
  const [markConverted, setMarkConverted] = useState(false);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center font-bold text-indigo-600">
          {lead.name.charAt(0)}
        </div>
        <div>
          <p className="font-medium text-gray-900">{lead.name}</p>
          <p className="text-sm text-gray-500">{lead.phone}</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '跟进方式' : 'Follow-up Type'}</label>
        <div className="flex gap-2">
          {[
            { id: 'call', label: lang === 'zh' ? '电话' : 'Call', icon: Phone },
            { id: 'wechat', label: lang === 'zh' ? '微信' : 'WeChat', icon: MessageSquare },
            { id: 'sms', label: lang === 'zh' ? '短信' : 'SMS', icon: MessageSquare },
            { id: 'visit', label: lang === 'zh' ? '到店' : 'Visit', icon: Users }
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setType(t.id as FollowUp['type'])}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  type === t.id ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '跟进内容' : 'Content'}</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          rows={3}
          placeholder={lang === 'zh' ? '请输入跟进内容...' : 'Enter follow-up content...'}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '跟进结果' : 'Result'}</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'scheduled', label: lang === 'zh' ? '已预约' : 'Scheduled' },
            { id: 'interested', label: lang === 'zh' ? '感兴趣' : 'Interested' },
            { id: 'not_interested', label: lang === 'zh' ? '不感兴趣' : 'Not Interested' },
            { id: 'no_answer', label: lang === 'zh' ? '未接通' : 'No Answer' },
            { id: 'call_back', label: lang === 'zh' ? '待回拨' : 'Call Back' }
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setResult(r.id as FollowUp['result'])}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
                result === r.id ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{lang === 'zh' ? '下次跟进日期' : 'Next Follow-up Date'}</label>
        <input
          type="date"
          value={nextDate}
          onChange={(e) => setNextDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={markConverted}
          onChange={(e) => setMarkConverted(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
        {lang === 'zh' ? '同时标记为已转化' : 'Mark lead as converted'}
      </label>

      <div className="flex gap-3 pt-4">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
        >
          {lang === 'zh' ? '取消' : 'Cancel'}
        </button>
        <button
          onClick={() => onSubmit({
            type,
            content,
            result,
            scheduledDate: nextDate,
            markConverted
          })}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg"
        >
          {lang === 'zh' ? '保存' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function StatCard({ 
  icon, 
  value, 
  label, 
  color, 
  trend 
}: { 
  icon: React.ReactNode; 
  value: number | string; 
  label: string; 
  color: string; 
  trend?: string; 
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-10 rounded-bl-full`} />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
            <div className="text-white">{icon}</div>
          </div>
          {trend && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              trend.startsWith('+') ? 'bg-green-100 text-green-700' : 
              trend.startsWith('-') ? 'bg-red-100 text-red-700' : 
              'bg-amber-100 text-amber-700'
            }`}>
              {trend}
            </span>
          )}
        </div>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
