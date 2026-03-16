import { describe, it, expect } from 'vitest';
import { exportToCSV, exportToExcel } from '../utils/export';
import { createBackup, getBackupSummary } from '../utils/backup';

describe('Export Utils', () => {
  describe('exportToCSV', () => {
    it('should exist and be a function', () => {
      expect(typeof exportToCSV).toBe('function');
    });
  });

  describe('exportToExcel', () => {
    it('should exist and be a function', () => {
      expect(typeof exportToExcel).toBe('function');
    });
  });
});

describe('Backup Utils', () => {
  describe('createBackup', () => {
    it('should create a backup with correct structure', () => {
      const testData = {
        students: [],
        courses: [],
        teachers: [],
        payments: [],
        feedbacks: [],
        homeworks: [],
        leaveRequests: [],
        campuses: []
      };

      const backup = createBackup(testData);

      expect(backup).toHaveProperty('version');
      expect(backup).toHaveProperty('createdAt');
      expect(backup).toHaveProperty('students');
      expect(backup).toHaveProperty('courses');
      expect(backup).toHaveProperty('teachers');
      expect(backup).toHaveProperty('payments');
      expect(backup).toHaveProperty('feedbacks');
      expect(backup).toHaveProperty('homeworks');
      expect(backup).toHaveProperty('leaveRequests');
      expect(backup).toHaveProperty('campuses');
      expect(backup.version).toBe('1.0.0');
    });
  });

  describe('getBackupSummary', () => {
    it('should generate summary from backup data', () => {
      const testBackup = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        students: [{ id: '1', name: 'Test Student' }],
        courses: [{ id: '1', title: 'Test Course' }],
        teachers: [{ id: '1', name: 'Test Teacher' }],
        payments: [{ id: '1', amount: 100 }],
        feedbacks: [{ id: '1', content: 'Test' }],
        homeworks: [{ id: '1', title: 'Test' }],
        leaveRequests: [{ id: '1', reason: 'Test' }],
        campuses: [{ id: '1', name: 'Test Campus' }]
      };

      const summary = getBackupSummary(testBackup);

      expect(summary).toHaveProperty('date');
      expect(summary).toHaveProperty('students');
      expect(summary).toHaveProperty('courses');
      expect(summary).toHaveProperty('teachers');
      expect(summary).toHaveProperty('payments');
      expect(summary.students).toBe(1);
      expect(summary.courses).toBe(1);
      expect(summary.teachers).toBe(1);
      expect(summary.payments).toBe(1);
    });
  });
});
