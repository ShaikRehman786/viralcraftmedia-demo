import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Activity, TrendingUp, Monitor, Home, Camera, MapPin, Sun, Zap, Layers, Shield, UploadCloud, DownloadCloud, CheckCircle2, Clock, Users, Target } from 'lucide-react';
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
        {/* 1. TEXT-FOCUSED CENTRED HERO */}
        <section className="service-hero-centered">
          <div className="service-hero-centered-content">
            <div className="service-hero-badge">
              <span className="service-hero-badge-dot"></span>
              Premium Digital Services
            </div>
            <h1 className="service-hero-title">
              Real Estate Video Editing
            </h1>
            <p className="service-hero-desc">
              We edit listings walkthroughs, replacement sky colors, apply drone stabilizers, and build corporate branding graphics to accelerate property sales.
            </p>
            <div className="service-hero-highlights">
              <span className="service-hero-highlight-item">✓ Sunset Sky Swaps</span>
              <span className="service-hero-highlight-item">✓ Color Balance & HDR</span>
              <span className="service-hero-highlight-item">✓ Drone Stabilizations</span>
              <span className="service-hero-highlight-item">✓ Layout Stitching</span>
              <span className="service-hero-highlight-item">✓ Agent Branding Cards</span>
              <span className="service-hero-highlight-item">✓ 48-72hr Delivery SLA</span>
            </div>
            <div className="service-hero-actions">
              <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none', background: '#C2410C', borderColor: '#C2410C' }}>
                Order Real Estate Editing
              </a>
              <a href="#services" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                View Deliverables
              </a>
            </div>
          </div>
        </section>

        {/* 2. PAYMENT & INQUIRY FORM - IMMEDIATELY AFTER HERO */}
        <section className="premium-form-section" id="configure">
          <div className="container">
            <div className="premium-form-wrapper">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>Order Real Estate Editing</h3>
                <span style={{ fontSize: '1rem', fontWeight: 800, color: '#C2410C' }}>₹{price.toLocaleString('en-IN')} Flat</span>
              </div>

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
                        className="wa-btn wa-btn-ghost mt-2"
                        style={{ padding: '8px 16px', fontSize: '0.75rem' }}
                      >
                        Download Invoice (PDF)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {status !== 'success' && (
                <form onSubmit={handlePay} noValidate>
                  <div className="premium-form-group">
                    <label>Realtor Name *</label>
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
                    <label>Raw Walkthrough Video Link *</label>
                    <input
                      type="url"
                      className={`premium-form-input ${errors.link ? 'err' : ''}`}
                      placeholder="Google Drive, WeTransfer, or Dropbox link"
                      value={link}
                      onChange={e => setLink(e.target.value)}
                    />
                    {errors.link && <span className="premium-form-error">{errors.link}</span>}
                  </div>

                  <div className="premium-form-group">
                    <label>Editing Instructions</label>
                    <textarea
                      rows="3"
                      className="premium-form-input"
                      style={{ resize: 'none' }}
                      placeholder="Branding card info, music style preference, special rooms to highlight..."
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-nav-cta"
                    style={{ width: '100%', justifyContent: 'center', border: 'none', minHeight: 48, cursor: 'pointer', background: '#C2410C', boxShadow: '0 6px 20px rgba(194, 65, 12, 0.18)' }}
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? 'Processing...' : `Pay ₹${price.toLocaleString('en-IN')} & Submit`}
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
              <span className="sec-label">Deliverables Suite</span>
              <h2 className="sec-title">What We Offer</h2>
            </div>
            <div className="premium-benefits-grid">
              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(194, 65, 12, 0.05)' }}>
                  <IconWrapper icon={Sun} size={22} color="#C2410C" />
                </div>
                <h3 className="premium-benefit-title">Sunset Sky Swaps</h3>
                <p className="premium-benefit-desc">We replace overcast skies with custom twilight or golden hour parameters to lift visual aesthetics.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                  <IconWrapper icon={Camera} size={22} color="#3B82F6" />
                </div>
                <h3 className="premium-benefit-title">Drone Stabilizations</h3>
                <p className="premium-benefit-desc">Stabilizing raw aerial pan edits to construct fluid visual listing paths.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                  <IconWrapper icon={MapPin} size={22} color="#10B981" />
                </div>
                <h3 className="premium-benefit-title">Layout Stitching</h3>
                <p className="premium-benefit-desc">Smooth speed-ramped transitions connecting rooms together, preserving natural home flow.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. WHY CHOOSE THIS SERVICE */}
        <section className="premium-benefits-section" style={{ background: '#FAFAFB', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Why Choose Us</span>
              <h2 className="sec-title">Listing Standards</h2>
            </div>
            <div className="premium-benefits-grid">
              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Users} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Dedicated Project Coordinator</h3>
                <p className="premium-benefit-desc">Coordination point tracking edits and branding adjustments checkpoint.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Target} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Conversion Focused</h3>
                <p className="premium-benefit-desc">Color pacing configurations structured to maximize inquiry sign-ups.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Shield} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Secure Checkout</h3>
                <p className="premium-benefit-desc">All transactions are managed securely through SSL encrypted gateways.</p>
              </div>

              <div className="premium-benefit-card">
                <div className="premium-benefit-icon" style={{ background: 'rgba(0,0,0,0.03)' }}>
                  <IconWrapper icon={Zap} size={22} color="#374151" />
                </div>
                <h3 className="premium-benefit-title">Scalable Formats</h3>
                <p className="premium-benefit-desc">Deliverables pre-packaged ready for MLS portals, YouTube, and reels.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. OUR PROCESS */}
        <section className="premium-process-section" style={{ background: '#FFFFFF' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Timeline</span>
              <h2 className="sec-title">Listing Post-Production Pipeline</h2>
            </div>
            <div className="premium-process-grid">
              <div className="premium-process-step">
                <div className="premium-process-step-num">01</div>
                <h3 className="premium-process-step-title">Footage Upload</h3>
                <p className="premium-process-step-desc">Provide raw walkthrough links via Drive, WeTransfer, or Dropbox.</p>
              </div>

              <div className="premium-process-step">
                <div className="premium-process-step-num">02</div>
                <h3 className="premium-process-step-title">Color & sky balance</h3>
                <p className="premium-process-step-desc">We clean wall shades, apply HDR exposure steps, and replace sky colors.</p>
              </div>

              <div className="premium-process-step">
                <div className="premium-process-step-num">03</div>
                <h3 className="premium-process-step-title">Branding overlay</h3>
                <p className="premium-process-step-desc">Stitching licensed backing tracks and agent contact layouts.</p>
              </div>

              <div className="premium-process-step">
                <div className="premium-process-step-num">04</div>
                <h3 className="premium-process-step-title">Launch Listing</h3>
                <p className="premium-process-step-desc">Download finalized listings files ready to publish on MLS feeds.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 6. TESTIMONIALS */}
        <section className="section clients" id="clients" style={{ background: '#FAF9F6' }}>
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Testimonials</span>
              <h2 className="sec-title">What Realtors Say</h2>
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
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '16px', color: '#111827' }}>Let's Build Your Property Tour</h2>
            <p style={{ color: '#4B5563', fontSize: '1rem', marginBottom: '32px' }}>Request cinematic listings walkthroughs and accelerate closing rates.</p>
            <a href="#configure" className="btn btn-primary" style={{ textDecoration: 'none', background: '#C2410C', borderColor: '#C2410C' }}>
              Order Real Estate Editing
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
