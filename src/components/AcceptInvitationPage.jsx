import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Loader2, CheckCircle, XCircle, AlertTriangle, User as UserIcon, Eye, EyeOff, ArrowRight, Check, ShieldCheck } from 'lucide-react';

axios.defaults.withCredentials = true;

export default function AcceptInvitationPage() {
  const { token: routeToken } = useParams();
  const queryToken = new URLSearchParams(window.location.search).get('token');
  const token = routeToken || queryToken;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [skills, setSkills] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const roleLabel = useMemo(() => {
    const r = (role || '').toLowerCase();
    if (r === 'manager') return 'Manager';
    if (r === 'employee') return 'Employee';
    if (r === 'client') return 'Client';
    return role ? role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() : 'Team';
  }, [role]);

  const isManager = (role || '').toUpperCase() === 'MANAGER';

  useEffect(() => {
    if (!token) {
      setInvalidToken(true);
      setVerifying(false);
      return;
    }
    const verifyToken = async () => {
      try {
        const res = await axios.get(`/api/auth/verify-invitation/${token}`);
        if (res.data.success) {
          setName(res.data.user.name || '');
          setEmail(res.data.user.email || '');
          setRole(res.data.user.role || '');
          setDepartment(res.data.user.department || '');
        }
      } catch (err) {
        setInvalidToken(true);
        setError(err.response?.data?.error || 'This invitation link is invalid or has expired.');
      } finally {
        setVerifying(false);
      }
    };
    verifyToken();
  }, [token]);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Enter your full name';
    if (!password) errs.password = 'Choose a password';
    else if (password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (!confirmPassword) errs.confirmPassword = 'Confirm your password';
    setFieldErrors(errs);
    if (Object.keys(errs).length) {
      setError(Object.values(errs)[0]);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`/api/auth/accept-invitation/${token}`, { name, password, department, skills });
      if (res.data.success) setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const pwChecks = useMemo(() => ({
    length: password.length >= 8,
    match: !!password && password === confirmPassword && confirmPassword.length > 0,
  }), [password, confirmPassword]);

  if (verifying) {
    return (
      <div className="reg-page">
        <div className="reg-verify">
          <Loader2 size={20} className="spin" />
          <span>Verifying invitation…</span>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="reg-page">
        <div className="reg-shell reg-shell--narrow">
          <div className="reg-card reg-card--state">
            <div className="reg-state-icon reg-state-icon--error"><AlertTriangle size={18} /></div>
            <h1 className="reg-state-title">Invitation unavailable</h1>
            <p className="reg-state-desc">{error || 'This registration link is invalid, expired, or already used. Ask your administrator to send a new invitation.'}</p>
            <Link to="/" className="reg-btn reg-btn--primary">Back to home</Link>
          </div>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reg-page">
        <div className="reg-shell reg-shell--narrow">
          <div className="reg-card reg-card--state">
            <div className="reg-state-icon reg-state-icon--success"><CheckCircle size={18} /></div>
            <h1 className="reg-state-title">Registration complete</h1>
            <p className="reg-state-desc">Your profile is now <strong>pending approval</strong>. An administrator will activate your access shortly. You will be able to sign in once approved.</p>
            <Link to="/login" className="reg-btn reg-btn--primary">Go to sign in <ArrowRight size={14} /></Link>
            <p className="reg-hint">You can close this window. No further action is needed.</p>
          </div>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  return (
    <div className="reg-page">
      <header className="reg-topbar">
        <Link to="/" className="reg-brand" aria-label="ViralCraftMedia home">
          <img src="/logoooooooooo.png" alt="ViralCraftMedia" />
        </Link>
        <span className="reg-topbar-divider" />
        <span className="reg-topbar-label">Invitation</span>
        <div className="reg-topbar-spacer" />
        <span className="reg-topbar-meta">Already have an account?</span>
        <Link to="/login" className="reg-topbar-link">Sign in</Link>
      </header>

      <div className="reg-shell">
        <div className="reg-layout">
          <div className="reg-intro">
            <div className="reg-eyebrow">
              <span className="reg-eyebrow-dot" />
              Invitation
              <span className="reg-badge" data-role={isManager ? 'manager' : 'employee'}>{roleLabel}</span>
            </div>
            <h1 className="reg-title">Create your {roleLabel.toLowerCase()} account</h1>
            <p className="reg-subtitle">
              {isManager
                ? 'You were invited to manage projects, review deliverables and coordinate your team in ViralCraftMedia.'
                : 'You were invited to join ViralCraftMedia. Set a password to activate your workspace access.'}
            </p>
            <div className="reg-invite-meta">
              <div className="reg-meta-row">
                <span className="reg-meta-label">Invitation for</span>
                <span className="reg-meta-value">{email || '—'}</span>
              </div>
              <div className="reg-meta-row">
                <span className="reg-meta-label">Access</span>
                <span className="reg-meta-value"><ShieldCheck size={12} /> Pending administrator approval after registration</span>
              </div>
            </div>
            <ol className="reg-steps">
              <li><strong>Set password</strong> — minimum 8 characters</li>
              <li><strong>Submit</strong> — profile marked as pending</li>
              <li><strong>Admin approves</strong> — you can then sign in</li>
            </ol>
            <p className="reg-footnote">Invitation links expire after 24 hours. If yours expired, ask your administrator to resend it.</p>
          </div>

          <div className="reg-card">
            <div className="reg-card-head">
              <h2 className="reg-card-title">Complete your profile</h2>
              <p className="reg-card-desc">Review your details and choose a password. Fields marked with * are required.</p>
            </div>

            {error && (
              <div className="reg-alert reg-alert--error" role="alert">
                <XCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="reg-form">
              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-name">Full name <span className="reg-req">*</span></label>
                <div className={`reg-input-wrap ${focusedInput === 'name' ? 'is-focused' : ''} ${fieldErrors.name ? 'has-error' : ''}`}>
                  <UserIcon size={15} className="reg-input-icon" />
                  <input id="reg-name" type="text" autoComplete="name" value={name} onChange={e => { setName(e.target.value); if (fieldErrors.name) setFieldErrors(s => ({ ...s, name: undefined })); }} onFocus={() => setFocusedInput('name')} onBlur={() => setFocusedInput(null)} placeholder="Your full name" />
                </div>
                {fieldErrors.name && <span className="reg-field-error">{fieldErrors.name}</span>}
              </div>

              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-email">Email address</label>
                <div className="reg-input-wrap is-readonly">
                  <input id="reg-email" type="text" value={email} readOnly tabIndex={-1} aria-readonly="true" />
                </div>
                <span className="reg-hint">Email is set by your invitation and cannot be changed.</span>
              </div>

              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-password">Password <span className="reg-req">*</span></label>
                <div className={`reg-input-wrap ${focusedInput === 'password' ? 'is-focused' : ''} ${fieldErrors.password ? 'has-error' : ''}`}>
                  <Lock size={15} className="reg-input-icon" />
                  <input id="reg-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); if (fieldErrors.password || fieldErrors.confirmPassword) setFieldErrors(s => ({ ...s, password: undefined, confirmPassword: undefined })); }} onFocus={() => setFocusedInput('password')} onBlur={() => setFocusedInput(null)} placeholder="At least 8 characters" />
                  <button type="button" className="reg-visibility" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.password ? <span className="reg-field-error">{fieldErrors.password}</span> : <span className="reg-hint">Minimum 8 characters. Use a strong, unique password.</span>}
              </div>

              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-confirm">Confirm password <span className="reg-req">*</span></label>
                <div className={`reg-input-wrap ${focusedInput === 'confirm' ? 'is-focused' : ''} ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                  <Lock size={15} className="reg-input-icon" />
                  <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors(s => ({ ...s, confirmPassword: undefined })); }} onFocus={() => setFocusedInput('confirm')} onBlur={() => setFocusedInput(null)} placeholder="Repeat password" />
                  <button type="button" className="reg-visibility" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide password' : 'Show password'} aria-pressed={showConfirm}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <span className="reg-field-error">{fieldErrors.confirmPassword}</span>}
              </div>

              <div className="reg-checks" aria-live="polite">
                <span className={`reg-check ${pwChecks.length ? 'is-ok' : ''}`}><Check size={12} /> 8+ characters</span>
                <span className={`reg-check ${pwChecks.match ? 'is-ok' : ''}`}><Check size={12} /> Passwords match</span>
              </div>

              <div className="reg-divider" />

              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-dept">Department <span className="reg-optional">Optional</span></label>
                <div className={`reg-input-wrap ${focusedInput === 'dept' ? 'is-focused' : ''}`}>
                  <input id="reg-dept" type="text" value={department} onChange={e => setDepartment(e.target.value)} onFocus={() => setFocusedInput('dept')} onBlur={() => setFocusedInput(null)} placeholder="e.g. Creative, Post-Production" />
                </div>
              </div>

              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-skills">Skills <span className="reg-optional">Optional — comma separated</span></label>
                <div className={`reg-input-wrap ${focusedInput === 'skills' ? 'is-focused' : ''}`}>
                  <input id="reg-skills" type="text" value={skills} onChange={e => setSkills(e.target.value)} onFocus={() => setFocusedInput('skills')} onBlur={() => setFocusedInput(null)} placeholder="e.g. Premiere, Color Grading, Sound Design" />
                </div>
              </div>

              <button type="submit" disabled={loading} className="reg-btn reg-btn--primary reg-btn--submit">
                {loading ? <><Loader2 size={15} className="spin" /> Creating account…</> : <>Create account <ArrowRight size={15} /></>}
              </button>
              <p className="reg-legal">By continuing, you agree to your administrator activating your account after review.</p>
            </form>
          </div>
        </div>
      </div>
      <style>{regStyles}</style>
    </div>
  );
}

const regStyles = `
.reg-page { min-height: 100vh; background: #FAFAFA; color: #18181B; font-family: var(--font); display: flex; flex-direction: column; }
.reg-topbar { height: 56px; border-bottom: 1px solid #E4E4E7; background: #FFFFFF; display: flex; align-items: center; gap: 10px; padding: 0 20px; position: sticky; top: 0; z-index: 10; }
.reg-brand img { height: 26px; width: auto; display: block; }
.reg-topbar-divider { width: 1px; height: 20px; background: #E4E4E7; margin: 0 2px; }
.reg-topbar-label { font-size: 0.8125rem; font-weight: 600; color: #71717A; letter-spacing: -0.01em; }
.reg-topbar-spacer { flex: 1; }
.reg-topbar-meta { font-size: 0.8125rem; color: #71717A; display: inline; }
.reg-topbar-link { font-size: 0.8125rem; font-weight: 600; color: #18181B; text-decoration: none; border: 1px solid #E4E4E7; padding: 7px 12px; border-radius: 999px; background: #FFFFFF; }
.reg-topbar-link:hover { background: #F4F4F5; }
.reg-shell { width: 100%; max-width: 980px; margin: 0 auto; padding: 32px 20px 40px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.reg-shell--narrow { max-width: 520px; }
.reg-layout { display: grid; grid-template-columns: 380px 1fr; gap: 32px; align-items: start; }
.reg-intro { padding-top: 8px; }
.reg-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #71717A; margin-bottom: 12px; }
.reg-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #FF6A00; }
.reg-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0; text-transform: none; border: 1px solid #E4E4E7; background: #FFFFFF; color: #3F3F46; }
.reg-badge[data-role="manager"] { background: #FFF7ED; border-color: #FFEDD5; color: #9A3412; }
.reg-title { font-size: 1.75rem; line-height: 1.15; font-weight: 750; letter-spacing: -0.03em; color: #111827; margin: 0 0 10px 0; }
.reg-subtitle { font-size: 0.9375rem; line-height: 1.6; color: #52525B; margin: 0 0 16px 0; }
.reg-invite-meta { border: 1px solid #E4E4E7; border-radius: 12px; background: #FFFFFF; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.reg-meta-row { display: flex; flex-direction: column; gap: 2px; }
.reg-meta-label { font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #71717A; }
.reg-meta-value { font-size: 0.8125rem; font-weight: 500; color: #18181B; display: inline-flex; align-items: center; gap: 6px; word-break: break-all; }
.reg-steps { margin: 0 0 14px 18px; padding: 0; display: flex; flex-direction: column; gap: 6px; font-size: 0.8125rem; color: #52525B; }
.reg-steps li { line-height: 1.5; }
.reg-steps strong { color: #18181B; font-weight: 600; }
.reg-footnote { font-size: 0.75rem; color: #71717A; line-height: 1.5; margin: 0; }
.reg-card { background: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); }
.reg-card--state { padding: 28px 24px; text-align: center; }
.reg-card-head { margin-bottom: 16px; }
.reg-card-title { font-size: 0.9375rem; font-weight: 650; color: #111827; margin: 0 0 4px 0; letter-spacing: -0.01em; }
.reg-card-desc { font-size: 0.8125rem; color: #71717A; margin: 0; line-height: 1.5; }
.reg-alert { display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: 10px; font-size: 0.8125rem; line-height: 1.5; margin-bottom: 14px; }
.reg-alert--error { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; }
.reg-alert svg { margin-top: 1px; flex-shrink: 0; }
.reg-form { display: flex; flex-direction: column; gap: 14px; }
.reg-field { display: flex; flex-direction: column; gap: 6px; }
.reg-label { font-size: 0.8125rem; font-weight: 600; color: #27272A; display: flex; align-items: center; gap: 6px; }
.reg-req { color: #EF4444; font-weight: 700; }
.reg-optional { font-weight: 400; color: #71717A; font-size: 0.75rem; }
.reg-input-wrap { display: flex; align-items: center; gap: 8px; min-height: 44px; border: 1px solid #D1D5DB; border-radius: 10px; background: #FFFFFF; padding: 0 10px 0 11px; transition: border-color 150ms ease, box-shadow 150ms ease, background 150ms ease; }
.reg-input-wrap.is-focused { border-color: #FF6A00; box-shadow: 0 0 0 3px rgba(255,106,0,0.12); }
.reg-input-wrap.has-error { border-color: #EF4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.10); }
.reg-input-wrap.is-readonly { background: #F4F4F5; border-color: #E4E4E7; }
.reg-input-icon { color: #71717A; flex-shrink: 0; }
.reg-input-wrap input { flex: 1; border: 0; outline: 0; background: transparent; font-size: 0.875rem; color: #18181B; font-family: var(--font); min-width: 0; }
.reg-input-wrap input::placeholder { color: #9CA3AF; }
.reg-input-wrap.is-readonly input { color: #52525B; }
.reg-visibility { border: 0; background: transparent; color: #71717A; width: 32px; height: 32px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
.reg-visibility:hover { background: #F4F4F5; color: #18181B; }
.reg-visibility:focus-visible { outline: 2px solid #FF6A00; outline-offset: 2px; }
.reg-hint { font-size: 0.75rem; color: #71717A; line-height: 1.4; }
.reg-field-error { font-size: 0.75rem; color: #DC2626; font-weight: 500; }
.reg-checks { display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0 0; }
.reg-check { display: inline-flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #71717A; }
.reg-check svg { width: 12px; height: 12px; border-radius: 50%; padding: 1px; background: #E4E4E7; color: #71717A; }
.reg-check.is-ok { color: #15803D; }
.reg-check.is-ok svg { background: #DCFCE7; color: #15803D; }
.reg-divider { height: 1px; background: #E4E4E7; margin: 2px 0; }
.reg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-weight: 600; border-radius: 10px; border: 1px solid transparent; text-decoration: none; cursor: pointer; transition: background 150ms ease, transform 150ms ease, opacity 150ms ease, box-shadow 150ms ease; font-family: var(--font); }
.reg-btn--primary { background: #111827; color: #FFFFFF; border-color: #111827; min-height: 44px; padding: 0 16px; font-size: 0.875rem; }
.reg-btn--primary:hover { background: #1F2937; }
.reg-btn--primary:active { transform: scale(0.99); }
.reg-btn--primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
.reg-btn--primary:focus-visible { outline: 2px solid #FF6A00; outline-offset: 2px; }
.reg-btn--submit { width: 100%; margin-top: 4px; }
.reg-legal { font-size: 0.6875rem; color: #71717A; text-align: center; margin: 0; line-height: 1.5; }
.reg-verify { display: inline-flex; align-items: center; gap: 10px; font-size: 0.875rem; color: #52525B; margin: auto; padding: 24px; }
.reg-state-icon { width: 32px; height: 32px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 12px; }
.reg-state-icon--error { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
.reg-state-icon--success { background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; }
.reg-state-title { font-size: 1.0625rem; font-weight: 700; letter-spacing: -0.02em; color: #111827; margin: 0 0 8px 0; }
.reg-state-desc { font-size: 0.875rem; color: #52525B; line-height: 1.6; margin: 0 0 16px 0; }
.spin { animation: regspin 0.8s linear infinite; }
@keyframes regspin { to { transform: rotate(360deg); } }
@media (max-width: 860px) {
  .reg-layout { grid-template-columns: 1fr; gap: 20px; }
  .reg-intro { padding-top: 0; }
}
@media (max-width: 520px) {
  .reg-topbar { padding: 0 12px; gap: 8px; }
  .reg-topbar-meta { display: none; }
  .reg-shell { padding: 20px 12px 24px; }
  .reg-title { font-size: 1.375rem; }
  .reg-subtitle { font-size: 0.875rem; }
  .reg-card { padding: 16px; border-radius: 14px; }
  .reg-card--state { padding: 20px 16px; }
  .reg-brand img { height: 22px; }
}
`;
