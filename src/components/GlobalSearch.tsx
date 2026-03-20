import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Users, User, BookOpen, Calendar, Building2, Clock, Trash2, Plus, Filter, Star } from 'lucide-react';
import { Language } from '../types';
import { useStudents, useCourses, useTeachers, useCampuses } from '../contexts/AppContext';
import { api } from '../services/api';
import { 
  SearchResult, 
  searchStudents, 
  searchTeachers, 
  searchCourses, 
  searchCampuses, 
  searchUsers,
  getSearchHistory, 
  saveSearchHistory, 
  clearSearchHistory, 
  deleteSearchHistoryItem,
  SearchHistoryItem
} from '../utils/search';

interface GlobalSearchProps {
  lang: Language;
  onClose: () => void;
}

export default function GlobalSearch({ lang, onClose }: GlobalSearchProps) {
  const { students } = useStudents();
  const { courses } = useCourses();
  const { teachers } = useTeachers();
  const { campuses } = useCampuses();
  
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [searchTypes, setSearchTypes] = useState<string[]>(['student', 'teacher', 'course', 'campus', 'user']);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHistory(getSearchHistory());
    loadUsers();
    inputRef.current?.focus();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const filteredResults = useMemo(() => {
    if (!query.trim()) return [];

    let allResults: SearchResult[] = [];

    if (searchTypes.includes('student')) {
      allResults = allResults.concat(searchStudents(query, students));
    }
    if (searchTypes.includes('teacher')) {
      allResults = allResults.concat(searchTeachers(query, teachers));
    }
    if (searchTypes.includes('course')) {
      allResults = allResults.concat(searchCourses(query, courses));
    }
    if (searchTypes.includes('campus')) {
      allResults = allResults.concat(searchCampuses(query, campuses));
    }
    if (searchTypes.includes('user')) {
      allResults = allResults.concat(searchUsers(query, users));
    }

    return allResults.slice(0, 50);
  }, [query, students, teachers, courses, campuses, users, searchTypes]);

  useEffect(() => {
    setResults(filteredResults);
    setShowHistory(!query.trim());
  }, [filteredResults, query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      saveSearchHistory(query);
      setHistory(getSearchHistory());
    }
  };

  const handleHistoryClick = (historyItem: SearchHistoryItem) => {
    setQuery(historyItem.query);
    setShowHistory(false);
  };

  const handleClearHistory = () => {
    if (confirm(lang === 'zh' ? '确定要清空搜索历史吗？' : 'Are you sure to clear search history?')) {
      clearSearchHistory();
      setHistory([]);
    }
  };

  const handleDeleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteSearchHistoryItem(id);
    setHistory(getSearchHistory());
  };

  const toggleSearchType = (type: string) => {
    setSearchTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type) 
        : [...prev, type]
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'student': return <Users className="w-4 h-4" />;
      case 'teacher': return <User className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'campus': return <Building2 className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'student': return 'text-blue-600 bg-blue-50';
      case 'teacher': return 'text-emerald-600 bg-emerald-50';
      case 'course': return 'text-purple-600 bg-purple-50';
      case 'campus': return 'text-amber-600 bg-amber-50';
      case 'user': return 'text-rose-600 bg-rose-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      student: lang === 'zh' ? '学员' : 'Student',
      teacher: lang === 'zh' ? '教师' : 'Teacher',
      course: lang === 'zh' ? '课程' : 'Course',
      campus: lang === 'zh' ? '校区' : 'Campus',
      user: lang === 'zh' ? '用户' : 'User',
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in">
        <div className="sticky top-0 bg-white rounded-t-3xl border-b border-gray-100 p-4 z-10">
          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={lang === 'zh' ? '搜索学员、教师、课程、校区...' : 'Search students, teachers, courses, campuses...'}
                className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-lg"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full transition"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              )}
            </form>
            <button
              onClick={onClose}
              className="p-3 hover:bg-gray-100 rounded-xl transition"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
            {['student', 'teacher', 'course', 'campus', 'user'].map(type => (
              <button
                key={type}
                onClick={() => toggleSearchType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition whitespace-nowrap ${
                  searchTypes.includes(type)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {getTypeIcon(type)}
                {getTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {showHistory && history.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {lang === 'zh' ? '搜索历史' : 'Search History'}
                </h3>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  {lang === 'zh' ? '清空' : 'Clear'}
                </button>
              </div>
              <div className="space-y-1">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleHistoryClick(item)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{item.query}</span>
                      <span className="text-xs text-gray-400">
                        {item.count}x
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition"
                    >
                      <Trash2 className="w-4 h-4 text-gray-400" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query && results.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                {lang === 'zh' ? '搜索结果' : 'Search Results'} 
                <span className="ml-2 text-indigo-600">({results.length})</span>
              </h3>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}-${index}`}
                  className="w-full text-left p-4 hover:bg-gray-50 rounded-2xl transition border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeColor(result.type)}`}>
                      {getTypeIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(result.type)}`}>
                          {getTypeLabel(result.type)}
                        </span>
                        <h4 className="font-semibold text-gray-900 truncate">
                          {result.title}
                        </h4>
                      </div>
                      {result.subtitle && (
                        <p className="text-sm text-gray-500 mb-1">{result.subtitle}</p>
                      )}
                      {result.description && (
                        <p className="text-xs text-gray-400 truncate">{result.description}</p>
                      )}
                    </div>
                    <Star className="w-4 h-4 text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {query && results.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {lang === 'zh' ? '未找到结果' : 'No results found'}
              </h3>
              <p className="text-gray-500">
                {lang === 'zh' ? '尝试使用其他关键词搜索' : 'Try searching with different keywords'}
              </p>
            </div>
          )}

          {!query && history.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                {lang === 'zh' ? '开始搜索' : 'Start searching'}
              </h3>
              <p className="text-gray-500">
                {lang === 'zh' ? '输入关键词搜索学员、教师、课程等' : 'Enter keywords to search students, teachers, courses, etc.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
