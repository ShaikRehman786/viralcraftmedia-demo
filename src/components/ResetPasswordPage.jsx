import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Lock, Loader2, Key, XCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [tokenValidating, setTokenValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await axios.get(`/api/employee/reset-password/${token}`);
        if (res.data.valid) {
          setTokenValid(true);
        } else {
          setTokenValid(false);
          setError('Invalid or expired reset token.');
        }
      } catch (err) {
        setTokenValid(false);
        setError(err.response?.data?.error || 'Invalid or expired reset token.');
      } finally {
        setTokenValidating(false);
      }
    };
    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`/api/employee/reset-password/${token}`, { password });
      if (res.data.success) {
        setMessage('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Link may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0E0E10',
      backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 106, 0, 0.08) 0%, transparent 60%)',
      padding: '24px',
      fontFamily: 'var(--font)'
    }}>
      <div className="login-card" style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 106, 0, 0.1)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        color: '#FFFFFF'
      }}>
        {/* Logo/Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <a href="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
            <img src="/logoooooooooo.png" alt="ViralCraftMedia" style={{ height: '48px', margin: '0 auto 12px auto' }} />
          </a>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', letterSpacing: '0.05em' }}>
            PASSWORD RECOVERY PORTAL
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#EF4444',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            color: '#10B981',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}

        {tokenValidating ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
            <Loader2 size={36} className="spinner" style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)', marginBottom: '16px' }} />
            <p style={{ fontSize: '0.9rem', color: '#A1A1AA' }}>Validating reset token...</p>
          </div>
        ) : !tokenValid ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ color: '#EF4444', marginBottom: '16px' }}>
              <XCircle size={48} style={{ margin: '0 auto' }} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '10px' }}>Link Invalid or Expired</h3>
            <p style={{ fontSize: '0.88rem', color: '#A1A1AA', marginBottom: '24px', lineHeight: '1.5' }}>
              The password reset link is invalid, has been reused, or has expired. Please request a new password reset link.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(255, 106, 0, 0.2)',
                transition: 'opacity 0.2s'
              }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#A1A1AA', marginBottom: '8px', fontWeight: '500' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '12px 16px 12px 48px',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#A1A1AA', marginBottom: '8px', fontWeight: '500' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '12px 16px 12px 48px',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-deep))',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontSize: '0.95rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(255, 106, 0, 0.2)',
                transition: 'transform 0.1s, opacity 0.2s'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                  Resetting Password...
                </>
              ) : (
                'Save New Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
