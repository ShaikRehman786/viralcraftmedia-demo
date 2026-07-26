import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mic, Headphones, Zap, Shield, Clock, Users, Target, UploadCloud, DownloadCloud, Layers } from 'lucide-react';
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
        budget: 0
      });
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
        {/* 1. EDITORIAL HERO — Left-aligned */}
        <section className="sp-hero">
          <div className="sp-hero-inner">
            <div className="sp-hero-left">
              <div className="sp-hero-eyebrow">Podcast Production</div>
              <h1>Professional Podcast<br />Masterclass Production</h1>
              <p>We edit room echoes, balance audio gains, sync multi-camera feeds, and create vertical reels to help you grow your show.</p>
              <div className="sp-hero-actions">
                <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  Start Podcast Project
                </a>
                <a href="#services" className="btn btn-ghost" style={{ textDecoration: 'none' }}>View Deliverables</a>
              </div>
            </div>
            <div className="sp-hero-right">
              <div className="sp-hero-stat-row">
                <div className="sp-hero-stat-card">
                  <span className="stat-val">3–4d</span>
                  <span className="stat-label">Fast Delivery</span>
                </div>
                <div className="sp-hero-stat-card">
                  <span className="stat-val">5+</span>
                  <span className="stat-label">Clips Per Episode</span>
                </div>
              </div>
              <div className="sp-hero-feature-list">
                {['Audio Mastering', 'Multi-Cam Cuts', 'Background Noise Fix', 'Social Clips Extraction'].map(f => (
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

        {/* 3. WHAT WE OFFER — Process Rail */}
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
