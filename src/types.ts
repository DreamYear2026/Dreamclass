export type Role = 'super_admin' | 'admin' | 'parent' | 'teacher';
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
  permissions?: string[];
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
  userId?: string | null;
  username?: string;
  name: string;
  phone: string;
  email: string;
  specialization: string;
  avatar?: string;
  status: 'active' | 'inactive';
  campusId?: string | null;
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
  campusId?: string | null;
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
  title: string;
  description?: string;
  targetDate?: string;
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

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: 'new' | 'contacted' | 'trial' | 'converted' | 'lost';
  notes: string;
  createdAt: string;
  nextFollowUp?: string;
  trialDate?: string;
  studentId?: string;
  age?: number;
  email?: string;
  address?: string;
  interests?: string[];
  assignedTo?: string;
  assignedName?: string;
  tags?: string[];
  lastContacted?: string;
  followUpCount?: number;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  type: 'discount' | 'referral' | 'promotion' | 'event' | 'seasonal';
  status: 'draft' | 'active' | 'paused' | 'completed';
  description: string;
  startDate: string;
  endDate: string;
  targetAudience?: string;
  budget?: number;
  conversionGoal?: number;
  actualConversions?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_trial' | 'free_lesson';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  status: 'active' | 'expired' | 'used' | 'inactive';
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usedCount?: number;
  applicableCourses?: string[];
  campaignId?: string;
  createdBy: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerPhone: string;
  referredName: string;
  referredPhone: string;
  status: 'pending' | 'registered' | 'paid' | 'completed';
  rewardType: 'discount' | 'free_lesson' | 'cash';
  rewardValue: number;
  rewardClaimed?: boolean;
  leadId?: string;
  studentId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  type: 'call' | 'sms' | 'wechat' | 'email' | 'visit';
  content: string;
  result: 'scheduled' | 'interested' | 'not_interested' | 'no_answer' | 'call_back';
  scheduledDate?: string;
  createdBy: string;
  createdAt: string;
}

export interface SalesFunnelStage {
  id: string;
  name: string;
  order: number;
  leadCount: number;
  conversionRate: number;
  color: string;
}

export interface ChannelStats {
  source: string;
  leadCount: number;
  convertedCount: number;
  conversionRate: number;
  avgDaysToConvert: number;
}

export interface SalaryRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  year: number;
  month: number;
  baseSalary: number;
  hourlyRate: number;
  totalHours: number;
  hourlySalary: number;
  performanceBonus: number;
  attendanceBonus: number;
  retentionBonus: number;
  otherBonus: number;
  totalBonus: number;
  taxDeduction: number;
  insuranceDeduction: number;
  otherDeduction: number;
  totalDeduction: number;
  netSalary: number;
  status: 'draft' | 'confirmed' | 'paid';
  paidAt?: string;
  confirmedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryAdjustment {
  id: string;
  teacherId: string;
  teacherName: string;
  adjustmentType: 'base_salary' | 'hourly_rate' | 'bonus';
  oldValue: number;
  newValue: number;
  changeAmount: number;
  reason: string;
  effectiveDate: string;
  createdBy: string;
  createdAt: string;
}

export interface TeacherSalaryConfig {
  id: string;
  teacherId: string;
  teacherName: string;
  baseSalary: number;
  hourlyRate: number;
  performanceBonusThreshold: number;
  performanceBonusAmount: number;
  attendanceBonusAmount: number;
  retentionBonusRate: number;
  taxRate: number;
  insuranceRate: number;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
}
