import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Activity, TrendingUp, Monitor, Home, Code, Globe, Database, Zap, Shield, UploadCloud, DownloadCloud, CheckCircle2, Clock, Users, Target } from 'lucide-react';
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
        budget: budget ? Number(budget) : 0
      });
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
        {/* 1. TEXT-FOCUSED CENTRED HERO */}
        <section className="service-hero-centered">
          <div className="service-hero-centered-content">
            <div className="service-hero-badge">
              <span className="service-hero-badge-dot"></span>
              Premium Digital Services
            </div>
            <h1 className="service-hero-title">
              Professional Website Development
            </h1>
            <p className="service-hero-desc">
              We build high-performance websites that help businesses establish credibility, generate qualified leads, and grow online with confidence.
            </p>
            <div className="service-hero-highlights">
              <span className="service-hero-highlight-item">✓ Custom Development</span>
              <span className="service-hero-highlight-item">✓ Mobile Responsive</span>
              <span className="service-hero-highlight-item">✓ SEO Optimized</span>
              <span className="service-hero-highlight-item">✓ Fast Performance</span>
              <span className="service-hero-highlight-item">✓ Secure Architecture</span>
              <span className="service-hero-highlight-item">✓ Long-Term Support</span>
            </div>
            <div className="service-hero-actions">
              <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                Request Website Proposal
              </a>
              <a href="#services" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                View Services
              </a>
            </div>
          </div>
        </section>

        {/* 2. ENQUIRY FORM - IMMEDIATELY AFTER HERO */}
        <section className="premium-form-section" id="configure">
          <div className="container">
            <div className="premium-form-wrapper">
              <h3 className="premium-form-title">Request Website Proposal</h3>

              {status === 'error' && <div className="alert alert-error" style={{ marginBottom: 20 }}><div className="alert-ic">!</div><div><h4>Submission Failed</h4><p>Please check inputs and try again.</p></div></div>}
              {status === 'query_sent' && <div className="alert alert-ok" style={{ marginBottom: 20 }}><div className="alert-ic alert-ic-ok">✓</div><div><h4>Request Registered</h4><p>Our engineering lead will connect on WhatsApp within 24 hours.</p></div></div>}

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
                    <label>Approximate Budget (INR)</label>
                    <input
                      type="number"
                      className="premium-form-input"
                      placeholder="e.g. 50000"
                      value={budget}
                      onChange={e => setBudget(e.target.value)}
                    />
                  </div>

                  <div className="premium-form-group">
                    <label>Functional Scope & Requirements</label>
                    <textarea
                      rows="3"
                      className="premium-form-input"
                      style={{ resize: 'none' }}
                      placeholder="Explain features, pages, wireframe links or operational targets..."
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
                    {status === 'loading' ? 'Configuring...' : 'Submit'}
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
              <span className="sec-label">Our Service Suite</span>
              <h2 className="sec-title">What We Offer</h2>
            </div>

            <div className="premium-benefits-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {[
                { title: 'Business Websites', desc: 'Professional company websites built strictly for trust and conversions.' },
                { title: 'Landing Pages', desc: 'High-converting pages designed for paid ads and lead generation.' },
                { title: 'CRM Solutions', desc: 'Internal dashboards and workflow systems tailored to your business.' },
                { title: 'Shopify Stores', desc: 'Fast and optimized online stores with secure checkout configurations.' },
                { title: 'Custom Web Applications', desc: 'Scalable solutions built around your business operations.' }
              ].map((val) => (
                <div key={val.title} className="premium-benefit-card" style={{ padding: '24px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, color: '#111827' }}>{val.title}</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#4B5563', lineHeight: '1.5' }}>{val.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. WHY CHOOSE THIS SERVICE */}
        <section className="premium-benefits-section" style={{ background: '#FAFAFB', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Why Choose Us</span>
              <h2 className="sec-title">Engineering Standards</h2>
            </div>
            <div className="premium-benefits-grid">
              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Users} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Dedicated Project Manager</h3>
                <p className="premium-benefit-desc">Your 1-on-1 link to coordinates and wireframes review checkpoints.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Target} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Conversion Focused</h3>
                <p className="premium-benefit-desc">Every layout is mapped to push target clicks and lead submissions.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Shield} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Secure Development</h3>
                <p className="premium-benefit-desc">Secure database queries, HTTPS certificates, and credentials storage protocols.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Zap} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Scalable Architecture</h3>
                <p className="premium-benefit-desc">Lightweight React components structured to support future CRM expansions.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. OUR PROCESS */}
        <section className="premium-process-section" style={{ background: '#FFFFFF' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Process</span>
              <h2 className="sec-title">Our Project Timeline</h2>
            </div>
            <div className="premium-process-grid">
              <div className="premium-process-step">
                <div className="premium-process-step-num">01</div>
                <h3 className="premium-process-step-title">Scoping</h3>
                <p className="premium-process-step-desc">Detailing pages, wireframes, and required checkout integrations.</p>
              </div>

              <div className="premium-process-step">
                <div className="premium-process-step-num">02</div>
                <h3 className="premium-process-step-title">UI Design</h3>
                <p className="premium-process-step-desc">Handcrafting responsive style assets mapping your brand identity.</p>
              </div>

              <div className="premium-process-step">
                <div className="premium-process-step-num">03</div>
                <h3 className="premium-process-step-title">Engineering</h3>
                <p className="premium-process-step-desc">Writing secure React code, configuring forms, and setup dashboard APIs.</p>
              </div>

              <div className="premium-process-step">
                <div className="premium-process-step-num">04</div>
                <h3 className="premium-process-step-title">Deployment</h3>
                <p className="premium-process-step-desc">Lighthouse speed runs, SSL checks, and custom staging deployment.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. TESTIMONIALS */}
        <section className="section clients" id="clients" style={{ background: '#FAF9F6' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Testimonials</span>
              <h2 className="sec-title">What Clients Say</h2>
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
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#111827' }}>Let's Build Your Website</h2>
            <p style={{ color: '#4B5563', fontSize: '1rem', marginBottom: '32px' }}>Request a development proposal and elevate your brand presence today.</p>
            <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Request Website Proposal
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
