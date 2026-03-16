import { Student, Course, Teacher, Payment, Feedback, Homework, LeaveRequest, Campus } from '../types';

export interface BackupData {
  version: string;
  createdAt: string;
  students: Student[];
  courses: Course[];
  teachers: Teacher[];
  payments: Payment[];
  feedbacks: Feedback[];
  homeworks: Homework[];
  leaveRequests: LeaveRequest[];
  campuses: Campus[];
}

export const createBackup = (data: Omit<BackupData, 'version' | 'createdAt'>): BackupData => {
  return {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    ...data,
  };
};

export const downloadBackup = (backup: BackupData, filename?: string) => {
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `dreamyear-backup-${formatDateForFilename(backup.createdAt)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseBackupFile = async (file: File): Promise<BackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const backup = JSON.parse(content);
        validateBackupData(backup);
        resolve(backup);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('无效的备份文件'));
      }
    };
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsText(file);
  });
};

const validateBackupData: (data: any) => asserts data is BackupData = (data: any): asserts data is BackupData => {
  if (!data.version || !data.createdAt) {
    throw new Error('备份文件缺少必要字段');
  }
  if (!Array.isArray(data.students)) {
    throw new Error('备份文件数据格式错误');
  }
};

const formatDateForFilename = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
};

export const getBackupSummary = (backup: BackupData) => {
  return {
    date: new Date(backup.createdAt).toLocaleString('zh-CN'),
    students: backup.students.length,
    courses: backup.courses.length,
    teachers: backup.teachers.length,
    payments: backup.payments.length,
    feedbacks: backup.feedbacks?.length || 0,
    homeworks: backup.homeworks?.length || 0,
    leaveRequests: backup.leaveRequests?.length || 0,
    campuses: backup.campuses?.length || 0,
  };
};
