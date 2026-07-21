import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Activity, TrendingUp, Monitor, Home, Camera, MapPin, Sun, Zap, Layers, Shield, UploadCloud, DownloadCloud } from 'lucide-react';
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
              instructions: instructions || 'No specific instructions provided',
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
                  Luxury Listing Walkthroughs
                </div>
                <h1 className="hero-title">
                  Luxury Real Estate Video Editing{' '}
                  <span className="hero-grad">That Sells Properties Faster.</span>
                </h1>
                <p className="hero-desc">
                  Cinema-grade listing walkthrough cuts. Sunset sky swap replacements, agent branding cards, and fluid stabilized drone pans.
                </p>
                <div className="hero-actions">
                  <a href="#pricing" className="btn btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    Book Project
                  </a>
                </div>
                <div className="hero-stats">
                  <div className="hero-stat">
                    <span className="hero-stat-val">₹5,000</span>
                    <span className="hero-stat-lbl">Flat Pricing</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val">48hr</span>
                    <span className="hero-stat-lbl">MLS Ready Delivery</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val"><AnimatedCounter target="100" suffix="%" /></span>
                    <span className="hero-stat-lbl">Sky Replacements Done</span>
                  </div>
                </div>
              </div>
              <div className="hero-right">
                <div className="showcase-mesh"></div>
                <div className="hero-mockup">
                  <div className="hero-mockup-property">
                    <div className="hero-mockup-property-img">
                      <div className="hero-mockup-property-sunset"></div>
                      <div className="hero-mockup-property-icon">
                        <Camera />
                      </div>
                    </div>
                    <div className="hero-mockup-property-body">
                      <div className="hero-mockup-property-title">Villa Serena Estates</div>
                      <div className="hero-mockup-property-sub">Panoramic ocean view · 5 BHK</div>
                      <div className="hero-mockup-property-price">₹5,000</div>
                      <div className="hero-mockup-property-tags">
                        <span className="hero-mockup-property-tag">Sky Swap</span>
                        <span className="hero-mockup-property-tag">Stabilized</span>
                        <span className="hero-mockup-property-tag">Branded</span>
                      </div>
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
              <span className="sec-label">What We Deliver</span>
              <h2 className="sec-title" style={{ fontSize: '2rem', fontWeight: 900 }}>Cinema-Grade Property Visuals</h2>
              <p className="sec-desc">Every listing video is meticulously crafted to showcase properties at their absolute best.</p>
            </div>
            <div className="svc-features-grid">
              {[
                { icon: Sun, title: 'Sky Replacement', desc: 'Transform overcast daytime footage into golden hour or dramatic sunset visuals.' },
                { icon: Camera, title: 'Pan Stabilization', desc: 'Smooth out handheld and drone footage for cinema-quality walkthrough pans.' },
                { icon: MapPin, title: 'Agent Branding', desc: 'Custom lower thirds, property info cards, and brokerage logo overlays.' },
                { icon: Layers, title: 'Color Grading', desc: 'Professional color correction to make interiors warm, inviting, and true to life.' },
                { icon: Zap, title: 'MLS Ready Output', desc: 'Export optimized for MLS uploads, social media, and website embedding.' },
                { icon: Shield, title: '48hr Fast Delivery', desc: 'Quick turnaround to keep your listings live and attracting buyers without delay.' }
              ].map((f, i) => (
                <div key={f.title} className="svc-feature-card" style={{ animation: `fade-up 0.5s ease ${i * 0.1}s both` }}>
                  <div className="svc-feature-icon" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(248,113,113,0.05))', borderColor: 'rgba(239,68,68,0.08)' }}>
                    <IconWrapper icon={f.icon} size={22} color="#EF4444" />
                  </div>
                  <h3 className="svc-feature-title">{f.title}</h3>
                  <p className="svc-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* REAL ESTATE BOOKING / PRICING FORM */}
        <section className="section pricing" id="pricing" style={{ padding: '80px 24px' }}>
          <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div className="sec-hdr center" style={{ maxWidth: '600px', marginBottom: '48px', textAlign: 'center' }}>
              <span className="sec-label">Listing Pricing</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 900 }}>Configure Your Booking</h2>
              <p className="sec-desc">Book walkthrough edits. Includes stabilize pan smoothing, interior lighting correction, and daylight-to-sunset sky replacements.</p>
            </div>

            <div className="p-right" style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
              {status === 'error' && <div className="alert alert-error"><div className="alert-ic">!</div><div><h4>Payment Failed</h4><p>Please try again.</p></div></div>}
              {status === 'success' && (
                <div className="alert alert-ok">
                  <div className="alert-ic alert-ic-ok">✓</div>
                  <div>
                    <h4>Booking Successful</h4>
                    {vcmId && <p className="font-mono" style={{ color: '#F59E0B', fontWeight: 700, margin: '6px 0' }}>Order ID: {vcmId}</p>}
                    <p>We'll start processing your walkthrough shortly.</p>
                    {pdfBase64 && (
                      <button type="button" onClick={handleDownloadInvoice} className="btn-dl-invoice" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '12px', background: '#EF4444', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                        Download PDF Invoice
                      </button>
                    )}
                  </div>
                </div>
              )}
              {status !== 'success' && (
                <form onSubmit={handlePay} className="p-form" noValidate style={{ width: '100%', padding: '40px', borderRadius: '24px', background: '#FFFFFF', border: '1.5px solid rgba(239, 68, 68, 0.12)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="p-form-hdr" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px', color: '#0E0E10' }}>Real Estate Booking Details</div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Agent / Broker Name <span className="req">*</span></label>
                    <div className={`p-inp ${errors.name ? 'err' : ''}`}><input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                    {errors.name && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>WhatsApp Contact <span className="req">*</span></label>
                    <div className={`p-inp p-phone ${errors.phone ? 'err' : ''}`} style={{ display: 'flex', alignItems: 'center' }}><span className="p-pre" style={{ padding: '0 12px', color: '#575F6E' }}>+91</span><input type="text" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ padding: '12px 14px', width: '100%', border: 'none', background: 'none' }} /></div>
                    {errors.phone && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.phone}</span>}
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Email Address</label>
                    <div className="p-inp"><input type="email" placeholder="you@brokerage.com" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Raw Walkthrough Video Link <span className="req">*</span></label>
                    <div className={`p-inp ${errors.link ? 'err' : ''}`}><input type="url" placeholder="Google Drive or Dropbox share link" value={link} onChange={e => setLink(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                    {errors.link && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.link}</span>}
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '24px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Property Address & Style Notes</label>
                    <div className="p-inp">
                      <textarea rows="3" placeholder="Address specifications, room details, custom pan instructs, brokerage color references..." value={instructions} onChange={e => setInstructions(e.target.value)} style={{ padding: '12px 14px', width: '100%', resize: 'none' }} />
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: '#FAF9F6', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.08)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#575F6E', fontWeight: '600' }}>Flat Rate Package Total</span>
                    <strong style={{ fontSize: '1.4rem', color: '#EF4444', fontFamily: 'var(--font-mono)' }}>₹5,000</strong>
                  </div>
                  
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', textAlign: 'center', background: '#EF4444', borderColor: '#EF4444' }} disabled={status === 'loading'}>
                    {status === 'loading' ? 'Processing...' : 'Book Walkthrough Project'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* TRUST BAR */}
        <section style={{ padding: '40px 24px', background: '#FAF9F6', borderTop: '1px solid rgba(239,68,68,0.04)', borderBottom: '1px solid rgba(239,68,68,0.04)' }}>
          <div className="container">
            <div className="svc-trust-bar">
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                48hr MLS Ready Delivery
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                100% Sky Replacement Rate
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Razorpay Secure Payment
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Agent Branding Included
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
              <p className="sec-desc">From raw walkthrough footage to MLS-ready listing video in three simple steps.</p>
            </div>
            <div className="svc-process-grid">
              {[
                { icon: UploadCloud, title: 'Upload Walkthrough', desc: 'Share your raw property walkthrough video via Google Drive or Dropbox.' },
                { icon: Camera, title: 'Cinema Edit', desc: 'We color grade, stabilize pans, swap skies, and add agent branding.' },
                { icon: DownloadCloud, title: 'Receive Final Video', desc: 'Get your MLS-ready listing walkthrough delivered within 48 hours.' }
              ].map((s, i) => (
                <div key={s.title} className="svc-process-step">
                  <div className="svc-process-icon" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(248,113,113,0.05))', borderColor: 'rgba(239,68,68,0.08)' }}>
                    <IconWrapper icon={s.icon} size={24} color="#EF4444" />
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
            <div className="svc-cta-section" style={{ borderColor: 'rgba(239,68,68,0.08)', background: 'linear-gradient(135deg, rgba(239,68,68,0.03), rgba(248,113,113,0.02))' }}>
              <h2 className="svc-cta-title">Sell Properties Faster with Premium Video</h2>
              <p className="svc-cta-desc">Book your walkthrough edit now and get cinema-grade property footage delivered in 48 hours.</p>
              <div className="svc-cta-actions">
                <a href="#pricing" className="btn btn-primary" style={{ background: '#EF4444', borderColor: '#EF4444' }}>Book Walkthrough</a>
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

              {/* Service 5: Real Estate Video Editing (Active) */}
              <div className="svc-card" style={{ border: '2px solid #EF4444', background: 'rgba(239, 68, 68, 0.02)', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={Home} size={44} color="#EF4444" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Real Estate Video (Active)</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Cinema-grade real estate video editing engineered to capture property value and drive buyer leads.</p>
                </div>
                <Link to="/services/real-estate-video-editing" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block', background: '#EF4444', borderColor: '#EF4444' }}>Book Project</Link>
              </div>

            </div>
          </div>
        </section>
      </main>

      <Footer />

    </div>
  );
}
