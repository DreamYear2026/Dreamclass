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

export interface BackupRecord {
  id: string;
  name: string;
  type: 'full' | 'differential';
  createdAt: string;
  size: number;
  data: BackupData;
  parentBackupId?: string;
}

export interface BackupSchedule {
  enabled: boolean;
  interval: 'daily' | 'weekly' | 'custom';
  time: string;
  day?: number;
  retentionDays: number;
}

const STORAGE_KEY_BACKUPS = 'dreamyear_backups';
const STORAGE_KEY_SCHEDULE = 'dreamyear_backup_schedule';
const STORAGE_KEY_LAST_BACKUP = 'dreamyear_last_backup';

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

export const saveBackupToLocal = (backupData: BackupData, type: 'full' | 'differential' = 'full', parentBackupId?: string): BackupRecord => {
  const backups = getLocalBackups();
  const dataStr = JSON.stringify(backupData);
  const record: BackupRecord = {
    id: `backup-${Date.now()}`,
    name: `${type === 'full' ? '完整' : '差异'}备份 - ${new Date().toLocaleString('zh-CN')}`,
    type,
    createdAt: backupData.createdAt,
    size: new Blob([dataStr]).size,
    data: backupData,
    parentBackupId,
  };
  
  backups.unshift(record);
  
  const schedule = getBackupSchedule();
  if (schedule.enabled) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - schedule.retentionDays);
    const filteredBackups = backups.filter(b => new Date(b.createdAt) > cutoffDate);
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(filteredBackups.slice(0, 50)));
  } else {
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(backups.slice(0, 50)));
  }
  
  localStorage.setItem(STORAGE_KEY_LAST_BACKUP, backupData.createdAt);
  return record;
};

export const getLocalBackups = (): BackupRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_BACKUPS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const deleteLocalBackup = (backupId: string): void => {
  const backups = getLocalBackups();
  const filtered = backups.filter(b => b.id !== backupId);
  localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(filtered));
};

export const createDifferentialBackup = (currentData: Omit<BackupData, 'version' | 'createdAt'>, lastFullBackup: BackupData): BackupData => {
  const current = createBackup(currentData);
  const differential: Partial<BackupData> = {
    version: current.version,
    createdAt: current.createdAt,
  };

  if (JSON.stringify(current.students) !== JSON.stringify(lastFullBackup.students)) {
    differential.students = current.students;
  }
  if (JSON.stringify(current.courses) !== JSON.stringify(lastFullBackup.courses)) {
    differential.courses = current.courses;
  }
  if (JSON.stringify(current.teachers) !== JSON.stringify(lastFullBackup.teachers)) {
    differential.teachers = current.teachers;
  }
  if (JSON.stringify(current.payments) !== JSON.stringify(lastFullBackup.payments)) {
    differential.payments = current.payments;
  }
  if (JSON.stringify(current.feedbacks) !== JSON.stringify(lastFullBackup.feedbacks)) {
    differential.feedbacks = current.feedbacks;
  }
  if (JSON.stringify(current.homeworks) !== JSON.stringify(lastFullBackup.homeworks)) {
    differential.homeworks = current.homeworks;
  }
  if (JSON.stringify(current.leaveRequests) !== JSON.stringify(lastFullBackup.leaveRequests)) {
    differential.leaveRequests = current.leaveRequests;
  }
  if (JSON.stringify(current.campuses) !== JSON.stringify(lastFullBackup.campuses)) {
    differential.campuses = current.campuses;
  }

  return { ...lastFullBackup, ...differential };
};

export const getBackupSchedule = (): BackupSchedule => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SCHEDULE);
    return data ? JSON.parse(data) : {
      enabled: false,
      interval: 'daily',
      time: '02:00',
      retentionDays: 30,
    };
  } catch {
    return {
      enabled: false,
      interval: 'daily',
      time: '02:00',
      retentionDays: 30,
    };
  }
};

export const saveBackupSchedule = (schedule: BackupSchedule): void => {
  localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(schedule));
};

export const getLastBackupTime = (): string | null => {
  return localStorage.getItem(STORAGE_KEY_LAST_BACKUP);
};

export const mergeDifferentialBackup = (fullBackup: BackupData, differentialBackup: Partial<BackupData>): BackupData => {
  return { ...fullBackup, ...differentialBackup };
};
