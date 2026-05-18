import { useState } from 'react';
import { Calendar, Send, Loader, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { leaveService } from '../../services/leaveService';
import type { LeaveRequest } from '../../types';

interface LeaveCardProps {
  leaveRequests: LeaveRequest[];
  onLeaveSubmit: (leave: LeaveRequest) => void;
}

export default function LeaveCard({ leaveRequests, onLeaveSubmit }: LeaveCardProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const created = await leaveService.createLeaveRequest(
        (user as any).engineerId || user.id,
        startDate,
        endDate,
        reason
      );
      onLeaveSubmit(created);

      setStartDate('');
      setEndDate('');
      setReason('');
      setShowForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 font-bold py-4 rounded-2xl hover:bg-indigo-500/[0.18] active:scale-[0.98] transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-3"
        >
          <Calendar className="w-6 h-6" />
          Request Leave of Absence
        </button>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg border border-white/[0.04] p-6 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-indigo-500/[0.08] rounded-2xl p-3">
              <Calendar className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-white/80 text-lg">Leave Application</h3>
              <p className="text-sm font-medium text-white/25">Plan your time off</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/[0.06] rounded-xl border border-red-100">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-white/20 uppercase tracking-widest mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={today}
                  required
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-white/20 uppercase tracking-widest mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || today}
                  required
                  className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-white/20 uppercase tracking-widest mb-2">
                Reason for Leave *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Briefly explain your leave request..."
                rows={3}
                required
                className="w-full px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-indigo-500/[0.12] text-indigo-400 border border-indigo-500/15 font-bold py-4 rounded-xl hover:bg-indigo-500/[0.18] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Request
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="px-6 py-4 border border-white/[0.04] rounded-xl text-white/40 font-bold hover:bg-white/[0.02] transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {leaveRequests.map((leave) => {
          return (
            <div
              key={leave.id}
              className={`bg-white rounded-2xl shadow-md border p-5 relative overflow-hidden ${
                leave.status === 'approved'
                  ? 'border-emerald-500/10'
                  : leave.status === 'rejected'
                  ? 'border-red-100'
                  : 'border-amber-100'
              }`}
            >
              <div className="flex items-start justify-between mb-4 relative">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="w-4 h-4 text-white/20" />
                    <p className="font-bold text-white/80">
                      {new Date(leave.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(leave.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-white/40 leading-relaxed">{leave.reason}</p>
                </div>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    leave.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-400/80'
                      : leave.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {leave.status === 'approved' ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : leave.status === 'rejected' ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                  {leave.status}
                </div>
              </div>

              {leave.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest italic">Awaiting HR Review</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {leaveRequests.length === 0 && !showForm && (
        <div className="text-center py-8 text-white/25">
          <Calendar className="w-12 h-12 mx-auto mb-2 text-white/15" />
          <p>No leave requests yet</p>
        </div>
      )}
    </div>
  );
}
