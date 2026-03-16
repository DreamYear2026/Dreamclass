import React, { useState, useRef } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle, Loader2, FileJson, Trash2, X } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';
import { useStudents, useCourses, useTeachers, useCampuses } from '../contexts/AppContext';
import { createBackup, downloadBackup, parseBackupFile, getBackupSummary, BackupData } from '../utils/backup';

export default function BackupRestore() {
  const { showToast } = useToast();
  const { students, refreshStudents } = useStudents();
  const { courses, refreshCourses } = useCourses();
  const { teachers, refreshTeachers } = useTeachers();
  const { campuses, refreshCampuses } = useCampuses();
  
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      const backupData = await api.getBackup();
      const backup = createBackup(backupData);
      downloadBackup(backup);
      showToast('备份创建成功', 'success');
    } catch (error) {
      showToast('备份创建失败', 'error');
      console.error('Backup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const backup = await parseBackupFile(file);
      setSelectedBackup(backup);
      setShowRestoreConfirm(true);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '无效的备份文件', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;

    try {
      setRestoreLoading(true);
      await api.restoreBackup(selectedBackup);
      
      await Promise.all([
        refreshStudents(),
        refreshCourses(),
        refreshTeachers(),
        refreshCampuses(),
      ]);

      showToast('数据恢复成功', 'success');
      setShowRestoreConfirm(false);
      setSelectedBackup(null);
    } catch (error) {
      showToast('数据恢复失败', 'error');
      console.error('Restore failed:', error);
    } finally {
      setRestoreLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          数据备份与恢复
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">创建备份</h4>
                <p className="text-sm text-gray-500">导出当前所有数据</p>
              </div>
            </div>
            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <FileJson className="w-4 h-4" />
                  创建备份文件
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">恢复数据</h4>
                <p className="text-sm text-gray-500">从备份文件恢复</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载中...
                </>
              ) : (
                <>
                  <FileJson className="w-4 h-4" />
                  选择备份文件
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-medium text-amber-800">重要提示</h5>
              <ul className="mt-2 text-sm text-amber-700 space-y-1">
                <li>• 恢复操作会覆盖当前所有数据，请谨慎操作</li>
                <li>• 恢复前建议先创建当前数据的备份</li>
                <li>• 恢复操作不可撤销，请确认备份文件正确</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showRestoreConfirm && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => {
            setShowRestoreConfirm(false);
            setSelectedBackup(null);
          }} />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">确认恢复数据</h3>
              <button
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setSelectedBackup(null);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-amber-800">警告</h5>
                    <p className="text-sm text-amber-700 mt-1">
                      此操作将覆盖当前所有数据，此操作不可撤销！
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">备份文件内容</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">备份时间</p>
                    <p className="font-medium text-gray-900">{getBackupSummary(selectedBackup).date}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">学员</p>
                    <p className="font-medium text-gray-900">{getBackupSummary(selectedBackup).students}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">课程</p>
                    <p className="font-medium text-gray-900">{getBackupSummary(selectedBackup).courses}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">教师</p>
                    <p className="font-medium text-gray-900">{getBackupSummary(selectedBackup).teachers}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">缴费记录</p>
                    <p className="font-medium text-gray-900">{getBackupSummary(selectedBackup).payments}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">校区</p>
                    <p className="font-medium text-gray-900">{getBackupSummary(selectedBackup).campuses}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowRestoreConfirm(false);
                    setSelectedBackup(null);
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleRestore}
                  disabled={restoreLoading}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {restoreLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      恢复中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      确认恢复
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
