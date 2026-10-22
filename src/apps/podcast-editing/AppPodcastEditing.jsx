import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getReferralAttribution, clearReferralAttribution } from '../../services/referralAttribution.js';
import { 
  Mic, Headphones, Zap, Shield, Clock, Users, Target, UploadCloud, DownloadCloud, Layers, CheckCircle2, HelpCircle
} from 'lucide-react';
import PodcastNavbar from './PodcastNavbar.jsx';
import PodcastFooter from './PodcastFooter.jsx';
import { clientTestimonials } from '../../data/clientTestimonials.js';

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

export default function AppPodcastEditing() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    document.title = "Studio-Grade Podcast Editing & Mastering | ViralCraft Media";
    const metaTags = {
      description: "Get pristine audio mixing, multi-cam video switching, spectral noise cleanup, and optimized social highlights for your podcast.",
      keywords: "podcast editing, audio mastering, video podcast switching, noise removal",
      "og:title": "Studio-Grade Podcast Editing & Mastering | ViralCraft Media",
      "og:description": "Get pristine audio mixing, multi-cam video switching, spectral noise cleanup, and optimized social highlights.",
      "og:url": window.location.href,
      "og:type": "website"
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
  }, []);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Full Name is required';
    if (!phone.trim()) errs.phone = 'Phone number is required';
    if (!email.trim()) errs.email = 'Email address is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setStatus('submitting');
    try {
      const referral = getReferralAttribution();
      const payload = {
        name,
        phone,
        email,
        service: 'Podcast Editing',
        projectLink: link,
        message: instructions,
        referralCode: referral?.code,
        referralCampaignId: referral?.campaignId
      };

      const res = await axios.post('/api/enquiries', payload);
      if (res.data.success) {
        setStatus('success');
        clearReferralAttribution();
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error('Podcast enquiry error:', err);
      setStatus('error');
    }
  };

  const faqs = [
    { q: 'Do you handle both audio-only and video podcasts?', a: 'Yes! We master single/multi-track audio (WAV/MP3) and edit multi-camera 4K/1080p video setups with dynamic speaker auto-switching and lower thirds.' },
    { q: 'Can you remove background hiss, echo, and room noise?', a: 'We run full spectral de-noise, de-reverb, mouth de-click, and professional loudness normalization (-16 LUFS for podcasts).' },
    { q: 'Do you generate short social clips from full episodes?', a: 'Absolutely. Every episode can be paired with 3-5 vertical short-form reels/shorts optimized with animated captions and hooks.' },
    { q: 'What is the turnaround time for a full episode?', a: 'Typical delivery is 48-72 hours per 60-minute episode, including full master and social teaser clips.' }
  ];

  return (
    <div className="page-wrapper" id="top">
      <PodcastNavbar />

      <main className="main-content">
        {/* HERO */}
        <section className="hero-section" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', paddingTop: '100px' }}>
          <div className="container">
            <div style={{ maxWidth: '820px', margin: '0 auto', textAlign: 'center' }}>
              <div className="sec-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <IconWrapper icon={Mic} size={24} />
                <span>Podcast Audio & Multi-Cam Studio</span>
              </div>
              <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '24px' }}>
                Broadcast-Quality Audio & <span style={{ color: 'var(--accent, #F97316)' }}>Multi-Cam Video Switching</span>
              </h1>
              <p style={{ fontSize: '1.2rem', color: '#64748B', lineHeight: 1.6, marginBottom: '36px' }}>
                Transform your raw recording sessions into immaculate, industry-standard podcast episodes ready for Spotify, Apple Podcasts, and YouTube.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="#consultation" className="btn btn-primary" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
                  Request Production Scope
                </a>
                <a href="#deliverables" className="btn btn-ghost" style={{ padding: '16px 36px', fontSize: '1.05rem' }}>
                  Explore Capabilities
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* DELIVERABLES OVERVIEW */}
        <section className="section" id="deliverables" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
          <div className="container">
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Production Deliverables</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Complete Episode Finishing</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '28px' }}>
              {[
                { icon: Headphones, title: 'LUFS Loudness & Spectral EQ', desc: 'Noise elimination, room echo reduction, warm vocal equalization, and leveling across all host & guest mics.' },
                { icon: Layers, title: 'Multi-Cam Switching', desc: 'Seamless cutting between wide, host, and guest angles synced with millisecond audio accuracy.' },
                { icon: Zap, title: 'Chapters, Show Notes & Teasers', desc: 'Timestamped YouTube chapters, detailed show notes, and 3-5 vertical social hook teasers per episode.' },
                { icon: Shield, title: 'Licensing & Sound Design', desc: 'Curated royalty-free intro/outro music themes, sound effects, audio branding, and lower-third graphic overlays.' }
              ].map((item) => (
                <div key={item.title} style={{ padding: '32px', background: 'rgba(255, 255, 255, 0.025)', borderRadius: '18px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <IconWrapper icon={item.icon} size={32} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '20px', marginBottom: '10px' }}>{item.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONSULTATION & ENQUIRY FORM */}
        <section className="section" id="consultation">
          <div className="container" style={{ maxWidth: '800px' }}>
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Get Started</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Request a Podcast Production Quote</h2>
              <p style={{ color: '#64748B', maxWidth: '580px', margin: '12px auto 0' }}>
                Tell us about your show frequency, camera count, and episode length. We will respond with an exact production quote within 12 hours.
              </p>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '40px' }}>
              {status === 'success' ? (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <CheckCircle2 size={64} color="#10B981" style={{ margin: '0 auto 24px' }} />
                  <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px' }}>Enquiry Received!</h3>
                  <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 24px' }}>
                    Thank you, {name}. Our podcast audio engineers will review your requirements and reach out via WhatsApp/email shortly.
                  </p>
                  <button onClick={() => setStatus('')} className="btn btn-ghost" style={{ padding: '12px 28px' }}>
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Your Name *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Vikram Mehta"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {errors.name && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{errors.name}</span>}
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>WhatsApp / Phone *</label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="input"
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                      />
                      {errors.phone && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{errors.phone}</span>}
                    </div>
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vikram@podcast.com"
                      className="input"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                    />
                    {errors.email && <span style={{ color: '#EF4444', fontSize: '0.8rem' }}>{errors.email}</span>}
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Existing Show Link (Spotify / YouTube / Drive)</label>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://open.spotify.com/show/..."
                      className="input"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px' }}
                    />
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                    <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px' }}>Project Details & Episode Frequency</label>
                    <textarea
                      rows="3"
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                      placeholder="e.g. 4 episodes per month, 2 camera 4K setup, need 3 vertical reels per episode..."
                      className="input"
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', resize: 'vertical' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '16px', fontSize: '1.05rem', fontWeight: 700 }}
                  >
                    {status === 'submitting' ? 'Submitting Enquiry...' : 'Request Production Proposal'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section" id="faq" style={{ background: 'rgba(255, 255, 255, 0.015)' }}>
          <div className="container" style={{ maxWidth: '800px' }}>
            <div className="sec-hdr center" style={{ textAlign: 'center', marginBottom: '48px' }}>
              <span className="sec-label">Support</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Frequently Asked Questions</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {faqs.map((f, idx) => (
                <div
                  key={f.q}
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.025)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '14px',
                    padding: '20px 24px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 }}>
                    <span>{f.q}</span>
                    <HelpCircle size={20} color={activeFaq === idx ? 'var(--accent, #F97316)' : '#64748B'} />
                  </div>
                  {activeFaq === idx && (
                    <p style={{ marginTop: '14px', color: '#94A3B8', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      {f.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PodcastFooter />
    </div>
  );
}
