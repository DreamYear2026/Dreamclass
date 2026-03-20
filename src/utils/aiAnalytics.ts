import { Student, Course, Teacher, Payment, Feedback } from '../types';

export interface StudentProfile {
  id: string;
  name: string;
  age: number;
  level: string;
  tags: string[];
  learningStyle: 'visual' | 'auditory' | 'kinesthetic';
  strengths: string[];
  weaknesses: string[];
  engagementScore: number;
  progressTrend: 'improving' | 'stable' | 'declining';
  attendanceRate: number;
  retentionRisk: 'low' | 'medium' | 'high';
  recommendedCourses: string[];
  personalityTraits: string[];
  parentCommunicationStyle: 'formal' | 'casual' | 'detailed';
}

export interface RetentionPrediction {
  studentId: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  contributingFactors: string[];
  recommendedActions: string[];
  predictedRenewalDate?: string;
  confidence: number;
}

export interface RevenuePrediction {
  period: string;
  predictedRevenue: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  growthRate: number;
  breakdown: {
    newStudents: number;
    renewals: number;
    upsells: number;
  };
  seasonalFactors: string[];
  confidence: number;
}

export interface CourseHotspot {
  courseId: string;
  courseName: string;
  hotScore: number;
  demandTrend: 'rising' | 'stable' | 'falling';
  waitlistCount: number;
  completionRate: number;
  satisfactionScore: number;
  recommendedCapacity: number;
  optimalPricing: number;
}

export const generateStudentProfile = (
  student: Student,
  courses: Course[],
  feedbacks: Feedback[],
  payments: Payment[]
): StudentProfile => {
  const studentCourses = courses.filter(c => c.studentId === student.id);
  const studentFeedbacks = feedbacks.filter(f => f.studentId === student.id);
  const studentPayments = payments.filter(p => p.studentId === student.id);

  const attendanceRate = calculateAttendanceRate(studentCourses);
  const engagementScore = calculateEngagementScore(studentFeedbacks, studentCourses);
  const progressTrend = analyzeProgressTrend(studentFeedbacks);
  const learningStyle = determineLearningStyle(studentFeedbacks);
  const strengths = identifyStrengths(studentFeedbacks);
  const weaknesses = identifyWeaknesses(studentFeedbacks);
  const retentionRisk = assessRetentionRisk(student, studentPayments, attendanceRate);
  const recommendedCourses = recommendCourses(student, studentFeedbacks);

  return {
    id: student.id,
    name: student.name,
    age: student.age,
    level: student.level,
    tags: student.tags || [],
    learningStyle,
    strengths,
    weaknesses,
    engagementScore,
    progressTrend,
    attendanceRate,
    retentionRisk,
    recommendedCourses,
    personalityTraits: generatePersonalityTraits(student, studentFeedbacks),
    parentCommunicationStyle: assessParentCommunicationStyle(student),
  };
};

const calculateAttendanceRate = (courses: Course[]): number => {
  if (courses.length === 0) return 0.8;
  const completedCourses = courses.filter(c => c.status === 'completed');
  return Math.min(1, completedCourses.length / Math.max(1, courses.length));
};

const calculateEngagementScore = (feedbacks: Feedback[], courses: Course[]): number => {
  let score = 50;
  
  if (feedbacks.length > 0) {
    const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
    score += avgRating * 8;
  }
  
  if (courses.length > 5) score += 10;
  if (courses.some(c => c.status === 'completed')) score += 10;
  
  return Math.min(100, Math.max(0, score));
};

const analyzeProgressTrend = (feedbacks: Feedback[]): 'improving' | 'stable' | 'declining' => {
  if (feedbacks.length < 3) return 'stable';
  
  const recentFeedbacks = feedbacks.slice(-5);
  const firstHalf = recentFeedbacks.slice(0, 2);
  const secondHalf = recentFeedbacks.slice(-2);
  
  const firstAvg = firstHalf.reduce((sum, f) => sum + f.rating, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, f) => sum + f.rating, 0) / secondHalf.length;
  
  if (secondAvg > firstAvg + 0.5) return 'improving';
  if (secondAvg < firstAvg - 0.5) return 'declining';
  return 'stable';
};

const determineLearningStyle = (feedbacks: Feedback[]): 'visual' | 'auditory' | 'kinesthetic' => {
  if (feedbacks.length === 0) return 'visual';
  
  const hasTheoryComments = feedbacks.some(f => 
    f.content.toLowerCase().includes('乐理') || f.content.toLowerCase().includes('theory')
  );
  const hasPracticeComments = feedbacks.some(f => 
    f.content.toLowerCase().includes('练习') || f.content.toLowerCase().includes('practice')
  );
  const hasListeningComments = feedbacks.some(f => 
    f.content.toLowerCase().includes('听') || f.content.toLowerCase().includes('listen')
  );
  
  if (hasPracticeComments) return 'kinesthetic';
  if (hasListeningComments) return 'auditory';
  return 'visual';
};

