import { Student, Teacher, Course, Payment, Feedback, Homework, LeaveRequest, Campus, User } from '../types';

export interface SearchResult {
  type: 'student' | 'teacher' | 'course' | 'payment' | 'feedback' | 'homework' | 'leaveRequest' | 'campus' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  data: any;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  count: number;
}

export interface FilterPreset {
  id: string;
  name: string;
  type: string;
  filters: Record<string, any>;
  createdAt: string;
}

const STORAGE_KEY_SEARCH_HISTORY = 'dreamyear_search_history';
const STORAGE_KEY_FILTER_PRESETS = 'dreamyear_filter_presets';
const MAX_HISTORY_ITEMS = 20;

export const searchStudents = (query: string, students: Student[]): SearchResult[] => {
  const lowerQuery = query.toLowerCase();
  return students
    .filter(student => 
      student.name.toLowerCase().includes(lowerQuery) ||
      student.parentName.toLowerCase().includes(lowerQuery) ||
      student.parentPhone.includes(query) ||
      (student.notes?.toLowerCase().includes(lowerQuery))
    )
    .map(student => ({
      type: 'student' as const,
      id: student.id,
      title: student.name,
      subtitle: `${student.level} · 剩余课时: ${student.remainingHours}h`,
      description: `家长: ${student.parentName} · 电话: ${student.parentPhone}`,
      data: student,
    }));
};

export const searchTeachers = (query: string, teachers: Teacher[]): SearchResult[] => {
  const lowerQuery = query.toLowerCase();
  return teachers
    .filter(teacher => 
      teacher.name.toLowerCase().includes(lowerQuery) ||
      teacher.phone.includes(query) ||
      teacher.email.toLowerCase().includes(lowerQuery) ||
      teacher.specialization.toLowerCase().includes(lowerQuery)
    )
    .map(teacher => ({
      type: 'teacher' as const,
      id: teacher.id,
      title: teacher.name,
      subtitle: teacher.specialization,
      description: `${teacher.phone} · ${teacher.email}`,
      data: teacher,
    }));
};

export const searchCourses = (query: string, courses: Course[]): SearchResult[] => {
  const lowerQuery = query.toLowerCase();
  return courses
    .filter(course => 
      course.title.toLowerCase().includes(lowerQuery) ||
      course.teacherName.toLowerCase().includes(lowerQuery) ||
      course.studentName.toLowerCase().includes(lowerQuery) ||
      course.room.toLowerCase().includes(lowerQuery)
    )
    .map(course => ({
      type: 'course' as const,
      id: course.id,
      title: course.title,
      subtitle: `${course.teacherName} · ${course.studentName}`,
      description: `${course.date} ${course.startTime}-${course.endTime} · ${course.room}`,
      data: course,
    }));
};

export const searchUsers = (query: string, users: User[]): SearchResult[] => {
  const lowerQuery = query.toLowerCase();
  return users
    .filter(user => 
      user.name.toLowerCase().includes(lowerQuery) ||
      user.username.toLowerCase().includes(lowerQuery) ||
      (user.email?.toLowerCase().includes(lowerQuery)) ||
      (user.phone?.includes(query))
    )
    .map(user => ({
      type: 'user' as const,
      id: user.id,
      title: user.name,
      subtitle: user.username,
      description: `${user.role}${user.email ? ` · ${user.email}` : ''}`,
      data: user,
    }));
};

export const searchCampuses = (query: string, campuses: Campus[]): SearchResult[] => {
  const lowerQuery = query.toLowerCase();
  return campuses
    .filter(campus => 
      campus.name.toLowerCase().includes(lowerQuery) ||
      campus.address.toLowerCase().includes(lowerQuery) ||
      campus.phone.includes(query)
    )
    .map(campus => ({
      type: 'campus' as const,
      id: campus.id,
      title: campus.name,
      subtitle: campus.address,
      description: campus.phone,
      data: campus,
    }));
};

export const getSearchHistory = (): SearchHistoryItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SEARCH_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveSearchHistory = (query: string): void => {
  const history = getSearchHistory();
  const existingIndex = history.findIndex(item => item.query.toLowerCase() === query.toLowerCase());
  
  if (existingIndex >= 0) {
    history[existingIndex].count++;
    history[existingIndex].timestamp = new Date().toISOString();
    const [item] = history.splice(existingIndex, 1);
    history.unshift(item);
  } else {
    history.unshift({
      id: `search-${Date.now()}`,
      query,
      timestamp: new Date().toISOString(),
      count: 1,
    });
  }
  
  localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(history.slice(0, MAX_HISTORY_ITEMS)));
};

export const clearSearchHistory = (): void => {
  localStorage.removeItem(STORAGE_KEY_SEARCH_HISTORY);
};

export const deleteSearchHistoryItem = (id: string): void => {
  const history = getSearchHistory();
  const filtered = history.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(filtered));
};

export const getFilterPresets = (type: string): FilterPreset[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_FILTER_PRESETS);
    const allPresets = data ? JSON.parse(data) : [];
    return allPresets.filter((preset: FilterPreset) => preset.type === type);
  } catch {
    return [];
  }
};

export const saveFilterPreset = (name: string, type: string, filters: Record<string, any>): FilterPreset => {
  const allPresets = getAllFilterPresets();
  const preset: FilterPreset = {
    id: `preset-${Date.now()}`,
    name,
    type,
    filters,
    createdAt: new Date().toISOString(),
  };
  
  allPresets.push(preset);
  localStorage.setItem(STORAGE_KEY_FILTER_PRESETS, JSON.stringify(allPresets));
  return preset;
};

export const deleteFilterPreset = (id: string): void => {
  const allPresets = getAllFilterPresets();
  const filtered = allPresets.filter(preset => preset.id !== id);
  localStorage.setItem(STORAGE_KEY_FILTER_PRESETS, JSON.stringify(filtered));
};

const getAllFilterPresets = (): FilterPreset[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_FILTER_PRESETS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};
