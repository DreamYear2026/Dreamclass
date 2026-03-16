import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Clock, Calendar, Users, DollarSign, AlertTriangle, Check, Send, Settings, Loader2, Plus, Trash2, Edit2, Zap, Sparkles } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useCourses, useTeachers } from '../contexts/AppContext';
import { useToast } from './Toast';
import { format, parseISO, addDays, subDays, isToday, isTomorrow, startOfDay, differenceInHours, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface ReminderRule {
  id: string;
  type: 'class' | 'renewal' | 'homework' | 'birthday' | 'custom';
  name: string;
  description: string;
  enabled: boolean;
  trigger: {
    hoursBefore?: number;
    daysBefore?: number;
    condition?: string;
  };
  channels: ('sms' | 'wechat' | 'app')[];
  template: string;
  target: 'all' | 'specific';
  targetIds?: string[];
}

interface ScheduledReminder {
  id: string;
  ruleId: string;
  type: string;
  title: string;
  content: string;
  targetName: string;
  targetId: string;
  scheduledTime: string;
  status: 'pending' | 'sent' | 'failed';
  channel: string;
}

const defaultRules: ReminderRule[] = [
  {
    id: 'r1',
    type: 'class',
    name: '上课前1天提醒',
    description: '在课程开始前24小时自动发送提醒',
    enabled: true,
    trigger: { hoursBefore: 24 },
    channels: ['wechat', 'app'],
    template: '亲爱的家长，{studentName}同学将于明天{time}在{room}上课，请准时到达。',
    target: 'all'
  },
  {
    id: 'r2',
    type: 'class',
    name: '上课前2小时提醒',
    description: '在课程开始前2小时发送紧急提醒',
    enabled: true,
    trigger: { hoursBefore: 2 },
    channels: ['app'],
    template: '{studentName}同学将在2小时后上课，请做好准备。',
    target: 'all'
  },
  {
    id: 'r3',
    type: 'renewal',
    name: '课时不足提醒',
    description: '学员剩余课时少于5节时提醒续费',
    enabled: true,
    trigger: { condition: 'remainingHours <= 5' },
    channels: ['wechat', 'app'],
    template: '亲爱的家长，{studentName}同学剩余课时仅剩{hours}节，建议及时续费。',
    target: 'all'
  },
  {
    id: 'r4',
    type: 'renewal',
    name: '长期未上课提醒',
    description: '学员超过14天未上课时提醒',
    enabled: true,
    trigger: { condition: 'lastClassDays >= 14' },
    channels: ['wechat'],
    template: '亲爱的家长，{studentName}同学已{days}天未上课，是否需要安排课程？',
    target: 'all'
  },
  {
    id: 'r5',
    type: 'birthday',
    name: '生日祝福',
    description: '学员生日当天发送祝福',
    enabled: true,
    trigger: { condition: 'isBirthday' },
    channels: ['wechat', 'app'],
    template: '祝{studentName}同学生日快乐！愿你在音乐的世界里快乐成长！',
    target: 'all'
  }
];

export default function SmartReminders({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students, loading: studentsLoading } = useStudents();
  const { courses, loading: coursesLoading } = useCourses();
  const { teachers } = useTeachers();
  const { showToast } = useToast();

  const [rules, setRules] = useState<ReminderRule[]>(defaultRules);
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledReminder[]>([]);
  const [activeTab, setActiveTab] = useState<'rules' | 'scheduled' | 'history'>('rules');
  const [showRuleEditor, setShowRuleEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<ReminderRule | null>(null);
  const [loading] = useState(false);

  const upcomingReminders = useMemo(() => {
    const today = new Date();
    const reminders: ScheduledReminder[] = [];

    const tomorrowCourses = courses.filter(c => {
      const courseDate = parseISO(c.date);
      return isTomorrow(courseDate) && c.status === 'scheduled';
    });

    tomorrowCourses.forEach(course => {
      reminders.push({
        id: `rem-${course.id}`,
        ruleId: 'r1',
        type: 'class',
        title: lang === 'zh' ? '上课提醒' : 'Class Reminder',
        content: `${course.studentName}同学将于明天${course.startTime}在${course.room}上课`,
        targetName: course.studentName,
        targetId: course.studentId,
        scheduledTime: format(addDays(today, 1), 'yyyy-MM-dd'),
        status: 'pending',
        channel: 'wechat'
      });
    });

    students.filter(s => s.remainingHours <= 5 && s.remainingHours > 0).forEach(student => {
      reminders.push({
        id: `rem-renewal-${student.id}`,
        ruleId: 'r3',
        type: 'renewal',
        title: lang === 'zh' ? '续费提醒' : 'Renewal Reminder',
        content: `${student.name}同学剩余课时仅剩${student.remainingHours}节`,
        targetName: student.name,
        targetId: student.id,
        scheduledTime: format(today, 'yyyy-MM-dd'),
        status: 'pending',
        channel: 'wechat'
      });
    });

    return reminders;
  }, [courses, students, lang]);

  const stats = useMemo(() => ({
    enabledRules: rules.filter(r => r.enabled).length,
    pendingReminders: upcomingReminders.filter(r => r.status === 'pending').length,
    sentToday: 12,
    failedCount: 0
  }), [rules, upcomingReminders]);

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
    showToast(lang === 'zh' ? '规则已更新' : 'Rule updated', 'success');
  };

  const sendReminderNow = (reminder: ScheduledReminder) => {
    showToast(lang === 'zh' ? `已发送提醒给 ${reminder.targetName}` : `Reminder sent to ${reminder.targetName}`, 'success');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'class': return <Calendar className="w-4 h-4" />;
      case 'renewal': return <DollarSign className="w-4 h-4" />;
      case 'homework': return <Clock className="w-4 h-4" />;
      case 'birthday': return <Sparkles className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class': return 'bg-blue-100 text-blue-700';
      case 'renewal': return 'bg-amber-100 text-amber-700';
      case 'homework': return 'bg-purple-100 text-purple-700';
      case 'birthday': return 'bg-pink-100 text-pink-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-600" />
            {lang === 'zh' ? '智能提醒系统' : 'Smart Reminders'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '自动发送上课、续费、生日等提醒' : 'Automated reminders for classes, renewals, and more'}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            setShowRuleEditor(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {lang === 'zh' ? '新建规则' : 'New Rule'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '启用规则' : 'Active Rules'}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.enabledRules}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <Settings className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '待发送' : 'Pending'}</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pendingReminders}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '今日已发' : 'Sent Today'}</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{stats.sentToday}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{lang === 'zh' ? '发送失败' : 'Failed'}</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{stats.failedCount}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'rules', label: lang === 'zh' ? '提醒规则' : 'Rules', icon: <Settings className="w-4 h-4" /> },
          { id: 'scheduled', label: lang === 'zh' ? '待发送' : 'Scheduled', icon: <Clock className="w-4 h-4" /> },
          { id: 'history', label: lang === 'zh' ? '发送记录' : 'History', icon: <Bell className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'rules' && (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(rule.type)}`}>
                    {getTypeIcon(rule.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{rule.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(rule.type)}`}>
                        {rule.type === 'class' ? (lang === 'zh' ? '课程' : 'Class') :
                         rule.type === 'renewal' ? (lang === 'zh' ? '续费' : 'Renewal') :
                         rule.type === 'homework' ? (lang === 'zh' ? '作业' : 'Homework') :
                         rule.type === 'birthday' ? (lang === 'zh' ? '生日' : 'Birthday') :
                         (lang === 'zh' ? '自定义' : 'Custom')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{lang === 'zh' ? '渠道' : 'Channels'}: {rule.channels.join(', ')}</span>
                      <span>{lang === 'zh' ? '对象' : 'Target'}: {rule.target === 'all' ? (lang === 'zh' ? '全部' : 'All') : (lang === 'zh' ? '指定' : 'Specific')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      setShowRuleEditor(true);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleRule(rule.id)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      rule.enabled ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      rule.enabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'scheduled' && (
        <div className="space-y-3">
          {upcomingReminders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">{lang === 'zh' ? '暂无待发送提醒' : 'No pending reminders'}</p>
            </div>
          ) : (
            upcomingReminders.map(reminder => (
              <div key={reminder.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(reminder.type)}`}>
                      {getTypeIcon(reminder.type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{reminder.title}</h3>
                      <p className="text-sm text-gray-500">{reminder.content}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>{reminder.targetName}</span>
                        <span>{reminder.scheduledTime}</span>
                        <span className="px-2 py-0.5 bg-gray-100 rounded">{reminder.channel}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => sendReminderNow(reminder)}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition flex items-center gap-1"
                  >
                    <Send className="w-4 h-4" />
                    {lang === 'zh' ? '立即发送' : 'Send Now'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">{lang === 'zh' ? '暂无发送记录' : 'No history yet'}</p>
        </div>
      )}

      {showRuleEditor && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowRuleEditor(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingRule ? (lang === 'zh' ? '编辑规则' : 'Edit Rule') : (lang === 'zh' ? '新建规则' : 'New Rule')}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '规则名称' : 'Rule Name'}
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={lang === 'zh' ? '例如：上课前1天提醒' : 'e.g., 1 day before class'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '提醒类型' : 'Reminder Type'}
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="class">{lang === 'zh' ? '课程提醒' : 'Class Reminder'}</option>
                    <option value="renewal">{lang === 'zh' ? '续费提醒' : 'Renewal Reminder'}</option>
                    <option value="homework">{lang === 'zh' ? '作业提醒' : 'Homework Reminder'}</option>
                    <option value="birthday">{lang === 'zh' ? '生日提醒' : 'Birthday Reminder'}</option>
                    <option value="custom">{lang === 'zh' ? '自定义' : 'Custom'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '触发条件' : 'Trigger'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder={lang === 'zh' ? '小时前' : 'Hours before'}
                    />
                    <select className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="hours">{lang === 'zh' ? '小时' : 'Hours'}</option>
                      <option value="days">{lang === 'zh' ? '天' : 'Days'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '消息模板' : 'Message Template'}
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    placeholder={lang === 'zh' ? '支持变量: {studentName}, {time}, {room}' : 'Variables: {studentName}, {time}, {room}'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {lang === 'zh' ? '发送渠道' : 'Channels'}
                  </label>
                  <div className="flex gap-2">
                    {['wechat', 'app', 'sms'].map(channel => (
                      <button
                        key={channel}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:border-indigo-300 hover:bg-indigo-50 transition"
                      >
                        {channel === 'wechat' ? (lang === 'zh' ? '微信' : 'WeChat') :
                         channel === 'app' ? (lang === 'zh' ? 'APP' : 'App') :
                         (lang === 'zh' ? '短信' : 'SMS')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowRuleEditor(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={() => {
                      showToast(lang === 'zh' ? '规则已保存' : 'Rule saved', 'success');
                      setShowRuleEditor(false);
                    }}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    {lang === 'zh' ? '保存' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
