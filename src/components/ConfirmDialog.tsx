import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, LogOut, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const icons = {
  danger: Trash2,
  warning: AlertTriangle,
  info: AlertTriangle,
};

const colors = {
  danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  warning: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
  info: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500',
};

const iconColors = {
  danger: 'bg-red-100 text-red-600',
  warning: 'bg-yellow-100 text-yellow-600',
  info: 'bg-indigo-100 text-indigo-600',
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const Icon = icons[type];
  const dialogId = 'confirm-dialog';
  const titleId = 'confirm-dialog-title';
  const messageId = 'confirm-dialog-message';

  useEffect(() => {
    if (isOpen) {
      cancelButtonRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      id={dialogId}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          onClick={() => !loading && onClose()}
          aria-hidden="true"
        />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all">
          <div className="flex items-start">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${iconColors[type]}`}>
              <Icon className="w-5 h-5" aria-hidden="true" />
            </div>
            
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900" id={titleId}>{title}</h3>
              <p className="mt-2 text-sm text-gray-500" id={messageId}>{message}</p>
            </div>
            
            <button
              onClick={onClose}
              disabled={loading}
              className="ml-4 text-gray-400 hover:text-gray-500 disabled:opacity-50"
              aria-label="关闭对话框"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${colors[type]}`}
            >
              {loading ? '处理中...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
