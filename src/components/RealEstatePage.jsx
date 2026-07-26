import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, MapPin, Sun, Zap, Shield, Clock, Users, Target, UploadCloud, Layers, Home } from 'lucide-react';
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

export default function RealEstatePage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [vcmId, setVcmId] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    document.title = "Luxury Real Estate Video Editing That Sells Properties Faster | ViralCraft Media";
    const metaTags = {
      description: "Cinema-grade walkthrough and drone video editing for listing realtors. Sunset sky replacements, branding cards, and smooth transitions starting at ₹5,000.",
      keywords: "real estate video editing, listing tours, virtual property tours, drone video color grading",
      "og:title": "Luxury Real Estate Video Editing That Sells Properties Faster | ViralCraft Media",
      "og:description": "Cinema-grade walkthrough and drone video editing for listing realtors. Sunset sky replacements, branding cards, and smooth transitions starting at ₹5,000.",
      "og:url": window.location.href,
      "og:type": "website",
      "twitter:card": "summary_large_image",
      "twitter:title": "Luxury Real Estate Video Editing That Sells Properties Faster | ViralCraft Media",
      "twitter:description": "Cinema-grade walkthrough and drone video editing for listing realtors. Sunset sky replacements, branding cards, and smooth transitions starting at ₹5,000."
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

    let script = document.querySelector('#schema-realestate');
    if (!script) {
      script = document.createElement('script');
      script.id = 'schema-realestate';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Real Estate Video Editing",
      "serviceType": "Property Media Production",
      "provider": { "@type": "Organization", "name": "ViralCraft Media" },
      "offers": { "@type": "Offer", "priceCurrency": "INR", "price": "5000.00" }
    });

    return () => script.remove();
  }, []);

  const price = 5000;

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Valid 10-digit WhatsApp number is required';
    if (!link.trim()) errs.link = 'Raw walkthrough footage link is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    try {
      const cRes = await axios.get('/api/config');
      const oRes = await axios.post('/api/create-order', { amount: price, serviceType: 'Real Estate Video Editing', clipCount: 1 });
      
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay checkout SDK failed to load.');
      }

      const opts = {
        key: cRes.data.key,
        amount: price * 100,
        currency: 'INR',
        name: 'ViralCraftMedia',
        description: 'Real Estate Video Editing Order',
        order_id: oRes.data.orderId,
        handler: async (resp) => {
          setStatus('loading');
          try {
            const vRes = await axios.post('/api/verify-payment', {
              razorpay_order_id: oRes.data.orderId,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              name,
              contact: `91${phone}`,
              email,
              videoLink: link,
              instructions: `${instructions || 'No specific instructions provided'}\nSource Page: Real Estate Video Editing`,
              clipCount: 1,
              amount: price,
              platform: 'Real Estate',
              serviceType: 'Real Estate Video Editing'
            });

            if (vRes.data.success) {
              const oid = vRes.data.orderId || '';
              const pBase64 = vRes.data.pdfBase64 || '';
              setVcmId(oid);
              if (pBase64) {
                setPdfBase64(pBase64);
              }
              setStatus('success');
            } else {
              setStatus('error');
            }
          } catch (vErr) {
            setStatus('error');
          }
        },
        modal: {
          ondismiss: () => {
            setStatus('error');
          }
        },
        prefill: {
          name,
          contact: phone
        },
        theme: {
          color: '#FF6A00'
        }
      };

      const rzp = new window.Razorpay(opts);
      rzp.open();
    } catch (err) {
      setStatus('error');
    }
  };

  const handleDownloadInvoice = () => {
    if (!pdfBase64) return;
    const linkElement = document.createElement('a');
    linkElement.href = `data:application/pdf;base64,${pdfBase64}`;
    linkElement.download = `invoice_${vcmId.replace('VCM-', 'VCM-INV-')}.pdf`;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
  };

  const clients = clientTestimonials.filter(c => c.industry === 'Real Estate' || c.industry === 'Agency' || c.industry === 'Corporate');
  if (clients.length === 0) {
    clients.push(...clientTestimonials.slice(0, 3));
  }

  const faqs = [
    { q: 'What raw video files do you accept?', a: 'We accept all major camera files, drone clips, and mobile stabilized gimbal video files. 4K resolutions are highly recommended.' },
    { q: 'Is sky enhancement included in the rate?', a: 'Yes. Sunset and twilight sky swap replacements are included in our flat pricing structure.' },
    { q: 'What is the turnaround time for a listing walkthrough?', a: 'Standard walkthroughs are delivered within 48 to 72 hours of receiving raw links.' }
  ];

  return (
    <div className="service-page-wrap realestate-page">
      <Navbar />
      <main style={{ paddingTop: '80px' }}>
        {/* 1. EDITORIAL HERO — Left-aligned */}
        <section className="sp-hero">
          <div className="sp-hero-inner">
            <div className="sp-hero-left">
              <div className="sp-hero-eyebrow">Real Estate Media</div>
              <h1>Luxury Real Estate Video Editing</h1>
              <p>We edit listing walkthroughs, replacement sky colors, apply drone stabilizers, and build corporate branding graphics to accelerate property sales.</p>
              <div className="sp-hero-actions">
                <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                  Order Real Estate Editing
                </a>
                <a href="#services" className="btn btn-ghost" style={{ textDecoration: 'none' }}>View Deliverables</a>
              </div>
            </div>
            <div className="sp-hero-right">
              <div className="sp-hero-stat-row">
                <div className="sp-hero-stat-card">
                  <span className="stat-val">₹5K</span>
                  <span className="stat-label">Flat Rate</span>
                </div>
                <div className="sp-hero-stat-card">
                  <span className="stat-val">48–72h</span>
                  <span className="stat-label">Delivery SLA</span>
                </div>
              </div>
              <div className="sp-hero-feature-list">
                {['Sunset Sky Swaps', 'Drone Stabilizations', 'Layout Stitching', 'Agent Branding Cards'].map(f => (
                  <div key={f} className="sp-hero-feature">
                    <span className="check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg></span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 2. PAYMENT & INQUIRY FORM — Split layout */}
        <section className="sp-enquiry" id="configure">
          <div className="sp-enquiry-inner">
            <div className="sp-enquiry-left">
              <div className="sp-section-tag">Order Now</div>
              <h2>Order Real Estate Editing</h2>
              <p>Share your raw walkthrough footage and editing instructions. Payment is processed securely via Razorpay, and delivery arrives within 48–72 hours.</p>
              <div className="sp-enquiry-trust">
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
                  Secure Razorpay Checkout
                </div>
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></span>
                  48–72 Hour Delivery
                </div>
                <div className="sp-trust-item">
                  <span className="trust-icon"><svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg></span>
                  Cinema-Grade Quality
                </div>
              </div>
              <div style={{ marginTop: '32px', padding: '20px 24px', background: 'rgba(255,106,0,0.04)', borderRadius: '12px', border: '1px solid rgba(255,106,0,0.1)' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '6px' }}>Flat Rate</div>
                <div style={{ fontFamily: "'Outfit', var(--font)", fontSize: '2rem', fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.02em' }}>₹{price.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--gray-500)', marginTop: '4px' }}>Per listing walkthrough — all edits included</div>
              </div>
            </div>
            <div className="sp-enquiry-form-card">
              <h3>Order Real Estate Editing</h3>

              {status === 'error' && <div className="alert alert-error" style={{ marginBottom: 20 }}><div className="alert-ic">!</div><div><h4>Payment Cancelled / Failed</h4><p>Please try again.</p></div></div>}
              {status === 'success' && (
                <div className="alert alert-ok" style={{ marginBottom: 20 }}>
                  <div className="alert-ic alert-ic-ok">✓</div>
                  <div>
                    <h4>Order Complete!</h4>
                    <p>Order ID: {vcmId}</p>
                    {pdfBase64 && (
                      <button
                        onClick={handleDownloadInvoice}
                        style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, background: 'var(--accent)', color: '#FFF', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '8px' }}
                      >
                        Download Invoice (PDF)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {status !== 'success' && (
                <form onSubmit={handlePay} noValidate>
                  <div className="sp-form-row">
                    <div className="sp-form-group">
                      <label>Realtor Name *</label>
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
                    <label>Raw Walkthrough Video Link *</label>
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
                    <label>Editing Instructions</label>
                    <textarea
                      rows="3"
                      className="sp-form-input"
                      style={{ resize: 'none' }}
                      placeholder="Branding card info, music style preference, special rooms to highlight..."
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="sp-form-submit"
                    style={{ background: '#C2410C', boxShadow: '0 6px 20px rgba(194, 65, 12, 0.18)' }}
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Processing...' : `Pay ₹${price.toLocaleString('en-IN')} & Submit`}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* 3. WHAT WE OFFER — Process Rail */}
        <WhatWeOffer
          sectionTag="Deliverables Suite"
          heading="What We Offer"
          description="Cinema-grade property media from raw footage to publish-ready listings."
          items={[
            { index: '01', icon: Sun, title: 'Sunset Sky Swaps', description: 'Overcast footage becomes golden hour in post. Flat gray skies become rich twilight tones that make buyers feel the property before they walk through.', color: '#FF6A00' },
            { index: '02', icon: Camera, title: 'Drone Stabilizations', description: 'Your aerials look like they were shot on a gimbal rig, not a drone fighting wind. Smoothed, colored, and paced to build desire from the first frame.', color: '#3B82F6' },
            { index: '03', icon: MapPin, title: 'Layout Stitching', description: 'Rooms flow into each other like a real walkthrough. No hard cuts, no choppy transitions — just a natural pace that keeps buyers watching until the end.', color: '#10B981' }
          ]}
        />

        {/* 4. WHY CHOOSE US — Stat Ledger */}
        <section className="sp-why">
          <div className="sp-why-inner">
            <div className="sp-section-header">
              <div className="sp-section-tag">Why Choose Us</div>
              <h2>Listing Standards</h2>
              <p>Every frame is crafted to make properties sell faster.</p>
            </div>
            <div className="sp-why-ledger">
              {[
                { tag: 'Accountability', title: 'Dedicated Project Coordinator', desc: 'Coordination point tracking edits and branding adjustments checkpoint throughout post-production.' },
                { tag: 'Results', title: 'Conversion Focused', desc: 'Color pacing configurations structured to maximize inquiry sign-ups and property viewings.' },
                { tag: 'Security', title: 'Secure Checkout', desc: 'All transactions are managed securely through SSL encrypted Razorpay gateways.' },
                { tag: 'Scale', title: 'Scalable Formats', desc: 'Deliverables pre-packaged ready for MLS portals, YouTube, and social media reels.' }
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
              <div className="sp-section-tag">Timeline</div>
              <h2>Listing Post-Production Pipeline</h2>
              <p>From raw footage upload to publish-ready listing videos.</p>
            </div>
            <div className="sp-wf-grid">
              {[
                { num: '01', icon: UploadCloud, title: 'Footage Upload', desc: 'Provide raw walkthrough links via Drive, WeTransfer, or Dropbox.', color: 'var(--accent)' },
                { num: '02', icon: Sun, title: 'Color & Sky Balance', desc: 'We clean wall shades, apply HDR exposure steps, and replace sky colors.', color: '#F59E0B' },
                { num: '03', icon: Camera, title: 'Branding Overlay', desc: 'Stitching licensed backing tracks and agent contact layouts.', color: '#10B981' }
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
              <h2>What Realtors Say</h2>
              <p>Trusted by real estate professionals who value premium property media.</p>
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
              <p>Common questions about our real estate video editing service.</p>
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
              <h2>Let's Build Your Property Tour</h2>
              <p>Request cinematic listing walkthroughs and accelerate closing rates.</p>
            </div>
            <a href="#configure" className="btn">
              Order Real Estate Editing
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
