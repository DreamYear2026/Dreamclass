import { Student, Course, Attendance, Feedback, Payment, Message, Notification, Teacher, User, Material, HoursChangeRecord, Homework, LeaveRequest, Campus } from '../types';

const handleResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json();
};

export const api = {
  async login(username: string, password: string): Promise<User> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse(res);
  },

  async logout(): Promise<void> {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    await handleResponse(res);
  },

  async getCurrentUser(): Promise<User | null> {
    const res = await fetch('/api/auth/me');
    if (res.status === 401) return null;
    return handleResponse(res);
  },
  async getStudents(): Promise<Student[]> {
    const res = await fetch('/api/students');
    return handleResponse(res);
  },

  async getStudent(id: string): Promise<Student> {
    const res = await fetch(`/api/students/${id}`);
    return handleResponse(res);
  },

  async addStudent(student: Omit<Student, 'id'>): Promise<Student> {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    return handleResponse(res);
  },

  async updateStudent(id: string, student: Partial<Student>): Promise<void> {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student),
    });
    await handleResponse(res);
  },

  async deleteStudent(id: string): Promise<void> {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  async changeStudentHours(id: string, changeAmount: number, reason: string): Promise<{ previousHours: number; newHours: number; changeAmount: number }> {
    const res = await fetch(`/api/students/${id}/hours-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changeAmount, reason }),
    });
    return handleResponse(res);
  },

  async getStudentHoursHistory(id: string): Promise<HoursChangeRecord[]> {
    const res = await fetch(`/api/students/${id}/hours-history`);
    return handleResponse(res);
  },

  async batchDeleteStudents(ids: string[]): Promise<{ deletedCount: number }> {
    const res = await fetch('/api/students/batch-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    return handleResponse(res);
  },

  async getTeachers(): Promise<Teacher[]> {
    const res = await fetch('/api/teachers');
    return handleResponse(res);
  },

  async getTeacher(id: string): Promise<Teacher> {
    const res = await fetch(`/api/teachers/${id}`);
    return handleResponse(res);
  },

  async addTeacher(teacher: Omit<Teacher, 'id'>): Promise<Teacher> {
    const res = await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacher),
    });
    return handleResponse(res);
  },

  async updateTeacher(id: string, teacher: Partial<Teacher>): Promise<void> {
    const res = await fetch(`/api/teachers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teacher),
    });
    await handleResponse(res);
  },

  async deleteTeacher(id: string): Promise<void> {
    const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  async getCourses(): Promise<Course[]> {
    const res = await fetch('/api/courses');
    return handleResponse(res);
  },

  async getCourse(id: string): Promise<Course> {
    const res = await fetch(`/api/courses/${id}`);
    return handleResponse(res);
  },

  async addCourse(course: Omit<Course, 'id' | 'status'>): Promise<Course> {
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
    return handleResponse(res);
  },

  async addCoursesBatch(courses: Omit<Course, 'id' | 'status'>[]): Promise<void> {
    const res = await fetch('/api/courses/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courses),
    });
    await handleResponse(res);
  },

  async updateCourseStatus(id: string, status: string): Promise<void> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await handleResponse(res);
  },

  async updateCourse(id: string, course: Partial<Omit<Course, 'id' | 'status' | 'studentId' | 'studentName'>>): Promise<void> {
    const res = await fetch(`/api/courses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(course),
    });
    await handleResponse(res);
  },

  async deleteCourse(id: string): Promise<void> {
    const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  async markAttendance(attendance: { courseId: string, studentId: string, status: string, date: string }): Promise<void> {
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attendance),
    });
    await handleResponse(res);
  },

  async getAttendanceByStudent(studentId: string): Promise<Attendance[]> {
    const res = await fetch(`/api/attendance/${studentId}`);
    return handleResponse(res);
  },

  async getFeedbacks(params?: { studentId?: string, teacherId?: string }): Promise<Feedback[]> {
    const query = new URLSearchParams();
    if (params?.studentId) query.set('studentId', params.studentId);
    if (params?.teacherId) query.set('teacherId', params.teacherId);
    const res = await fetch(`/api/feedbacks?${query.toString()}`);
    return handleResponse(res);
  },

  async addFeedback(feedback: Omit<Feedback, 'id' | 'date'>): Promise<Feedback> {
    const res = await fetch('/api/feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    });
    return handleResponse(res);
  },

  async getPayments(studentId?: string): Promise<Payment[]> {
    const query = studentId ? `?studentId=${studentId}` : '';
    const res = await fetch(`/api/payments${query}`);
    return handleResponse(res);
  },

  async addPayment(payment: Omit<Payment, 'id' | 'date' | 'status'>): Promise<Payment> {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    return handleResponse(res);
  },

  async getMessages(userId: string, role: string): Promise<Message[]> {
    const res = await fetch(`/api/messages?userId=${userId}&role=${role}`);
    return handleResponse(res);
  },

  async sendMessage(message: Omit<Message, 'id' | 'timestamp' | 'read'>): Promise<Message> {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });
    return handleResponse(res);
  },

  async markMessageRead(id: string): Promise<void> {
    const res = await fetch(`/api/messages/${id}/read`, { method: 'PATCH' });
    await handleResponse(res);
  },

  async getNotifications(userId: string): Promise<Notification[]> {
    const res = await fetch(`/api/notifications/${userId}`);
    return handleResponse(res);
  },

  async addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Promise<Notification> {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: string): Promise<void> {
    const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    await handleResponse(res);
  },

  async getMaterials(): Promise<Material[]> {
    const res = await fetch('/api/materials');
    return handleResponse(res);
  },

  async addMaterial(material: Omit<Material, 'id' | 'uploadDate'>): Promise<Material> {
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(material),
    });
    return handleResponse(res);
  },

  async deleteMaterial(id: string): Promise<void> {
    const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' });
    await handleResponse(res);
  },

  async updateCurrentUser(data: Partial<User>): Promise<User> {
    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const res = await fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    await handleResponse(res);
  },

  async getCampuses(): Promise<Campus[]> {
    const res = await fetch('/api/campuses');
    return handleResponse(res);
  },

  async getHomeworks(): Promise<Homework[]> {
    const res = await fetch('/api/homeworks');
    return handleResponse(res);
  },

  async getLeaveRequests(): Promise<LeaveRequest[]> {
    const res = await fetch('/api/leave-requests');
    return handleResponse(res);
  },

  async getBackup(): Promise<any> {
    const res = await fetch('/api/backup');
    return handleResponse(res);
  },

  async restoreBackup(backupData: any): Promise<void> {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupData),
    });
    return handleResponse(res);
  },

  async getUsers(): Promise<User[]> {
    const res = await fetch('/api/users');
    return handleResponse(res);
  },

  async addUser(user: Omit<User, 'id'> & { password: string }): Promise<User> {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return handleResponse(res);
  },

  async updateUser(id: string, user: Partial<User> & { password?: string }): Promise<void> {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return handleResponse(res);
  },

  async deleteUser(id: string): Promise<void> {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    return handleResponse(res);
  },
};
