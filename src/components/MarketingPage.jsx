import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Activity, TrendingUp, Monitor, Home, BarChart3, Target, Users, Calendar, Zap, Layers, Shield, UploadCloud, DownloadCloud, CheckCircle2, Clock } from 'lucide-react';
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
  const [activeFaq, setActiveFaq] = useState(null);

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
        description: `Strategy requirements: ${instructions}\nSource Page: Social Media Marketing`,
        budget: budget ? Number(budget) : 0
      });
      setStatus('query_sent');
    } catch (err) {
      setStatus('error');
    }
  };

  const clients = clientTestimonials.filter(c => c.industry === 'Creator' || c.industry === 'Marketing' || c.industry === 'Agency');
  if (clients.length === 0) {
    clients.push(...clientTestimonials.slice(0, 3));
  }

  const faqs = [
    { q: 'How do you target our specific audience?', a: 'We reverse-engineer what formats are working for your competitors, extracting hook formulas and framing strategies.' },
    { q: 'Do you manage posting calendars?', a: 'Yes. We build scheduling layouts to ensure structured content flow across TikTok, Instagram, and YouTube.' },
    { q: 'What analytics metrics do you monitor?', a: 'We focus on traffic quality: DM conversion triggers, qualified link clicks, and pipeline generation from comments.' }
  ];

  return (
    <div className="service-page-wrap marketing-page">
      <Navbar />

      <main style={{ paddingTop: '80px' }}>
        {/* 1. TEXT-FOCUSED CENTRED HERO */}
        <section className="service-hero-centered">
          <div className="service-hero-centered-content">
            <div className="service-hero-badge">
              <span className="service-hero-badge-dot"></span>
              Premium Digital Services
            </div>
            <h1 className="service-hero-title">
              Social Media Marketing & Growth
            </h1>
            <p className="service-hero-desc">
              We build organic brand channels, configure script blueprints, and map social engagement hooks to convert audiences into direct web leads.
            </p>
            <div className="service-hero-highlights">
              <span className="service-hero-highlight-item">✓ Competitor Audits</span>
              <span className="service-hero-highlight-item">✓ Script Blueprinting</span>
              <span className="service-hero-highlight-item">✓ Direct-Inbound DM Funnels</span>
              <span className="service-hero-highlight-item">✓ UTM Link Tracking</span>
              <span className="service-hero-highlight-item">✓ Performance Analytics</span>
              <span className="service-hero-highlight-item">✓ Scalable Operations</span>
            </div>
            <div className="service-hero-actions">
              <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Request Growth Blueprint
              </a>
              <a href="#services" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                View Deliverables
              </a>
            </div>
          </div>
        </section>

        {/* 2. ENQUIRY FORM - IMMEDIATELY AFTER HERO */}
        <section className="premium-form-section" id="configure">
          <div className="container">
            <div className="premium-form-wrapper">
              <h3 className="premium-form-title">Request Growth Blueprint</h3>

              {status === 'error' && <div className="alert alert-error" style={{ marginBottom: 20 }}><div className="alert-ic">!</div><div><h4>Submission Failed</h4><p>Please check inputs and try again.</p></div></div>}
              {status === 'query_sent' && <div className="alert alert-ok" style={{ marginBottom: 20 }}><div className="alert-ic alert-ic-ok">✓</div><div><h4>Request Registered</h4><p>Our strategist will connect on WhatsApp within 24 hours.</p></div></div>}

              {status !== 'query_sent' && (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="premium-form-group">
                    <label>Client Name *</label>
                    <input
                      type="text"
                      className={`premium-form-input ${errors.name ? 'err' : ''}`}
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                    {errors.name && <span className="premium-form-error">{errors.name}</span>}
                  </div>

                  <div className="premium-form-group">
                    <label>WhatsApp Number *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className="premium-form-input" style={{ width: 'auto', background: '#F3F4F6', color: '#4B5563', padding: '12px' }}>+91</span>
                      <input
                        type="text"
                        className={`premium-form-input ${errors.phone ? 'err' : ''}`}
                        placeholder="9876543210"
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </div>
                    {errors.phone && <span className="premium-form-error">{errors.phone}</span>}
                  </div>

                  <div className="premium-form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="premium-form-input"
                      placeholder="you@domain.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="premium-form-group">
                    <label>Monthly Target Budget (INR)</label>
                    <input
                      type="number"
                      className="premium-form-input"
                      placeholder="e.g. 25000"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                    />
                  </div>

                  <div className="premium-form-group">
                    <label>Strategy Requirements & Brand Links</label>
                    <textarea
                      rows="3"
                      className="premium-form-input"
                      style={{ resize: 'none' }}
                      placeholder="Explain target channels, current content challenges, or competitor references..."
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-nav-cta"
                    style={{ width: '100%', justifyContent: 'center', border: 'none', minHeight: 48, cursor: 'pointer' }}
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Requesting...' : 'Submit'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* 3. WHAT WE OFFER */}
        <section className="premium-benefits-section" id="services">
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Deliverables Suite</span>
              <h2 className="sec-title">What We Offer</h2>
            </div>
            <div className="premium-benefits-grid">
              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                  <IconWrapper icon={BarChart3} size={22} color="#10B981" />
                </div>
                <h3 className="premium-benefit-title">Competitor Audits</h3>
                <p className="premium-benefit-desc">Reverse-engineering target content styles, verbal hooks parameters, and posting patterns from leaders.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                  <IconWrapper icon={Target} size={22} color="#3B82F6" />
                </div>
                <h3 className="premium-benefit-title">Content Scripts</h3>
                <p className="premium-benefit-desc">Comprehensive storyboards mapping script hooks, dialog lines, and active conversion layouts.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                  <IconWrapper icon={Users} size={22} color="#8B5CF6" />
                </div>
                <h3 className="premium-benefit-title">Lead Funnel Sync</h3>
                <p className="premium-benefit-desc">Connecting automatic DM triggers, custom UTM paths, and tracking queries directly to dashboards.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. WHY CHOOSE THIS SERVICE */}
        <section className="premium-benefits-section" style={{ background: '#FAFAFB', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Why Choose Us</span>
              <h2 className="sec-title">Growth Standards</h2>
            </div>
            <div className="premium-benefits-grid">
              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Users} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Dedicated Account Manager</h3>
                <p className="premium-benefit-desc">Your 1-on-1 link to coordinates and strategy updates checkpoints.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Target} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Conversion Focused</h3>
                <p className="premium-benefit-desc">Social hooks formatted strictly to drive lead queries and inquiries.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Shield} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Secure Analytics</h3>
                <p className="premium-benefit-desc">Safe UTM tracking setup and secure data sync protocols.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Zap} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Scalable Strategy</h3>
                <p className="premium-benefit-desc">Flexible strategy templates configured to match evolving social algorithms.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. OUR PROCESS */}
        <section className="premium-process-section" style={{ background: '#FFFFFF' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Our Workflow</span>
              <h2 className="sec-title">Organic Development Pipeline</h2>
            </div>
            <div className="premium-process-grid">
              <div className="premium-process-step">
                <div className="premium-process-step-num">01</div>
                <h3 className="premium-process-step-title">Niche Auditing</h3>
                <p className="premium-process-step-desc">Extracting hook patterns and formatting formats from performing accounts.</p>
              </div>

              <div className="premium-process-step">
                <div className="premium-process-step-num">02</div>
                <h3 className="premium-process-step-title">Blueprinting</h3>
                <p className="premium-process-step-desc">Mapping hooks, visual directions, scripting structures, and calls-to-action.</p>
              </div>

              <div className="premium-process-step">
                <div className="premium-process-step-num">03</div>
                <h3 className="premium-process-step-title">CRM Integrations</h3>
                <p className="premium-process-step-desc">Connecting link tracking, comments webhooks, and routing pipelines.</p>
              </div>

              <div className="premium-process-step">
                <div className="premium-process-step-num">04</div>
                <h3 className="premium-process-step-title">Performance Run</h3>
                <p className="premium-process-step-desc">Monitoring click-through parameters and direct inbox conversion leads.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. TESTIMONIALS */}
        <section className="section clients" id="clients" style={{ background: '#FAF9F6' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Testimonials</span>
              <h2 className="sec-title">What Brands Say</h2>
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

        {/* 7. FAQ */}
        <section className="section faq-section" id="faq" style={{ background: '#FFFFFF' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">FAQ</span>
              <h2 className="sec-title">Frequently Asked Questions</h2>
            </div>
            <div className="faq-list">
              {faqs.map((f, i) => (
                <div key={f.q} className={`faq-item ${activeFaq === i ? 'active' : ''}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                  <div className="faq-question">
                    <span>{f.q}</span>
                    <svg className="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                  <div className="faq-answer">
                    <p>{f.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA */}
        <section style={{ padding: '80px 24px', background: '#FAFAFB', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#111827' }}>Let's Scale Your Organic Growth</h2>
            <p style={{ color: '#4B5563', fontSize: '1rem', marginBottom: '32px' }}>Request a social growth blueprint and capture targeted feed audiences today.</p>
            <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Request Growth Blueprint
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
