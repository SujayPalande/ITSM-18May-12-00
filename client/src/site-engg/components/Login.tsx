import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCompanyBranding } from '../contexts/CompanyBrandingContext';
import { Building2, X, AlertCircle, ArrowRight, KeyRound, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { signIn, resetPassword, configError } = useAuth();
  const { branding } = useCompanyBranding();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError('');
    setResetSuccess(false);
    setResetLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
      setResetEmail('');
    } catch (err: any) {
      setResetError(err.message || 'Failed to send reset email');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-[-40%] right-[-20%] w-[600px] h-[600px] bg-indigo-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-15%] w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        {configError && (
          <div className="mb-5 bg-red-500/[0.08] border border-red-500/20 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-red-300 font-semibold text-sm mb-1">Configuration Error</h2>
                <p className="text-red-400/70 text-xs">{configError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="mb-5 flex flex-col items-center gap-3">
              <img src="/logo1.png" alt="Cybaem Tech" className="h-16 w-auto object-contain opacity-90" />
              <h1
                className="text-xl font-bold tracking-[-0.02em]"
                style={{ color: branding?.primary_color || '#E2E8F0' }}
              >
                CYBAEM TECH
              </h1>
            </div>
            <p className="text-slate-500 text-[13px] font-medium">Daily Reporting & Attendance</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/[0.08] border border-red-500/15 text-red-400 px-4 py-3 rounded-xl text-[13px] font-medium">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2 ml-0.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800/15" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-[13px] font-medium placeholder:text-slate-800/15 focus:outline-none focus:border-white/[0.12] focus:bg-slate-200 transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.1em] ml-0.5">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] text-indigo-400/60 hover:text-indigo-400 font-medium transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-800/15" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-[13px] font-medium placeholder:text-slate-800/15 focus:outline-none focus:border-white/[0.12] focus:bg-slate-200 transition-all duration-200"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-slate-800 py-3 rounded-xl font-semibold text-[13px] tracking-[-0.01em] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group relative overflow-hidden"
              style={{
                background: branding
                  ? `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`
                  : 'linear-gradient(135deg, #6366F1, #4F46E5)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.2)',
              }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.12em] mb-4 text-center">Demo Credentials</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Admin', email: 'admin@company.com', color: '#A78BFA' },
                  { label: 'HR Manager', email: 'hr@company.com', color: '#60A5FA' },
                  { label: 'Engineer', email: 'engineer@company.com', color: '#34D399' },
                  { label: 'Client', email: 'client@company.com', color: '#FBBF24' },
                ].map((cred) => (
                  <button
                    key={cred.label}
                    type="button"
                    onClick={() => { setEmail(cred.email); setPassword('password123'); }}
                    className="text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-200 transition-all duration-200 border border-slate-100 hover:border-slate-200 group"
                  >
                    <p className="text-[11px] font-semibold text-slate-600 group-hover:text-slate-700 transition-colors flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cred.color }} />
                      {cred.label}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">{cred.email}</p>
                  </button>
                ))}
              </div>
            </div>
          </form>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 w-full max-w-md shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800/90 tracking-[-0.02em]">Reset Password</h2>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSuccess(false);
                  setResetError('');
                  setResetEmail('');
                }}
                className="text-slate-500 hover:text-slate-600 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl text-[13px] font-medium mb-4">
                Password reset email sent! Check your inbox for instructions.
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="bg-red-500/[0.08] border border-red-500/15 text-red-400 px-4 py-3 rounded-xl text-[13px] font-medium">
                    {resetError}
                  </div>
                )}

                <div>
                  <label htmlFor="resetEmail" className="block text-[11px] font-semibold text-slate-500 uppercase tracking-[0.1em] mb-2 ml-0.5">
                    Email Address
                  </label>
                  <input
                    id="resetEmail"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 text-[13px] font-medium placeholder:text-slate-800/15 focus:outline-none focus:border-white/[0.12] focus:bg-slate-200 transition-all duration-200"
                    placeholder="you@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full text-slate-800 py-3 rounded-xl font-semibold text-[13px] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  style={{
                    background: branding
                      ? `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color})`
                      : 'linear-gradient(135deg, #6366F1, #4F46E5)',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.2)',
                  }}
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
