import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Student, Course, Attendance, Feedback, Payment, Teacher, Campus } from '../types';
import { api } from '../services/api';

interface AppDataContextType {
  students: Student[];
  courses: Course[];
  teachers: Teacher[];
  campuses: Campus[];
  loading: boolean;
  error: string | null;
  refreshStudents: () => Promise<void>;
  refreshCourses: () => Promise<void>;
  refreshTeachers: () => Promise<void>;
  refreshCampuses: () => Promise<void>;
  addStudent: (student: Omit<Student, 'id'>) => Promise<Student>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  addCourse: (course: Omit<Course, 'id' | 'status'>) => Promise<Course>;
  updateCourse: (id: string, course: Partial<Course>) => Promise<void>;
  updateCourseStatus: (id: string, status: Course['status']) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Promise<Teacher>;
  updateTeacher: (id: string, data: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: string) => Promise<void>;
  markAttendance: (data: { courseId: string; studentId: string; status: string; date: string }) => Promise<void>;
  getAttendanceByStudent: (studentId: string) => Promise<Attendance[]>;
}

const AppDataContext = createContext<AppDataContextType | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStudents = useCallback(async () => {
    try {
      const data = await api.getStudents();
      setStudents(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch students');
      throw err;
    }
  }, []);

  const refreshCourses = useCallback(async () => {
    try {
      const data = await api.getCourses();
      setCourses(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch courses');
      throw err;
    }
  }, []);

  const refreshTeachers = useCallback(async () => {
    try {
      const data = await api.getTeachers();
      setTeachers(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch teachers');
      throw err;
    }
  }, []);

  const refreshCampuses = useCallback(async () => {
    try {
      const data = await api.getCampuses();
      setCampuses(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch campuses');
      throw err;
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        await Promise.all([refreshStudents(), refreshCourses(), refreshTeachers(), refreshCampuses()]);
      } catch (err) {
        console.error('Failed to initialize data', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [refreshStudents, refreshCourses, refreshTeachers, refreshCampuses]);

  const addStudent = useCallback(async (student: Omit<Student, 'id'>) => {
    const newStudent = await api.addStudent(student);
    setStudents(prev => [...prev, newStudent]);
    return newStudent;
  }, []);

  const updateStudent = useCallback(async (id: string, data: Partial<Student>) => {
    await api.updateStudent(id, data);
    setStudents(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
  }, []);

  const deleteStudent = useCallback(async (id: string) => {
    await api.deleteStudent(id);
    setStudents(prev => prev.filter(s => s.id !== id));
  }, []);

  const addCourse = useCallback(async (course: Omit<Course, 'id' | 'status'>) => {
    const newCourse = await api.addCourse(course);
    setCourses(prev => [...prev, newCourse]);
    return newCourse;
  }, []);

  const updateCourse = useCallback(async (id: string, course: Partial<Course>) => {
    await api.updateCourse(id, course);
    setCourses(prev => prev.map(c => c.id === id ? { ...c, ...course } : c));
  }, []);

  const updateCourseStatus = useCallback(async (id: string, status: Course['status']) => {
    await api.updateCourseStatus(id, status);
    setCourses(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  }, []);

  const deleteCourse = useCallback(async (id: string) => {
    await api.deleteCourse(id);
    setCourses(prev => prev.filter(c => c.id !== id));
  }, []);

  const addTeacher = useCallback(async (teacher: Omit<Teacher, 'id'>) => {
    const newTeacher = await api.addTeacher(teacher);
    setTeachers(prev => [...prev, newTeacher]);
    return newTeacher;
  }, []);

  const updateTeacher = useCallback(async (id: string, data: Partial<Teacher>) => {
    await api.updateTeacher(id, data);
    setTeachers(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTeacher = useCallback(async (id: string) => {
    await api.deleteTeacher(id);
    setTeachers(prev => prev.filter(t => t.id !== id));
  }, []);

  const markAttendance = useCallback(async (data: { courseId: string; studentId: string; status: string; date: string }) => {
    await api.markAttendance(data);
    if (data.status === 'present') {
      setStudents(prev => prev.map(s => 
        s.id === data.studentId ? { ...s, remainingHours: s.remainingHours - 1 } : s
      ));
    }
  }, []);

  const getAttendanceByStudent = useCallback(async (studentId: string) => {
    return api.getAttendanceByStudent(studentId);
  }, []);

  return (
    <AppDataContext.Provider value={{
      students,
      courses,
      teachers,
      campuses,
      loading,
      error,
      refreshStudents,
      refreshCourses,
      refreshTeachers,
      refreshCampuses,
      addStudent,
      updateStudent,
      deleteStudent,
      addCourse,
      updateCourse,
      updateCourseStatus,
      deleteCourse,
      addTeacher,
      updateTeacher,
      deleteTeacher,
      markAttendance,
      getAttendanceByStudent,
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}

export function useStudents() {
  const { students, loading, error, refreshStudents, addStudent, updateStudent, deleteStudent } = useAppData();
  return { students, loading, error, refreshStudents, addStudent, updateStudent, deleteStudent };
}

export function useCourses() {
  const { courses, loading, error, refreshCourses, addCourse, updateCourse, updateCourseStatus, deleteCourse } = useAppData();
  return { courses, loading, error, refreshCourses, addCourse, updateCourse, updateCourseStatus, deleteCourse };
}

export function useTeachers() {
  const { teachers, loading, error, refreshTeachers, addTeacher, updateTeacher, deleteTeacher } = useAppData();
  return { teachers, loading, error, refreshTeachers, addTeacher, updateTeacher, deleteTeacher };
}

export function useCampuses() {
  const { campuses, loading, error, refreshCampuses } = useAppData();
  return { campuses, loading, error, refreshCampuses };
}
