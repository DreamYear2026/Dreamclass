import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Student } from '../types';

export interface ImportStudent extends Omit<Student, 'id' | 'createdAt' | 'updatedAt'> {
  tags?: string[];
}

export interface ImportResult {
  success: ImportStudent[];
  errors: { row: number; error: string; data: any }[];
  total: number;
}

export const parseCSV = async (file: File): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedData = results.data as any[];
        const result = validateAndTransformData(parsedData);
        resolve(result);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const parseExcel = (file: File): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const parsedData = XLSX.utils.sheet_to_json(worksheet);
        const result = validateAndTransformData(parsedData);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => {
      reject(error);
    };
    reader.readAsArrayBuffer(file);
  });
};

const validateAndTransformData = (data: any[]): ImportResult => {
  const success: ImportStudent[] = [];
  const errors: { row: number; error: string; data: any }[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2;
    try {
      const student = transformRowToStudent(row);
      validateStudent(student);
      success.push(student);
    } catch (error) {
      errors.push({
        row: rowNumber,
        error: error instanceof Error ? error.message : '未知错误',
        data: row,
      });
    }
  });

  return {
    success,
    errors,
    total: data.length,
  };
};

const transformRowToStudent = (row: any): ImportStudent => {
  const student: ImportStudent = {
    name: String(row.name || row.姓名 || ''),
    age: parseInt(row.age || row.年龄) || 8,
    level: String(row.level || row.级别 || 'Beginner'),
    parentName: String(row.parentName || row.家长姓名 || ''),
    parentPhone: String(row.parentPhone || row.联系电话 || ''),
    remainingHours: parseInt(row.remainingHours || row.课时 || row.初始课时) || 10,
    avatar: row.avatar ? String(row.avatar) : undefined,
    userId: row.userId ? String(row.userId) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    status: (row.status || row.状态) as any || 'active',
    campusId: row.campusId ? String(row.campusId) : undefined,
  };

  if (row.tags || row.标签) {
    const tagsStr = String(row.tags || row.标签);
    student.tags = tagsStr.split(/[,，;；\s]+/).filter(t => t.trim());
  }

  return student;
};

const validateStudent = (student: ImportStudent): void => {
  const errors: string[] = [];

  if (!student.name.trim()) {
    errors.push('学员姓名不能为空');
  }

  if (!student.parentName.trim()) {
    errors.push('家长姓名不能为空');
  }

  if (!student.parentPhone.trim()) {
    errors.push('联系电话不能为空');
  }

  if (!/^[\d\-]+$/.test(student.parentPhone)) {
    errors.push('电话格式不正确');
  }

  if (student.age < 3 || student.age > 18) {
    errors.push('年龄应在3-18岁之间');
  }

  if (student.remainingHours < 0) {
    errors.push('课时数不能为负数');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
};

export const downloadTemplate = () => {
  const templateData = [
    {
      姓名: '张三',
      年龄: 8,
      级别: 'Beginner',
      家长姓名: '张父',
      联系电话: '138-0013-8000',
      初始课时: 10,
      状态: 'active',
      标签: '钢琴,启蒙',
    },
    {
      姓名: '李四',
      年龄: 10,
      级别: 'Intermediate',
      家长姓名: '李母',
      联系电话: '139-0013-9000',
      初始课时: 20,
      状态: 'active',
      标签: '小提琴,进阶',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '学员导入模板');

  const colWidths = [
    { wch: 15 },
    { wch: 8 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 10 },
    { wch: 20 },
  ];
  worksheet['!cols'] = colWidths;

  XLSX.writeFile(workbook, '学员导入模板.xlsx');
};
