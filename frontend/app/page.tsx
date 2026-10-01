'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { motion } from 'framer-motion';
import {
  Shield, User, Eye, EyeOff, ArrowRight, Lock,
  Zap, BarChart3, FileSearch, Sparkles
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] }
  })
};

const features = [
  { icon: Zap, title: 'Real-time Analysis', desc: 'Instant sentiment scoring' },
  { icon: BarChart3, title: 'Sentiment Tracking', desc: 'Visual trend dashboards' },
  { icon: FileSearch, title: 'Deep Traceability', desc: 'Full evidence chain' },
];

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'admin' | 'student'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');

  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setUsername('');
    setPassword('');
    setError('');
  }, [mode]);

  async function login() {
    setBusy(true);
    setError('');
    try {
      let payload;
      if (mode === 'admin') {
        payload = await api('/api/v1/auth/admin-login', { method: 'POST', body: JSON.stringify({ username, password }) });
        localStorage.setItem('reviewlens_role', 'admin');
      } else {
        payload = await api('/api/v1/auth/student-login', { method: 'POST', body: JSON.stringify({ student_id: studentId }) });
        localStorage.setItem('reviewlens_role', 'student');
        localStorage.setItem('reviewlens_student_id', studentId);
      }
      localStorage.setItem('reviewlens_token', payload.access_token);
      router.push(mode === 'admin' ? '/admin' : '/student');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  }

  const isAdmin = mode === 'admin';

  return (
    <main className="min-h-screen">
      <div className="auth-shell">
        {/* ── Hero Panel ── */}
        <section className="hero-panel">
          <motion.div
            className="hero-copy"
            initial="hidden"
            animate="visible"
          >
            <motion.div className="eyebrow" custom={0} variants={fadeUp}>
              <Sparkles size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              ReviewLens · Intelligence Platform
            </motion.div>

            <motion.h1 custom={1} variants={fadeUp}>
              Sentiment analysis for marketplace reviews
            </motion.h1>

            <motion.p className="lead" custom={2} variants={fadeUp}>
              A polished review-intelligence workspace for importing marketplace feedback, running deterministic analysis jobs, inspecting evidence, and exporting results.
            </motion.p>
          </motion.div>

          <motion.div
            className="feature-grid"
            initial="hidden"
            animate="visible"
          >
            {features.map((f, i) => (
              <motion.div className="feature-card panel" key={f.title} custom={i + 3} variants={fadeUp}>
                <f.icon size={22} style={{ color: 'var(--accent)' }} />
                <b>{f.title}</b>
                <span>{f.desc}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Floating decorative orb */}
          <div style={{
            position: 'absolute', bottom: '15%', left: '60%',
            width: 200, height: 200,
            background: 'radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none', filter: 'blur(40px)',
          }} />
        </section>

        {/* ── Auth Panel ── */}
        <section className="auth-panel">
          <motion.div
            className="auth-card panel"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="eyebrow">
              {isAdmin ? <Shield size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} /> : <User size={12} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />}
              Secure workspace
            </div>

            <h2>{isAdmin ? 'Admin sign-in' : 'Student sign-in'}</h2>

            <p className="muted sans" style={{ fontSize: 13, lineHeight: 1.5 }}>
              {isAdmin
                ? 'Enter administrator credentials to access the workspace.'
                : 'Enter your student roll number to access the review intelligence dashboard.'}
            </p>

            {/* Mode Toggle */}
            <div className="mode-switch">
              <button
                type="button"
                className={`mode-btn ${isAdmin ? 'active' : 'secondary'}`}
                onClick={() => {
                  setMode('admin');
                  setUsername('');
                  setPassword('');
                  setError('');
                }}
              >
                <Shield size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Admin
              </button>
              <button
                type="button"
                className={`mode-btn ${!isAdmin ? 'active' : 'secondary'}`}
                onClick={() => {
                  setMode('student');
                  setStudentId('');
                  setError('');
                }}
              >
                <User size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                Student
              </button>
            </div>

            {/* Form */}
            <form
              className="auth-form"
              onSubmit={e => {
                e.preventDefault();
                login();
              }}
              autoComplete="off"
            >
              {isAdmin ? (
                <>
                  {/* Invisible decoy inputs to capture unwanted browser autofill */}
                  <input
                    type="text"
                    name="fake_autofill_user"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
                  />
                  <input
                    type="password"
                    name="fake_autofill_password"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    style={{ position: 'absolute', opacity: 0, height: 0, width: 0, pointerEvents: 'none' }}
                  />

                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--muted-color)', pointerEvents: 'none'
                    }} />
                    <input
                      className="input"
                      style={{ paddingLeft: 40 }}
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="Username"
                      autoComplete="off"
                      name="admin_login_username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{
                      position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--muted-color)', pointerEvents: 'none'
                    }} />
                    <input
                      className="input"
                      style={{ paddingLeft: 40, paddingRight: 44 }}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="new-password"
                      name="admin_login_password"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', color: 'var(--muted-color)',
                        cursor: 'pointer', padding: 4
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--muted-color)', pointerEvents: 'none'
                  }} />
                  <input
                    className="input"
                    style={{ paddingLeft: 40 }}
                    value={studentId}
                    onChange={e => setStudentId(e.target.value)}
                    placeholder="Enter Roll Number (e.g. 24B11CS001, 21BCE1001)"
                    autoComplete="off"
                  />
                </div>
              )}

              {error && (
                <motion.p
                  className="error-text"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.p>
              )}

              <motion.button
                type="submit"
                className="btn w-full"
                disabled={busy}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  animation: !busy ? 'glow-pulse 3s infinite' : 'none'
                }}
              >
                {busy ? 'Signing in...' : (
                  <>
                    Sign in
                    <ArrowRight size={16} />
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
