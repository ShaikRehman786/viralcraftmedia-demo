import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getReferralAttribution, clearReferralAttribution } from '../services/referralAttribution.js';
import { 
  Mic, Headphones, Zap, Shield, Clock, Users, Target, UploadCloud, DownloadCloud, Layers
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

export default function PodcastEditingPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [activeFaq, setActiveFaq] = useState(null);

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
        description: `Raw Audio/Video Link: ${link}\nInstructions/Notes: ${instructions}\nSource Page: Podcast Editing`,
        budget: 0,
        referralDetails: getReferralAttribution()
      });
      clearReferralAttribution();
      setStatus('query_sent');
    } catch (err) {
      setStatus('error');
    }
  };

  const clients = clientTestimonials.filter(c => c.industry === 'Creator' || c.industry === 'Fitness' || c.industry === 'Coaching');
  if (clients.length === 0) {
    clients.push(...clientTestimonials.slice(0, 3));
  }

  const faqs = [
    { q: 'What audio standards do you adhere to?', a: 'All episodes are mixed and mastered strictly to commercial platforms parameters, maintaining a unified sound stage across speakers.' },
    { q: 'Do you compile multi-camera video reels?', a: 'Yes. We cut raw visual stems dynamically, alternating focus to match active speakers and conversational flow.' },
    { q: 'How many social highlight shorts do I get?', a: 'Depending on your scope, our editors extract and package 2 to 5 high-retention vertical clips ready for shorts and reels.' }
  ];



  return (
    <div className="service-page-wrap podcast-page">
      <Navbar />
      <main style={{ paddingTop: '80px' }}>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          .premium-floating-panel {
            background: rgba(11, 11, 12, 0.25);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            padding: 28px 24px;
            width: 100%;
            max-width: 280px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            gap: 20px;
            animation: float 6s ease-in-out infinite;
          }
          @media (max-width: 1024px) {
            .premium-floating-panel {
              max-width: 250px;
              padding: 24px 20px;
              gap: 16px;
            }
          }
          @media (min-width: 769px) and (max-width: 1024px) {
            .sp-hero {
              min-height: auto !important;
              padding-top: 50px !important;
              padding-bottom: 70px !important;
            }
            .sp-hero-inner {
              padding: 0 32px !important;
              gap: 32px !important;
            }
            .sp-hero-left {
              gap: 16px !important;
            }
          }
          @media (max-width: 768px) {
            .sp-hero {
              min-height: auto !important;
              padding-top: 30px !important;
              padding-bottom: 55px !important;
            }
            .sp-hero-inner {
              padding: 0 20px !important;
              flex-direction: column !important;
              align-items: flex-start !important;
              justify-content: center !important;
              gap: 24px !important;
            }
            .sp-hero-left {
              gap: 12px !important;
              align-items: flex-start !important;
              text-align: left !important;
              width: 100% !important;
              flex: 1 1 auto !important;
            }
            .sp-hero-left h1 {
              font-size: clamp(2rem, 8vw, 2.75rem) !important;
            }
            .sp-hero-left p {
              font-size: 0.95rem !important;
              line-height: 1.4 !important;
              margin-top: 4px !important;
            }
            .sp-hero-actions {
              margin-top: 6px !important;
              gap: 12px !important;
              width: 100% !important;
            }
            .sp-hero-actions a {
              flex: 1 1 auto !important;
              justify-content: center !important;
              font-size: 0.9rem !important;
              padding: 10px 16px !important;
            }
            .sp-hero-right {
              justify-content: center !important;
              width: 100% !important;
            }
            .premium-floating-panel {
              max-width: 100% !important;
              flex-direction: row !important;
              flex-wrap: wrap !important;
              justify-content: center !important;
              align-items: center !important;
              gap: 20px 32px !important;
              padding: 16px 20px !important;
              animation: none !important;
              background: rgba(11, 11, 12, 0.45) !important;
              border: 1px solid rgba(255, 255, 255, 0.08) !important;
            }
            .sp-hero-overlay {
              background: linear-gradient(to bottom, rgba(11, 11, 12, 0.75) 0%, rgba(11, 11, 12, 0.45) 60%, rgba(11, 11, 12, 0.8) 100%) !important;
            }
          }
          .podcast-video-bg {
            position: absolute;
            top: 0;
            right: 0;
            width: 55%;
            height: 100%;
            object-fit: cover;
            object-position: center 15%;
            transform: translate3d(0,0,0);
            will-change: transform;
            z-index: 0;
            -webkit-mask-image: linear-gradient(to right, transparent 0%, black 25%);
            mask-image: linear-gradient(to right, transparent 0%, black 25%);
          }
          @media (max-width: 1200px) {
            .podcast-video-bg {
              width: 60%;
              object-position: center 10%;
              -webkit-mask-image: linear-gradient(to right, transparent 0%, black 30%);
              mask-image: linear-gradient(to right, transparent 0%, black 30%);
            }
          }
          @media (min-width: 769px) and (max-width: 1024px) {
            .podcast-video-bg {
              width: 50% !important;
              object-position: center 25% !important;
              transform: scale(1.05) !important;
            }
          }
          @media (max-width: 768px) {
            .podcast-video-bg {
              width: 100%;
              height: 100%;
              left: 0;
              object-position: center 30% !important;
              transform: scale(1.1) !important;
              -webkit-mask-image: none !important;
              mask-image: none !important;
            }
          }
        `}</style>

        {/* 1. EDITORIAL HERO — Cinematic Video Redesign */}
        <section className="sp-hero" style={{ 
          position: 'relative', 
          minHeight: '85vh', 
          display: 'flex', 
          alignItems: 'center', 
          overflow: 'hidden',
          background: '#0B0B0C'
        }}>
          {/* Background Video */}
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="podcast-video-bg"
          >
            <source src="/pod_service1.mp4" type="video/mp4" />
          </video>

          {/* Cinematic Dark Gradient Overlay */}
          <div
            className="sp-hero-overlay"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to right, rgba(11, 11, 12, 0.95) 0%, rgba(11, 11, 12, 0.8) 40%, rgba(11, 11, 12, 0.15) 100%)',
              zIndex: 1
            }}
          />

          <div className="sp-hero-inner" style={{ 
            position: 'relative', 
            zIndex: 2,
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 48px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '40px',
            flexWrap: 'wrap'
          }}>
            {/* Left Content Column */}
            <div className="sp-hero-left" style={{ 
              flex: '1 1 500px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              <div className="sp-hero-eyebrow" style={{ 
                fontSize: '0.85rem', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                letterSpacing: '2px', 
                color: 'var(--accent, #F97316)',
                margin: 0
              }}>
                Podcast Production
              </div>
              
              <h1 style={{ 
                fontSize: 'clamp(2.5rem, 5vw, 4rem)', 
                fontWeight: 800, 
                lineHeight: 1.1, 
                color: '#FFFFFF',
                margin: 0,
                letterSpacing: '-1px'
              }}>
                Professional Podcast Production
              </h1>
              
              <p style={{ 
                fontSize: 'clamp(1rem, 2vw, 1.25rem)', 
                lineHeight: 1.5, 
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0,
                maxWidth: '480px'
              }}>
                We edit room echoes, balance audio levels, sync multi-camera tracks, and extract viral clips.
              </p>
              
              <div className="sp-hero-actions" style={{ 
                display: 'flex', 
                gap: '16px',
                marginTop: '8px'
              }}>
                <a href="#configure" className="btn btn-primary" style={{ 
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  Start Podcast Project
                </a>
                <a href="#services" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                  View Deliverables
                </a>
              </div>
            </div>

            {/* Right Panel Column: Single Floating Glass Card (Option C) */}
            <div className="sp-hero-right" style={{ 
              flex: '1 1 320px',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center'
            }}>
              <div className="premium-floating-panel">
                {/* Five Star Rating */}
                <div style={{ display: 'flex', gap: '3px', color: '#F59E0B', fontSize: '0.7rem', letterSpacing: '1px' }}>
                  ★ ★ ★ ★ ★
                </div>

                {/* Key Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: 'clamp(1.5rem, 3vw, 1.8rem)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.5px' }}>250+</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500, letterSpacing: '0.2px' }}>Episodes Delivered</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontSize: 'clamp(1.5rem, 3vw, 1.8rem)', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.1, letterSpacing: '-0.5px' }}>48M+</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 500, letterSpacing: '0.2px' }}>Views Generated</div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '0.1px' }}>Trusted by Creators</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 400, letterSpacing: '0.1px' }}>Worldwide Industry Leaders</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. ENQUIRY FORM — Split layout */}
        <section className="sp-enquiry" id="configure">
          <div className="sp-enquiry-inner">
            <div className="sp-enquiry-left">
              <div className="sp-section-tag">Get Started</div>
              <h2>Launch Your Podcast Project</h2>
              <p>Share your raw recordings and editing notes. A production lead will connect on WhatsApp within 24 hours to discuss scope.</p>
              <div className="sp-enquiry-trust">
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg></span>
                  Secure & Confidential
                </div>
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></span>
                  24-Hour Response Time
                </div>
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></span>
                  50+ Podcasts Produced
                </div>
              </div>
            </div>
            <div className="sp-enquiry-form-card">
              <h3>Start Podcast Project</h3>

              {status === 'error' && <div className="alert alert-error" style={{ marginBottom: 20 }}><div className="alert-ic">!</div><div><h4>Submission Failed</h4><p>Please check inputs and try again.</p></div></div>}
              {status === 'query_sent' && <div className="alert alert-ok" style={{ marginBottom: 20 }}><div className="alert-ic alert-ic-ok">✓</div><div><h4>Request Registered</h4><p>A production lead will connect on WhatsApp within 24 hours.</p></div></div>}

              {status !== 'query_sent' && (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="sp-form-row">
                    <div className="sp-form-group">
                      <label>Show Host Name *</label>
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
                    <label>Raw Recording Folder Link *</label>
                    <input
                      type="url"
                      className={`sp-form-input ${errors.link ? 'err' : ''}`}
                      placeholder="Google Drive, WeTransfer, or Dropbox link"
                      value={link}
                      onChange={e => setLink(e.target.value)}
                    />
                    {errors.link && <span className="sp-form-error">{errors.link}</span>}
                  </div>

                  <div className="sp-form-group">
                    <label>Show Notes & Special Instructions</label>
                    <textarea
                      rows="3"
                      className="sp-form-input"
                      style={{ resize: 'none' }}
                      placeholder="Number of guest/host camera feeds, special transitions, audio cleaning instructions..."
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="sp-form-submit"
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Configuring...' : 'Start Podcast Project'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* 3. WHAT WE OFFER */}
        <div id="services">
          <WhatWeOffer
            sectionTag="Production Deliverables"
            heading="What We Offer"
            description="End-to-end podcast production from raw recording to publish-ready episodes."
            items={[
              { index: '01', icon: Mic, title: 'Multi-Camera Cuts', description: "Your listeners forget they're watching a podcast. Camera cuts arrive when the conversation demands them — no dead air, no awkward pauses.", color: '#FF6A00' },
              { index: '02', icon: Headphones, title: 'Studio Audio EQ', description: 'Every voice comes through clean. Room echo disappears, plosives get tamed, and your audience stops adjusting volume between segments.', color: '#3B82F6' },
              { index: '03', icon: Zap, title: 'Social Clip Engine', description: "Every episode feeds your growth engine. We find the 30 seconds that made your guest laugh or your audience lean in — and turn it into a clip strangers can't scroll past.", color: '#10B981' }
            ]}
          />
        </div>


        {/* 4. WHY CHOOSE US — Stat Ledger */}
        <section className="sp-why">
          <div className="sp-why-inner">
            <div className="sp-section-header">
              <div className="sp-section-tag">Why Choose Us</div>
              <h2>Production Quality</h2>
              <p>We treat every episode as a premium production, not just an edit.</p>
            </div>
            <div className="sp-why-ledger">
              {[
                { tag: 'Audio Precision', title: 'Sound Accuracy', desc: 'Pristine audio levels balanced perfectly across mobile and stereo speakers for professional broadcast quality.' },
                { tag: 'Speed', title: '3–4 Day Turnaround', desc: 'Guaranteed episodic delivery to maintain your broadcast scheduling calendar without delays.' },
                { tag: 'Accountability', title: 'Dedicated Director', desc: 'A single point of contact coordinating edit notes and final deliverables throughout production.' },
                { tag: 'Retention', title: 'Retentive Hooks', desc: 'Highlight selections engineered to maximize viewership on social loops and drive audience growth.' }
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
              <div className="sp-section-tag">Operations</div>
              <h2>Our Production Workflow</h2>
              <p>A streamlined pipeline from raw recording to publish-ready episodes.</p>
            </div>
            <div className="sp-wf-grid">
              {[
                { num: '01', icon: UploadCloud, title: 'Submit Stems', desc: 'Provide raw recording links via Google Drive or WeTransfer.', color: 'var(--accent)' },
                { num: '02', icon: Headphones, title: 'Mastering & Switching', desc: 'We clean vocal tracks and align speaker camera transitions.', color: '#F59E0B' },
                { num: '03', icon: Layers, title: 'Episodic Packaging', desc: 'Adding intro/outro elements, graphics, and social promo cuts.', color: '#10B981' }
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
              <h2>What Hosts Say</h2>
              <p>Trusted by podcasters and content creators who demand broadcast quality.</p>
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
              <p>Everything you need to know about our podcast production workflow.</p>
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
              <h2>Ready to Scale Your Podcast?</h2>
              <p>Configure your production scope and launch high-retention episodes today.</p>
            </div>
            <a href="#configure" className="btn">
              Start Podcast Project
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
