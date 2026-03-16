import React, { useState, useEffect, useMemo } from 'react';
import { Send, Loader2, CheckCircle, Users, Star, Clock, Bell, MessageSquare, FileText, Copy, Trash2, ChevronDown, Search, Filter, Check, X, Sparkles, Heart } from 'lucide-react';
import { Language, Message, Notification } from '../types';
import { useTranslation } from '../i18n';
import { api } from '../services/api';
import { useToast } from './Toast';
import { useAuth } from '../contexts/AuthContext';
import { useTeachers, useStudents, useCourses } from '../contexts/AppContext';
import { format, parseISO, isToday, isThisWeek, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  category: 'schedule' | 'feedback' | 'reminder' | 'promotion' | 'general';
  usageCount: number;
}

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantRole: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
}

const defaultTemplates: MessageTemplate[] = [
  {
    id: 't1',
    title: '上课提醒',
    content: '亲爱的家长，您好！提醒您{studentName}同学将于{date} {time}在{room}上课，请准时到达。',
    category: 'schedule',
    usageCount: 156
  },
  {
    id: 't2',
    title: '课时不足提醒',
    content: '亲爱的家长，{studentName}同学剩余课时仅剩{hours}节，建议及时续费以保证学习进度。',
    category: 'reminder',
    usageCount: 89
  },
  {
    id: 't3',
    title: '课程反馈',
    content: '亲爱的家长，{studentName}同学今日课程表现优秀，主要学习了{content}，建议回家后加强练习。',
    category: 'feedback',
    usageCount: 234
  },
  {
    id: 't4',
    title: '续费优惠',
    content: '亲爱的家长，{studentName}同学续费可享{discount}折优惠，活动截止{deadline}，详情请咨询教务老师。',
    category: 'promotion',
    usageCount: 67
  },
  {
    id: 't5',
    title: '请假确认',
    content: '已收到{studentName}同学的请假申请，请假时间为{date}，已为您安排补课时间为{makeupDate}。',
    category: 'schedule',
    usageCount: 45
  },
  {
    id: 't6',
    title: '节日问候',
    content: '亲爱的家长，祝您和家人{holiday}快乐！感谢您对我们工作的支持与信任。',
    category: 'general',
    usageCount: 312
  }
];

