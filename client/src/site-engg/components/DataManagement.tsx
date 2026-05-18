import { useState } from 'react';
import { Download, Upload, RotateCcw, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { StorageService } from '../lib/storage';

export default function DataManagement() {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleExport() {
    try {
      const data = StorageService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `site-engineer-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Data exported successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export data' });
      setTimeout(() => setMessage(null), 3000);
    }
  }

  function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const success = StorageService.importData(data);

        if (success) {
          setMessage({ type: 'success', text: 'Data imported successfully! Reloading...' });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          setMessage({ type: 'error', text: 'Failed to import data - invalid format' });
          setTimeout(() => setMessage(null), 3000);
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Failed to import data' });
        setTimeout(() => setMessage(null), 3000);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function handleReset() {
    StorageService.resetData();
    setMessage({ type: 'success', text: 'Data reset successfully! Reloading...' });
    setTimeout(() => window.location.reload(), 1500);
  }

  const storageInfo = () => {
    try {
      const data = StorageService.exportData();
      const sizeInKB = (new Blob([data]).size / 1024).toFixed(2);
      return `${sizeInKB} KB`;
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="w-6 h-6 text-slate-600" />
        <div>
          <h2 className="text-[15px] font-semibold text-slate-800">Data Management</h2>
          <p className="text-sm text-slate-600">Manage application data storage</p>
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/[0.06] border border-emerald-500/15 text-emerald-400'
              : 'bg-red-500/[0.06] border border-red-500/15 text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-[13px] font-medium">{message.text}</span>
        </div>
      )}

      <div className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-slate-600">Storage Location</p>
              <p className="text-xs text-slate-500 mt-1">Browser LocalStorage</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] font-medium text-slate-600">Data Size</p>
              <p className="text-xs text-slate-500 mt-1">{storageInfo()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 rounded-lg hover:bg-indigo-500/[0.18] transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-[13px] font-medium">Export Data</span>
          </button>

          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/[0.12] text-emerald-400 border border-emerald-500/15 rounded-lg hover:bg-emerald-500/[0.18] transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            <span className="text-[13px] font-medium">Import Data</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/[0.12] text-red-400 border border-red-500/15 rounded-lg hover:bg-red-500/[0.18] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-[13px] font-medium">Reset to Default</span>
          </button>
        </div>

        <div className="p-4 bg-indigo-500/[0.04] border border-indigo-500/10 rounded-lg">
          <p className="text-xs text-indigo-400/70">
            <strong>Note:</strong> All data is stored in your browser's localStorage. Data persists across page
            refreshes but is specific to this browser. Use export/import to backup or transfer data.
          </p>
        </div>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6 max-w-md mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-red-500/[0.06] rounded-full p-2">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">Reset Data to Default?</h3>
                <p className="text-sm text-slate-600">
                  This will permanently delete all current data including check-ins, reports, and leave
                  requests. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowResetConfirm(false);
                  handleReset();
                }}
                className="flex-1 px-4 py-2 bg-red-500/[0.12] text-red-400 border border-red-500/15 rounded-lg hover:bg-red-500/[0.18] transition-colors"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
