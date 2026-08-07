import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getReferralAttribution, clearReferralAttribution } from '../services/referralAttribution.js';
import { 
  BarChart3, Target, Users, Zap, Shield, TrendingUp, Calendar, Layers
} from 'lucide-react';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import WhatWeOffer from './shared/WhatWeOffer.jsx';
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
        budget: budget ? Number(budget) : 0,
        referralDetails: getReferralAttribution()
      });
      clearReferralAttribution();
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
        <style>{`
          .marketing-page .sp-hero {
            background-image: none !important;
            background-color: #0B0B0C !important;
          }
          .marketing-video-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center 20%;
            transform: translate3d(0,0,0);
            will-change: transform;
            z-index: 0;
          }

          @media (max-width: 1024px) {
            .marketing-page .sp-hero {
              min-height: auto !important;
              padding-top: 50px !important;
              padding-bottom: 70px !important;
            }
            .marketing-video-bg {
              object-position: center 25% !important;
            }
          }

          @media (max-width: 768px) {
            .marketing-page .sp-hero {
              min-height: auto !important;
              padding-top: 30px !important;
              padding-bottom: 55px !important;
            }
            .marketing-page .sp-hero-inner {
              padding: 0 20px !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: flex-start !important;
              justify-content: center !important;
              gap: 24px !important;
            }
            .marketing-page .sp-hero-left {
              gap: 12px !important;
              align-items: flex-start !important;
              text-align: left !important;
              width: 100% !important;
            }
            .marketing-page .sp-hero h1 {
              font-size: clamp(2rem, 8vw, 2.75rem) !important;
            }
            .marketing-page .sp-hero p {
              font-size: 0.95rem !important;
              line-height: 1.4 !important;
              margin-top: 4px !important;
            }
            .marketing-page .sp-hero-actions {
              margin-top: 6px !important;
              gap: 12px !important;
              width: 100% !important;
            }
            .marketing-page .sp-hero-actions a {
              flex: 1 1 auto !important;
              justify-content: center !important;
              font-size: 0.9rem !important;
              padding: 10px 16px !important;
            }
            .marketing-page .sp-hero-right {
              display: flex !important;
              flex-direction: column !important;
              width: 100% !important;
              margin-top: 8px !important;
            }
            .marketing-page .sp-hero-stat-row {
              gap: 16px !important;
              justify-content: flex-start !important;
            }
            .marketing-page .sp-hero-stat-card {
              flex: 1 1 auto !important;
              padding: 16px !important;
              background: rgba(11, 11, 12, 0.45) !important;
              border: 1px solid rgba(255, 255, 255, 0.08) !important;
              border-radius: 12px !important;
            }
            .marketing-page .sp-hero-feature-list {
              gap: 10px !important;
              margin-top: 16px !important;
              display: grid !important;
              grid-template-columns: 1fr 1fr !important;
              width: 100% !important;
            }
            .marketing-page .sp-hero-feature {
              margin: 0 !important;
              padding: 10px 12px !important;
              font-size: 0.8rem !important;
              background: rgba(11, 11, 12, 0.35) !important;
              border: 1px solid rgba(255, 255, 255, 0.05) !important;
              border-radius: 8px !important;
            }
            .marketing-video-bg {
              object-position: center 30% !important;
              transform: scale(1.1) !important;
            }
            .marketing-page .sp-hero::after {
              background: linear-gradient(to bottom, rgba(11, 11, 12, 0.75) 0%, rgba(11, 11, 12, 0.45) 60%, rgba(11, 11, 12, 0.8) 100%) !important;
            }
          }
        `}</style>

        {/* 1. EDITORIAL HERO — Left-aligned */}
        <section className="sp-hero">
          {/* Background Video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="marketing-video-bg"
          >
            <source src="/market_service.mp4" type="video/mp4" />
          </video>
          <div className="sp-hero-inner">
            <div className="sp-hero-left">
              <div className="sp-hero-eyebrow">Growth Strategy</div>
              <h1>Social Media Marketing &amp; Growth</h1>
              <p>We build organic brand channels, configure script blueprints, and map social engagement hooks to convert audiences into direct web leads.</p>
              <div className="sp-hero-actions">
                <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  Request Growth Blueprint
                </a>
                <a href="#services" className="btn btn-ghost" style={{ textDecoration: 'none' }}>View Deliverables</a>
              </div>
            </div>
            <div className="sp-hero-right">
              <div className="sp-hero-stat-row">
                <div className="sp-hero-stat-card">
                  <span className="stat-val">3x</span>
                  <span className="stat-label">Avg. Growth Rate</span>
                </div>
                <div className="sp-hero-stat-card">
                  <span className="stat-val">30d</span>
                  <span className="stat-label">Strategy Cycle</span>
                </div>
              </div>
              <div className="sp-hero-feature-list">
                {['Competitor Audits', 'Script Blueprinting', 'DM Funnels', 'Performance Analytics'].map(f => (
                  <div key={f} className="sp-hero-feature">
                    <span className="check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2. ENQUIRY FORM — Split layout */}
        <section className="sp-enquiry" id="configure">
          <div className="sp-enquiry-inner">
            <div className="sp-enquiry-left">
              <div className="sp-section-tag">Get Started</div>
              <h2>Request Your Growth Blueprint</h2>
              <p>Tell us about your brand and target audience. Our strategist will connect on WhatsApp within 24 hours with a custom plan.</p>
              <div className="sp-enquiry-trust">
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></span>
                  Data-Driven Approach
                </div>
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></span>
                  24-Hour Response Time
                </div>
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></span>
                  Scalable Operations
                </div>
              </div>
            </div>
            <div className="sp-enquiry-form-card">
              <h3>Request Growth Blueprint</h3>

              {status === 'error' && <div className="alert alert-error" style={{ marginBottom: 20 }}><div className="alert-ic">!</div><div><h4>Submission Failed</h4><p>Please check inputs and try again.</p></div></div>}
              {status === 'query_sent' && <div className="alert alert-ok" style={{ marginBottom: 20 }}><div className="alert-ic alert-ic-ok">✓</div><div><h4>Request Registered</h4><p>Our strategist will connect on WhatsApp within 24 hours.</p></div></div>}

              {status !== 'query_sent' && (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="sp-form-row">
                    <div className="sp-form-group">
                      <label>Client Name *</label>
                      <input
                        type="text"
                        className={`sp-form-input ${errors.name ? 'err' : ''}`}
                        placeholder="Your name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                      />
                      {errors.name && <span className="sp-form-error">{errors.name}</span>}
                    </div>
                    <div className="sp-form-group">
                      <label>WhatsApp Number *</label>
                      <div className="sp-phone-group">
                        <span className="sp-phone-prefix">+91</span>
                        <input
                          type="text"
                          className={`sp-form-input ${errors.phone ? 'err' : ''}`}
                          placeholder="9876543210"
                          value={phone}
                          onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        />
                      </div>
                      {errors.phone && <span className="sp-form-error">{errors.phone}</span>}
                    </div>
                  </div>

                  <div className="sp-form-row">
                    <div className="sp-form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        className="sp-form-input"
                        placeholder="you@domain.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="sp-form-group">
                      <label>Monthly Target Budget (INR)</label>
                      <input
                        type="number"
                        className="sp-form-input"
                        placeholder="e.g. 25000"
                        value={budget}
                        onChange={e => setBudget(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sp-form-group">
                    <label>Strategy Requirements & Brand Links</label>
                    <textarea
                      rows="3"
                      className="sp-form-input"
                      style={{ resize: 'none' }}
                      placeholder="Explain target channels, current content challenges, or competitor references..."
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="sp-form-submit"
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
        <div id="services">
          <WhatWeOffer
            sectionTag="Deliverables Suite"
            heading="What We Offer"
            description="Data-driven social strategies that convert attention into measurable results."
            items={[
              { index: '01', icon: BarChart3, title: 'Competitor Audits', description: "We study what's working in your niche right now, then build a strategy that out-executes everyone else — not copies them.", color: '#FF6A00' },
              { index: '02', icon: Target, title: 'Content Scripts', description: 'One idea becomes a hook, a story, and a call to action that actually gets replies. Your brand voice stays consistent without sounding like a corporate robot.', color: '#8B5CF6' },
              { index: '03', icon: Users, title: 'Lead Funnel Sync', description: 'Every comment and DM feeds a trackable pipeline. We connect what you post to who raises their hand to buy — no more guessing.', color: '#10B981' }
            ]}
          />
        </div>


        {/* 4. WHY CHOOSE US — Stat Ledger */}
        <section className="sp-why">
          <div className="sp-why-inner">
            <div className="sp-section-header">
              <div className="sp-section-tag">Why Choose Us</div>
              <h2>Growth Standards</h2>
              <p>We don't just post content — we engineer growth systems.</p>
            </div>
            <div className="sp-why-ledger">
              {[
                { tag: 'Accountability', title: 'Dedicated Account Manager', desc: 'Your 1-on-1 link to coordinates and strategy updates checkpoints throughout the engagement.' },
                { tag: 'Results', title: 'Conversion Focused', desc: 'Social hooks formatted strictly to drive lead queries and inbound inquiries that convert.' },
                { tag: 'Security', title: 'Secure Analytics', desc: 'Safe UTM tracking setup and secure data sync protocols protecting your brand data.' },
                { tag: 'Scale', title: 'Scalable Strategy', desc: 'Flexible strategy templates configured to match evolving social algorithms and platform changes.' }
              ].map((item, i) => (
                <div key={item.tag} className="sp-why-ledger-item">
                  <div className="sp-why-ledger-tag">{item.tag}</div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. WORKFLOW — Premium Cards */}
        <section className="sp-workflow" id="workflow">
          <div className="sp-workflow-inner">
            <div className="sp-section-header">
              <div className="sp-section-tag">Our Workflow</div>
              <h2>Organic Development Pipeline</h2>
              <p>A systematic approach to building your organic social presence from audit to scale.</p>
            </div>
            <div className="sp-wf-grid">
              {[
                { num: '01', icon: BarChart3, title: 'Niche Auditing', desc: 'Extracting hook patterns and formatting formats from performing accounts.', color: 'var(--accent)' },
                { num: '02', icon: Target, title: 'Blueprinting', desc: 'Mapping hooks, visual directions, scripting structures, and calls-to-action.', color: '#F59E0B' },
                { num: '03', icon: TrendingUp, title: 'Performance Run', desc: 'Monitoring click-through parameters and direct inbox conversion leads.', color: '#10B981' }
              ].map((s, i) => (
                <div key={s.num} className="sp-wf-card" style={{ '--stagger': i }}>
                  <div className="sp-wf-step-badge">Step {s.num}</div>
                  <div className="sp-wf-icon-wrap">
                    <IconWrapper icon={s.icon} size={48} color={s.color} />
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. TESTIMONIALS — Homepage Marquee */}
        <section className="sp-testimonials" id="clients">
          <div className="sp-testimonials-inner">
            <div className="sp-section-header">
              <div className="sp-section-tag">Testimonials</div>
              <h2>What Brands Say</h2>
              <p>Trusted by brands and agencies who value data-driven growth strategies.</p>
            </div>
            <div className="cl-marquee">
              <div className="cl-track">
                {[1, 2, 3].flatMap((copy) =>
                  clients.slice(0, 3).map((c) => (
                    <div key={c.handle + copy} className="cl-card">
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
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 7. FAQ — Left-aligned, Minimal */}
        <section className="sp-faq" id="faq">
          <div className="sp-faq-inner">
            <div className="sp-faq-left">
              <div className="sp-section-tag">FAQ</div>
              <h2>Frequently Asked Questions</h2>
              <p>Common questions about our social media marketing services.</p>
            </div>
            <div className="sp-faq-rows">
              {faqs.map((f, i) => (
                <div key={f.q} className={`sp-faq-row ${activeFaq === i ? 'active' : ''}`} onClick={() => setActiveFaq(activeFaq === i ? null : i)}>
                  <div className="sp-faq-question">
                    <span>{f.q}</span>
                    <svg className="sp-faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
                  </div>
                  <div className="sp-faq-answer">
                    <p>{f.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA — Full-width Banner */}
        <section className="sp-cta">
          <div className="sp-cta-inner">
            <div>
              <h2>Let's Scale Your Organic Growth</h2>
              <p>Request a social growth blueprint and capture targeted feed audiences today.</p>
            </div>
            <a href="#configure" className="btn">
              Request Growth Blueprint
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
