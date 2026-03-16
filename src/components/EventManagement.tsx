import React, { useState, useMemo } from 'react';
import { Calendar, Users, Clock, MapPin, Plus, Edit2, Trash2, ChevronRight, Star, Ticket, Music, Award, Camera, Video, Download, Check, X, Send, Bell } from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { useStudents, useTeachers } from '../contexts/AppContext';
import { useToast } from './Toast';
import { format, parseISO, addDays, subDays, isPast, isFuture, isToday, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  type: 'concert' | 'competition' | 'recital' | 'masterclass' | 'other';
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  capacity: number;
  registeredCount: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  fee: number;
  coverImage?: string;
  performers: string[];
  createdAt: string;
  registrationDeadline: string;
  hasCertificate: boolean;
  tags: string[];
}

interface EventRegistration {
  id: string;
  eventId: string;
  studentId: string;
  studentName: string;
  registeredAt: string;
  status: 'registered' | 'confirmed' | 'attended' | 'cancelled';
  paid: boolean;
  performance?: {
    title: string;
    duration: number;
    notes?: string;
  };
}

const mockEvents: Event[] = [
  {
    id: 'e1',
    title: '春季音乐会',
    type: 'concert',
    description: '一年一度的春季音乐会，展示学员学习成果',
    date: addDays(new Date(), 15).toISOString(),
    startTime: '14:00',
    endTime: '17:00',
    venue: '市音乐厅',
    capacity: 100,
    registeredCount: 45,
    status: 'upcoming',
    fee: 0,
    performers: ['张老师', '李老师'],
    createdAt: subDays(new Date(), 30).toISOString(),
    registrationDeadline: addDays(new Date(), 10).toISOString(),
    hasCertificate: true,
    tags: ['音乐会', '学员展示'],
  },
  {
    id: 'e2',
    title: '钢琴比赛选拔赛',
    type: 'competition',
    description: '市级钢琴比赛校内选拔赛',
    date: addDays(new Date(), 25).toISOString(),
    startTime: '09:00',
    endTime: '18:00',
    venue: '本校音乐厅',
    capacity: 50,
    registeredCount: 32,
    status: 'upcoming',
    fee: 100,
    performers: [],
    createdAt: subDays(new Date(), 20).toISOString(),
    registrationDeadline: addDays(new Date(), 20).toISOString(),
    hasCertificate: true,
    tags: ['比赛', '钢琴'],
  },
  {
    id: 'e3',
    title: '大师班 - 钢琴演奏技巧',
    type: 'masterclass',
    description: '特邀著名钢琴家授课',
    date: subDays(new Date(), 5).toISOString(),
    startTime: '10:00',
    endTime: '12:00',
    venue: '本校音乐厅',
    capacity: 30,
    registeredCount: 28,
    status: 'completed',
    fee: 200,
    performers: ['特邀大师'],
    createdAt: subDays(new Date(), 40).toISOString(),
    registrationDeadline: subDays(new Date(), 10).toISOString(),
    hasCertificate: true,
    tags: ['大师班', '钢琴'],
  },
];

const mockRegistrations: EventRegistration[] = [
  { id: 'r1', eventId: 'e1', studentId: 's1', studentName: '小明', registeredAt: subDays(new Date(), 10).toISOString(), status: 'confirmed', paid: true, performance: { title: '月光奏鸣曲', duration: 5 } },
  { id: 'r2', eventId: 'e1', studentId: 's2', studentName: '小红', registeredAt: subDays(new Date(), 8).toISOString(), status: 'registered', paid: true, performance: { title: '小星星变奏曲', duration: 3 } },
  { id: 'r3', eventId: 'e2', studentId: 's1', studentName: '小明', registeredAt: subDays(new Date(), 5).toISOString(), status: 'registered', paid: true },
];

