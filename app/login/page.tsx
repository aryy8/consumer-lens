'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ScanSearch,
  ShieldCheck,
  Scale,
  FileText,
  User,
  Lock,
  Eye,
  EyeOff,
  Users,
  Settings,
  Shield,
} from 'lucide-react'
import { DEMO_ROLES, useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [loading, user, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const res = await login(employeeId, password)
    if (!res.ok) {
      setError(res.error ?? 'Login failed.')
      setSubmitting(false)
    }
    // On success, login() performs a full navigation to /dashboard.
  }

  function quickFill(id: string, pw: string, role: string) {
    setEmployeeId(id)
    setPassword(pw)
    setSelectedRole(role)
    setError('')
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-[#F8FAFC]">
      {/* LEFT SECTION - Brand and Features */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 lg:p-16 overflow-hidden bg-gradient-to-br from-[#FFFFFF] via-[#F0F7FF] to-[#E0EFFF]/80 border-r border-[#E2E8F0]">
        {/* Subtle Decorative Dot Grid in Top Right */}
        <div className="absolute top-10 right-10 opacity-30 pointer-events-none">
          <svg width="120" height="120" fill="none" viewBox="0 0 120 120">
            <defs>
              <pattern id="dot-grid" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#3B82F6" />
              </pattern>
            </defs>
            <rect width="120" height="120" fill="url(#dot-grid)" />
          </svg>
        </div>

        {/* Subtle Watermark Shield in Bottom Right */}
        <div className="absolute -bottom-10 right-4 opacity-[0.14] pointer-events-none">
          <Shield className="size-80 text-[#2563EB]" strokeWidth={1} />
        </div>

        {/* Top Branding */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="flex size-10 items-center justify-center rounded-xl bg-transparent overflow-hidden shadow-sm">
            <img src="/favicon.webp" alt="Logo" className="size-full object-cover" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[17px] font-bold tracking-tight text-slate-900">
              Consumer Lens
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Legal Metrology Enforcement
            </span>
          </div>
        </div>

        {/* Center Hero & Feature Cards */}
        <div className="my-auto py-10 max-w-xl relative z-10">
          <h1 className="text-3xl lg:text-[34px] font-extrabold tracking-tight text-slate-900 leading-[1.2]">
            Label compliance verification <br />
            <span className="text-[#2563EB]">for field enforcement officers.</span>
          </h1>

          <div className="w-12 h-1 bg-[#2563EB] rounded-full mt-4 mb-5" />

          <p className="text-sm leading-relaxed text-slate-600 font-normal">
            Scan packaged product labels and auto-detect the 9 mandatory declarations. Verify
            compliance against the Legal Metrology (Packaged Commodities) Rules, 2011 and
            generate signed inspection reports.
          </p>

          {/* 3 Feature Rows */}
          <div className="mt-8 space-y-4">
            {/* Feature 1 */}
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#DBEAFE]/80 text-[#2563EB] shrink-0 border border-[#BFDBFE]/60 shadow-sm">
                <ShieldCheck className="size-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold text-slate-900">Auto-detect declarations</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan labels and detect the 9 mandatory declarations instantly.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#DBEAFE]/80 text-[#2563EB] shrink-0 border border-[#BFDBFE]/60 shadow-sm">
                <Scale className="size-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold text-slate-900">Verify compliance</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check compliance against the Legal Metrology (Packaged Commodities) Rules, 2011.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#DBEAFE]/80 text-[#2563EB] shrink-0 border border-[#BFDBFE]/60 shadow-sm">
                <FileText className="size-5" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold text-slate-900">Generate reports</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Create signed inspection reports with rule-level violation citations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Ministry Emblem and Attribution */}
        <div className="flex items-center gap-4 relative z-10 pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ministry.png"
            alt="Emblem of India"
            className="h-12 w-auto object-contain shrink-0"
          />
          <div className="flex flex-col text-[11px] leading-tight">
            <span className="font-semibold text-slate-800">
              Ministry of Consumer Affairs, Food &amp; Public Distribution
            </span>
            <span className="font-medium text-slate-600 mt-0.5">Government of India</span>
            <span className="text-[10px] text-slate-400 mt-1">
              Authorized personnel only. All activity is logged.
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT SECTION - Officer Sign In Card */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14 bg-[#F8FAFC]">
        <div className="w-full max-w-[460px] bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-8 sm:p-10 animate-[fadeIn_0.3s_ease-out]">
          {/* Top Avatar Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className="flex size-14 items-center justify-center rounded-full border-2 border-[#2563EB] text-[#2563EB] bg-blue-50/50 shadow-sm">
              <User className="size-7" strokeWidth={1.75} />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Officer sign in</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
              Enter your official credentials to access the enforcement workspace.
            </p>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee ID */}
            <div className="space-y-1.5">
              <label htmlFor="employeeId" className="block text-xs font-semibold text-slate-700">
                Employee ID
              </label>
              <div className="relative flex items-center">
                <User className="size-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="employeeId"
                  value={employeeId}
                  onChange={(e) => {
                    setEmployeeId(e.target.value)
                    setSelectedRole(null)
                  }}
                  placeholder="e.g. INS001"
                  autoComplete="username"
                  className="h-11 w-full pl-10 pr-3.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Password
              </label>
              <div className="relative flex items-center">
                <Lock className="size-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setSelectedRole(null)
                  }}
                  placeholder="••••••"
                  autoComplete="current-password"
                  className="h-11 w-full pl-10 pr-10 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                />
                <span className="text-xs font-medium text-slate-600">Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => alert('Please contact the System Administrator to reset your credentials.')}
                className="text-xs font-medium text-[#2563EB] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2 text-xs text-red-600 animate-[fadeIn_0.2s_ease-out]">
                <AlertCircle className="size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-lg bg-[#D97706] hover:bg-[#B45309] text-white font-semibold text-sm shadow-md shadow-amber-600/15 transition-all duration-150 flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              DEMO ACCESS
            </span>
          </div>

          {/* Role Tiles */}
          <div className="grid grid-cols-3 gap-2.5">
            {DEMO_ROLES.map((r) => {
              const isSelected = selectedRole === r.role || employeeId === r.employeeId

              const roleIcons = {
                inspector: <ShieldCheck className="size-3.5 text-[#2563EB]" strokeWidth={2.5} />,
                supervisor: <Users className="size-3.5 text-[#059669]" strokeWidth={2.5} />,
                admin: <Settings className="size-3.5 text-[#7C3AED]" strokeWidth={2.5} />,
              }

              const roleIconBg = {
                inspector: 'bg-[#DBEAFE]',
                supervisor: 'bg-[#D1FAE5]',
                admin: 'bg-[#EDE9FE]',
              }

              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => quickFill(r.employeeId, r.password, r.role)}
                  className={cn(
                    'flex flex-col items-center text-center p-3 rounded-xl border transition-all duration-150 cursor-pointer',
                    isSelected
                      ? 'border-[#2563EB] bg-[#EFF6FF] ring-2 ring-[#2563EB]/20 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  )}
                >
                  <div className={cn('size-6 rounded-md flex items-center justify-center mb-1.5', roleIconBg[r.role])}>
                    {roleIcons[r.role]}
                  </div>
                  <span className="text-xs font-bold text-slate-900">{r.label}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">{r.blurb}</span>
                </button>
              )
            })}
          </div>

          {/* Helper Text */}
          <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">
            Select a role to auto-fill credentials, then press Sign in. Password for all demo
            accounts is{' '}
            <span className="font-semibold text-[#2563EB]">demo</span>.
          </p>
        </div>
      </div>
    </div>
  )
}
