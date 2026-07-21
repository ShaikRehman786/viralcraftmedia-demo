import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Activity, TrendingUp, Monitor, Home, BarChart3, Target, Users, Calendar, Zap, Layers, Shield, UploadCloud, DownloadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import AnimatedCounter from './shared/AnimatedCounter.jsx';
import { clientTestimonials } from '../data/clientTestimonials.js';

function IconWrapper({ icon: Icon, size = 32, color = 'var(--accent)', className = '', ...props }) {
  return (
    <div
      className={`icon-wrapper ${className}`}
      style={{
        width: `${Math.max(24, Math.min(36, size))}px`,
        height: `${Math.max(24, Math.min(36, size))}px`,
        '--icon-color': color
      }}
      {...props}
    >
      <Icon size={Math.max(14, Math.min(22, size * 0.6))} color={color} strokeWidth={2.5} className="icon" />
    </div>
  );
}

export default function MarketingPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [budget, setBudget] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.title = "Grow Your Brand With Strategic Social Media Marketing | ViralCraft Media";
    const metaTags = {
      description: "Build an organic social presence with custom strategy calendars, performance metrics tracking, and content audits.",
      keywords: "social media marketing, organic growth, branding strategy, content calendar",
      "og:title": "Grow Your Brand With Strategic Social Media Marketing | ViralCraft Media",
      "og:description": "Build an organic social presence with custom strategy calendars, performance metrics tracking, and content audits.",
      "og:url": window.location.href,
      "og:type": "website",
      "twitter:card": "summary_large_image",
      "twitter:title": "Grow Your Brand With Strategic Social Media Marketing | ViralCraft Media",
      "twitter:description": "Build an organic social presence with custom strategy calendars, performance metrics tracking, and content audits."
    };

    Object.entries(metaTags).forEach(([key, val]) => {
      let el = document.querySelector(`meta[name="${key}"], meta[property="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(key.startsWith('og:') || key.startsWith('twitter:') ? 'property' : 'name', key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', val);
    });

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', window.location.href);

    let script = document.querySelector('#schema-marketing');
    if (!script) {
      script = document.createElement('script');
      script.id = 'schema-marketing';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Social Media Marketing",
      "serviceType": "Organic Strategy & Growth",
      "provider": { "@type": "Organization", "name": "ViralCraft Media" }
    });

    return () => script.remove();
  }, []);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Valid 10-digit WhatsApp number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    try {
      await axios.post('/api/enquiries', {
        name,
        email,
        phone: `91${phone}`,
        serviceCategory: 'Social Media Marketing',
        description: `Strategy requirements: ${instructions}`,
        budget: budget ? Number(budget) : 0
      });
      setStatus('query_sent');
    } catch (err) {
      setStatus('error');
    }
  };

  const clients = clientTestimonials;

  return (
    <div className="landing-page-wrap">
      
      <Navbar />

      <main style={{ paddingTop: '80px' }}>
        {/* HERO SECTION */}
        <section className="hero" id="top">
          <div className="hero-bg"></div>
          <div className="hero-grid-overlay"></div>
          <div className="container">
            <div className="hero-grid">
              <div className="hero-left">
                <div className="hero-badge">
                  <span className="hero-badge-dot"></span>
                  Organic Growth & Audience Development
                </div>
                <h1 className="hero-title">
                  Grow Your Brand With{' '}
                  <span className="hero-grad">Strategic Social Media Marketing.</span>
                </h1>
                <p className="hero-desc">
                  Accelerate your account propagation. Content audit strategies, competitor niche benchmarking, and high conversions posting calendars.
                </p>
                <div className="hero-actions">
                  <a href="#pricing" className="btn btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    Start Strategy
                  </a>
                </div>
                <div className="hero-stats">
                  <div className="hero-stat">
                    <span className="hero-stat-val"><AnimatedCounter target="15" suffix="+" /></span>
                    <span className="hero-stat-lbl">Brands Scaled</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val">Weekly</span>
                    <span className="hero-stat-lbl">Calendar Auditing</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val"><AnimatedCounter target="3" suffix="x+" /></span>
                    <span className="hero-stat-lbl">Reach Boost</span>
                  </div>
                </div>
              </div>
              <div className="hero-right">
                <div className="showcase-mesh"></div>
                <div className="hero-mockup">
                  <div className="hero-mockup-dashboard">
                    <div className="hero-mockup-dash-header">
                      <span className="hero-mockup-dash-title">Growth Analytics</span>
                      <div className="hero-mockup-dash-dot"></div>
                    </div>
                    <div className="hero-mockup-chart">
                      <div className="hero-mockup-chart-bar"></div>
                      <div className="hero-mockup-chart-bar"></div>
                      <div className="hero-mockup-chart-bar"></div>
                      <div className="hero-mockup-chart-bar"></div>
                      <div className="hero-mockup-chart-bar"></div>
                      <div className="hero-mockup-chart-bar"></div>
                      <div className="hero-mockup-chart-bar"></div>
                      <div className="hero-mockup-chart-bar"></div>
                    </div>
                    <div>
                      <div className="hero-mockup-stat">
                        <span className="hero-mockup-stat-label">Engagement Rate</span>
                        <span className="hero-mockup-stat-value up">+4.8%</span>
                      </div>
                      <div className="hero-mockup-stat">
                        <span className="hero-mockup-stat-label">Follower Growth</span>
                        <span className="hero-mockup-stat-value accent">+12.3%</span>
                      </div>
                      <div className="hero-mockup-stat">
                        <span className="hero-mockup-stat-label">Reach This Week</span>
                        <span className="hero-mockup-stat-value">45.2K</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="section" style={{ padding: '80px 24px', background: '#FFFFFF' }}>
          <div className="container">
            <div className="sec-hdr center" style={{ maxWidth: '600px', marginBottom: '40px', textAlign: 'center', margin: '0 auto 40px' }}>
              <span className="sec-label">Strategy Capabilities</span>
              <h2 className="sec-title" style={{ fontSize: '2rem', fontWeight: 900 }}>Data-Driven Social Growth</h2>
              <p className="sec-desc">We combine competitor analysis, content strategy, and performance tracking to scale your brand organically.</p>
            </div>
            <div className="svc-features-grid">
              {[
                { icon: BarChart3, title: 'Content Audits', desc: 'Deep analysis of your existing content performance to identify gaps and opportunities.' },
                { icon: Target, title: 'Niche Benchmarking', desc: 'Competitor analysis to uncover winning formats, hashtag strategies, and posting patterns.' },
                { icon: Calendar, title: 'Posting Calendar', desc: 'Strategically paced content schedules aligned with platform algorithms and audience behavior.' },
                { icon: Users, title: 'Audience Targeting', desc: 'Define and refine your ideal audience profile for maximum engagement and conversion.' },
                { icon: Zap, title: 'Hook Scriptwriting', desc: 'Scroll-stopping opening frameworks proven to increase watch time and completion rates.' },
                { icon: Shield, title: 'Performance Reports', desc: 'Weekly analytics reviews with actionable recommendations for continuous improvement.' }
              ].map((f, i) => (
                <div key={f.title} className="svc-feature-card" style={{ animation: `fade-up 0.5s ease ${i * 0.1}s both` }}>
                  <div className="svc-feature-icon" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(52,211,153,0.05))', borderColor: 'rgba(16,185,129,0.08)' }}>
                    <IconWrapper icon={f.icon} size={22} color="#10B981" />
                  </div>
                  <h3 className="svc-feature-title">{f.title}</h3>
                  <p className="svc-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* MARKETING REQUEST FORM */}
        <section className="section pricing" id="pricing" style={{ padding: '80px 24px' }}>
          <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div className="sec-hdr center" style={{ maxWidth: '600px', marginBottom: '48px', textAlign: 'center' }}>
              <span className="sec-label">Social Strategy</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 900 }}>Configure Your Strategy</h2>
              <p className="sec-desc">Submit your channel handles or competitor references. Our branding team will analyze metrics and deliver a roadmap proposal.</p>
            </div>

            <div className="p-right" style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
              {status === 'error' && <div className="alert alert-error"><div className="alert-ic">!</div><div><h4>Submission Failed</h4><p>Please try again.</p></div></div>}
              {status === 'query_sent' && <div className="alert alert-ok"><div className="alert-ic alert-ic-ok">✓</div><div><h4>Request Registered</h4><p>A marketing lead will contact on WhatsApp within 24 hours.</p></div></div>}
              
              {status !== 'query_sent' && (
                <form onSubmit={handleSubmit} className="p-form" noValidate style={{ width: '100%', padding: '40px', borderRadius: '24px', background: '#FFFFFF', border: '1.5px solid rgba(16, 185, 129, 0.12)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="p-form-hdr" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px', color: '#0E0E10' }}>Marketing Specifications</div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Brand / Client Name <span className="req">*</span></label>
                    <div className={`p-inp ${errors.name ? 'err' : ''}`}><input type="text" placeholder="Your name or company" value={name} onChange={e => setName(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                    {errors.name && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>WhatsApp Number <span className="req">*</span></label>
                    <div className={`p-inp p-phone ${errors.phone ? 'err' : ''}`} style={{ display: 'flex', alignItems: 'center' }}><span className="p-pre" style={{ padding: '0 12px', color: '#575F6E' }}>+91</span><input type="text" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ padding: '12px 14px', width: '100%', border: 'none', background: 'none' }} /></div>
                    {errors.phone && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.phone}</span>}
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Email Address</label>
                    <div className="p-inp"><input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Monthly Marketing Budget Target (INR)</label>
                    <div className="p-inp"><input type="number" placeholder="e.g. 35000" value={budget} onChange={e => setBudget(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Handles / Niche Description</label>
                    <div className="p-inp">
                      <textarea rows="3" placeholder="Provide links to your social profiles, current posting count, and key competitor handles..." value={instructions} onChange={e => setInstructions(e.target.value)} style={{ padding: '12px 14px', width: '100%', resize: 'none' }} />
                    </div>
                  </div>
                  
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', textAlign: 'center', background: '#10B981', borderColor: '#10B981' }} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* TRUST BAR */}
        <section style={{ padding: '40px 24px', background: '#FAF9F6', borderTop: '1px solid rgba(16,185,129,0.04)', borderBottom: '1px solid rgba(16,185,129,0.04)' }}>
          <div className="container">
            <div className="svc-trust-bar">
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                15+ Brands Scaled
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                3x Average Reach Boost
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Weekly Performance Reports
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Dedicated Strategy Lead
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding: '80px 24px', background: '#FFFFFF' }}>
          <div className="container">
            <div className="sec-hdr center" style={{ maxWidth: '600px', marginBottom: '40px', textAlign: 'center', margin: '0 auto 40px' }}>
              <span className="sec-label">Process</span>
              <h2 className="sec-title" style={{ fontSize: '2rem', fontWeight: 900 }}>How It Works</h2>
              <p className="sec-desc">A focused strategy engagement designed for measurable organic growth.</p>
            </div>
            <div className="svc-process-grid">
              {[
                { icon: UploadCloud, title: 'Submit Your Profiles', desc: 'Share your social handles, niche, and competitor references for analysis.' },
                { icon: Layers, title: 'Strategy Development', desc: 'We audit your content, benchmark competitors, and build a tailored growth plan.' },
                { icon: DownloadCloud, title: 'Execute & Optimize', desc: 'Implement the calendar strategy with weekly performance reviews and adjustments.' }
              ].map((s, i) => (
                <div key={s.title} className="svc-process-step">
                  <div className="svc-process-icon" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(52,211,153,0.05))', borderColor: 'rgba(16,185,129,0.08)' }}>
                    <IconWrapper icon={s.icon} size={24} color="#10B981" />
                  </div>
                  <h3 className="svc-process-title">{s.title}</h3>
                  <p className="svc-process-desc">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section style={{ padding: '40px 24px 80px', background: '#FAF9F6' }}>
          <div className="container">
            <div className="svc-cta-section" style={{ borderColor: 'rgba(16,185,129,0.08)', background: 'linear-gradient(135deg, rgba(16,185,129,0.03), rgba(52,211,153,0.02))' }}>
              <h2 className="svc-cta-title">Ready to Scale Your Brand?</h2>
              <p className="svc-cta-desc">Get a custom growth strategy built for your niche and audience.</p>
              <div className="svc-cta-actions">
                <a href="#pricing" className="btn btn-primary" style={{ background: '#10B981', borderColor: '#10B981' }}>Start Your Strategy</a>
                <a href="#clients" className="btn btn-ghost">See Testimonials</a>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="section clients" id="clients" style={{ padding: '80px 24px' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Testimonials</span>
              <h2 className="sec-title">Brands & Creators Who Trust Us</h2>
              <p className="sec-desc">From startups to creators and growing brands — trusted by clients who value performance-driven content.</p>
            </div>
            <div className="cl-marquee">
              <div className="cl-track">
                {[
                  ...clients.map(c => ({ ...c, uniqueId: 'm1-' + c.handle })),
                  ...clients.map(c => ({ ...c, uniqueId: 'm2-' + c.handle })),
                  ...clients.map(c => ({ ...c, uniqueId: 'm3-' + c.handle }))
                ].map((c) => (
                  <div key={c.uniqueId} className="cl-card">
                    <div className="cl-top">
                      <div className="cl-av">{c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                      <div className="cl-meta">
                        <div className="cl-name">{c.name}</div>
                        <div className="cl-handle">{c.handle}</div>
                      </div>
                      <svg className="cl-badge" viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="var(--accent)" /></svg>
                    </div>
                    <div className="cl-stars">
                      {[1, 2, 3, 4, 5].map(s => <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>)}
                    </div>
                    <div className="cl-stats">
                      <span className="cl-stat">{c.followers} Followers</span>
                      <span className="cl-stat-div"></span>
                      <span className="cl-stat">{c.industry}</span>
                    </div>
                    <p className="cl-review">"{c.review}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* OTHER SERVICES */}
        <section className="section" id="services" style={{ padding: '80px 24px' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Our Service Suite</span>
              <h2 className="sec-title">Explore Other Premium Formats</h2>
            </div>
            <div className="svc-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
              
              {/* Service 1: Clip Editing */}
              <div className="svc-card" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={Scissors} size={44} color="var(--accent)" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Clip Editing</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Turn long-form content into highly engaging short-form videos engineered for maximum retention.</p>
                </div>
                <Link to="/services/clip-editing" className="btn btn-ghost" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block' }}>Start Project</Link>
              </div>

              {/* Service 2: Podcast Editing */}
              <div className="svc-card" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={Activity} size={44} color="#3B82F6" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Podcast Editing</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Transform raw podcast recordings into polished, professional episodes that keep listeners engaged.</p>
                </div>
                <Link to="/services/podcast-editing" className="btn btn-ghost" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block' }}>Start Project</Link>
              </div>

              {/* Service 3: Social Media Marketing (Active) */}
              <div className="svc-card" style={{ border: '2px solid #10B981', background: 'rgba(16, 185, 129, 0.02)', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={TrendingUp} size={44} color="#10B981" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Social Marketing (Active)</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Help businesses grow organically with strategic content planning, script hook writing, and calendar pacing.</p>
                </div>
                <Link to="/services/social-media-marketing" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block', background: '#10B981', borderColor: '#10B981' }}>Start Project</Link>
              </div>

              {/* Service 4: Website Design & Development */}
              <div className="svc-card" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={Monitor} size={44} color="#8B5CF6" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Website Development</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Build high-performance websites designed to increase trust, improve conversions, and represent your brand.</p>
                </div>
                <Link to="/services/web-design-development" className="btn btn-ghost" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block' }}>Start Project</Link>
              </div>

              {/* Service 5: Real Estate Video Editing */}
              <div className="svc-card" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={Home} size={44} color="#EF4444" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Real Estate Video</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Cinema-grade real estate video editing engineered to capture property value and drive buyer leads.</p>
                </div>
                <Link to="/services/real-estate-video-editing" className="btn btn-ghost" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block' }}>Book Project</Link>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />

    </div>
  );
}
