import React, { useState, useRef, useEffect } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle, Loader2, FileJson, Trash2, X, Clock, History, Settings, HardDrive, Zap, Calendar, Save } from 'lucide-react';
import { api } from '../services/api';
import { useToast } from './Toast';
import { useStudents, useCourses, useTeachers, useCampuses } from '../contexts/AppContext';
import { createBackup, downloadBackup, parseBackupFile, getBackupSummary, BackupData, saveBackupToLocal, getLocalBackups, deleteLocalBackup, createDifferentialBackup, getBackupSchedule, saveBackupSchedule, getLastBackupTime, BackupRecord, BackupSchedule } from '../utils/backup';

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
  const [localBackups, setLocalBackups] = useState<BackupRecord[]>([]);
  const [backupSchedule, setBackupSchedule] = useState<BackupSchedule>(getBackupSchedule());
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(getLastBackupTime());
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalBackups(getLocalBackups());
  }, []);

  const refreshLocalBackups = () => {
    setLocalBackups(getLocalBackups());
    setLastBackupTime(getLastBackupTime());
  };

  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      const backupData = await api.getBackup();
      const backup = createBackup(backupData);
      
      saveBackupToLocal(backup, 'full');
      downloadBackup(backup);
      
      refreshLocalBackups();
      showToast('备份创建成功', 'success');
    } catch (error) {
      showToast('备份创建失败', 'error');
      console.error('Backup failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDifferentialBackup = async () => {
    try {
      const fullBackups = localBackups.filter(b => b.type === 'full');
      if (fullBackups.length === 0) {
        showToast('请先创建完整备份', 'warning');
        return;
      }

      setLoading(true);
      const currentData = await api.getBackup();
      const lastFullBackup = fullBackups[0].data;
      const differentialBackup = createDifferentialBackup(currentData, lastFullBackup);
      
      saveBackupToLocal(differentialBackup, 'differential', fullBackups[0].id);
      downloadBackup(differentialBackup);
      
      refreshLocalBackups();
      showToast('差异备份创建成功', 'success');
    } catch (error) {
      showToast('差异备份创建失败', 'error');
      console.error('Differential backup failed:', error);
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

  const handleLocalBackupRestore = (backupRecord: BackupRecord) => {
    setSelectedBackup(backupRecord.data);
    setShowRestoreConfirm(true);
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

  const handleDeleteBackup = (backupId: string) => {
    if (confirm('确定要删除这个备份吗？')) {
      deleteLocalBackup(backupId);
      refreshLocalBackups();
      showToast('备份已删除', 'success');
    }
  };

  const handleSaveSchedule = () => {
    saveBackupSchedule(backupSchedule);
    setShowScheduleSettings(false);
    showToast('备份计划已保存', 'success');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-indigo-600" />
          数据备份与恢复
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">完整备份</h4>
                <p className="text-sm text-gray-500">导出所有数据</p>
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
                  创建完整备份
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">差异备份</h4>
                <p className="text-sm text-gray-500">仅备份变化的数据</p>
              </div>
            </div>
            <button
              onClick={handleCreateDifferentialBackup}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <FileJson className="w-4 h-4" />
                  创建差异备份
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-purple-600" />
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
              className="w-full py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
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

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            自动备份计划
          </h3>
          <button
            onClick={() => setShowScheduleSettings(!showScheduleSettings)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            <Settings className="w-4 h-4" />
            {showScheduleSettings ? '收起设置' : '设置计划'}
          </button>
        </div>

        {showScheduleSettings && (
          <div className="p-4 bg-gray-50 rounded-xl mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={backupSchedule.enabled}
                    onChange={(e) => setBackupSchedule({ ...backupSchedule, enabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">启用自动备份</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备份频率</label>
                <select
                  value={backupSchedule.interval}
                  onChange={(e) => setBackupSchedule({ ...backupSchedule, interval: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="daily">每天</option>
                  <option value="weekly">每周</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">备份时间</label>
                <input
                  type="time"
                  value={backupSchedule.time}
                  onChange={(e) => setBackupSchedule({ ...backupSchedule, time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">保留天数</label>
                <input
                  type="number"
                  value={backupSchedule.retentionDays}
                  onChange={(e) => setBackupSchedule({ ...backupSchedule, retentionDays: parseInt(e.target.value) || 30 })}
                  min="1"
                  max="365"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveSchedule}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Save className="w-4 h-4" />
                保存设置
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${backupSchedule.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span>{backupSchedule.enabled ? '自动备份已启用' : '自动备份未启用'}</span>
          </div>
          {lastBackupTime && (
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              <span>上次备份：{new Date(lastBackupTime).toLocaleString('zh-CN')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-600" />
          本地备份历史
        </h3>

        {localBackups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <HardDrive className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>暂无本地备份</p>
          </div>
        ) : (
          <div className="space-y-3">
            {localBackups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${backup.type === 'full' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                    <Database className={`w-5 h-5 ${backup.type === 'full' ? 'text-emerald-600' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">{backup.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(backup.createdAt).toLocaleString('zh-CN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-4 h-4" />
                        {formatFileSize(backup.size)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${backup.type === 'full' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {backup.type === 'full' ? '完整' : '差异'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadBackup(backup.data)}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    title="下载备份"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleLocalBackupRestore(backup)}
                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                    title="恢复此备份"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBackup(backup.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="删除备份"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
                      <CheckCircle className="w-4 h-4" />
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
