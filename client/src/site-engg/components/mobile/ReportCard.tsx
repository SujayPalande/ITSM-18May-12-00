import { useState } from 'react';
import { FileText, Send, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { reportService } from '../../services/reportService';
import type { DailyReport, Assignment } from '../../types';

interface ReportCardProps {
  report: DailyReport | null;
  assignment: Assignment | undefined;
  onReportSubmit: (report: DailyReport) => void;
}

export default function ReportCard({ report, assignment, onReportSubmit }: ReportCardProps) {
  const { user } = useAuth();
  const [workDone, setWorkDone] = useState('');
  const [issues, setIssues] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !(user as any).engineerId || !assignment) return;

    setLoading(true);
    setError(null);

    try {
      const created = await reportService.createReport(
        (user as any).engineerId,
        assignment.clientId,
        workDone,
        issues || undefined,
        assignment.siteId
      );
      onReportSubmit(created);
      setShowSuccess(true);
      setWorkDone('');
      setIssues('');
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  }

  if (report) {
    return (
      <div className="bg-indigo-500/[0.06] border border-blue-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-blue-600 rounded-xl p-2.5">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-lg">Report Submitted</h3>
            <p className="text-sm font-medium text-blue-700/80">Great work today!</p>
          </div>
        </div>
        
        <div className="bg-white/50 backdrop-blur-sm rounded-xl p-4 mt-4 border border-blue-100/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60 mb-2">My Updates</p>
          <p className="text-sm font-semibold text-white/50 leading-relaxed mb-3">{report.workDone}</p>
          {report.issues && (
            <div className="flex items-start gap-2 pt-3 border-t border-blue-100/30">
              <AlertCircle className="w-4 h-4 text-red-400/80 mt-0.5" />
              <p className="text-sm font-semibold text-red-400">{report.issues}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-6 text-center">
        <FileText className="w-10 h-10 text-white/15 mx-auto mb-3" />
        <p className="font-bold text-white/50">No active assignment</p>
        <p className="text-sm text-white/25 mt-1">Please check back later</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md border border-white/[0.04] p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-indigo-500/[0.08] rounded-2xl p-3">
          <FileText className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold text-white/80 text-lg">Daily Report</h3>
          <p className="text-sm font-medium text-white/25">Record your work progress</p>
        </div>
      </div>

      {showSuccess && (
        <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-500/10 flex items-center gap-3 animate-in fade-in zoom-in-95">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <p className="text-sm font-medium text-emerald-400/80">Report sumitted successfully!</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-500/[0.06] rounded-xl border border-red-100 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-black text-white/20 uppercase tracking-widest mb-2">
            Work Accomplished *
          </label>
          <textarea
            value={workDone}
            onChange={(e) => setWorkDone(e.target.value)}
            placeholder="Describe what you completed..."
            rows={4}
            required
            className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-white/20 uppercase tracking-widest mb-2">
            Issues / Blockers (Optional)
          </label>
          <textarea
            value={issues}
            onChange={(e) => setIssues(e.target.value)}
            placeholder="Any problems encountered?"
            rows={2}
            className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !workDone.trim()}
          className="w-full bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 font-bold py-4 rounded-xl hover:bg-indigo-500/[0.18] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Submitting Report...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Daily Report
            </>
          )}
        </button>
      </form>
    </div>
  );
}