export default function EventManagement({ lang }: { lang: Language }) {
  const { t } = useTranslation(lang);
  const { students } = useStudents();
  const { teachers } = useTeachers();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'events' | 'registrations' | 'archive'>('events');
  const [events, setEvents] = useState<Event[]>(mockEvents);
  const [registrations] = useState<EventRegistration[]>(mockRegistrations);
  const [showEventForm, setShowEventForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'concert' as Event['type'],
    description: '',
    date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    startTime: '14:00',
    endTime: '17:00',
    venue: '',
    capacity: 50,
    fee: 0,
    hasCertificate: true,
    registrationDeadline: format(addDays(new Date(), 25), 'yyyy-MM-dd'),
    tags: '',
  });

  const stats = useMemo(() => ({
    total: events.length,
    upcoming: events.filter(e => e.status === 'upcoming').length,
    completed: events.filter(e => e.status === 'completed').length,
    totalParticipants: events.reduce((sum, e) => sum + e.registeredCount, 0),
    totalRevenue: events.filter(e => e.status === 'completed').reduce((sum, e) => sum + (e.fee * e.registeredCount), 0),
  }), [events]);

  const filteredEvents = useMemo(() => {
    let filtered = events;
    if (filterType !== 'all') {
      filtered = filtered.filter(e => e.type === filterType);
    }
    if (activeTab === 'events') {
      filtered = filtered.filter(e => e.status === 'upcoming' || e.status === 'ongoing');
    } else if (activeTab === 'archive') {
      filtered = filtered.filter(e => e.status === 'completed' || e.status === 'cancelled');
    }
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, filterType, activeTab]);

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.venue) {
      showToast(lang === 'zh' ? '请填写完整信息' : 'Please fill all fields', 'error');
      return;
    }

    const event: Event = {
      id: `e${Date.now()}`,
      title: newEvent.title,
      type: newEvent.type,
      description: newEvent.description,
      date: new Date(newEvent.date).toISOString(),
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      venue: newEvent.venue,
      capacity: newEvent.capacity,
      registeredCount: 0,
      status: 'upcoming',
      fee: newEvent.fee,
      performers: [],
      createdAt: new Date().toISOString(),
      registrationDeadline: new Date(newEvent.registrationDeadline).toISOString(),
      hasCertificate: newEvent.hasCertificate,
      tags: newEvent.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    setEvents([event, ...events]);
    setShowEventForm(false);
    setNewEvent({
      title: '',
      type: 'concert',
      description: '',
      date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      startTime: '14:00',
      endTime: '17:00',
      venue: '',
      capacity: 50,
      fee: 0,
      hasCertificate: true,
      registrationDeadline: format(addDays(new Date(), 25), 'yyyy-MM-dd'),
      tags: '',
    });
    showToast(lang === 'zh' ? '活动创建成功' : 'Event created', 'success');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'concert': return <Music className="w-5 h-5" />;
      case 'competition': return <Award className="w-5 h-5" />;
      case 'recital': return <Star className="w-5 h-5" />;
      case 'masterclass': return <Users className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'concert': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'competition': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'recital': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'masterclass': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'concert': return lang === 'zh' ? '音乐会' : 'Concert';
      case 'competition': return lang === 'zh' ? '比赛' : 'Competition';
      case 'recital': return lang === 'zh' ? '独奏会' : 'Recital';
      case 'masterclass': return lang === 'zh' ? '大师班' : 'Masterclass';
      default: return lang === 'zh' ? '其他' : 'Other';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" />
            {lang === 'zh' ? '活动管理' : 'Event Management'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === 'zh' ? '音乐会、比赛、大师班活动组织' : 'Concerts, competitions, and masterclasses'}
          </p>
        </div>
        <button
          onClick={() => setShowEventForm(true)}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {lang === 'zh' ? '创建活动' : 'Create Event'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '总活动' : 'Total Events'}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '即将举行' : 'Upcoming'}</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.upcoming}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '已完成' : 'Completed'}</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '总参与' : 'Participants'}</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats.totalParticipants}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">{lang === 'zh' ? '活动收入' : 'Revenue'}</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">¥{stats.totalRevenue}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'events', label: lang === 'zh' ? '即将举行' : 'Upcoming', icon: <Calendar className="w-4 h-4" /> },
          { id: 'registrations', label: lang === 'zh' ? '报名管理' : 'Registrations', icon: <Users className="w-4 h-4" /> },
          { id: 'archive', label: lang === 'zh' ? '历史活动' : 'Archive', icon: <Clock className="w-4 h-4" /> },
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

      {(activeTab === 'events' || activeTab === 'archive') && (
        <>
          <div className="flex gap-2">
            {['all', 'concert', 'competition', 'recital', 'masterclass'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filterType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'all' ? (lang === 'zh' ? '全部' : 'All') : getTypeLabel(type)}
              </button>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map(event => (
              <div 
                key={event.id} 
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedEvent(event)}
              >
                <div className={`h-2 ${
                  event.type === 'concert' ? 'bg-purple-500' :
                  event.type === 'competition' ? 'bg-amber-500' :
                  event.type === 'recital' ? 'bg-blue-500' :
                  event.type === 'masterclass' ? 'bg-green-500' :
                  'bg-gray-500'
                }`} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(event.type)}`}>
                      {getTypeIcon(event.type)}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                      event.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                      event.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {event.status === 'upcoming' ? (lang === 'zh' ? '即将举行' : 'Upcoming') :
                       event.status === 'ongoing' ? (lang === 'zh' ? '进行中' : 'Ongoing') :
                       event.status === 'completed' ? (lang === 'zh' ? '已完成' : 'Completed') :
                       (lang === 'zh' ? '已取消' : 'Cancelled')}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-3">{event.description}</p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{format(parseISO(event.date), 'yyyy年M月d日')}</span>
                      <span className="text-gray-400">{event.startTime}-{event.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{event.venue}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{event.registeredCount}/{event.capacity}</span>
                      </div>
                      {event.fee > 0 && (
                        <span className="font-bold text-amber-600">¥{event.fee}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {event.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                    {event.hasCertificate && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {lang === 'zh' ? '有证书' : 'Certificate'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'registrations' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '学员' : 'Student'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '活动' : 'Event'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '表演曲目' : 'Performance'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '状态' : 'Status'}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{lang === 'zh' ? '操作' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {registrations.map(reg => {
                const event = events.find(e => e.id === reg.eventId);
                return (
                  <tr key={reg.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{reg.studentName}</p>
                      <p className="text-xs text-gray-500">{format(parseISO(reg.registeredAt), 'yyyy-MM-dd')}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{event?.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {reg.performance ? (
                        <div>
                          <p className="font-medium">{reg.performance.title}</p>
                          <p className="text-xs text-gray-500">{reg.performance.duration}{lang === 'zh' ? '分钟' : ' min'}</p>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        reg.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        reg.status === 'registered' ? 'bg-blue-100 text-blue-700' :
                        reg.status === 'attended' ? 'bg-purple-100 text-purple-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {reg.status === 'confirmed' ? (lang === 'zh' ? '已确认' : 'Confirmed') :
                         reg.status === 'registered' ? (lang === 'zh' ? '已报名' : 'Registered') :
                         reg.status === 'attended' ? (lang === 'zh' ? '已参加' : 'Attended') :
                         (lang === 'zh' ? '已取消' : 'Cancelled')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button className="text-xs text-indigo-600 hover:text-indigo-700">
                          <Send className="w-4 h-4" />
                        </button>
                        <button className="text-xs text-red-600 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showEventForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowEventForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {lang === 'zh' ? '创建活动' : 'Create Event'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '活动名称' : 'Event Title'} *
                  </label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={lang === 'zh' ? '例如：春季音乐会' : 'e.g., Spring Concert'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '活动类型' : 'Event Type'}
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={e => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="concert">{lang === 'zh' ? '音乐会' : 'Concert'}</option>
                    <option value="competition">{lang === 'zh' ? '比赛' : 'Competition'}</option>
                    <option value="recital">{lang === 'zh' ? '独奏会' : 'Recital'}</option>
                    <option value="masterclass">{lang === 'zh' ? '大师班' : 'Masterclass'}</option>
                    <option value="other">{lang === 'zh' ? '其他' : 'Other'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '活动描述' : 'Description'}
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                    placeholder={lang === 'zh' ? '活动简介...' : 'Event description...'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'zh' ? '活动日期' : 'Date'}
                    </label>
                    <input
                      type="date"
                      value={newEvent.date}
                      onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'zh' ? '报名截止' : 'Deadline'}
                    </label>
                    <input
                      type="date"
                      value={newEvent.registrationDeadline}
                      onChange={e => setNewEvent({ ...newEvent, registrationDeadline: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'zh' ? '开始时间' : 'Start Time'}
                    </label>
                    <input
                      type="time"
                      value={newEvent.startTime}
                      onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'zh' ? '结束时间' : 'End Time'}
                    </label>
                    <input
                      type="time"
                      value={newEvent.endTime}
                      onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '活动地点' : 'Venue'} *
                  </label>
                  <input
                    type="text"
                    value={newEvent.venue}
                    onChange={e => setNewEvent({ ...newEvent, venue: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={lang === 'zh' ? '例如：市音乐厅' : 'e.g., City Concert Hall'}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'zh' ? '容量' : 'Capacity'}
                    </label>
                    <input
                      type="number"
                      value={newEvent.capacity}
                      onChange={e => setNewEvent({ ...newEvent, capacity: parseInt(e.target.value) || 50 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {lang === 'zh' ? '报名费' : 'Fee'}
                    </label>
                    <input
                      type="number"
                      value={newEvent.fee}
                      onChange={e => setNewEvent({ ...newEvent, fee: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {lang === 'zh' ? '标签' : 'Tags'}
                  </label>
                  <input
                    type="text"
                    value={newEvent.tags}
                    onChange={e => setNewEvent({ ...newEvent, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder={lang === 'zh' ? '用逗号分隔，例如：音乐会, 钢琴' : 'Comma separated, e.g., concert, piano'}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasCertificate"
                    checked={newEvent.hasCertificate}
                    onChange={e => setNewEvent({ ...newEvent, hasCertificate: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="hasCertificate" className="text-sm text-gray-700">
                    {lang === 'zh' ? '参与者可获得证书' : 'Participants receive certificate'}
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowEventForm(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    {lang === 'zh' ? '取消' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleCreateEvent}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    {lang === 'zh' ? '创建活动' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSelectedEvent(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className={`h-2 ${
                selectedEvent.type === 'concert' ? 'bg-purple-500' :
                selectedEvent.type === 'competition' ? 'bg-amber-500' :
                selectedEvent.type === 'recital' ? 'bg-blue-500' :
                selectedEvent.type === 'masterclass' ? 'bg-green-500' :
                'bg-gray-500'
              }`} />
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getTypeColor(selectedEvent.type)}`}>
                        {getTypeIcon(selectedEvent.type)}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(selectedEvent.type)}`}>
                        {getTypeLabel(selectedEvent.type)}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedEvent.title}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <p className="text-gray-600 mb-4">{selectedEvent.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '日期时间' : 'Date & Time'}</p>
                    <p className="font-medium text-gray-900">{format(parseISO(selectedEvent.date), 'yyyy年M月d日')}</p>
                    <p className="text-sm text-gray-600">{selectedEvent.startTime} - {selectedEvent.endTime}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '地点' : 'Venue'}</p>
                    <p className="font-medium text-gray-900">{selectedEvent.venue}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '报名情况' : 'Registration'}</p>
                    <p className="font-medium text-gray-900">{selectedEvent.registeredCount}/{selectedEvent.capacity}</p>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${(selectedEvent.registeredCount / selectedEvent.capacity) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{lang === 'zh' ? '报名费' : 'Fee'}</p>
                    <p className="font-medium text-gray-900">
                      {selectedEvent.fee > 0 ? `¥${selectedEvent.fee}` : (lang === 'zh' ? '免费' : 'Free')}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  {selectedEvent.tags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    {lang === 'zh' ? '管理报名' : 'Manage Registrations'}
                  </button>
                  <button
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    {lang === 'zh' ? '发送提醒' : 'Send Reminder'}
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
