import React, { useState } from 'react';
import axios from 'axios';
import { Lock, Mail, ArrowLeft, Loader2, Key, Eye, EyeOff } from 'lucide-react';

axios.defaults.withCredentials = true;

export default function PartnerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/partners/login', { email, password });
      if (res.data.success) {
        window.location.href = '/partner';
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0B0B0C',
      color: '#FFF',
      fontFamily: 'Inter, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '24px',
        padding: '48px 40px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px'
      }}>
        {/* Back Link */}
        <a href="/" style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: 'rgba(255, 255, 255, 0.5)',
          textDecoration: 'none',
          fontSize: '0.85rem',
          fontWeight: 500,
          transition: 'color 0.2s',
          alignSelf: 'flex-start'
        }} onMouseEnter={(e) => e.target.style.color = '#FFF'} onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.5)'}>
          <ArrowLeft size={16} /> Back to Website
        </a>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Partner Portal</h2>
          <p style={{ fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.5)', margin: 0 }}>Log in to submit referrals and track your commissions.</p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#FCA5A5',
            fontSize: '0.82rem',
            lineHeight: 1.4
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Email Address</label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Mail size={18} style={{
                position: 'absolute',
                left: '16px',
                color: focusedInput === 'email' ? 'var(--accent, #F97316)' : 'rgba(255,255,255,0.3)',
                transition: 'color 0.2s'
              }} />
              <input
                type="email"
                placeholder="agency@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${focusedInput === 'email' ? 'var(--accent, #F97316)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '12px',
                  color: '#FFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Password</label>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Lock size={18} style={{
                position: 'absolute',
                left: '16px',
                color: focusedInput === 'password' ? 'var(--accent, #F97316)' : 'rgba(255, 255, 255, 0.3)',
                transition: 'color 0.2s'
              }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 48px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${focusedInput === 'password' ? 'var(--accent, #F97316)' : 'rgba(255, 255, 255, 0.08)'}`,
                  borderRadius: '12px',
                  color: '#FFF',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'var(--accent, #F97316)',
              border: 'none',
              borderRadius: '12px',
              color: '#FFF',
              fontSize: '0.92rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '12px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            {loading ? (
              <Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              'Sign In as Partner'
            )}
          </button>
        </form>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
