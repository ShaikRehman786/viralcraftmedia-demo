import React, { useState } from 'react';
import axios from 'axios';
import { Lock, Mail, ArrowLeft, Loader2, LogIn, Key, Eye, EyeOff, XCircle, CheckCircle } from 'lucide-react';

axios.defaults.withCredentials = true;

const redirectByRole = (role) => {
  const normalized = role ? role.toUpperCase() : '';
  if (normalized === 'BACKUP_ADMIN') {
    window.location.href = '/backup';
  } else if (normalized === 'SUPER_ADMIN') {
    window.location.href = '/admin';
  } else if (normalized === 'MANAGER') {
    window.location.href = '/manager';
  } else if (normalized === 'EMPLOYEE') {
    window.location.href = '/employee';
  } else if (normalized === 'CLIENT') {
    window.location.href = '/client';
  } else {
    window.location.href = '/dashboard';
  }
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [message, setMessage] = useState('');
  
  // Forced password change status
  const [mustChange, setMustChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI state tracking for hover / focus effects
  const [focusedInput, setFocusedInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [btnHovered, setBtnHovered] = useState(false);
  const [btnPressed, setBtnPressed] = useState(false);
  const [forgotHovered, setForgotHovered] = useState(false);
  const [backHovered, setBackHovered] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data.success) {
        const user = res.data.user;
        if (user.mustChangePassword) {
          setMustChange(true);
          setLoading(false);
          return;
        }
        redirectByRole(res.data.role);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/employee/forgot-password', { email });
      if (res.data.success) {
        setMessage('Reset instructions sent to your email.');
        setTimeout(() => {
          setForgotMode(false);
          setMessage('');
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to request reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      setError('New passwords do not match or are empty');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/change-password', { password: newPassword });
      if (res.data.success) {
        setMessage('Password updated successfully. Redirecting...');
        setTimeout(() => {
          axios.get('/api/auth/me').then(meRes => {
            redirectByRole(meRes.data.user.role);
          }).catch(() => {
            window.location.href = '/login';
          });
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change temporary password.');
    } finally {
      setLoading(false);
    }
  };

  // Determine current form state to display correct titles
  const headingText = mustChange 
    ? 'Update Password' 
    : forgotMode 
      ? 'Reset Password' 
      : 'Welcome Back';

  const subtitleText = mustChange
    ? 'For security, you must update your temporary password to continue.'
    : forgotMode
      ? 'Enter your email and we\'ll send reset instructions.'
      : 'Sign in to continue.';

  return (
    <div className="login-page-wrapper" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA', // Pure SaaS light background
      padding: '24px',
      fontFamily: 'var(--font)',
      position: 'relative'
    }}>
      {/* Login Card */}
      <div className="login-card" style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: '440px',
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '20px',
        padding: '40px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.01)',
        color: '#18181B',
        transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease'
      }}>
        {/* Logo & Headers */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <a href="/" style={{ display: 'inline-block', textDecoration: 'none', marginBottom: '20px' }}>
            <img src="/logoooooooooo.png" alt="ViralCraftMedia" style={{ height: '36px', width: 'auto', display: 'block', margin: '0 auto' }} />
          </a>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#18181B',
            letterSpacing: '-0.03em',
            margin: '0 0 6px 0',
            lineHeight: '1.2'
          }}>
            {headingText}
          </h2>
          <p style={{
            fontSize: '0.88rem',
            color: '#71717A',
            margin: 0,
            fontWeight: '400'
          }}>
            {subtitleText}
          </p>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#991B1B',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <XCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        {/* Success/Info Notification Banner */}
        {message && (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #A7F3D0',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#065F46',
            fontSize: '0.85rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={16} color="#10B981" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: '500' }}>{message}</span>
          </div>
        )}

        {/* Dynamic Authentication Forms */}
        {mustChange ? (
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#18181B', marginBottom: '8px' }}>
                New password
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: '#FAFAFA',
                border: `1px solid ${focusedInput === 'newPassword' ? '#F97316' : '#E4E4E7'}`,
                borderRadius: '12px',
                padding: '0 14px',
                height: '52px',
                transition: 'all 200ms ease',
                boxShadow: focusedInput === 'newPassword' ? '0 0 0 3px rgba(249, 115, 22, 0.15)' : 'none'
              }}>
                <Lock size={16} color="#71717A" style={{ marginRight: '10px', flexShrink: 0, opacity: 0.7 }} />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  onFocus={() => setFocusedInput('newPassword')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: '#18181B',
                    width: '100%',
                    height: '100%',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font)',
                    fontWeight: '400'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#71717A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    marginLeft: '6px',
                    opacity: 0.7
                  }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#18181B', marginBottom: '8px' }}>
                Confirm new password
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: '#FAFAFA',
                border: `1px solid ${focusedInput === 'confirmPassword' ? '#F97316' : '#E4E4E7'}`,
                borderRadius: '12px',
                padding: '0 14px',
                height: '52px',
                transition: 'all 200ms ease',
                boxShadow: focusedInput === 'confirmPassword' ? '0 0 0 3px rgba(249, 115, 22, 0.15)' : 'none'
              }}>
                <Lock size={16} color="#71717A" style={{ marginRight: '10px', flexShrink: 0, opacity: 0.7 }} />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repeat strong password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusedInput('confirmPassword')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: '#18181B',
                    width: '100%',
                    height: '100%',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font)',
                    fontWeight: '400'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#71717A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    marginLeft: '6px',
                    opacity: 0.7
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '52px',
                background: '#18181B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '0.92rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 200ms ease',
                transform: btnPressed ? 'scale(0.985)' : btnHovered ? 'translateY(-1px)' : 'none',
                boxShadow: btnHovered 
                  ? '0 4px 12px rgba(24, 24, 27, 0.15)' 
                  : '0 2px 4px rgba(24, 24, 27, 0.05)',
                opacity: loading ? 0.9 : 1
              }}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => { setBtnHovered(false); setBtnPressed(false); }}
              onMouseDown={() => setBtnPressed(true)}
              onMouseUp={() => setBtnPressed(false)}
            >
              {loading ? <Loader2 size={16} className="spinner" /> : <LogIn size={16} />}
              {loading ? 'Updating Password...' : 'Save & Continue'}
            </button>
          </form>
        ) : !forgotMode ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#18181B', marginBottom: '8px' }}>
                Email address
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: '#FAFAFA',
                border: `1px solid ${focusedInput === 'email' ? '#F97316' : '#E4E4E7'}`,
                borderRadius: '12px',
                padding: '0 14px',
                height: '52px',
                transition: 'all 200ms ease',
                boxShadow: focusedInput === 'email' ? '0 0 0 3px rgba(249, 115, 22, 0.15)' : 'none'
              }}>
                <Mail size={16} color="#71717A" style={{ marginRight: '10px', flexShrink: 0, opacity: 0.7 }} />
                <input
                  type="email"
                  placeholder="enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: '#18181B',
                    width: '100%',
                    height: '100%',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font)',
                    fontWeight: '400'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: '500', color: '#18181B', margin: 0 }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#F97316',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    fontWeight: '500',
                    padding: 0,
                    textDecoration: forgotHovered ? 'underline' : 'none',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={() => setForgotHovered(true)}
                  onMouseLeave={() => setForgotHovered(false)}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: '#FAFAFA',
                border: `1px solid ${focusedInput === 'password' ? '#F97316' : '#E4E4E7'}`,
                borderRadius: '12px',
                padding: '0 14px',
                height: '52px',
                transition: 'all 200ms ease',
                boxShadow: focusedInput === 'password' ? '0 0 0 3px rgba(249, 115, 22, 0.15)' : 'none'
              }}>
                <Lock size={16} color="#71717A" style={{ marginRight: '10px', flexShrink: 0, opacity: 0.7 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: '#18181B',
                    width: '100%',
                    height: '100%',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font)',
                    fontWeight: '400'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: '#71717A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.2s',
                    marginLeft: '6px',
                    opacity: 0.7
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '52px',
                background: '#18181B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '0.92rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 200ms ease',
                transform: btnPressed ? 'scale(0.985)' : btnHovered ? 'translateY(-1px)' : 'none',
                boxShadow: btnHovered 
                  ? '0 4px 12px rgba(24, 24, 27, 0.15)' 
                  : '0 2px 4px rgba(24, 24, 27, 0.05)',
                opacity: loading ? 0.9 : 1
              }}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => { setBtnHovered(false); setBtnPressed(false); }}
              onMouseDown={() => setBtnPressed(true)}
              onMouseUp={() => setBtnPressed(false)}
            >
              {loading ? <Loader2 size={16} className="spinner" /> : <LogIn size={16} />}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#18181B', marginBottom: '8px' }}>
                Email address
              </label>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: '#FAFAFA',
                border: `1px solid ${focusedInput === 'forgotEmail' ? '#F97316' : '#E4E4E7'}`,
                borderRadius: '12px',
                padding: '0 14px',
                height: '52px',
                transition: 'all 200ms ease',
                boxShadow: focusedInput === 'forgotEmail' ? '0 0 0 3px rgba(249, 115, 22, 0.15)' : 'none'
              }}>
                <Mail size={16} color="#71717A" style={{ marginRight: '10px', flexShrink: 0, opacity: 0.7 }} />
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedInput('forgotEmail')}
                  onBlur={() => setFocusedInput(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    outline: 'none',
                    color: '#18181B',
                    width: '100%',
                    height: '100%',
                    fontSize: '0.9rem',
                    fontFamily: 'var(--font)',
                    fontWeight: '400'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '52px',
                background: '#18181B',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '0.92rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 200ms ease',
                transform: btnPressed ? 'scale(0.985)' : btnHovered ? 'translateY(-1px)' : 'none',
                boxShadow: btnHovered 
                  ? '0 4px 12px rgba(24, 24, 27, 0.15)' 
                  : '0 2px 4px rgba(24, 24, 27, 0.05)',
                opacity: loading ? 0.9 : 1
              }}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => { setBtnHovered(false); setBtnPressed(false); }}
              onMouseDown={() => setBtnPressed(true)}
              onMouseUp={() => setBtnPressed(false)}
            >
              {loading ? <Loader2 size={16} className="spinner" /> : <Key size={16} />}
              {loading ? 'Requesting Reset...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => setForgotMode(false)}
              onMouseEnter={() => setBackHovered(true)}
              onMouseLeave={() => setBackHovered(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#71717A',
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                gap: '6px',
                fontWeight: '500',
                textDecoration: backHovered ? 'underline' : 'none',
                transition: 'color 0.2s',
                marginTop: '16px'
              }}
            >
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
