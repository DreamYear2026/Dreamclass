import { useState, useCallback, useMemo } from 'react';
import { addDays, addWeeks, subWeeks, startOfWeek, isSameDay, parseISO } from 'date-fns';
import { Course } from '../types';

export function useScheduleNavigation(initialDate: Date = new Date(), view: 'week' | 'day' | 'list') {
  const [currentDate, setCurrentDate] = useState(initialDate);

  const startDate = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const endDate = useMemo(() => addDays(startDate, 6), [startDate]);

  const nextDate = useCallback(() => {
    if (view === 'day') setCurrentDate(prev => addDays(prev, 1));
    else setCurrentDate(prev => addWeeks(prev, 1));
  }, [view]);

  const prevDate = useCallback(() => {
    if (view === 'day') setCurrentDate(prev => addDays(prev, -1));
    else setCurrentDate(prev => subWeeks(prev, 1));
  }, [view]);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  return {
    currentDate,
    startDate,
    endDate,
    nextDate,
    prevDate,
    goToToday,
  };
}

export function useCoursesFilter(courses: Course[], view: 'week' | 'day' | 'list', currentDate: Date, startDate: Date, endDate: Date, statusFilter: string = 'all') {
  const displayedCourses = useMemo(() => {
    return courses.filter(course => {
      const courseDate = parseISO(course.date);
      const dateMatch = view === 'day' 
        ? isSameDay(courseDate, currentDate)
        : courseDate >= startDate && courseDate <= addDays(endDate, 1);
      
      const statusMatch = statusFilter === 'all' || course.status === statusFilter;
      
      return dateMatch && statusMatch;
    });
  }, [courses, view, currentDate, startDate, endDate, statusFilter]);

  const getCoursesForDayAndHour = useCallback((date: Date, hour: number) => {
    return displayedCourses.filter(course => {
      const courseDate = parseISO(course.date);
      const courseHour = parseInt(course.startTime.split(':')[0], 10);
      return isSameDay(courseDate, date) && courseHour === hour;
    });
  }, [displayedCourses]);

  return {
    displayedCourses,
    getCoursesForDayAndHour,
  };
}
