import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Activity, TrendingUp, Monitor, Home, Mic, Headphones, Zap, Target, Layers, Shield, UploadCloud, DownloadCloud } from 'lucide-react';
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

export default function PodcastEditingPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.title = "Transform Raw Podcasts Into Professional Episodes | ViralCraft Media";
    const metaTags = {
      description: "Get pristine audio mixing, multi-cam video switching, noise cleanup, and optimized social highlights for your podcast channels.",
      keywords: "podcast editing, audio mastering, video podcast switching, noise removal",
      "og:title": "Transform Raw Podcasts Into Professional Episodes | ViralCraft Media",
      "og:description": "Get pristine audio mixing, multi-cam video switching, noise cleanup, and optimized social highlights for your podcast channels.",
      "og:url": window.location.href,
      "og:type": "website",
      "twitter:card": "summary_large_image",
      "twitter:title": "Transform Raw Podcasts Into Professional Episodes | ViralCraft Media",
      "twitter:description": "Get pristine audio mixing, multi-cam video switching, noise cleanup, and optimized social highlights for your podcast channels."
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

    let script = document.querySelector('#schema-podcast-editing');
    if (!script) {
      script = document.createElement('script');
      script.id = 'schema-podcast-editing';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Podcast Editing & Production",
      "serviceType": "Audio & Video Editing",
      "provider": { "@type": "Organization", "name": "ViralCraft Media" }
    });

    return () => script.remove();
  }, []);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Valid 10-digit WhatsApp number is required';
    if (!link.trim()) errs.link = 'File or folder link is required';
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
        serviceCategory: 'Podcast Editing',
        description: `Raw Audio/Video Link: ${link}\nInstructions/Notes: ${instructions}`,
        budget: 0
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
                  Pristine Studio Audio & Video
                </div>
                <h1 className="hero-title">
                  Transform Raw Podcasts Into{' '}
                  <span className="hero-grad">Professional Episodes.</span>
                </h1>
                <p className="hero-desc">
                  Master multi-camera speaker switching, clean background audio hiss, EQ voice dynamics, and extract high retention highlight reels.
                </p>
                <div className="hero-actions">
                  <a href="#pricing" className="btn btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    Submit Scope
                  </a>
                </div>
                <div className="hero-stats">
                  <div className="hero-stat">
                    <span className="hero-stat-val"><AnimatedCounter target="100" suffix="+" /></span>
                    <span className="hero-stat-lbl">Episodes Mastered</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val">3-4d</span>
                    <span className="hero-stat-lbl">Turnaround</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val"><AnimatedCounter target="99" suffix="%" /></span>
                    <span className="hero-stat-lbl">Sound Accuracy</span>
                  </div>
                </div>
              </div>
              <div className="hero-right">
                <div className="showcase-mesh"></div>
                <div className="hero-mockup">
                  <div className="hero-mockup-waveform" style={{ flexDirection: 'column', gap: '4px', height: 'auto' }}>
                    <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '80px' }}>
                      {Array.from({ length: 40 }).map((_, i) => (
                        <div key={i} className="hero-mockup-waveform-bar" style={{
                          height: `${20 + Math.sin(i * 1.2) * 30 + Math.cos(i * 0.5) * 20 + 20}px`,
                          opacity: 0.4 + Math.sin(i * 0.3) * 0.3
                        }}></div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></div>
                      <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>REC · MASTER · -3dB</span>
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
              <span className="sec-label">Production Capabilities</span>
              <h2 className="sec-title" style={{ fontSize: '2rem', fontWeight: 900 }}>Studio-Grade Podcast Post-Production</h2>
              <p className="sec-desc">From raw audio cleanup to multi-cam video switching, every episode receives full-spectrum post-production.</p>
            </div>
            <div className="svc-features-grid">
              {[
                { icon: Mic, title: 'Noise Cleanup', desc: 'Remove background hiss, hum, and room echo for pristine vocal clarity.' },
                { icon: Headphones, title: 'Audio Mastering', desc: 'EQ compression, loudness normalization, and multi-band dynamics for consistent levels.' },
                { icon: Layers, title: 'Multi-Cam Switching', desc: 'Seamless host/guest camera cuts with speaker-following logic.' },
                { icon: Zap, title: 'Social Highlights', desc: 'Extract high-retention clips optimized for Instagram, TikTok, and YouTube Shorts.' },
                { icon: Target, title: 'Silence Removal', desc: 'Tighten pacing by removing dead air, long pauses, and verbal stumbles.' },
                { icon: Shield, title: 'Episode Packaging', desc: 'Intro/outro bumpers, chapter markers, show notes, and ID3 tags included.' }
              ].map((f, i) => (
                <div key={f.title} className="svc-feature-card" style={{ animation: `fade-up 0.5s ease ${i * 0.1}s both` }}>
                  <div className="svc-feature-icon" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(96,165,250,0.05))', borderColor: 'rgba(59,130,246,0.08)' }}>
                    <IconWrapper icon={f.icon} size={22} color="#3B82F6" />
                  </div>
                  <h3 className="svc-feature-title">{f.title}</h3>
                  <p className="svc-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PODCAST ENQUIRY FORM */}
        <section className="section pricing" id="pricing" style={{ padding: '80px 24px' }}>
          <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div className="sec-hdr center" style={{ maxWidth: '600px', marginBottom: '48px', textAlign: 'center' }}>
              <span className="sec-label">Request Proposal</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 900 }}>Configure Your Podcast</h2>
              <p className="sec-desc">Provide raw recording links or files. Our post-production audio engineers will review and deliver a custom roadmap proposal.</p>
            </div>

            <div className="p-right" style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
              {status === 'error' && <div className="alert alert-error"><div className="alert-ic">!</div><div><h4>Submission Failed</h4><p>Please try again.</p></div></div>}
              {status === 'query_sent' && <div className="alert alert-ok"><div className="alert-ic alert-ic-ok">✓</div><div><h4>Request Registered</h4><p>A production manager will connect on WhatsApp within 24 hours.</p></div></div>}
              
              {status !== 'query_sent' && (
                <form onSubmit={handleSubmit} className="p-form" noValidate style={{ width: '100%', padding: '40px', borderRadius: '24px', background: '#FFFFFF', border: '1.5px solid rgba(59, 130, 246, 0.12)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="p-form-hdr" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px', color: '#0E0E10' }}>Podcast Specifications</div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Show Host Name <span className="req">*</span></label>
                    <div className={`p-inp ${errors.name ? 'err' : ''}`}><input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
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
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Raw Footage Folder Link <span className="req">*</span></label>
                    <div className={`p-inp ${errors.link ? 'err' : ''}`}><input type="url" placeholder="Google Drive, WeTransfer, or Dropbox shared folder link" value={link} onChange={e => setLink(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                    {errors.link && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.link}</span>}
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Episodic Notes & Instructions</label>
                    <div className="p-inp">
                      <textarea rows="3" placeholder="Number of guest/host camera feeds, special transitions, audio cleaning instructions..." value={instructions} onChange={e => setInstructions(e.target.value)} style={{ padding: '12px 14px', width: '100%', resize: 'none' }} />
                    </div>
                  </div>
                  
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', textAlign: 'center', background: '#3B82F6', borderColor: '#3B82F6' }} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Submitting...' : 'Submit Request'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* TRUST BAR */}
        <section style={{ padding: '40px 24px', background: '#FAF9F6', borderTop: '1px solid rgba(59,130,246,0.04)', borderBottom: '1px solid rgba(59,130,246,0.04)' }}>
          <div className="container">
            <div className="svc-trust-bar">
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                3-4 Day Quick Turnaround
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                99% Sound Accuracy Rate
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                100+ Episodes Mastered
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                Multi-Cam Support
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
              <p className="sec-desc">From raw recording to polished episode in three straightforward steps.</p>
            </div>
            <div className="svc-process-grid">
              {[
                { icon: UploadCloud, title: 'Submit Raw Recordings', desc: 'Share your raw podcast audio/video files via Google Drive or Dropbox.' },
                { icon: Headphones, title: 'Audio & Video Mastering', desc: 'Our engineers clean audio, switch camera feeds, and master final levels.' },
                { icon: DownloadCloud, title: 'Receive Final Episode', desc: 'Get your mastered episode with show notes, chapters, and social clips.' }
              ].map((s, i) => (
                <div key={s.title} className="svc-process-step">
                  <div className="svc-process-icon" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(96,165,250,0.05))', borderColor: 'rgba(59,130,246,0.08)' }}>
                    <IconWrapper icon={s.icon} size={24} color="#3B82F6" />
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
            <div className="svc-cta-section" style={{ borderColor: 'rgba(59,130,246,0.08)', background: 'linear-gradient(135deg, rgba(59,130,246,0.03), rgba(96,165,250,0.02))' }}>
              <h2 className="svc-cta-title">Ready to Launch Your Podcast?</h2>
              <p className="svc-cta-desc">Submit your raw recordings and get a professional episode delivered within 3-4 days.</p>
              <div className="svc-cta-actions">
                <a href="#pricing" className="btn btn-primary" style={{ background: '#3B82F6', borderColor: '#3B82F6' }}>Submit Your Scope</a>
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

              {/* Service 2: Podcast Editing (Active) */}
              <div className="svc-card" style={{ border: '2px solid #3B82F6', background: 'rgba(59, 130, 246, 0.02)', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={Activity} size={44} color="#3B82F6" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Podcast Editing (Active)</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Transform raw podcast recordings into polished, professional episodes that keep listeners engaged.</p>
                </div>
                <Link to="/services/podcast-editing" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block', background: '#3B82F6', borderColor: '#3B82F6' }}>Start Project</Link>
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
