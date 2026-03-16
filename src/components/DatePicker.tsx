import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, X, Calendar } from 'lucide-react';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  showTime?: boolean;
  hour?: number;
  minute?: number;
  onTimeChange?: (hour: number, minute: number) => void;
}

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const WEEKDAYS_COLORS = ['text-red-500', 'text-gray-700', 'text-gray-700', 'text-gray-700', 'text-gray-700', 'text-gray-700', 'text-blue-500'];

function generateYears(minDate?: Date, maxDate?: Date) {
  const currentYear = new Date().getFullYear();
  const startYear = minDate?.getFullYear() || currentYear - 10;
  const endYear = maxDate?.getFullYear() || currentYear + 10;
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
}

function generateMonths() {
  return [
    { value: 0, label: '1月' },
    { value: 1, label: '2月' },
    { value: 2, label: '3月' },
    { value: 3, label: '4月' },
    { value: 4, label: '5月' },
    { value: 5, label: '6月' },
    { value: 6, label: '7月' },
    { value: 7, label: '8月' },
    { value: 8, label: '9月' },
    { value: 9, label: '10月' },
    { value: 10, label: '11月' },
    { value: 11, label: '12月' },
  ];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function generateDays(year: number, month: number) {
  const daysInMonth = getDaysInMonth(year, month);
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
}

function generateHours() {
  return Array.from({ length: 24 }, (_, i) => i);
}

function generateMinutes() {
  return Array.from({ length: 60 }, (_, i) => i);
}

function getWeekday(year: number, month: number, day: number): number {
  return new Date(year, month, day).getDay();
}

function isToday(year: number, month: number, day: number): boolean {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
}

interface WheelPickerProps {
  items: (string | number | { value: number; label: string })[];
  value: number;
  onChange: (value: number) => void;
  width?: number;
  label?: string;
}

function WheelPicker({ items, value, onChange, width = 80, label }: WheelPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const animationRef = useRef<number | null>(null);

  const getItemLabel = (item: any) => {
    if (typeof item === 'object' && item.label) return item.label;
    return String(item).padStart(2, '0');
  };

  const getItemValue = (item: any) => {
    if (typeof item === 'object' && item.value !== undefined) return item.value;
    return item;
  };

  const currentIndex = items.findIndex(item => getItemValue(item) === value);
  const offset = currentIndex >= 0 ? -currentIndex * ITEM_HEIGHT : 0;

  const handleStart = (clientY: number) => {
    setIsDragging(true);
    startY.current = clientY;
    startOffset.current = offset;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const handleMove = (clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    
    const deltaY = clientY - startY.current;
    const newOffset = startOffset.current + deltaY;
    
    containerRef.current.style.transform = `translateY(${newOffset + ITEM_HEIGHT * 2}px)`;
  };

  const handleEnd = (clientY: number) => {
    if (!isDragging || !containerRef.current) return;
    
    setIsDragging(false);
    
    const deltaY = clientY - startY.current;
    const movedItems = Math.round(deltaY / ITEM_HEIGHT);
    let newIndex = -Math.round((startOffset.current + movedItems * ITEM_HEIGHT) / ITEM_HEIGHT);
    
    newIndex = Math.max(0, Math.min(items.length - 1, newIndex));
    
    const newValue = getItemValue(items[newIndex]);
    onChange(newValue);
  };

  useEffect(() => {
    if (!isDragging && containerRef.current) {
      containerRef.current.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)';
      containerRef.current.style.transform = `translateY(${offset + ITEM_HEIGHT * 2}px)`;
      
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.style.transition = '';
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [offset, isDragging]);

  return (
    <div className="relative overflow-hidden" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, width }}>
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.9) 100%)',
          zIndex: 10,
        }}
      />
      <div 
        className="absolute left-0 right-0 border-t border-b border-indigo-200 bg-indigo-50/30"
        style={{ 
          top: ITEM_HEIGHT * 2, 
          height: ITEM_HEIGHT,
          zIndex: 5,
        }}
      />
      <div
        ref={containerRef}
        className="absolute left-0 right-0 touch-pan-y"
        style={{ 
          transform: `translateY(${offset + ITEM_HEIGHT * 2}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          handleStart(e.clientY);
        }}
        onMouseMove={(e) => handleMove(e.clientY)}
        onMouseUp={(e) => handleEnd(e.clientY)}
        onMouseLeave={(e) => {
          if (isDragging) handleEnd(e.clientY);
        }}
        onTouchStart={(e) => handleStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientY)}
        onTouchEnd={(e) => handleEnd(e.changedTouches[0].clientY)}
      >
        {items.map((item, index) => {
          const itemValue = getItemValue(item);
          const isSelected = itemValue === value;
          
          return (
            <div
              key={index}
              className={`flex items-center justify-center select-none transition-all duration-150 ${
                isSelected ? 'text-indigo-600 font-semibold text-lg' : 'text-gray-400 text-base'
              }`}
              style={{ height: ITEM_HEIGHT }}
              onClick={() => onChange(itemValue)}
            >
              {getItemLabel(item)}{label && isSelected && <span className="ml-1 text-sm text-gray-400">{label}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  showTime = false,
  hour = 10,
  minute = 0,
  onTimeChange,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState({
    year: value.getFullYear(),
    month: value.getMonth(),
    day: value.getDate(),
    hour: hour,
    minute: minute,
  });

  useEffect(() => {
    setTempDate({
      year: value.getFullYear(),
      month: value.getMonth(),
      day: value.getDate(),
      hour: hour,
      minute: minute,
    });
  }, [value, hour, minute]);

  const years = generateYears(minDate, maxDate);
  const months = generateMonths();
  const days = generateDays(tempDate.year, tempDate.month);
  const hours = generateHours();
  const minutes = generateMinutes();

  const weekday = useMemo(() => getWeekday(tempDate.year, tempDate.month, tempDate.day), [tempDate.year, tempDate.month, tempDate.day]);
  const todayCheck = useMemo(() => isToday(tempDate.year, tempDate.month, tempDate.day), [tempDate.year, tempDate.month, tempDate.day]);

  const handleConfirm = () => {
    const newDate = new Date(tempDate.year, tempDate.month, tempDate.day);
    onChange(newDate);
    if (showTime && onTimeChange) {
      onTimeChange(tempDate.hour, tempDate.minute);
    }
    setIsOpen(false);
  };

  const formatDate = () => {
    const dateStr = `${value.getFullYear()}年${value.getMonth() + 1}月${value.getDate()}日`;
    if (showTime) {
      return `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
    return dateStr;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-left bg-white hover:border-gray-300 transition"
      >
        {formatDate()}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl max-h-[85vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                取消
              </button>
              <span className="font-semibold text-gray-900">
                {showTime ? '选择日期和时间' : '选择日期'}
              </span>
              <button
                onClick={handleConfirm}
                className="text-indigo-600 hover:text-indigo-700 font-medium transition"
              >
                确定
              </button>
            </div>

            <div className="px-4 pt-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 mb-4">
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">
                    {tempDate.year}年{tempDate.month + 1}月{tempDate.day}日
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-2xl font-bold ${WEEKDAYS_COLORS[weekday]}`}>
                      {WEEKDAYS[weekday]}
                    </span>
                    {todayCheck && (
                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                        今天
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-1 bg-gray-50 rounded-xl p-2">
                <WheelPicker
                  items={years}
                  value={tempDate.year}
                  onChange={(year) => setTempDate(prev => ({ ...prev, year }))}
                  width={90}
                  label="年"
                />
                <WheelPicker
                  items={months}
                  value={tempDate.month}
                  onChange={(month) => setTempDate(prev => ({ ...prev, month }))}
                  width={70}
                  label=""
                />
                <WheelPicker
                  items={days}
                  value={tempDate.day}
                  onChange={(day) => setTempDate(prev => ({ ...prev, day }))}
                  width={70}
                  label="日"
                />
              </div>

              {showTime && (
                <>
                  <div className="mt-4 mb-2 text-center text-sm text-gray-500">时间</div>
                  <div className="flex justify-center gap-1 bg-gray-50 rounded-xl p-2">
                    <WheelPicker
                      items={hours}
                      value={tempDate.hour}
                      onChange={(h) => setTempDate(prev => ({ ...prev, hour: h }))}
                      width={70}
                      label="时"
                    />
                    <div className="flex items-center text-2xl text-gray-400 font-light">:</div>
                    <WheelPicker
                      items={minutes}
                      value={tempDate.minute}
                      onChange={(m) => setTempDate(prev => ({ ...prev, minute: m }))}
                      width={70}
                      label="分"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  );
}

export function DateRangePicker({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: {
  startDate: Date;
  endDate: Date;
  onStartChange: (date: Date) => void;
  onEndChange: (date: Date) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState({
    year: startDate.getFullYear(),
    month: startDate.getMonth(),
    day: startDate.getDate(),
  });
  const [tempEnd, setTempEnd] = useState({
    year: endDate.getFullYear(),
    month: endDate.getMonth(),
    day: endDate.getDate(),
  });
  const [activeTab, setActiveTab] = useState<'start' | 'end'>('start');

  useEffect(() => {
    setTempStart({
      year: startDate.getFullYear(),
      month: startDate.getMonth(),
      day: startDate.getDate(),
    });
    setTempEnd({
      year: endDate.getFullYear(),
      month: endDate.getMonth(),
      day: endDate.getDate(),
    });
  }, [startDate, endDate]);

  const years = generateYears();
  const months = generateMonths();
  const startDays = generateDays(tempStart.year, tempStart.month);
  const endDays = generateDays(tempEnd.year, tempEnd.month);

  const handleConfirm = () => {
    onStartChange(new Date(tempStart.year, tempStart.month, tempStart.day));
    onEndChange(new Date(tempEnd.year, tempEnd.month, tempEnd.day));
    setIsOpen(false);
  };

  const formatRange = () => {
    return `${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${endDate.getMonth() + 1}月${endDate.getDate()}日`;
  };

  const currentTemp = activeTab === 'start' ? tempStart : tempEnd;
  const currentDays = activeTab === 'start' ? startDays : endDays;
  const weekday = getWeekday(currentTemp.year, currentTemp.month, currentTemp.day);
  const todayCheck = isToday(currentTemp.year, currentTemp.month, currentTemp.day);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white hover:border-gray-300 transition text-sm"
      >
        {formatRange()}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                取消
              </button>
              <span className="font-semibold text-gray-900">选择日期范围</span>
              <button
                onClick={handleConfirm}
                className="text-indigo-600 hover:text-indigo-700 font-medium transition"
              >
                确定
              </button>
            </div>

            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setActiveTab('start')}
                className={`flex-1 py-3 text-sm font-medium transition ${
                  activeTab === 'start'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500'
                }`}
              >
                开始日期
              </button>
              <button
                onClick={() => setActiveTab('end')}
                className={`flex-1 py-3 text-sm font-medium transition ${
                  activeTab === 'end'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500'
                }`}
              >
                结束日期
              </button>
            </div>

            <div className="px-4 pt-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 mb-4">
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">
                    {currentTemp.year}年{currentTemp.month + 1}月{currentTemp.day}日
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-2xl font-bold ${WEEKDAYS_COLORS[weekday]}`}>
                      {WEEKDAYS[weekday]}
                    </span>
                    {todayCheck && (
                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                        今天
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-1 bg-gray-50 rounded-xl p-2">
                <WheelPicker
                  items={years}
                  value={currentTemp.year}
                  onChange={(year) => {
                    if (activeTab === 'start') {
                      setTempStart(prev => ({ ...prev, year }));
                    } else {
                      setTempEnd(prev => ({ ...prev, year }));
                    }
                  }}
                  width={90}
                  label="年"
                />
                <WheelPicker
                  items={months}
                  value={currentTemp.month}
                  onChange={(month) => {
                    if (activeTab === 'start') {
                      setTempStart(prev => ({ ...prev, month }));
                    } else {
                      setTempEnd(prev => ({ ...prev, month }));
                    }
                  }}
                  width={70}
                  label=""
                />
                <WheelPicker
                  items={currentDays}
                  value={currentTemp.day}
                  onChange={(day) => {
                    if (activeTab === 'start') {
                      setTempStart(prev => ({ ...prev, day }));
                    } else {
                      setTempEnd(prev => ({ ...prev, day }));
                    }
                  }}
                  width={70}
                  label="日"
                />
              </div>
            </div>

            <div className="h-6" />
          </div>
        </div>
      )}
    </>
  );
}
