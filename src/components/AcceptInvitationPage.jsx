import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Loader2, CheckCircle, AlertTriangle, Clock, UserCheck, UserX, User as UserIcon, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';

axios.defaults.withCredentials = true;

const getBackendApiBase = () => {
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  if (isLocal) {
    return (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
  }
  return (import.meta.env.VITE_API_URL || 'https://viralcraftmedia-demo.onrender.com').replace(/\/+$/, '');
};

export default function AcceptInvitationPage() {
  const { token: routeToken } = useParams();
  const queryToken = new URLSearchParams(window.location.search).get('token');
  let extractedToken = (routeToken || queryToken || '').replace(/\/+$/, '').trim();
  try {
    if (extractedToken.includes('%')) {
      extractedToken = decodeURIComponent(extractedToken).trim();
    }
  } catch {}
  const token = extractedToken;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [skills, setSkills] = useState('');

  // Explicit lifecycle states: 'CHECKING' | 'VALID' | 'EXPIRED' | 'ALREADY_USED' | 'REVOKED' | 'INVALID' | 'SUCCESS'
  const [pageState, setPageState] = useState('CHECKING');
  const [loading, setLoading] = useState(false);
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
      setPageState('INVALID');
      setError('Invitation link is missing or incomplete. Please check the full link in your email.');
      return;
    }

    const verifyToken = async () => {
      try {
        let res;
        try {
          res = await axios.get(`/api/auth/verify-invitation/${encodeURIComponent(token)}`);
        } catch (initialErr) {
          // If relative proxy returns 404 or fails, fallback to environment-matched backend
          if (initialErr.response?.status === 404 || !initialErr.response) {
            res = await axios.get(`${getBackendApiBase()}/api/auth/verify-invitation/${encodeURIComponent(token)}`);
          } else {
            throw initialErr;
          }
        }

        if (res.data.success) {
          setName(res.data.user.name || '');
          setEmail(res.data.user.email || '');
          setRole(res.data.user.role || '');
          setDepartment(res.data.user.department || '');
          setPageState('VALID');
        }
      } catch (err) {
        const errData = err.response?.data;
        const code = errData?.code;
        const status = err.response?.status;
        const isNetworkOrServer = !err.response || status >= 500;
        const msg = errData?.error || (isNetworkOrServer ? "We couldn't verify this invitation right now. Please try again." : 'This invitation link could not be verified.');
        setError(msg);

        if (code === 'INVITATION_EXPIRED') {
          setPageState('EXPIRED');
        } else if (code === 'INVITATION_ALREADY_USED') {
          setPageState('ALREADY_USED');
        } else if (code === 'INVITATION_REVOKED') {
          setPageState('REVOKED');
        } else if (isNetworkOrServer) {
          setPageState('SERVER_ERROR');
        } else {
          setPageState('INVALID');
        }
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
      let res;
      try {
        res = await axios.post(`/api/auth/accept-invitation/${encodeURIComponent(token)}`, {
          token,
          name,
          password,
          department,
          skills
        });
      } catch (initialErr) {
        if (initialErr.response?.status === 404 || !initialErr.response) {
          res = await axios.post(`${getBackendApiBase()}/api/auth/accept-invitation/${encodeURIComponent(token)}`, {
            token,
            name,
            password,
            department,
            skills
          });
        } else {
          throw initialErr;
        }
      }

      if (res.data.success) {
        setPageState('SUCCESS');
      }
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

  // STATE: CHECKING INVITATION
  if (pageState === 'CHECKING') {
    return (
      <div className="reg-page">
        <div className="reg-verify">
          <Loader2 size={22} className="spin" style={{ color: '#FF6A00' }} />
          <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#3F3F46' }}>Verifying invitation credentials…</span>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  // STATE: INVITATION EXPIRED
  if (pageState === 'EXPIRED') {
    return (
      <div className="reg-page">
        <div className="reg-shell reg-shell--narrow">
          <div className="reg-card reg-card--state">
            <div className="reg-state-icon reg-state-icon--warning"><Clock size={20} /></div>
            <h1 className="reg-state-title">Invitation Link Expired</h1>
            <p className="reg-state-desc">
              {error || 'This invitation link has expired. For security, invitations are active for 7 days.'}
            </p>
            <p className="reg-state-note">
              Please contact your administrator or manager to request a fresh invitation link.
            </p>
            <div className="reg-actions-row">
              <Link to="/login" className="reg-btn reg-btn--secondary">Sign In</Link>
              <Link to="/" className="reg-btn reg-btn--primary">Back to Home</Link>
            </div>
          </div>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  // STATE: INVITATION ALREADY USED
  if (pageState === 'ALREADY_USED') {
    return (
      <div className="reg-page">
        <div className="reg-shell reg-shell--narrow">
          <div className="reg-card reg-card--state">
            <div className="reg-state-icon reg-state-icon--info"><UserCheck size={20} /></div>
            <h1 className="reg-state-title">Invitation Already Accepted</h1>
            <p className="reg-state-desc">
              {error || 'This invitation has already been accepted and your account is active.'}
            </p>
            <p className="reg-state-note">
              You can log in directly using your email address and the password you chose during setup.
            </p>
            <Link to="/login" className="reg-btn reg-btn--primary">Go to Sign In <ArrowRight size={14} /></Link>
          </div>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  // STATE: INVITATION REVOKED OR SUPERSEDED
  if (pageState === 'REVOKED') {
    return (
      <div className="reg-page">
        <div className="reg-shell reg-shell--narrow">
          <div className="reg-card reg-card--state">
            <div className="reg-state-icon reg-state-icon--warning"><UserX size={20} /></div>
            <h1 className="reg-state-title">Invitation Revoked or Replaced</h1>
            <p className="reg-state-desc">
              {error || 'This invitation link has been cancelled or replaced with a newer invitation.'}
            </p>
            <p className="reg-state-note">
              If an administrator resent your invitation, please check your inbox for the most recent email.
            </p>
            <div className="reg-actions-row">
              <Link to="/login" className="reg-btn reg-btn--secondary">Sign In</Link>
              <Link to="/" className="reg-btn reg-btn--primary">Back to Home</Link>
            </div>
          </div>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  // STATE: SERVER OR NETWORK ERROR
  if (pageState === 'SERVER_ERROR') {
    return (
      <div className="reg-page">
        <div className="reg-shell reg-shell--narrow">
          <div className="reg-card reg-card--state">
            <div className="reg-state-icon reg-state-icon--warning"><AlertTriangle size={20} /></div>
            <h1 className="reg-state-title">Verification Temporarily Unavailable</h1>
            <p className="reg-state-desc">
              {error || "We couldn't verify this invitation right now. Please try again."}
            </p>
            <p className="reg-state-note">
              This may be due to a brief network issue or server maintenance. Please try refreshing the page.
            </p>
            <div className="reg-actions-row">
              <button type="button" onClick={() => window.location.reload()} className="reg-btn reg-btn--primary">Retry Verification</button>
              <Link to="/" className="reg-btn reg-btn--secondary">Back to Home</Link>
            </div>
          </div>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  // STATE: INVALID / MALFORMED INVITATION
  if (pageState === 'INVALID') {
    return (
      <div className="reg-page">
        <div className="reg-shell reg-shell--narrow">
          <div className="reg-card reg-card--state">
            <div className="reg-state-icon reg-state-icon--error"><AlertTriangle size={20} /></div>
            <h1 className="reg-state-title">Invalid Invitation Link</h1>
            <p className="reg-state-desc">
              {error || 'This invitation link is not recognized or may be incomplete.'}
            </p>
            <p className="reg-state-note">
              Please ensure you copied the entire URL from the email you received, or ask your administrator to send a new invitation.
            </p>
            <Link to="/" className="reg-btn reg-btn--primary">Back to Home</Link>
          </div>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  // STATE: SUCCESS (ACCOUNT ACTIVATED)
  if (pageState === 'SUCCESS') {
    return (
      <div className="reg-page">
        <div className="reg-shell reg-shell--narrow">
          <div className="reg-card reg-card--state">
            <div className="reg-state-icon reg-state-icon--success"><CheckCircle size={22} /></div>
            <h1 className="reg-state-title">Account Created Successfully</h1>
            <p className="reg-state-desc">
              Your profile is now <strong>active</strong>. You can sign in immediately to access your workspace and assigned projects.
            </p>
            <Link to="/login" className="reg-btn reg-btn--primary">Go to Sign In <ArrowRight size={14} /></Link>
            <p className="reg-hint" style={{ marginTop: '14px' }}>Sign in using your email (<strong>{email}</strong>) and password.</p>
          </div>
        </div>
        <style>{regStyles}</style>
      </div>
    );
  }

  // STATE: VALID INVITATION -> RENDER SIGNUP FORM
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
                <span className="reg-meta-label">Role Assignment</span>
                <span className="reg-meta-value">{roleLabel}</span>
              </div>
              {department && (
                <div className="reg-meta-row">
                  <span className="reg-meta-label">Department</span>
                  <span className="reg-meta-value">{department}</span>
                </div>
              )}
            </div>
            <ol className="reg-steps">
              <li><strong>Activate access:</strong> Choose a secure password (8+ characters).</li>
              <li><strong>Instant access:</strong> Log in immediately to view your dashboard.</li>
            </ol>
            <p className="reg-footnote">Need assistance? Reach our team at <a href="mailto:support@viralcraftmedia.com" style={{ color: '#FF6A00', textDecoration: 'none' }}>support@viralcraftmedia.com</a>.</p>
          </div>

          <div className="reg-card">
            <div className="reg-card-head">
              <h2 className="reg-card-title">Account details</h2>
              <p className="reg-card-desc">Complete your profile to activate your account.</p>
            </div>

            {error && (
              <div className="reg-alert reg-alert--error" role="alert">
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="reg-form" noValidate>
              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-email">Work Email</label>
                <div className="reg-input-wrap is-readonly">
                  <input id="reg-email" type="email" value={email} readOnly disabled />
                </div>
                <span className="reg-hint">Invitations are strictly bound to this email address.</span>
              </div>

              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-name">Full Name <span className="reg-req">*</span></label>
                <div className={`reg-input-wrap ${focusedInput === 'name' ? 'is-focused' : ''} ${fieldErrors.name ? 'has-error' : ''}`}>
                  <UserIcon size={16} className="reg-input-icon" />
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={e => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: '' })); }}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="Sri Harsha"
                    autoComplete="name"
                    required
                  />
                </div>
                {fieldErrors.name && <span className="reg-field-error">{fieldErrors.name}</span>}
              </div>

              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-password">Password <span className="reg-req">*</span></label>
                <div className={`reg-input-wrap ${focusedInput === 'pw' ? 'is-focused' : ''} ${fieldErrors.password ? 'has-error' : ''}`}>
                  <Lock size={16} className="reg-input-icon" />
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: '' })); }}
                    onFocus={() => setFocusedInput('pw')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="reg-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {fieldErrors.password && <span className="reg-field-error">{fieldErrors.password}</span>}
              </div>

              <div className="reg-field">
                <label className="reg-label" htmlFor="reg-confirm">Confirm Password <span className="reg-req">*</span></label>
                <div className={`reg-input-wrap ${focusedInput === 'cpw' ? 'is-focused' : ''} ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                  <Lock size={16} className="reg-input-icon" />
                  <input
                    id="reg-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setFieldErrors(prev => ({ ...prev, confirmPassword: '' })); }}
                    onFocus={() => setFocusedInput('cpw')}
                    onBlur={() => setFocusedInput(null)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="reg-visibility"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <span className="reg-field-error">{fieldErrors.confirmPassword}</span>}
              </div>

              <div className="reg-checks">
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
                {loading ? <><Loader2 size={15} className="spin" /> Activating account…</> : <>Create account <ArrowRight size={15} /></>}
              </button>
              <p className="reg-legal">By clicking "Create account", your login credentials will be activated immediately.</p>
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
.reg-shell--narrow { max-width: 480px; }
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
.reg-card--state { padding: 36px 28px; text-align: center; }
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
.reg-btn--primary { background: #111827; color: #FFFFFF; border-color: #111827; min-height: 44px; padding: 0 18px; font-size: 0.875rem; }
.reg-btn--primary:hover { background: #1F2937; }
.reg-btn--primary:active { transform: scale(0.99); }
.reg-btn--primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
.reg-btn--primary:focus-visible { outline: 2px solid #FF6A00; outline-offset: 2px; }
.reg-btn--secondary { background: #FFFFFF; color: #374151; border-color: #D1D5DB; min-height: 44px; padding: 0 18px; font-size: 0.875rem; }
.reg-btn--secondary:hover { background: #F9FAFB; }
.reg-btn--submit { width: 100%; margin-top: 4px; }
.reg-actions-row { display: flex; gap: 12px; justify-content: center; margin-top: 8px; }
.reg-legal { font-size: 0.6875rem; color: #71717A; text-align: center; margin: 0; line-height: 1.5; }
.reg-verify { display: inline-flex; align-items: center; gap: 12px; font-size: 0.9375rem; color: #52525B; margin: auto; padding: 32px; }
.reg-state-icon { width: 44px; height: 44px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.reg-state-icon--error { background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; }
.reg-state-icon--warning { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
.reg-state-icon--info { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
.reg-state-icon--success { background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; }
.reg-state-title { font-size: 1.25rem; font-weight: 750; letter-spacing: -0.02em; color: #111827; margin: 0 0 10px 0; }
.reg-state-desc { font-size: 0.9rem; color: #4B5563; line-height: 1.6; margin: 0 0 8px 0; }
.reg-state-note { font-size: 0.8125rem; color: #6B7280; line-height: 1.5; margin: 0 0 20px 0; }
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
  .reg-card--state { padding: 24px 16px; }
  .reg-actions-row { flex-direction: column; }
  .reg-brand img { height: 22px; }
}
`;
