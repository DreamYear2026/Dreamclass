import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AppDataProvider, useAppData, useStudents, useCourses } from '../contexts/AppContext';
import { api } from '../services/api';
import React from 'react';

vi.mock('../services/api', () => ({
  api: {
    getStudents: vi.fn(),
    getCourses: vi.fn(),
    addStudent: vi.fn(),
    updateStudent: vi.fn(),
    addCourse: vi.fn(),
    updateCourse: vi.fn(),
    updateCourseStatus: vi.fn(),
    deleteCourse: vi.fn(),
    markAttendance: vi.fn(),
    getAttendanceByStudent: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);

const TestComponent = () => {
  const { students, courses, loading, error } = useAppData();
  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="error">{error || 'no error'}</span>
      <span data-testid="students-count">{students.length}</span>
      <span data-testid="courses-count">{courses.length}</span>
    </div>
  );
};

const renderWithProvider = () => {
  return render(
    <AppDataProvider>
      <TestComponent />
    </AppDataProvider>
  );
};

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should show loading state initially', () => {
      mockedApi.getStudents.mockImplementation(() => new Promise(() => {}));
      mockedApi.getCourses.mockImplementation(() => new Promise(() => {}));

      renderWithProvider();

      expect(screen.getByTestId('loading').textContent).toBe('true');
    });

    it('should fetch students and courses on mount', async () => {
      const mockStudents = [
        { id: '1', name: '张三', phone: '13800138000', remainingHours: 10, age: 10, level: 'Beginner', parentName: '张父', parentPhone: '13900139000' },
      ];
      const mockCourses = [
        { id: '1', studentId: '1', studentName: '张三', date: '2024-01-01', time: '10:00', status: 'scheduled' as const, title: '钢琴课', teacherId: 't1', teacherName: '李老师', startTime: '10:00', endTime: '11:00', room: 'A1' },
      ];

      mockedApi.getStudents.mockResolvedValueOnce(mockStudents);
      mockedApi.getCourses.mockResolvedValueOnce(mockCourses);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });

      expect(screen.getByTestId('students-count').textContent).toBe('1');
      expect(screen.getByTestId('courses-count').textContent).toBe('1');
    });

    it('should handle fetch errors', async () => {
      mockedApi.getStudents.mockRejectedValueOnce(new Error('Failed to fetch'));
      mockedApi.getCourses.mockResolvedValueOnce([]);

      renderWithProvider();

      await waitFor(() => {
        expect(screen.getByTestId('loading').textContent).toBe('false');
      });
    });
  });

  describe('useStudents hook', () => {
    it('should throw error when used outside provider', () => {
      const TestErrorComponent = () => {
        useStudents();
        return null;
      };

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestErrorComponent />)).toThrow(
        'useAppData must be used within an AppDataProvider'
      );

      consoleError.mockRestore();
    });
  });

  describe('useCourses hook', () => {
    it('should throw error when used outside provider', () => {
      const TestErrorComponent = () => {
        useCourses();
        return null;
      };

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<TestErrorComponent />)).toThrow(
        'useAppData must be used within an AppDataProvider'
      );

      consoleError.mockRestore();
    });
  });
});