export default function EnhancedMessageCenter({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { teachers } = useTeachers();
  const { students } = useStudents();
  const { courses } = useCourses();

  const isParent = user?.role === 'parent';
  const [activeTab, setActiveTab] = useState<'conversations' | 'templates' | 'broadcast' | 'notifications'>('conversations');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>(defaultTemplates);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  
  const [broadcastForm, setBroadcastForm] = useState({
    targetType: 'all' as 'all' | 'active' | 'expiring',
    message: '',
    scheduledTime: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const [msgs, notifs] = await Promise.all([
          api.getMessages(user.id, user.role),
          api.getNotifications(user.id)
        ]);
        setMessages(msgs);
        setNotifications(notifs);
      } catch (error) {
        console.error('Failed to fetch messages', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const conversations = useMemo(() => {
    const convMap = new Map<string, Conversation>();
    
    messages.forEach(msg => {
      const participantId = msg.senderId === user?.id ? msg.receiverId : msg.senderId;
      const participantRole = msg.senderId === user?.id ? msg.receiverRole : msg.senderRole;
      
      if (!convMap.has(participantId)) {
        const participant = participantRole === 'teacher' 
          ? teachers.find(t => t.id === participantId)
          : students.find(s => s.id === participantId);
        
        convMap.set(participantId, {
          id: participantId,
          participantId,
          participantName: participant?.name || participantId,
          participantRole,
          lastMessage: msg.content,
          lastTime: msg.timestamp,
          unread: msg.receiverId === user?.id && !msg.read ? 1 : 0,
          messages: [msg]
        });
      } else {
        const conv = convMap.get(participantId)!;
        conv.messages.push(msg);
        if (new Date(msg.timestamp) > new Date(conv.lastTime)) {
          conv.lastMessage = msg.content;
          conv.lastTime = msg.timestamp;
        }
        if (msg.receiverId === user?.id && !msg.read) {
          conv.unread++;
        }
      }
    });
    
    return Array.from(convMap.values()).sort((a, b) => 
      new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    );
  }, [messages, user, teachers, students]);

  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(c => 
      c.participantName.toLowerCase().includes(query) ||
      c.lastMessage.toLowerCase().includes(query)
    );
  }, [conversations, searchQuery]);

  const filteredTemplates = useMemo(() => {
    return templates;
  }, [templates]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedConversation) return;
    
    const conv = conversations.find(c => c.participantId === selectedConversation);
    if (!conv) return;
    
    try {
      const msg = await api.sendMessage({
        senderId: user.id,
        senderRole: user.role,
        receiverId: conv.participantId,
        receiverRole: conv.participantRole as any,
        content: newMessage.trim()
      });
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
      showToast(lang === 'zh' ? '消息发送成功' : 'Message sent', 'success');
    } catch (error) {
      showToast(lang === 'zh' ? '发送失败' : 'Failed to send', 'error');
    }
  };

  const handleUseTemplate = (template: MessageTemplate) => {
    let content = template.content;
    
    if (selectedConversation) {
      const student = students.find(s => s.id === selectedConversation);
      if (student) {
        content = content.replace('{studentName}', student.name);
        content = content.replace('{hours}', String(student.remainingHours));
      }
    }
    
    content = content.replace('{date}', format(new Date(), 'M月d日'));
    content = content.replace('{time}', '10:00');
    content = content.replace('{room}', '琴房101');
    content = content.replace('{content}', '音阶练习');
    content = content.replace('{discount}', '9');
    content = content.replace('{deadline}', format(subDays(new Date(), -7), 'M月d日'));
    content = content.replace('{makeupDate}', format(subDays(new Date(), -3), 'M月d日'));
    content = content.replace('{holiday}', '新年');
    
    setNewMessage(content);
    setShowTemplatePicker(false);
    setSelectedTemplate(template);
  };

  const handleBroadcast = async () => {
    if (!broadcastForm.message.trim()) {
      showToast(lang === 'zh' ? '请输入消息内容' : 'Please enter message', 'error');
      return;
    }
    
    let targetStudents = students;
    if (broadcastForm.targetType === 'active') {
      targetStudents = students.filter(s => s.remainingHours > 5);
    } else if (broadcastForm.targetType === 'expiring') {
      targetStudents = students.filter(s => s.remainingHours <= 5);
    }
    
    showToast(lang === 'zh' 
      ? `群发消息已发送给 ${targetStudents.length} 位学员家长` 
      : `Broadcast sent to ${targetStudents.length} parents`,
      'success'
    );
    
    setBroadcastForm({ targetType: 'all', message: '', scheduledTime: '' });
  };

  const handleMarkAsRead = async (type: 'message' | 'notification', id: string) => {
    try {
      if (type === 'message') {
        await api.markMessageRead(id);
        setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
      } else {
        await api.markNotificationRead(id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (error) {
      showToast(lang === 'zh' ? '操作失败' : 'Operation failed', 'error');
    }
  };

  const unreadCount = {
    messages: messages.filter(m => !m.read && m.receiverId === user?.id).length,
    notifications: notifications.filter(n => !n.read).length
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-[#FF6B6B] animate-spin mx-auto" />
            <Sparkles className="w-6 h-6 text-[#FFE66D] absolute -top-1 -right-1 animate-pulse" />
          </div>
          <p className="mt-4 text-gray-500">{lang === 'zh' ? '加载中...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#FFE66D]" />
            {lang === 'zh' ? '家校沟通中心' : 'Communication Center'}
          </h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Heart className="w-4 h-4 text-[#FF6B6B]" />
            {lang === 'zh' ? '高效沟通，模板消息，群发通知' : 'Efficient communication with templates'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'notifications', label: lang === 'zh' ? '系统通知' : 'Notifications', icon: <Bell className="w-4 h-4" />, count: unreadCount.notifications, emoji: '🔔' },
          ...(!isParent ? [
            { id: 'conversations', label: lang === 'zh' ? '会话' : 'Conversations', icon: <MessageSquare className="w-4 h-4" />, count: unreadCount.messages, emoji: '💬' },
            { id: 'templates', label: lang === 'zh' ? '模板消息' : 'Templates', icon: <FileText className="w-4 h-4" />, emoji: '📝' },
            { id: 'broadcast', label: lang === 'zh' ? '群发通知' : 'Broadcast', icon: <Users className="w-4 h-4" />, emoji: '📢' },
          ] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white shadow-lg shadow-[#FF6B6B]/30'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count && tab.count > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'conversations' && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={lang === 'zh' ? '搜索会话...' : 'Search conversations...'}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">{lang === 'zh' ? '暂无会话' : 'No conversations'}</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.participantId)}
                    className={`p-3 cursor-pointer transition ${
                      selectedConversation === conv.participantId ? 'bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                        {conv.participantName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 truncate">{conv.participantName}</p>
                          <span className="text-xs text-gray-400">
                            {format(parseISO(conv.lastTime), 'HH:mm')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{conv.lastMessage}</p>
                      </div>
                      {conv.unread > 0 && (
                        <span className="bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            {selectedConversation ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {conversations.find(c => c.participantId === selectedConversation)?.participantName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {conversations.find(c => c.participantId === selectedConversation)?.participantName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {conversations.find(c => c.participantId === selectedConversation)?.participantRole === 'teacher' 
                          ? (lang === 'zh' ? '教师' : 'Teacher')
                          : (lang === 'zh' ? '学员/家长' : 'Student/Parent')
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1"
                  >
                    <Sparkles className="w-4 h-4" />
                    {lang === 'zh' ? '使用模板' : 'Template'}
                  </button>
                </div>

                {showTemplatePicker && (
                  <div className="p-3 border-b border-gray-100 bg-gray-50 max-h-48 overflow-y-auto">
                    <p className="text-xs text-gray-500 mb-2">{lang === 'zh' ? '选择消息模板' : 'Select a template'}</p>
                    <div className="grid gap-2">
                      {filteredTemplates.map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleUseTemplate(template)}
                          className="p-2 text-left bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition"
                        >
                          <p className="text-sm font-medium text-gray-900">{template.title}</p>
                          <p className="text-xs text-gray-500 truncate">{template.content}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex-1 p-4 overflow-y-auto max-h-[300px]">
                  {conversations
                    .find(c => c.participantId === selectedConversation)
                    ?.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                    .map(msg => (
                      <div
                        key={msg.id}
                        className={`mb-3 flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[70%] p-3 rounded-2xl ${
                          msg.senderId === user?.id
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.senderId === user?.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                            {format(parseISO(msg.timestamp), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="p-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      placeholder={lang === 'zh' ? '输入消息...' : 'Type a message...'}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>{lang === 'zh' ? '选择一个会话开始聊天' : 'Select a conversation to start'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '消息模板库' : 'Message Templates'}
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {filteredTemplates.map(template => (
              <div key={template.id} className="p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/30 transition">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{template.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      template.category === 'schedule' ? 'bg-blue-100 text-blue-700' :
                      template.category === 'feedback' ? 'bg-green-100 text-green-700' :
                      template.category === 'reminder' ? 'bg-amber-100 text-amber-700' :
                      template.category === 'promotion' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {template.category === 'schedule' ? (lang === 'zh' ? '课程安排' : 'Schedule') :
                       template.category === 'feedback' ? (lang === 'zh' ? '课程反馈' : 'Feedback') :
                       template.category === 'reminder' ? (lang === 'zh' ? '提醒通知' : 'Reminder') :
                       template.category === 'promotion' ? (lang === 'zh' ? '优惠活动' : 'Promotion') :
                       (lang === 'zh' ? '通用' : 'General')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">{template.usageCount} {lang === 'zh' ? '次使用' : 'uses'}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.content}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(template.content);
                    showToast(lang === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard', 'success');
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Copy className="w-4 h-4" />
                  {lang === 'zh' ? '复制模板' : 'Copy Template'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'broadcast' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            {lang === 'zh' ? '群发通知' : 'Broadcast Message'}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'zh' ? '发送对象' : 'Target Audience'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'all', label: lang === 'zh' ? '全部学员' : 'All Students', count: students.length },
                  { id: 'active', label: lang === 'zh' ? '活跃学员' : 'Active Students', count: students.filter(s => s.remainingHours > 5).length },
                  { id: 'expiring', label: lang === 'zh' ? '即将到期' : 'Expiring Soon', count: students.filter(s => s.remainingHours <= 5).length },
                ].map(option => (
                  <button
                    key={option.id}
                    onClick={() => setBroadcastForm({ ...broadcastForm, targetType: option.id as any })}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      broadcastForm.targetType === option.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{option.label}</p>
                    <p className="text-2xl font-bold text-indigo-600 mt-1">{option.count}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {lang === 'zh' ? '消息内容' : 'Message Content'}
              </label>
              <textarea
                value={broadcastForm.message}
                onChange={e => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                placeholder={lang === 'zh' ? '输入群发消息内容...' : 'Enter broadcast message...'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleBroadcast}
                disabled={!broadcastForm.message.trim()}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {lang === 'zh' ? '立即发送' : 'Send Now'}
              </button>
              <button
                className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {lang === 'zh' ? '定时发送' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">{lang === 'zh' ? '暂无系统通知' : 'No notifications'}</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkAsRead('notification', n.id)}
                className={`p-4 bg-white rounded-2xl shadow-sm border cursor-pointer transition ${
                  n.read ? 'border-gray-100' : 'border-indigo-200 bg-indigo-50/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900">{n.title}</h3>
                  <div className="flex items-center gap-2">
                    {n.read && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                    {!n.read && <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>}
                  </div>
                </div>
                <p className="text-sm text-gray-700 mt-1">{n.content}</p>
                <p className="text-xs text-gray-400 mt-2">{format(parseISO(n.timestamp), 'yyyy-MM-dd HH:mm')}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
