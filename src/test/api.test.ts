import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../services/api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should call login API with correct parameters', async () => {
      const mockUser = { id: '1', username: 'admin', role: 'admin' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });

      const result = await api.login('admin', 'password');

      expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'password' }),
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Invalid credentials' }),
      });

      await expect(api.login('admin', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('getStudents', () => {
    it('should fetch students list', async () => {
      const mockStudents = [
        { id: '1', name: '张三', phone: '13800138000' },
        { id: '2', name: '李四', phone: '13900139000' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStudents),
      });

      const result = await api.getStudents();

      expect(mockFetch).toHaveBeenCalledWith('/api/students');
      expect(result).toEqual(mockStudents);
    });
  });

  describe('addStudent', () => {
    it('should add a new student', async () => {
      const newStudent = { name: '王五', phone: '13700137000', remainingHours: 10, age: 10, level: 'Beginner', parentName: '王父', parentPhone: '13800138000' };
      const mockResponse = { id: '3', ...newStudent };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await api.addStudent(newStudent);

      expect(mockFetch).toHaveBeenCalledWith('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateStudent', () => {
    it('should update a student', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.updateStudent('1', { name: '张三更新' });

      expect(mockFetch).toHaveBeenCalledWith('/api/students/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '张三更新' }),
      });
    });
  });

  describe('deleteStudent', () => {
    it('should delete a student', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.deleteStudent('1');

      expect(mockFetch).toHaveBeenCalledWith('/api/students/1', {
        method: 'DELETE',
      });
    });
  });

  describe('getCourses', () => {
    it('should fetch courses list', async () => {
      const mockCourses = [
        { id: '1', studentId: '1', studentName: '张三', date: '2024-01-01', time: '10:00', status: 'scheduled' },
      ];
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCourses),
      });

      const result = await api.getCourses();

      expect(mockFetch).toHaveBeenCalledWith('/api/courses');
      expect(result).toEqual(mockCourses);
    });
  });

  describe('markAttendance', () => {
    it('should mark attendance', async () => {
      const attendanceData = {
        courseId: '1',
        studentId: '1',
        status: 'present',
        date: '2024-01-01',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await api.markAttendance(attendanceData);

      expect(mockFetch).toHaveBeenCalledWith('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData),
      });
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal Server Error' }),
      });

      await expect(api.getStudents()).rejects.toThrow('Internal Server Error');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(api.getStudents()).rejects.toThrow('Network error');
    });
  });
});