const identifyStrengths = (feedbacks: Feedback[]): string[] => {
  const strengths: string[] = [];
  if (feedbacks.length === 0) return ['学习态度认真'];
  
  const avgRating = feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length;
  
  if (avgRating >= 4) strengths.push('音乐天赋');
  if (feedbacks.some(f => f.skillRatings?.rhythm >= 4)) strengths.push('节奏感好');
  if (feedbacks.some(f => f.skillRatings?.pitch >= 4)) strengths.push('音准优秀');
  if (feedbacks.some(f => f.skillRatings?.technique >= 4)) strengths.push('技巧扎实');
  if (feedbacks.some(f => f.content.includes('认真') || f.content.includes('努力'))) strengths.push('学习刻苦');
  
  return strengths.length > 0 ? strengths : ['学习态度端正'];
};

const identifyWeaknesses = (feedbacks: Feedback[]): string[] => {
  const weaknesses: string[] = [];
  if (feedbacks.length === 0) return ['需要更多练习'];
  
  if (feedbacks.some(f => f.skillRatings?.rhythm < 3)) weaknesses.push('节奏感需要加强');
  if (feedbacks.some(f => f.skillRatings?.pitch < 3)) weaknesses.push('音准需要提升');
  if (feedbacks.some(f => f.skillRatings?.technique < 3)) weaknesses.push('技巧需要练习');
  if (feedbacks.some(f => f.content.includes('紧张') || f.content.includes('怯场'))) weaknesses.push('舞台表现力需要锻炼');
  
  return weaknesses.length > 0 ? weaknesses : ['需要持续练习'];
};

const assessRetentionRisk = (
  student: Student,
  payments: Payment[],
  attendanceRate: number
): 'low' | 'medium' | 'high' => {
  let riskScore = 0;
  
  if (student.remainingHours < 5) riskScore += 30;
  else if (student.remainingHours < 10) riskScore += 15;
  
  if (attendanceRate < 0.6) riskScore += 25;
  else if (attendanceRate < 0.8) riskScore += 10;
  
  if (payments.length === 0) riskScore += 20;
  else if (payments.length < 2) riskScore += 10;
  
  if ((student.status as any) === 'paused') riskScore += 30;
  
  if (riskScore >= 40) return 'high';
  if (riskScore >= 20) return 'medium';
  return 'low';
};

const recommendCourses = (student: Student, feedbacks: Feedback[]): string[] => {
  const recommendations: string[] = [];
  
  if (student.level === '初级') {
    recommendations.push('基础乐理');
    recommendations.push('视唱练耳');
  } else if (student.level === '中级') {
    recommendations.push('乐曲赏析');
    recommendations.push('进阶技巧');
  } else {
    recommendations.push('音乐创作');
    recommendations.push('舞台表演');
  }
  
  if (student.tags?.includes('钢琴')) recommendations.push('钢琴考级辅导');
  if (student.tags?.includes('小提琴')) recommendations.push('小提琴考级辅导');
  
  return recommendations;
};

const generatePersonalityTraits = (student: Student, feedbacks: Feedback[]): string[] => {
  const traits: string[] = [];
  
  if (student.age < 8) traits.push('活泼好动');
  else if (student.age < 12) traits.push('好奇心强');
  else traits.push('自主学习');
  
  if (feedbacks.some(f => f.content.includes('认真') || f.content.includes('专注'))) {
    traits.push('认真专注');
  }
  
  return traits.length > 0 ? traits : ['学习热情高'];
};

const assessParentCommunicationStyle = (student: Student): 'formal' | 'casual' | 'detailed' => {
  if (student.notes?.includes('详细') || student.notes?.includes('具体')) {
    return 'detailed';
  }
  if (student.age < 10) return 'casual';
  return 'formal';
};

