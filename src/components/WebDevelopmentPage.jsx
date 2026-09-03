import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getReferralAttribution, clearReferralAttribution } from '../services/referralAttribution.js';
import {
  Code, Globe, Zap, Shield, Clock, Users, Target, Monitor, CheckCircle2
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

export default function WebDevelopmentPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [budget, setBudget] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    document.title = "Build Premium Websites That Convert Visitors Into Clients | ViralCraft Media";
    const metaTags = {
      description: "Get lightning fast, SEO optimized web applications and high converting corporate websites integrated with CRM dashboards.",
      keywords: "web development, responsive web design, react developer, nextjs apps",
      "og:title": "Build Premium Websites That Convert Visitors Into Clients | ViralCraft Media",
      "og:description": "Get lightning fast, SEO optimized web applications and high converting corporate websites integrated with CRM dashboards.",
      "og:url": window.location.href,
      "og:type": "website",
      "twitter:card": "summary_large_image",
      "twitter:title": "Build Premium Websites That Convert Visitors Into Clients | ViralCraft Media",
      "twitter:description": "Get lightning fast, SEO optimized web applications and high converting corporate websites integrated with CRM dashboards."
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

    let script = document.querySelector('#schema-webdev');
    if (!script) {
      script = document.createElement('script');
      script.id = 'schema-webdev';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Website Design & Development",
      "serviceType": "Software Engineering & Web Design",
      "provider": { "@type": "Organization", "name": "ViralCraft Media" }
    });

    return () => script.remove();
  }, []);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Valid WhatsApp number is required';
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
        serviceCategory: 'Website Design & Development',
        description: `Project Scope details: ${instructions}\nSource Page: Website Development`,
        budget: budget ? Number(budget) : 0,
        referralDetails: getReferralAttribution()
      });
      clearReferralAttribution();
      setStatus('query_sent');
    } catch (err) {
      setStatus('error');
    }
  };

  const clients = clientTestimonials.filter(c => c.industry === 'Tech' || c.industry === 'SaaS' || c.industry === 'Agency' || c.industry === 'E-Commerce');
  if (clients.length === 0) {
    clients.push(...clientTestimonials.slice(0, 3));
  }

  const faqs = [
    { q: 'Do you use page-builder templates?', a: 'No. All corporate sites and SaaS layouts are custom-engineered from scratch to ensure fast performance and lightweight codes.' },
    { q: 'Can you synchronize our checkout systems with CRM hubs?', a: 'Yes. We configure webhook layers and API endpoints to flow transactional data straight into your central dashboard.' },
    { q: 'How long does a complete design and build cycle take?', a: 'Standard landing pages are completed within 7 to 10 days, while custom dashboards and CRM platforms require 3 to 4 weeks depending on specs.' }
  ];



  return (
    <div className="service-page-wrap webdev-page">
      <Navbar />
      <main style={{ paddingTop: '80px' }}>
        {/* 1. EDITORIAL HERO — Left-aligned */}
        <section className="sp-hero">
          <div className="sp-hero-inner">
            <div className="sp-hero-left">
              <div className="sp-hero-eyebrow">Web Development</div>
              <h1>Professional Website Development</h1>
              <p>We build high-performance websites that help businesses establish credibility, generate qualified leads, and grow online.</p>
              <div className="sp-hero-actions">
                <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  Request Website Proposal
                </a>
                <a href="#services" className="btn btn-ghost" style={{ textDecoration: 'none' }}>View Services</a>
              </div>
            </div>
            <div className="sp-hero-right">
              <div className="sp-hero-stat-row">
                <div className="sp-hero-stat-card">
                  <span className="stat-val">7–10d</span>
                  <span className="stat-label">Landing Page TAT</span>
                </div>
                <div className="sp-hero-stat-card">
                  <span className="stat-val">100%</span>
                  <span className="stat-label">Custom Code</span>
                </div>
              </div>
              <div className="sp-hero-feature-list">
                {['Custom Development', 'Mobile Responsive', 'SEO Optimized', 'Secure Architecture'].map(f => (
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
              <h2>Request Your Website Proposal</h2>
              <p>Share your project scope and requirements. Our engineering lead will connect on WhatsApp within 24 hours with a detailed proposal.</p>
              <div className="sp-enquiry-trust">
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></span>
                  Secure Development
                </div>
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></span>
                  Fast Turnaround
                </div>
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></span>
                  50+ Projects Delivered
                </div>
              </div>
            </div>
            <div className="sp-enquiry-form-card">
              <h3>Request Website Proposal</h3>

              {status === 'error' && <div className="alert alert-error" style={{ marginBottom: 20 }}><div className="alert-ic">!</div><div><h4>Submission Failed</h4><p>Please check inputs and try again.</p></div></div>}
              {status === 'query_sent' && <div className="alert alert-ok" style={{ marginBottom: 20 }}><div className="alert-ic alert-ic-ok">✓</div><div><h4>Request Registered</h4><p>Our engineering lead will connect on WhatsApp within 24 hours.</p></div></div>}

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
                      <label>Approximate Budget (INR)</label>
                      <input
                        type="number"
                        className="sp-form-input"
                        placeholder="e.g. 50000"
                        value={budget}
                        onChange={e => setBudget(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="sp-form-group">
                    <label>Functional Scope & Requirements</label>
                    <textarea
                      rows="3"
                      className="sp-form-input"
                      style={{ resize: 'none' }}
                      placeholder="Explain features, pages, wireframe links or operational targets..."
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="sp-form-submit"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Configuring...' : 'Submit'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* 3. WHAT WE OFFER */}
        <div id="services">
          <WhatWeOffer
            sectionTag="Our Service Suite"
            heading="What We Offer"
            description="Custom-engineered web solutions built from scratch — no templates, no page builders."
            items={[
              { index: '01', icon: Globe, title: 'Business Websites', description: 'Your site ships in 10 days, built from scratch. No page builders, no bloated templates — just fast, secure code that makes you look like the market leader.', color: '#FF6A00' },
              { index: '02', icon: Target, title: 'Landing Pages', description: 'Every pixel pushes toward converting the visitor. We map layout, copy, and load speed to turn traffic into leads.', color: '#3B82F6' },
              { index: '03', icon: Monitor, title: 'CRM Solutions', description: 'Your team gets a dashboard they actually want to use. Custom workflows, no training required, no "let me check with IT" when something needs to change.', color: '#10B981' }
            ]}
          />
        </div>


        {/* 4. WHY CHOOSE US — Stat Ledger */}
        <section className="sp-why">
          <div className="sp-why-inner">
            <div className="sp-section-header">
              <div className="sp-section-tag">Why Choose Us</div>
              <h2>Engineering Standards</h2>
              <p>Built with the same rigor we'd demand for our own products.</p>
            </div>
            <div className="sp-why-ledger">
              {[
                { tag: 'Accountability', title: 'Dedicated Project Manager', desc: 'Your 1-on-1 link to coordinates and wireframes review checkpoints throughout the build cycle.' },
                { tag: 'Results', title: 'Conversion Focused', desc: 'Every layout is mapped to push target clicks and lead submissions that drive business growth.' },
                { tag: 'Security', title: 'Secure Development', desc: 'Secure database queries, HTTPS certificates, and credentials storage protocols baked in from day one.' },
                { tag: 'Scale', title: 'Scalable Architecture', desc: 'Lightweight React components structured to support future CRM expansions and feature additions.' }
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
              <div className="sp-section-tag">Process</div>
              <h2>Our Project Timeline</h2>
              <p>From scoping to deployment — a structured engineering pipeline.</p>
            </div>
            <div className="sp-wf-grid">
              {[
                { num: '01', icon: Target, title: 'Scoping', desc: 'Detailing pages, wireframes, and required checkout integrations.', color: 'var(--accent)' },
                { num: '02', icon: Monitor, title: 'UI Design', desc: 'Handcrafting responsive style assets mapping your brand identity.', color: '#F59E0B' },
                { num: '03', icon: Code, title: 'Engineering', desc: 'Writing secure React code, configuring forms, and setup dashboard APIs.', color: '#10B981' }
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
              <h2>What Clients Say</h2>
              <p>Trusted by tech companies and startups who demand engineering excellence.</p>
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
              <p>Common questions about our web development process and timelines.</p>
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
              <h2>Let's Build Your Website</h2>
              <p>Request a development proposal and elevate your brand presence today.</p>
            </div>
            <a href="#configure" className="btn">
              Request Website Proposal
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
