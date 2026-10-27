'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { DEMO_ACCOUNTS, getSession, requestPasswordReset, signIn } from '../../lib/auth'
import './login.css'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type DemoRole = 'manager' | 'employee'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoveryMessage, setRecoveryMessage] = useState('')

  useEffect(() => {
    const session = getSession()
    if (session) router.replace(session.user.role === 'MANAGER' ? '/manager/dashboard' : '/employee/dashboard')
  }, [router])

  function useDemo(role: DemoRole) {
    const account = DEMO_ACCOUNTS[role]
    setEmail(account.email)
    setPassword(account.password)
    setError('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Enter your work email and password.')
      return
    }
    if (!emailPattern.test(email.trim())) {
      setError('Enter a valid work email address.')
      return
    }

    setLoading(true)
    try {
      const session = signIn(email.trim(), password, remember)
      router.push(session.user.role === 'MANAGER' ? '/manager/dashboard' : '/employee/dashboard')
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'Unable to sign in.')
      setLoading(false)
    }
  }

  function submitRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRecoveryError('')
    setRecoveryMessage('')
    try {
      setRecoveryMessage(requestPasswordReset(recoveryEmail.trim()))
    } catch (recoverySubmissionError) {
      setRecoveryError(recoverySubmissionError instanceof Error ? recoverySubmissionError.message : 'Unable to start recovery.')
    }
  }

  return (
    <main className="login-page" aria-labelledby="login-title">
      <div className="login-shell">
        <Link href="/" className="login-back"><ArrowLeft aria-hidden="true" /> Back to ChainSight</Link>
        <div className="login-grid">
          <section className="login-brand-panel" aria-label="ChainSight overview">
            <div className="login-brand"><span className="login-brand-mark"><span /></span><strong>chainsight</strong></div>
            <p className="login-eyebrow">SUPPLY CHAIN INTELLIGENCE</p>
            <h1>Welcome back to ChainSight.</h1>
            <p className="login-brand-copy">Access your supply chain workspace and make confident operational decisions.</p>
            <div className="login-network" aria-hidden="true"><span /><span /><span /><i /><i /><i /></div>
            <ul className="login-benefits">
              <li><CheckCircle2 aria-hidden="true" /> Inventory visibility</li>
              <li><CheckCircle2 aria-hidden="true" /> Logistics intelligence</li>
              <li><CheckCircle2 aria-hidden="true" /> Procurement analytics</li>
            </ul>
          </section>

          <section className="login-form-panel">
            <div className="login-card">
              <p className="login-eyebrow">WORKSPACE ACCESS</p>
              <h2 id="login-title">Sign in to your workspace</h2>
              <p className="login-copy">Use your work credentials to continue.</p>
              <form onSubmit={submit} noValidate>
                <div className="login-field"><label htmlFor="email">Work email</label><input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" aria-invalid={Boolean(error)} /></div>
                <div className="login-field"><label htmlFor="password">Password</label><div className="login-password"><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" aria-invalid={Boolean(error)} /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div></div>
                {error && <p className="login-error" role="alert">{error}</p>}
                <div className="login-options"><label className="remember-option"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>Remember me</span></label><button type="button" className="forgot-link" onClick={() => { setRecoveryOpen(true); setRecoveryEmail(email); setRecoveryMessage(''); setRecoveryError('') }}>Forgot password?</button></div>
                <button className="login-submit" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} {!loading && <ArrowRight aria-hidden="true" />}</button>
              </form>
              <div className="demo-accounts"><p className="demo-title">Demo accounts</p><p><strong>Manager</strong><span>{DEMO_ACCOUNTS.manager.email}</span></p><p><strong>Employee</strong><span>{DEMO_ACCOUNTS.employee.email}</span></p><div className="demo-actions"><button type="button" onClick={() => useDemo('manager')}>Use Manager Demo</button><button type="button" onClick={() => useDemo('employee')}>Use Employee Demo</button></div><small>Development-only demo authentication. Production sessions are server-managed.</small></div>
            </div>
          </section>
        </div>
      </div>

      {recoveryOpen && <div className="recovery-backdrop" role="presentation"><section className="recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-title"><button type="button" className="recovery-close" onClick={() => setRecoveryOpen(false)} aria-label="Close recovery dialog"><X aria-hidden="true" /></button><p className="login-eyebrow">ACCOUNT RECOVERY</p><h2 id="recovery-title">Reset your password</h2><p className="login-copy">Enter your work email to start the demo recovery flow.</p><form onSubmit={submitRecovery} noValidate><div className="login-field"><label htmlFor="recovery-email">Work email</label><input id="recovery-email" type="email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" aria-invalid={Boolean(recoveryError)} /></div>{recoveryError && <p className="login-error" role="alert">{recoveryError}</p>}{recoveryMessage && <p className="login-success" role="status">{recoveryMessage}</p>}<button className="login-submit" type="submit">Continue <ArrowRight aria-hidden="true" /></button></form></section></div>}
    </main>
  )
}