export const predictRetention = (
  students: Student[],
  payments: Payment[],
  courses: Course[]
): RetentionPrediction[] => {
  return students.map(student => {
    const studentPayments = payments.filter(p => p.studentId === student.id);
    const studentCourses = courses.filter(c => c.studentId === student.id);
    
    let riskScore = 0;
    const factors: string[] = [];
    
    if (student.remainingHours < 5) {
      riskScore += 40;
      factors.push('课时即将耗尽');
    } else if (student.remainingHours < 10) {
      riskScore += 20;
      factors.push('课时不足一半');
    }
    
    const attendanceRate = calculateAttendanceRate(studentCourses);
    if (attendanceRate < 0.6) {
      riskScore += 30;
      factors.push('出勤率低');
    } else if (attendanceRate < 0.8) {
      riskScore += 15;
      factors.push('出勤率一般');
    }
    
    if (studentPayments.length === 0) {
      riskScore += 20;
      factors.push('无缴费记录');
    }
    
    const riskLevel: 'low' | 'medium' | 'high' = 
      riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';
    
    const actions: string[] = [];
    if (riskLevel === 'high') {
      actions.push('立即联系家长');
      actions.push('提供专属续费优惠');
      actions.push('展示学习成果报告');
    } else if (riskLevel === 'medium') {
      actions.push('温馨提醒续费');
      actions.push('安排学习成果展示课');
    } else {
      actions.push('常规续费提醒');
      actions.push('介绍进阶课程');
    }
    
    return {
      studentId: student.id,
      riskLevel,
      riskScore: Math.min(100, riskScore),
      contributingFactors: factors,
      recommendedActions: actions,
      confidence: 0.75,
    };
  });
};

export const predictRevenue = (
  payments: Payment[],
  historicalData?: { month: string; revenue: number }[]
): RevenuePrediction => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const period = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
  
  let baseRevenue = 0;
  const recentPayments = payments.filter(p => {
    const paymentDate = new Date(p.date);
    const daysDiff = (now.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 90;
  });
  
  if (recentPayments.length > 0) {
    const avgMonthlyRevenue = recentPayments.reduce((sum, p) => sum + p.amount, 0) / 3;
    baseRevenue = avgMonthlyRevenue;
  } else {
    baseRevenue = 50000;
  }
  
  let growthRate = 0.05;
  let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  
  if (historicalData && historicalData.length >= 3) {
    const recent = historicalData.slice(-3);
    const firstMonth = recent[0].revenue;
    const lastMonth = recent[recent.length - 1].revenue;
    growthRate = (lastMonth - firstMonth) / firstMonth;
    
    if (growthRate > 0.05) trend = 'increasing';
    else if (growthRate < -0.05) trend = 'decreasing';
  }
  
  const predictedRevenue = baseRevenue * (1 + growthRate);
  
  return {
    period,
    predictedRevenue: Math.round(predictedRevenue),
    trend,
    growthRate: Math.round(growthRate * 100) / 100,
    breakdown: {
      newStudents: Math.round(predictedRevenue * 0.3),
      renewals: Math.round(predictedRevenue * 0.5),
      upsells: Math.round(predictedRevenue * 0.2),
    },
    seasonalFactors: ['开学季', '假期前'],
    confidence: 0.7,
  };
};

export const analyzeCourseHotspots = (
  courses: Course[],
  teachers: Teacher[]
): CourseHotspot[] => {
  const courseMap = new Map<string, {
    name: string;
    total: number;
    completed: number;
    recentEnrollments: number;
  }>();
  
  const now = new Date();
  
  courses.forEach(course => {
    const existing = courseMap.get(course.title) || {
      name: course.title,
      total: 0,
      completed: 0,
      recentEnrollments: 0,
    };
    
    existing.total++;
    if (course.status === 'completed') existing.completed++;
    
    const courseDate = new Date(course.date);
    const daysDiff = (now.getTime() - courseDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 30) existing.recentEnrollments++;
    
    courseMap.set(course.title, existing);
  });
  
  const hotspots: CourseHotspot[] = [];
  
  courseMap.forEach((data, courseId) => {
    const completionRate = data.total > 0 ? data.completed / data.total : 0.8;
    const demandTrend = data.recentEnrollments > 3 ? 'rising' : 
                       data.recentEnrollments > 0 ? 'stable' : 'falling';
    
    let hotScore = 50;
    if (data.total > 10) hotScore += 20;
    if (completionRate > 0.8) hotScore += 15;
    if (demandTrend === 'rising') hotScore += 15;
    
    hotspots.push({
      courseId,
      courseName: data.name,
      hotScore: Math.min(100, hotScore),
      demandTrend,
      waitlistCount: demandTrend === 'rising' ? Math.floor(data.recentEnrollments * 0.5) : 0,
      completionRate: Math.round(completionRate * 100) / 100,
      satisfactionScore: Math.round(75 + completionRate * 20),
      recommendedCapacity: data.total > 20 ? 30 : data.total > 10 ? 20 : 15,
      optimalPricing: hotScore > 80 ? 300 : hotScore > 60 ? 250 : 200,
    });
  });
  
  return hotspots.sort((a, b) => b.hotScore - a.hotScore);
};
