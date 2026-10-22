import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Briefcase, 
  ArrowRight, 
  Lock, 
  ExternalLink, 
  Activity, 
  Database, 
  Layers, 
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { PARTNER_LOGIN_PATH } from '../../utils/partnerAuth.js';

export default function CRMLandingPortal() {
  const [activeTab, setActiveTab] = useState('overview');

  const portals = [
    {
      title: 'Super Admin & Operations',
      badge: 'Full Access',
      desc: 'Central command for executive leadership. Financial reporting, team capacity planning, and agency audit trails.',
      link: '/login',
      role: 'SUPER_ADMIN / ADMIN',
      icon: ShieldCheck,
      color: '#F97316'
    },
    {
      title: 'Project Management & Production',
      badge: 'Operations',
      desc: 'Kanban delivery queues, video editor allocations, turnaround tracking, and automated client notifications.',
      link: '/login',
      role: 'MANAGER / PM',
      icon: Layers,
      color: '#3B82F6'
    },
    {
      title: 'Editor & Creative Workspace',
      badge: 'Production',
      desc: 'Assigned raw footage queues, client revision instructions, asset uploads, and task completion approvals.',
      link: '/login',
      role: 'EMPLOYEE / EDITOR',
      icon: Briefcase,
      color: '#8B5CF6'
    },
    {
      title: 'Client Review & Approval Portal',
      badge: 'External',
      desc: 'Secure dashboard for clients to inspect milestones, stream drafts, approve revisions, and download invoices.',
      link: '/login',
      role: 'CLIENT',
      icon: Users,
      color: '#10B981'
    },
    {
      title: 'Partner Affiliate Network',
      badge: 'Affiliate',
      desc: 'Affiliate campaign generator, real-time conversion click tracking, referral commission balances, and payouts.',
      link: PARTNER_LOGIN_PATH,
      role: 'PARTNER',
      icon: TrendingUp,
      color: '#EC4899'
    },
    {
      title: 'Database & System Backups',
      badge: 'DevOps & Security',
      desc: 'Air-gapped manual snapshot triggers, automated MongoDB cluster backups, restoration points, and audit logs.',
      link: '/backup',
      role: 'BACKUP_ADMIN',
      icon: Database,
      color: '#6366F1'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090A0F',
      color: '#F8FAFC',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Background Subtle Gradient & Grid */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '600px',
        background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(249, 115, 22, 0.15), transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Enterprise Top Navigation */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        backdropFilter: 'blur(16px)',
        background: 'rgba(9, 10, 15, 0.75)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo & Platform Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img 
              src="/logoooooooooo.png" 
              alt="ViralCraftMedia Enterprise" 
              style={{ height: '34px', width: 'auto' }} 
            />
            <div style={{ height: '20px', width: '1px', background: 'rgba(255, 255, 255, 0.15)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#F8FAFC' }}>
                AGENCY CRM
              </span>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 600, 
                textTransform: 'uppercase', 
                background: 'rgba(249, 115, 22, 0.12)', 
                color: '#F97316', 
                padding: '2px 8px', 
                borderRadius: '6px',
                border: '1px solid rgba(249, 115, 22, 0.25)',
                letterSpacing: '0.04em'
              }}>
                Enterprise Suite
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: '#94A3B8' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              <span>Production Services Online</span>
            </div>
            <a 
              href="/login" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                background: 'var(--accent, #F97316)',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.25)'
              }}
            >
              <Lock size={14} /> Staff & Client Sign In
            </a>
          </div>
        </div>
      </header>

      {/* Main Enterprise Showcase */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: '1280px', margin: '0 auto', padding: '60px 24px 100px' }}>
        
        {/* Hero Section */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 64px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '9999px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '20px'
          }}>
            <Sparkles size={14} color="#F97316" />
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#CBD5E1', letterSpacing: '0.02em' }}>
              Next-Generation Agency Operating System
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
            marginBottom: '20px'
          }}>
            Unified Operations, Production & Client Intelligence.
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: '#94A3B8',
            lineHeight: 1.6,
            maxWidth: '640px',
            margin: '0 auto 36px'
          }}>
            Secure, role-based workspaces engineered for executive oversight, editorial project pipelines, automated WhatsApp client touchpoints, and financial settlement.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <a 
              href="/login" 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: '#F97316',
                color: '#FFF',
                borderRadius: '12px',
                fontSize: '0.96rem',
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(249, 115, 22, 0.3)'
              }}
            >
              Access Agency Workspace <ArrowRight size={16} />
            </a>
            <a 
              href={PARTNER_LOGIN_PATH} 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#F8FAFC',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                fontSize: '0.96rem',
                fontWeight: 500,
                textDecoration: 'none'
              }}
            >
              Affiliate Partner Portal <ExternalLink size={14} color="#94A3B8" />
            </a>
          </div>
        </div>

        {/* System Capabilities Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          padding: '24px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: '16px',
          marginBottom: '56px'
        }}>
          {[
            { label: 'Role Architecture', val: '6 Distinct Portals' },
            { label: 'Security Model', val: 'HttpOnly JWT + CSRF' },
            { label: 'Realtime Pipeline', val: 'Socket.IO Live Sync' },
            { label: 'Backup Governance', val: 'Air-Gapped Snapshots' }
          ].map((item, idx) => (
            <div key={idx} style={{ textAlign: 'center', padding: '10px' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F1F5F9' }}>
                {item.val}
              </div>
            </div>
          ))}
        </div>

        {/* Portal Directory Section */}
        <div>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '8px' }}>
              Authorized Portals & Workspaces
            </h2>
            <p style={{ color: '#94A3B8', fontSize: '0.95rem', margin: 0 }}>
              Select your organization division to access secure operational tools.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '24px'
          }}>
            {portals.map((p, idx) => {
              const IconComp = p.icon;
              return (
                <div 
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '18px',
                    padding: '30px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: `${p.color}18`,
                        border: `1px solid ${p.color}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComp size={22} color={p.color} />
                      </div>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#94A3B8',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                      }}>
                        {p.badge}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 10px 0', color: '#F8FAFC' }}>
                      {p.title}
                    </h3>
                    
                    <p style={{ fontSize: '0.9rem', color: '#94A3B8', lineHeight: 1.55, margin: '0 0 20px 0' }}>
                      {p.desc}
                    </p>
                  </div>

                  <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: 'monospace' }}>
                      AUTH: {p.role}
                    </span>
                    <a
                      href={p.link}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        color: '#F97316',
                        textDecoration: 'none'
                      }}
                    >
                      Authenticate <ChevronRight size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </main>

      {/* Enterprise Minimal Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '32px 24px',
        textAlign: 'center',
        fontSize: '0.84rem',
        color: '#64748B'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <span>&copy; {new Date().getFullYear()} ViralCraftMedia Inc. Agency CRM System. All rights reserved.</span>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span style={{ color: '#475569' }}>Internal Agency Infrastructure</span>
            <span style={{ color: '#475569' }}>TLS 1.3 256-bit Secured</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
