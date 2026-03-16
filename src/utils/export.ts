import { unparse } from 'papaparse';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type JsPDFWithAutoTable = jsPDF & {
  getNumberOfPages: () => number;
  lastAutoTable: { finalY: number };
};

export const exportToCSV = (data: any[], filename: string) => {
  const csv = unparse(data);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
  }));
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportMultipleSheetsToExcel = (
  sheets: { name: string; data: any[] }[],
  filename: string
) => {
  const workbook = XLSX.utils.book_new();
  
  sheets.forEach(({ name, data }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map(key => ({
      wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
    }));
    worksheet['!cols'] = colWidths;
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

interface PDFColumn {
  header: string;
  dataKey: string;
  width?: number;
}

interface PDFOptions {
  title: string;
  subtitle?: string;
  columns: PDFColumn[];
  data: any[];
  filename: string;
  orientation?: 'portrait' | 'landscape';
}

export const exportToPDF = (options: PDFOptions) => {
  const { title, subtitle, columns, data, filename, orientation = 'portrait' } = options;
  
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  }) as JsPDFWithAutoTable;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 28);
    doc.setTextColor(0);
  }
  
  const tableData = data.map(row => 
    columns.map(col => String(row[col.dataKey] ?? ''))
  );
  
  autoTable(doc, {
    head: [columns.map(col => col.header)],
    body: tableData,
    startY: subtitle ? 35 : 25,
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250],
    },
    margin: { top: 10, left: 14, right: 14 },
  });
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`${filename}.pdf`);
};

interface ReportOptions {
  title: string;
  period?: string;
  sections: {
    title: string;
    columns: PDFColumn[];
    data: any[];
  }[];
  filename: string;
}

export const exportReportToPDF = (options: ReportOptions) => {
  const { title, period, sections, filename } = options;
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as JsPDFWithAutoTable;
  
  let currentY = 20;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229);
  doc.text(title, 14, currentY);
  currentY += 10;
  
  if (period) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(period, 14, currentY);
    currentY += 8;
  }
  
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(0.5);
  doc.line(14, currentY, 196, currentY);
  currentY += 10;
  
  sections.forEach((section, index) => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(section.title, 14, currentY);
    currentY += 6;
    
    const tableData = section.data.map(row => 
      section.columns.map(col => String(row[col.dataKey] ?? ''))
    );
    
    autoTable(doc, {
      head: [section.columns.map(col => col.header)],
      body: tableData,
      startY: currentY,
      styles: {
        fontSize: 9,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250],
      },
      margin: { left: 14, right: 14 },
    });
    
    currentY = doc.lastAutoTable.finalY + 15;
  });
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      new Date().toLocaleDateString('zh-CN'),
      doc.internal.pageSize.getWidth() - 14,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );
  }
  
  doc.save(`${filename}.pdf`);
};

export const exportStudentReport = (student: any, courses: any[], filename: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  let currentY = 20;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(79, 70, 229);
  doc.text('学员成长报告', 14, currentY);
  currentY += 15;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(0);
  
  const info = [
    ['学员姓名', student.name],
    ['联系电话', student.phone || '-'],
    ['剩余课时', String(student.remainingHours || 0)],
    ['入学日期', student.createdAt ? new Date(student.createdAt).toLocaleDateString('zh-CN') : '-'],
  ];
  
  info.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 50, currentY);
    currentY += 7;
  });
  
  currentY += 5;
  doc.setDrawColor(200);
  doc.line(14, currentY, 196, currentY);
  currentY += 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('课程记录', 14, currentY);
  currentY += 8;
  
  if (courses.length > 0) {
    autoTable(doc, {
      head: [['日期', '课程', '教师', '状态']],
      body: courses.map(c => [
        c.date,
        c.title,
        c.teacherName,
        c.status === 'completed' ? '已完成' : c.status === 'cancelled' ? '已取消' : '已安排'
      ]),
      startY: currentY,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('暂无课程记录', 14, currentY);
  }
  
  doc.save(`${filename}.pdf`);
};
