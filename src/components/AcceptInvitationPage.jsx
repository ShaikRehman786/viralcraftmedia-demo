import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Lock, Sparkles, Loader2, PenTool, CheckCircle, XCircle, AlertTriangle, User as UserIcon } from 'lucide-react';

axios.defaults.withCredentials = true;

export default function AcceptInvitationPage() {
  const { token: routeToken } = useParams();
  const queryToken = new URLSearchParams(window.location.search).get('token');
  const token = routeToken || queryToken;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [skills, setSkills] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // UI state tracking for hover/focus effects
  const [focusedInput, setFocusedInput] = useState(null);
  const [btnHovered, setBtnHovered] = useState(false);
  const [btnPressed, setBtnPressed] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      setError('Full Name is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await axios.post(`/api/auth/accept-invitation/${token}`, {
        name,
        password,
        department,
        skills
      });
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAFA',
        color: '#18181B',
        fontFamily: 'var(--font)',
        padding: '24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 size={32} className="spinner" style={{ color: '#F97316', margin: '0 auto 16px auto' }} />
          <p style={{ fontSize: '0.9rem', color: '#71717A', fontWeight: '500' }}>Verifying invitation token...</p>
        </div>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAFA',
        color: '#18181B',
        fontFamily: 'var(--font)',
        padding: '24px'
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E4E4E7',
          borderRadius: '20px',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: '#FEF2F2',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={22} color="#EF4444" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.03em', color: '#18181B', marginBottom: '8px' }}>
            Invitation Link Expired
          </h2>
          <p style={{ color: '#71717A', fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '28px' }}>
            {error || 'This registration link is invalid, expired, or has already been used. Please contact your administrator to request a new invitation.'}
          </p>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              background: '#18181B',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px',
              borderRadius: '12px',
              fontWeight: '600',
              textDecoration: 'none',
              fontSize: '0.9rem',
              transition: 'background-color 0.2s'
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FAFAFA',
        color: '#18181B',
        fontFamily: 'var(--font)',
        padding: '24px'
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E4E4E7',
          borderRadius: '20px',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: '#F0FDF4',
            marginBottom: '20px'
          }}>
            <CheckCircle size={22} color="#10B981" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.03em', color: '#18181B', marginBottom: '8px' }}>
            Registration Complete
          </h2>
          <p style={{ color: '#71717A', fontSize: '0.88rem', lineHeight: '1.6', marginBottom: '28px' }}>
            Your credentials have been configured successfully. Your account status is now set to <strong>Pending Approval</strong>. 
            An administrator will review and activate your access shortly.
          </p>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              background: '#18181B',
              color: '#FFFFFF',
              border: 'none',
              padding: '14px',
              borderRadius: '12px',
              fontWeight: '600',
              textDecoration: 'none',
              fontSize: '0.9rem'
            }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA',
      color: '#18181B',
      fontFamily: 'var(--font)',
      padding: '24px'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E4E4E7',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.03)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'rgba(249, 115, 22, 0.1)',
            marginBottom: '16px'
          }}>
            <Sparkles size={22} color="#F97316" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', letterSpacing: '-0.03em', margin: '0 0 6px 0' }}>Join ViralCraft Media</h2>
          <p style={{ color: '#71717A', fontSize: '0.88rem', margin: 0 }}>Configure your password & complete profile</p>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '10px',
            padding: '10px 14px',
            color: '#991B1B',
            fontSize: '0.85rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <XCircle size={16} color="#EF4444" style={{ flexShrink: 0 }} />
            <span style={{ fontWeight: '500' }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#18181B', marginBottom: '8px' }}>
              Full Name
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#FAFAFA',
              border: `1px solid ${focusedInput === 'name' ? '#F97316' : '#E4E4E7'}`,
              borderRadius: '12px',
              padding: '0 14px',
              height: '52px',
              transition: 'all 200ms ease',
              boxShadow: focusedInput === 'name' ? '0 0 0 3px rgba(249, 115, 22, 0.15)' : 'none'
            }}>
              <UserIcon size={16} color="#71717A" style={{ marginRight: '10px', flexShrink: 0, opacity: 0.7 }} />
              <input
                type="text"
                placeholder="Your Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocusedInput('name')}
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

          {/* Email (Read Only representation) */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#71717A', marginBottom: '8px' }}>
              Email address
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F4F4F5',
              border: '1px solid #E4E4E7',
              borderRadius: '12px',
              padding: '0 14px',
              height: '52px',
              color: '#71717A'
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '400' }}>{email}</span>
            </div>
          </div>

          {/* Choose Password */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#18181B', marginBottom: '8px' }}>
              Choose password
            </label>
            <div style={{
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
                type="password"
                placeholder="At least 8 characters"
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
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#18181B', marginBottom: '8px' }}>
              Confirm password
            </label>
            <div style={{
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
                type="password"
                placeholder="Confirm password"
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
            </div>
          </div>

          {/* Department (Optional) */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#18181B', marginBottom: '8px' }}>
              Department <span style={{ color: '#71717A', fontWeight: '400' }}>(Optional)</span>
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#FAFAFA',
              border: `1px solid ${focusedInput === 'dept' ? '#F97316' : '#E4E4E7'}`,
              borderRadius: '12px',
              padding: '0 14px',
              height: '52px',
              transition: 'all 200ms ease',
              boxShadow: focusedInput === 'dept' ? '0 0 0 3px rgba(249, 115, 22, 0.15)' : 'none'
            }}>
              <PenTool size={16} color="#71717A" style={{ marginRight: '10px', flexShrink: 0, opacity: 0.7 }} />
              <input
                type="text"
                placeholder="e.g. Creative, Post-Production"
                value={department}
                onChange={e => setDepartment(e.target.value)}
                onFocus={() => setFocusedInput('dept')}
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

          {/* Skills (Optional) */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: '500', color: '#18181B', marginBottom: '8px' }}>
              Skills <span style={{ color: '#71717A', fontWeight: '400' }}>(Optional, comma-separated)</span>
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: '#FAFAFA',
              border: `1px solid ${focusedInput === 'skills' ? '#F97316' : '#E4E4E7'}`,
              borderRadius: '12px',
              padding: '0 14px',
              height: '52px',
              transition: 'all 200ms ease',
              boxShadow: focusedInput === 'skills' ? '0 0 0 3px rgba(249, 115, 22, 0.15)' : 'none'
            }}>
              <PenTool size={16} color="#71717A" style={{ marginRight: '10px', flexShrink: 0, opacity: 0.7 }} />
              <input
                type="text"
                placeholder="e.g. Premiere, Color Grading, Sound Design"
                value={skills}
                onChange={e => setSkills(e.target.value)}
                onFocus={() => setFocusedInput('skills')}
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
            {loading ? (
              <>
                <Loader2 size={16} className="spinner" />
                Configuring Profile...
              </>
            ) : (
              'Complete Registration'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
