export type Role = 'admin' | 'parent' | 'teacher';
export type Language = 'en' | 'zh';

export interface Campus {
  id: string;
  name: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface Student {
  id: string;
  name: string;
  age: number;
  level: string;
  parentName: string;
  parentPhone: string;
  remainingHours: number;
  avatar?: string;
  userId?: string;
  notes?: string;
  status?: 'active' | 'paused' | 'graduated' | 'transferred';
  tags?: string[];
  campusId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HoursChangeRecord {
  id: string;
  studentId: string;
  changeAmount: number;
  previousHours: number;
  newHours: number;
  reason: string;
  operatorId: string;
  operatorName: string;
  createdAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

export interface Course {
  id: string;
  title: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  room: string;
}

export interface Attendance {
  id: string;
  courseId: string;
  studentId: string;
  status: 'present' | 'absent' | 'leave';
  date: string;
}

export interface Feedback {
  id: string;
  courseId: string;
  studentId: string;
  teacherId: string;
  content: string;
  homework: string;
  rating: number;
  date: string;
  skillRatings?: SkillRatings;
}

export interface SkillRatings {
  pitch: number;
  rhythm: number;
  technique: number;
  expression: number;
  theory: number;
  sightReading: number;
}

export interface StudentSkillProgress {
  id: string;
  studentId: string;
  skillName: string;
  skillCategory: string;
  currentLevel: number;
  maxLevel: number;
  totalSessions: number;
  lastImprovement: number;
  lastUpdated: string;
  history: SkillHistoryEntry[];
}

export interface SkillHistoryEntry {
  date: string;
  feedbackId: string;
  previousLevel: number;
  newLevel: number;
  improvement: number;
}

export interface LearningGoal {
  id: string;
  studentId: string;
  skillName: string;
  targetLevel: number;
  currentLevel: number;
  deadline: string;
  status: 'in_progress' | 'completed' | 'overdue';
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  hours: number;
  date: string;
  status: 'paid' | 'pending';
  description: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  receiverId: string;
  receiverRole: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Material {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'audio' | 'sheet';
  category: string;
  level: string;
  description: string;
  fileUrl?: string;
  filename: string;
  size: string;
  uploadedBy: string;
  uploadDate: string;
}

export interface LeaveRequest {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  type: 'leave' | 'reschedule';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  preferredDate?: string;
  preferredTime?: string;
  processedBy?: string;
  processedDate?: string;
  response?: string;
}

export interface StudentProgress {
  id: string;
  studentId: string;
  skillName: string;
  skillCategory: string;
  level: number;
  maxLevel: number;
  notes: string;
  updatedAt: string;
}

export interface LearningGoal {
  id: string;
  studentId: string;
  skillName: string;
  targetLevel: number;
  currentLevel: number;
  deadline: string;
  status: 'in_progress' | 'completed' | 'overdue';
  createdAt: string;
}

export interface PracticeRecord {
  id: string;
  studentId: string;
  date: string;
  duration: number;
  pieces: string[];
  notes: string;
}

export interface Homework {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'reviewed';
  submittedAt?: string;
  submittedContent?: string;
  submittedFiles?: string[];
  reviewComment?: string;
  rating?: number;
  reviewedAt?: string;
  createdAt: string;
}
