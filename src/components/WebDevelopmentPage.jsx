import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Activity, TrendingUp, Monitor, Home, Code, Globe, Database, Zap, Shield, UploadCloud, DownloadCloud } from 'lucide-react';
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
        description: `Project Scope details: ${instructions}`,
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
                  React & Next.js Custom Engineering
                </div>
                <h1 className="hero-title">
                  Build Premium Websites That{' '}
                  <span className="hero-grad">Convert Visitors Into Clients.</span>
                </h1>
                <p className="hero-desc">
                  Sleek corporate sites, SaaS layouts, full database integrations, and high performance dashboards built with pixel accuracy. If you need a website, we can build it.
                </p>
                <div className="hero-actions">
                  <a href="#pricing" className="btn btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    Submit Scope
                  </a>
                </div>
                <div className="hero-stats">
                  <div className="hero-stat">
                    <span className="hero-stat-val">99%</span>
                    <span className="hero-stat-lbl">Lighthouse Speed</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val">SEO</span>
                    <span className="hero-stat-lbl">Index Optimized</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val"><AnimatedCounter target="100" suffix="%" /></span>
                    <span className="hero-stat-lbl">Responsive Accuracy</span>
                  </div>
                </div>
              </div>
              <div className="hero-right">
                <div className="showcase-mesh"></div>
                <div className="hero-mockup">
                  <div className="hero-mockup-browser">
                    <div className="hero-mockup-browser-bar">
                      <div className="hero-mockup-browser-dot"></div>
                      <div className="hero-mockup-browser-dot"></div>
                      <div className="hero-mockup-browser-dot"></div>
                      <div className="hero-mockup-browser-url"></div>
                    </div>
                    <div className="hero-mockup-browser-body">
                      <div className="hero-mockup-code-line"></div>
                      <div className="hero-mockup-code-line"></div>
                      <div className="hero-mockup-code-line"></div>
                      <div className="hero-mockup-code-line"></div>
                      <div className="hero-mockup-code-line"></div>
                      <div className="hero-mockup-code-line"></div>
                      <div className="hero-mockup-code-line"></div>
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
              <span className="sec-label">Engineering Capabilities</span>
              <h2 className="sec-title" style={{ fontSize: '2rem', fontWeight: 900 }}>Full-Stack Web Engineering</h2>
              <p className="sec-desc">From corporate sites to custom SaaS platforms, we build performant web solutions with pixel-perfect execution.</p>
            </div>
            <div className="svc-features-grid">
              {[
                { icon: Monitor, title: 'Responsive Design', desc: 'Pixel-perfect layouts across every device size with meticulous attention to detail.' },
                { icon: Code, title: 'Modern Frameworks', desc: 'React, Next.js, and Node.js powered applications with clean, maintainable code.' },
                { icon: Globe, title: 'SEO Optimized', desc: 'Built-in meta frameworks, structured data, and Lighthouse-optimized performance.' },
                { icon: Database, title: 'CRM Integration', desc: 'Custom dashboard portals with real-time data, user management, and analytics.' },
                { icon: Zap, title: 'Payment Gateways', desc: 'Seamless Razorpay, Stripe, and other payment integrations with secure checkout.' },
                { icon: Shield, title: 'SLA & Maintenance', desc: 'Ongoing support, performance tune-ups, security patches, and feature updates.' }
              ].map((f, i) => (
                <div key={f.title} className="svc-feature-card" style={{ animation: `fade-up 0.5s ease ${i * 0.1}s both` }}>
                  <div className="svc-feature-icon" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(167,139,250,0.05))', borderColor: 'rgba(139,92,246,0.08)' }}>
                    <IconWrapper icon={f.icon} size={22} color="#8B5CF6" />
                  </div>
                  <h3 className="svc-feature-title">{f.title}</h3>
                  <p className="svc-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CAPABILITIES SUITE */}
        <section style={{ padding: '40px 24px', background: '#FFFFFF', borderTop: '1px solid rgba(139, 92, 246, 0.08)', borderBottom: '1px solid rgba(139, 92, 246, 0.08)' }}>
          <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0E0E10', marginBottom: '24px' }}>Capabilities Suite</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {[
                "Business Websites", "Corporate Portals", "Portfolio Showcases", "High-Converting Landing Pages",
                "Agency Portfolios", "Restaurant & Booking Hubs", "Hotel Management & Booking", "Hospital Information Systems",
                "Clinic Booking Pages", "Educational Portals", "School & College Platforms", "Real Estate MLS Websites",
                "Construction Showcases", "Travel Booking Hubs", "Blogs & News Portals", "NGO Donation Gateways",
                "Event Management Platforms", "E-Commerce Marketplaces", "Booking Engines", "Custom CRM & ERP Modules",
                "Admin Dashboards", "Web Applications", "Custom API Integrations", "Payment Gateways", "SEO Optimizations",
                "Maintenance & SLA Support", "Performance Tune-ups", "Full UI Redesigns"
              ].map((val) => (
                <span key={val} style={{ fontSize: '0.8rem', background: '#FAF9F6', color: '#575F6E', padding: '6px 14px', borderRadius: '100px', border: '1px solid rgba(0,0,0,0.04)', fontWeight: 'bold' }}>
                  {val}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* WEB DEV REQUEST FORM */}
        <section className="section pricing" id="pricing" style={{ padding: '80px 24px' }}>
          <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div className="sec-hdr center" style={{ maxWidth: '600px', marginBottom: '48px', textAlign: 'center' }}>
              <span className="sec-label">Web Scoping</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 900 }}>Configure Your Website</h2>
              <p className="sec-desc">Submit your functional scope or wireframe files. Our engineers will catalog your technical checklist directly in our CRM.</p>
            </div>

            <div className="p-right" style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
              {status === 'error' && <div className="alert alert-error"><div className="alert-ic">!</div><div><h4>Submission Failed</h4><p>Please try again.</p></div></div>}
              {status === 'query_sent' && <div className="alert alert-ok"><div className="alert-ic alert-ic-ok">✓</div><div><h4>Request Registered</h4><p>An engineering lead will contact on WhatsApp within 24 hours.</p></div></div>}
              
              {status !== 'query_sent' && (
                <form onSubmit={handleSubmit} className="p-form" noValidate style={{ width: '100%', padding: '40px', borderRadius: '24px', background: '#FFFFFF', border: '1.5px solid rgba(139, 92, 246, 0.12)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="p-form-hdr" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px', color: '#0E0E10' }}>Development Specifications</div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Client Name <span className="req">*</span></label>
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
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Target Scope Budget (INR)</label>
                    <div className="p-inp"><input type="number" placeholder="e.g. 75000" value={budget} onChange={e => setBudget(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Technical Details / Features required</label>
                    <div className="p-inp">
                      <textarea rows="3" placeholder="Specify if Business Site, SaaS portal, Custom ERP, Payment gateway integration details..." value={instructions} onChange={e => setInstructions(e.target.value)} style={{ padding: '12px 14px', width: '100%', resize: 'none' }} />
                    </div>
                  </div>
                  
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', textAlign: 'center', background: '#8B5CF6', borderColor: '#8B5CF6' }} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* TRUST BAR */}
        <section style={{ padding: '40px 24px', background: '#FAF9F6', borderTop: '1px solid rgba(139,92,246,0.04)', borderBottom: '1px solid rgba(139,92,246,0.04)' }}>
          <div className="container">
            <div className="svc-trust-bar">
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                99% Lighthouse Score
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                100% Responsive Guarantee
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                SEO First Architecture
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Custom CRM Integration
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
              <p className="sec-desc">From requirements to launch, a transparent and collaborative development process.</p>
            </div>
            <div className="svc-process-grid">
              {[
                { icon: UploadCloud, title: 'Submit Requirements', desc: 'Share your project scope, wireframes, or reference sites you admire.' },
                { icon: Code, title: 'Development & Testing', desc: 'We build your site with React/Next.js, testing across all devices and browsers.' },
                { icon: DownloadCloud, title: 'Launch & Support', desc: 'Deploy to production with ongoing maintenance and performance monitoring.' }
              ].map((s, i) => (
                <div key={s.title} className="svc-process-step">
                  <div className="svc-process-icon" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(167,139,250,0.05))', borderColor: 'rgba(139,92,246,0.08)' }}>
                    <IconWrapper icon={s.icon} size={24} color="#8B5CF6" />
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
            <div className="svc-cta-section" style={{ borderColor: 'rgba(139,92,246,0.08)', background: 'linear-gradient(135deg, rgba(139,92,246,0.03), rgba(167,139,250,0.02))' }}>
              <h2 className="svc-cta-title">Ready to Build Your Website?</h2>
              <p className="svc-cta-desc">Share your project scope and get a detailed proposal from our engineering team.</p>
              <div className="svc-cta-actions">
                <a href="#pricing" className="btn btn-primary" style={{ background: '#8B5CF6', borderColor: '#8B5CF6' }}>Submit Your Scope</a>
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

              {/* Service 3: Social Media Marketing */}
              <div className="svc-card" style={{ minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={TrendingUp} size={44} color="#10B981" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Social Marketing</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Help businesses grow organically with strategic content planning, script hook writing, and calendar pacing.</p>
                </div>
                <Link to="/services/social-media-marketing" className="btn btn-ghost" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block' }}>Start Project</Link>
              </div>

              {/* Service 4: Website Design & Development (Active) */}
              <div className="svc-card" style={{ border: '2px solid #8B5CF6', background: 'rgba(139, 92, 246, 0.02)', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={Monitor} size={44} color="#8B5CF6" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Website Development (Active)</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Build high-performance websites designed to increase trust, improve conversions, and represent your brand.</p>
                </div>
                <Link to="/services/web-design-development" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block', background: '#8B5CF6', borderColor: '#8B5CF6' }}>Start Project</Link>
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
