import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudents } from '../contexts/AppContext';
import { Student } from '../types';

export function useStudentByUser(): {
  student: Student | null;
  loading: boolean;
  error: string | null;
} {
  const { user } = useAuth();
  const { students, loading, error } = useStudents();

  const student = useMemo(() => {
    if (!user || loading) return null;
    
    if (user.role !== 'parent') return null;
    
    if (user.id) {
      const foundByUserId = students.find(s => s.userId === user.id);
      if (foundByUserId) return foundByUserId;
    }
    
    if (user.phone) {
      const foundByPhone = students.find(s => s.parentPhone === user.phone);
      if (foundByPhone) return foundByPhone;
    }
    
    return null;
  }, [students, user, loading]);

  return { student, loading, error };
}
