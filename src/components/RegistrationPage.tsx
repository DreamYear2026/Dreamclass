import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  Plus,
  Calendar,
  BookOpen,
  Clock,
  Gift,
  Percent,
  ChevronRight,
  Package,
  Users,
  FileText,
  AlertCircle,
  Check,
  Trash2,
  Heart,
  DollarSign,
  Sparkles,
} from 'lucide-react';
import { Student, Course, Teacher } from '../types';
import { useToast } from './Toast';
import StudentForm from './StudentForm';

interface RegistrationPageProps {
  lang?: 'en' | 'zh';
  onClose?: () => void;
  initialStudentId?: string;
}

interface FormData {
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  date: string;
  tabType: 'hours' | 'period';
  purchaseHours: number;
  giftHours: number;
  totalAmount: number;
  discountAmount: number;
  validityPeriod: string;
  consumedHours: number;
  otherCharges: OtherCharge[];
  performanceAllocations: PerformanceAllocation[];
  remarks: string;
}

interface OtherCharge {
  id: string;
  name: string;
  amount: number;
}

interface PerformanceAllocation {
  id: string;
  teacherId: string;
  teacherName: string;
  percentage: number;
}

export default function RegistrationPage({ lang = 'zh', onClose, initialStudentId }: RegistrationPageProps) {
  const { showToast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  
  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    studentName: '',
    courseId: '',
    courseName: '',
    date: new Date().toISOString().split('T')[0],
    tabType: 'hours',
    purchaseHours: 0,
    giftHours: 0,
    totalAmount: 0,
    discountAmount: 0,
    validityPeriod: '',
    consumedHours: 0,
    otherCharges: [],
    performanceAllocations: [],
    remarks: '',
  });

  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [showCourseSelector, setShowCourseSelector] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showValidityModal, setShowValidityModal] = useState(false);
  const [showConsumedModal, setShowConsumedModal] = useState(false);
  const [showOtherChargeModal, setShowOtherChargeModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);

  const [tempGiftHours, setTempGiftHours] = useState(0);
  const [tempDiscountAmount, setTempDiscountAmount] = useState(0);
  const [tempValidityDays, setTempValidityDays] = useState(0);
  const [tempConsumedHours, setTempConsumedHours] = useState(0);
  const [tempOtherCharge, setTempOtherCharge] = useState({ name: '', amount: 0 });
  const [tempPerformance, setTempPerformance] = useState({ teacherId: '', percentage: 0 });

  useEffect(() => {
    try {
      const storedStudents = localStorage.getItem('students');
      const storedCourses = localStorage.getItem('courses');
      const storedTeachers = localStorage.getItem('teachers');
      
      if (storedStudents) setStudents(JSON.parse(storedStudents));
      if (storedCourses) setCourses(JSON.parse(storedCourses));
      if (storedTeachers) setTeachers(JSON.parse(storedTeachers));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }, []);

  useEffect(() => {
    if (initialStudentId && students.length > 0) {
      const student = students.find(s => s.id === initialStudentId);
      if (student) {
        setFormData(prev => ({
          ...prev,
          studentId: student.id,
          studentName: student.name,
        }));
      }
    }
  }, [initialStudentId, students]);

  const pricePerHour = useMemo(() => {
    if (formData.purchaseHours <= 0 || formData.totalAmount <= 0) return 0;
    return (formData.totalAmount - formData.discountAmount) / formData.purchaseHours;
  }, [formData.purchaseHours, formData.totalAmount, formData.discountAmount]);

  const subtotal = useMemo(() => {
    const otherChargesTotal = formData.otherCharges.reduce((sum, item) => sum + item.amount, 0);
    return formData.totalAmount - formData.discountAmount + otherChargesTotal;
  }, [formData.totalAmount, formData.discountAmount, formData.otherCharges]);

  const isValid = useMemo(() => {
    return (
      formData.studentId !== '' &&
      formData.courseId !== '' &&
      formData.purchaseHours > 0 &&
      formData.totalAmount > 0
    );
  }, [formData.studentId, formData.courseId, formData.purchaseHours, formData.totalAmount]);

  const handleSelectStudent = (student: Student) => {
    setFormData({
      ...formData,
      studentId: student.id,
      studentName: student.name,
    });
    setShowStudentSelector(false);
  };

  const handleSelectCourse = (course: Course) => {
    setFormData({
      ...formData,
      courseId: course.id,
      courseName: course.title,
    });
    setShowCourseSelector(false);
  };

  const handleConfirmGift = () => {
    setFormData({ ...formData, giftHours: tempGiftHours });
    setShowGiftModal(false);
    showToast(`已设置赠送课时: ${tempGiftHours} 课时`, 'success');
  };

  const handleConfirmDiscount = () => {
    if (tempDiscountAmount > formData.totalAmount) {
      showToast('优惠金额不能大于应收金额', 'error');
      return;
    }
    setFormData({ ...formData, discountAmount: tempDiscountAmount });
    setShowDiscountModal(false);
    showToast(`已设置优惠金额: ¥${tempDiscountAmount}`, 'success');
  };

  const handleConfirmValidity = () => {
    const period = tempValidityDays > 0 ? `${tempValidityDays}天` : '';
    setFormData({ ...formData, validityPeriod: period });
    setShowValidityModal(false);
    showToast(`已设置课时有效期: ${period}`, 'success');
  };

  const handleConfirmConsumed = () => {
    setFormData({ ...formData, consumedHours: tempConsumedHours });
    setShowConsumedModal(false);
    showToast(`已设置已消耗课时: ${tempConsumedHours} 课时`, 'success');
  };

  const handleAddOtherCharge = () => {
    if (!tempOtherCharge.name.trim() || tempOtherCharge.amount <= 0) {
      showToast('请填写完整的收费项信息', 'error');
      return;
    }
    const newCharge: OtherCharge = {
      id: Date.now().toString(),
      name: tempOtherCharge.name,
      amount: tempOtherCharge.amount,
    };
    setFormData({
      ...formData,
      otherCharges: [...formData.otherCharges, newCharge],
    });
    setTempOtherCharge({ name: '', amount: 0 });
    setShowOtherChargeModal(false);
    showToast('收费项已添加', 'success');
  };

  const handleRemoveOtherCharge = (id: string) => {
    setFormData({
      ...formData,
      otherCharges: formData.otherCharges.filter(item => item.id !== id),
    });
  };

  const handleAddPerformance = () => {
    if (!tempPerformance.teacherId || tempPerformance.percentage <= 0) {
      showToast('请填写完整的业绩分配信息', 'error');
      return;
    }
    const totalPercentage = formData.performanceAllocations.reduce((sum, item) => sum + item.percentage, 0);
    if (totalPercentage + tempPerformance.percentage > 100) {
      showToast('业绩分配比例总和不能超过100%', 'error');
      return;
    }
    const teacher = teachers.find(t => t.id === tempPerformance.teacherId);
    const newAllocation: PerformanceAllocation = {
      id: Date.now().toString(),
      teacherId: tempPerformance.teacherId,
      teacherName: teacher?.name || '',
      percentage: tempPerformance.percentage,
    };
    setFormData({
      ...formData,
      performanceAllocations: [...formData.performanceAllocations, newAllocation],
    });
    setTempPerformance({ teacherId: '', percentage: 0 });
    setShowPerformanceModal(false);
    showToast('业绩分配已添加', 'success');
  };

  const handleRemovePerformance = (id: string) => {
    setFormData({
      ...formData,
      performanceAllocations: formData.performanceAllocations.filter(item => item.id !== id),
    });
  };

  const handleSaveNewStudent = async (data: Omit<Student, 'id'>) => {
    const newStudent: Student = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    
    const updatedStudents = [...students, newStudent];
    localStorage.setItem('students', JSON.stringify(updatedStudents));
    setStudents(updatedStudents);
    
    setFormData({
      ...formData,
      studentId: newStudent.id,
      studentName: newStudent.name,
    });
    
    setShowNewStudentForm(false);
    showToast('学员添加成功', 'success');
  };

  const refreshStudents = () => {
    try {
      const storedStudents = localStorage.getItem('students');
      if (storedStudents) setStudents(JSON.parse(storedStudents));
    } catch (error) {
      console.error('Failed to refresh students:', error);
    }
  };

  const handleSubmit = () => {
    if (!isValid) {
      showToast('请填写完整的必填信息', 'error');
      return;
    }

    const submitData = {
      ...formData,
      pricePerHour,
      subtotal,
      createdAt: new Date().toISOString(),
    };

    console.log('提交报名续课数据:', submitData);
    showToast('报名续课办理成功！', 'success');
    
    if (onClose) {
      onClose();
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={onClose}
            className="text-gray-600 text-base font-medium"
          >
            取消
          </button>
          <h1 className="text-base font-bold text-gray-900">办理报名续课</h1>
          <div className="w-12" />
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="p-4 space-y-4">
          {/* 基础信息卡片 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">基础信息</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {/* 报名学员 */}
              <button
                onClick={() => setShowStudentSelector(true)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-orange-500" />
                  </div>
                  <span className="text-gray-700 font-medium">报名学员</span>
                </div>
                <div className="flex items-center gap-2">
                  {formData.studentName ? (
                    <span className="text-gray-900 font-medium">{formData.studentName}</span>
                  ) : (
                    <span className="text-gray-400">选择报名学员</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNewStudentForm(true);
                    }}
                    className="ml-2 px-2 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs rounded-lg flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3 h-3" />
                    新学员
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              {/* 报名课程 */}
              <button
                onClick={() => setShowCourseSelector(true)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-gray-700 font-medium">报名课程</span>
                </div>
                <div className="flex items-center gap-2">
                  {formData.courseName ? (
                    <span className="text-gray-900 font-medium">{formData.courseName}</span>
                  ) : (
                    <span className="text-gray-400">请选择</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>

              {/* 经办日期 */}
              <button
                onClick={() => setShowDatePicker(true)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-purple-500" />
                  </div>
                  <span className="text-gray-700 font-medium">经办日期</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-900">{formData.date}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            </div>
          </div>

          {/* 报名信息核心模块 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-emerald-50 to-teal-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="font-semibold text-gray-800 text-sm">报名信息</span>
                </div>
                <div className="flex bg-white rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setFormData({ ...formData, tabType: 'hours' })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      formData.tabType === 'hours'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    按课时
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, tabType: 'period' })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      formData.tabType === 'period'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    按时段
                  </button>
                </div>
              </div>
            </div>

            {formData.tabType === 'hours' && (
              <div className="divide-y divide-gray-100">
                {/* 购买课时数 */}
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium text-sm">购买课时数</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.purchaseHours || ''}
                        onChange={(e) => setFormData({ ...formData, purchaseHours: parseFloat(e.target.value) || 0 })}
                        className="w-20 text-right px-3 py-2 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
                        placeholder="0"
                        min={0}
                      />
                      <span className="text-gray-500 text-sm">课时</span>
                      <button
                        onClick={() => {
                          setTempGiftHours(formData.giftHours);
                          setShowGiftModal(true);
                        }}
                        className="ml-2 px-2.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs rounded-lg flex items-center gap-1 shadow-sm"
                      >
                        <Gift className="w-3 h-3" />
                        赠送
                      </button>
                    </div>
                  </div>
                  {formData.giftHours > 0 && (
                    <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg w-fit">
                      <Gift className="w-3 h-3" />
                      已赠送 {formData.giftHours} 课时
                    </div>
                  )}
                </div>

                {/* 应收金额 */}
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium text-sm">应收金额</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={formData.totalAmount || ''}
                        onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                        className="w-24 text-right px-3 py-2 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
                        placeholder="0"
                        min={0}
                      />
                      <span className="text-gray-500 text-sm">元</span>
                      <button
                        onClick={() => {
                          setTempDiscountAmount(formData.discountAmount);
                          setShowDiscountModal(true);
                        }}
                        className="ml-2 px-2.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs rounded-lg flex items-center gap-1 shadow-sm"
                      >
                        <Percent className="w-3 h-3" />
                        优惠
                      </button>
                    </div>
                  </div>
                  {formData.discountAmount > 0 && (
                    <div className="mt-2 text-xs text-orange-600 flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg w-fit">
                      <Percent className="w-3 h-3" />
                      已优惠 ¥{formData.discountAmount.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* 实时计算 */}
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-600 font-semibold text-sm">
                      {formatCurrency(pricePerHour)}/课时
                    </span>
                    <span className="text-gray-600 font-medium text-sm">
                      小计 {formatCurrency(formData.totalAmount - formData.discountAmount)}
                    </span>
                  </div>
                </div>

                {/* 底部双按钮 */}
                <div className="px-4 py-3 flex gap-3">
                  <button
                    onClick={() => {
                      setTempValidityDays(0);
                      setShowValidityModal(true);
                    }}
                    className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <Clock className="w-4 h-4" />
                    设置有效期
                  </button>
                  <button
                    onClick={() => {
                      setTempConsumedHours(formData.consumedHours);
                      setShowConsumedModal(true);
                    }}
                    className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-gray-700 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <Clock className="w-4 h-4" />
                    已消耗课时
                  </button>
                </div>

                {formData.validityPeriod && (
                  <div className="px-4 py-2 text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    课时有效期: {formData.validityPeriod}
                  </div>
                )}
                {formData.consumedHours > 0 && (
                  <div className="px-4 py-2 text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    已消耗课时: {formData.consumedHours} 课时
                  </div>
                )}
              </div>
            )}

            {formData.tabType === 'period' && (
              <div className="px-4 py-8 text-center text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>按时段功能开发中...</p>
              </div>
            )}
          </div>

          {/* 扩展功能模块 */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 bg-gradient-to-r from-amber-50 to-orange-50">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-semibold text-gray-800 text-sm">扩展功能</span>
              </div>
            </div>
            <div className="divide-y divide-gray-100">
              {/* 其它收费项 */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 font-medium text-sm">其它收费项</span>
                  </div>
                  <button
                    onClick={() => setShowOtherChargeModal(true)}
                    className="text-emerald-600 text-sm font-medium flex items-center gap-1 hover:text-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>
                {formData.otherCharges.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.otherCharges.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl"
                      >
                        <span className="text-gray-700 text-sm">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 text-sm font-medium">¥{item.amount.toFixed(2)}</span>
                          <button
                            onClick={() => handleRemoveOtherCharge(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-sm text-gray-500 pt-1">
                      收费项合计: <span className="font-medium text-gray-700">¥{formData.otherCharges.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 业绩分配 */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700 font-medium text-sm">业绩分配</span>
                  </div>
                  <button
                    onClick={() => setShowPerformanceModal(true)}
                    className="text-emerald-600 text-sm font-medium flex items-center gap-1 hover:text-emerald-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    添加
                  </button>
                </div>
                {formData.performanceAllocations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {formData.performanceAllocations.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl"
                      >
                        <span className="text-gray-700 text-sm">{item.teacherName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-900 text-sm font-medium">{item.percentage}%</span>
                          <button
                            onClick={() => handleRemovePerformance(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="text-right text-sm text-gray-500 pt-1">
                      分配比例合计: <span className="font-medium text-gray-700">{formData.performanceAllocations.reduce((sum, item) => sum + item.percentage, 0)}%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 备注信息 */}
              <div className="px-4 py-4">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <span className="text-gray-700 font-medium text-sm block mb-2">备注信息</span>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 text-sm resize-none focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
                      placeholder="请输入备注信息..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部提交栏 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-safe shadow-lg">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-gray-500 text-sm">应收合计</span>
          <span className="text-xl font-bold text-gray-900">{formatCurrency(subtotal)}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`w-full py-4 rounded-2xl font-bold text-white text-base transition-all flex items-center justify-center gap-2 ${
            isValid
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-xl hover:shadow-emerald-200 active:scale-[0.98]'
              : 'bg-gray-300 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          立即办理
        </button>
      </div>

      {/* 学员选择弹窗 */}
      {showStudentSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end animate-fade-in" onClick={() => setShowStudentSelector(false)}>
          <div className="bg-white w-full rounded-t-3xl max-h-[70vh] overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">选择学员</h3>
              <button onClick={() => setShowStudentSelector(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
              {students.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>暂无学员数据</p>
                </div>
              ) : (
                students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-medium">
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-400">{student.parentPhone}</p>
                    </div>
                    {formData.studentId === student.id && (
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 课程选择弹窗 */}
      {showCourseSelector && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end animate-fade-in" onClick={() => setShowCourseSelector(false)}>
          <div className="bg-white w-full rounded-t-3xl max-h-[70vh] overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">选择课程</h3>
              <button onClick={() => setShowCourseSelector(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
              {courses.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>暂无课程数据</p>
                </div>
              ) : (
                courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleSelectCourse(course)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center text-white">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">{course.title}</p>
                      <p className="text-xs text-gray-400">{course.teacherName}</p>
                    </div>
                    {formData.courseId === course.id && (
                      <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 日期选择弹窗 */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end animate-fade-in" onClick={() => setShowDatePicker(false)}>
          <div className="bg-white w-full rounded-t-3xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">选择日期</h3>
              <button onClick={() => setShowDatePicker(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
              />
              <button
                onClick={() => setShowDatePicker(false)}
                className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 赠送课时弹窗 */}
      {showGiftModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowGiftModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
              <h3 className="font-bold text-gray-900 text-center">赠送课时</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempGiftHours || ''}
                  onChange={(e) => setTempGiftHours(parseInt(e.target.value) || 0)}
                  className="flex-1 px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:border-emerald-300 focus:bg-white transition-all"
                  placeholder="请输入赠送课时数"
                  min={0}
                />
                <span className="text-gray-500 text-sm">课时</span>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowGiftModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmGift}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 优惠金额弹窗 */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowDiscountModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-amber-50">
              <h3 className="font-bold text-gray-900 text-center">优惠金额</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempDiscountAmount || ''}
                  onChange={(e) => setTempDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:border-orange-300 focus:bg-white transition-all"
                  placeholder="请输入优惠金额"
                  min={0}
                  max={formData.totalAmount}
                />
                <span className="text-gray-500 text-sm">元</span>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowDiscountModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmDiscount}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 课时有效期弹窗 */}
      {showValidityModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowValidityModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-violet-50">
              <h3 className="font-bold text-gray-900 text-center">设置课时有效期</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempValidityDays || ''}
                  onChange={(e) => setTempValidityDays(parseInt(e.target.value) || 0)}
                  className="flex-1 px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:border-purple-300 focus:bg-white transition-all"
                  placeholder="请输入有效天数"
                  min={0}
                />
                <span className="text-gray-500 text-sm">天</span>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowValidityModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmValidity}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 已消耗课时弹窗 */}
      {showConsumedModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowConsumedModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
              <h3 className="font-bold text-gray-900 text-center">已消耗课时数</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tempConsumedHours || ''}
                  onChange={(e) => setTempConsumedHours(parseInt(e.target.value) || 0)}
                  className="flex-1 px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                  placeholder="请输入已消耗课时数"
                  min={0}
                />
                <span className="text-gray-500 text-sm">课时</span>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowConsumedModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmConsumed}
                  className="flex-1 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 其它收费项弹窗 */}
      {showOtherChargeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowOtherChargeModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
              <h3 className="font-bold text-gray-900 text-center">添加收费项</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">收费项名称</label>
                <input
                  type="text"
                  value={tempOtherCharge.name}
                  onChange={(e) => setTempOtherCharge({ ...tempOtherCharge, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:border-amber-300 focus:bg-white transition-all"
                  placeholder="请输入收费项名称"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">金额</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tempOtherCharge.amount || ''}
                    onChange={(e) => setTempOtherCharge({ ...tempOtherCharge, amount: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:border-amber-300 focus:bg-white transition-all"
                    placeholder="请输入金额"
                    min={0}
                  />
                  <span className="text-gray-500 text-sm">元</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowOtherChargeModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleAddOtherCharge}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 业绩分配弹窗 */}
      {showPerformanceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPerformanceModal(false)}>
          <div className="bg-white w-full max-w-sm rounded-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h3 className="font-bold text-gray-900 text-center">添加业绩分配</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">选择教师</label>
                <select
                  value={tempPerformance.teacherId}
                  onChange={(e) => setTempPerformance({ ...tempPerformance, teacherId: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all appearance-none"
                >
                  <option value="">请选择教师</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">分配比例</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tempPerformance.percentage || ''}
                    onChange={(e) => setTempPerformance({ ...tempPerformance, percentage: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-4 py-3 border-2 border-gray-100 bg-gray-50 rounded-xl text-gray-900 focus:outline-none focus:border-indigo-300 focus:bg-white transition-all"
                    placeholder="请输入分配比例"
                    min={0}
                    max={100}
                  />
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPerformanceModal(false)}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleAddPerformance}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新学员表单 */}
      {showNewStudentForm && (
        <StudentForm
          onClose={() => setShowNewStudentForm(false)}
          onSave={handleSaveNewStudent}
        />
      )}
    </div>
  );
}
