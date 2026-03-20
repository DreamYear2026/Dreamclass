import React from 'react';
import { Download } from 'lucide-react';
import { Language } from '../types';

interface BusinessFilterBarProps {
  lang: Language;
  windowDays: 7 | 30 | 90;
  onWindowDaysChange: (days: 7 | 30 | 90) => void;
  status: 'all' | 'paid' | 'pending';
  onStatusChange: (status: 'all' | 'paid' | 'pending') => void;
  onExport: () => void;
  exportLabel?: string;
}

export default function BusinessFilterBar({
  lang,
  windowDays,
  onWindowDaysChange,
  status,
  onStatusChange,
  onExport,
  exportLabel,
}: BusinessFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => onWindowDaysChange(d as 7 | 30 | 90)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                windowDays === d ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {lang === 'zh' ? `近${d}天` : `${d}d`}
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as 'all' | 'paid' | 'pending')}
          className="px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">{lang === 'zh' ? '状态：全部（视图+导出）' : 'Status: all (view+export)'}</option>
          <option value="paid">{lang === 'zh' ? '状态：仅已支付（视图+导出）' : 'Status: paid only (view+export)'}</option>
          <option value="pending">{lang === 'zh' ? '状态：仅待支付（视图+导出）' : 'Status: pending only (view+export)'}</option>
        </select>
      </div>
      <button
        onClick={onExport}
        className="px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        {exportLabel || (lang === 'zh' ? '导出当前校区经营数据' : 'Export Business Data')}
      </button>
    </div>
  );
}
