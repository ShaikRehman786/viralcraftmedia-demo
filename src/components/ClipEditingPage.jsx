import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Scissors, Activity, TrendingUp, Monitor, Home, Play, Heart, MessageCircle, Bookmark, Zap, Target, Layers, UserCheck, Clock, Shield, UploadCloud, DownloadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
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

export default function ClipEditingPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [link, setLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selection, setSelection] = useState(null);
  const [customQty, setCustomQty] = useState('');
  const [price, setPrice] = useState(1099);
  const [status, setStatus] = useState('');
  const [errors, setErrors] = useState({});
  const [_payId, setPayId] = useState('');
  const [vcmId, setVcmId] = useState('');
  const [pdfBase64, setPdfBase64] = useState('');

  const jobs = selection === '9+' ? (parseInt(customQty, 10) || 10) : (parseInt(selection, 10) || 1);

  useEffect(() => {
    const calculatePricing = (count) => {
      if (count === 1) return 1099;
      if (count >= 2 && count <= 4) return count * 899;
      if (count === 5) return 3995;
      return count * 699;
    };
    setPrice(calculatePricing(jobs));
  }, [jobs]);

  useEffect(() => {
    document.title = "Turn Long Videos Into Viral Short Clips | ViralCraft Media";
    const metaTags = {
      description: "Elevate your audience growth with premium vertical short-form editing. Customized hook strategies, animated subtitles, and retaining transitions.",
      keywords: "vertical clipping, youtube shorts, instagram reels, video editing crm",
      "og:title": "Turn Long Videos Into Viral Short Clips | ViralCraft Media",
      "og:description": "Elevate your audience growth with premium vertical short-form editing. Customized hook strategies, animated subtitles, and retaining transitions.",
      "og:url": window.location.href,
      "og:type": "website",
      "twitter:card": "summary_large_image",
      "twitter:title": "Turn Long Videos Into Viral Short Clips | ViralCraft Media",
      "twitter:description": "Elevate your audience growth with premium vertical short-form editing. Customized hook strategies, animated subtitles, and retaining transitions."
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

    let script = document.querySelector('#schema-clip-editing');
    if (!script) {
      script = document.createElement('script');
      script.id = 'schema-clip-editing';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      "name": "Short-Form Clip Editing",
      "serviceType": "Video Editing",
      "provider": { "@type": "Organization", "name": "ViralCraft Media" },
      "offers": { "@type": "Offer", "priceCurrency": "INR", "price": "1099.00" }
    });

    return () => script.remove();
  }, []);

  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!/^\d{10}$/.test(phone)) errs.phone = 'Valid 10-digit WhatsApp number is required';
    if (!link.trim()) errs.link = 'Video link is required';
    if (!selection) errs.selection = 'Please select number of clips';
    if (selection === '9+') {
      const p = parseInt(customQty, 10);
      if (isNaN(p) || p < 10 || p > 100) errs.qty = 'Enter 10–100';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    setPayId('');
    try {
      const cRes = await axios.get('/api/config');
      const oRes = await axios.post('/api/create-order', { amount: price });
      
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay checkout SDK failed to load.');
      }

      const opts = {
        key: cRes.data.key,
        amount: price * 100,
        currency: 'INR',
        name: 'ViralCraftMedia',
        description: `${jobs} Clip Editing Order`,
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
              videoLink: link,
              instructions,
              clipCount: jobs,
              amount: price,
              platform,
              serviceType: 'Clip Editing'
            });

            if (vRes.data.success) {
              const oid = vRes.data.orderId || '';
              const pBase64 = vRes.data.pdfBase64 || '';
              setPayId(resp.razorpay_payment_id);
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

  const handleSendQuery = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus('loading');
    try {
      await axios.post('/api/enquiries', {
        name,
        phone: `91${phone}`,
        serviceCategory: 'Clip Editing',
        description: `Platform: ${platform}\nRaw Link: ${link}\nInstructions: ${instructions}\nQty: ${jobs} clips`,
        budget: price
      });
      setStatus('query_sent');
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
                  Trusted by 50+ Brands & Creators
                </div>
                <h1 className="hero-title">
                  Turn Long Videos Into{' '}
                  <span className="hero-grad">Viral Short Clips.</span>
                </h1>
                <p className="hero-desc">
                  Transform long-form videos into high-retention short clips engineered for growth across Instagram Reels, YouTube Shorts, and TikTok.
                </p>
                <div className="hero-actions">
                  <a href="#pricing" className="btn btn-primary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    Start Order
                  </a>
                </div>
                <div className="hero-stats">
                  <div className="hero-stat">
                    <span className="hero-stat-val"><AnimatedCounter target="1" suffix="M+" /></span>
                    <span className="hero-stat-lbl">Views Generated</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val">48hr</span>
                    <span className="hero-stat-lbl">Delivery</span>
                  </div>
                  <div className="hero-stat-div"></div>
                  <div className="hero-stat">
                    <span className="hero-stat-val"><AnimatedCounter target="100" suffix="%" /></span>
                    <span className="hero-stat-lbl">Satisfaction</span>
                  </div>
                </div>
              </div>
              <div className="hero-right">
                <div className="showcase-mesh"></div>
                <div className="hero-mockup">
                  <div className="hero-mockup-phone">
                    <div className="hero-mockup-phone-inner">
                      <div className="hero-mockup-notch"></div>
                      <div className="hero-mockup-content">
                        <span className="hero-mockup-reel-badge">Reel Preview</span>
                        <div className="hero-mockup-reel-icon">
                          <Play />
                        </div>
                        <div className="hero-mockup-captions">
                          <div className="hero-mockup-caption"></div>
                          <div className="hero-mockup-caption"></div>
                          <div className="hero-mockup-caption"></div>
                        </div>
                        <div className="hero-mockup-actions">
                          <div className="hero-mockup-action"><Heart /></div>
                          <div className="hero-mockup-action"><MessageCircle /></div>
                          <div className="hero-mockup-action"><Bookmark /></div>
                        </div>
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
              <span className="sec-label">What You Get</span>
              <h2 className="sec-title" style={{ fontSize: '2rem', fontWeight: 900 }}>Engineering Viral Content</h2>
              <p className="sec-desc">Every clip is crafted with precision to maximize retention, engagement, and audience growth.</p>
            </div>
            <div className="svc-features-grid">
              {[
                { icon: Zap, title: 'Hook Strategy', desc: 'Attention-grabbing openings designed to stop the scroll in the first 1-2 seconds.' },
                { icon: Target, title: 'Retention Pacing', desc: 'Rhythmic editing patterns that maintain viewer interest through the entire duration.' },
                { icon: Layers, title: 'Animated Subtitles', desc: 'Dynamic caption overlays with kinetic typography for sound-off viewing.' },
                { icon: UserCheck, title: 'Brand Matching', desc: 'Custom visual style aligned with your existing brand identity and content aesthetic.' },
                { icon: Clock, title: '48hr Delivery', desc: 'Rapid turnaround without compromising on quality or attention to detail.' },
                { icon: Shield, title: 'Platform Optimized', desc: 'Export settings fine-tuned for Instagram Reels, YouTube Shorts, and TikTok.' }
              ].map((f, i) => (
                <div key={f.title} className="svc-feature-card" style={{ animation: `fade-up 0.5s ease ${i * 0.1}s both` }}>
                  <div className="svc-feature-icon">
                    <IconWrapper icon={f.icon} size={22} color="var(--accent)" />
                  </div>
                  <h3 className="svc-feature-title">{f.title}</h3>
                  <p className="svc-feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ORDER / PRICING CALCULATOR FORM */}
        <section className="section pricing" id="pricing" style={{ padding: '80px 24px' }}>
          <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            <div className="sec-hdr center" style={{ maxWidth: '600px', marginBottom: '48px', textAlign: 'center' }}>
              <span className="sec-label">Order Placement</span>
              <h2 className="sec-title" style={{ fontSize: '2.2rem', fontWeight: 900 }}>Configure Your Project</h2>
              <p className="sec-desc">Choose the volume of vertical clips needed. Prices automatically scale down as quantity requirements increase.</p>
            </div>

            <div className="p-right" style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>
              {status === 'error' && <div className="alert alert-error"><div className="alert-ic">!</div><div><h4>Payment Failed</h4><p>Please try again.</p></div></div>}
              {status === 'success' && (
                <div className="alert alert-ok">
                  <div className="alert-ic alert-ic-ok">✓</div>
                  <div>
                    <h4>Payment Successful</h4>
                    {vcmId && <p className="font-mono" style={{ color: '#F59E0B', fontWeight: 700, margin: '6px 0' }}>Order: {vcmId}</p>}
                    <p>We'll start processing your order shortly.</p>
                    {pdfBase64 && (
                      <button type="button" onClick={handleDownloadInvoice} className="btn-dl-invoice" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '12px', background: '#F97316', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                        Download PDF Invoice
                      </button>
                    )}
                  </div>
                </div>
              )}
              {status === 'query_sent' && <div className="alert alert-ok"><div className="alert-ic alert-ic-ok">✓</div><div><h4>Query Submitted</h4><p>We'll contact you on WhatsApp within 24 hours.</p></div></div>}
              
              {status !== 'success' && status !== 'query_sent' && (
                <form className="p-form" noValidate style={{ width: '100%', padding: '40px', borderRadius: '24px', background: '#FFFFFF', border: '1.5px solid rgba(255, 106, 0, 0.12)', boxShadow: 'var(--shadow-sm)' }}>
                  <div className="p-form-hdr" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '24px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px', color: '#0E0E10' }}>Order Specifications</div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Client Name <span className="req">*</span></label>
                    <div className={`p-inp ${errors.name ? 'err' : ''}`}><input type="text" placeholder="Your full name" value={name} onChange={e => setName(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                    {errors.name && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.name}</span>}
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>WhatsApp Number <span className="req">*</span></label>
                    <div className={`p-inp p-phone ${errors.phone ? 'err' : ''}`} style={{ display: 'flex', alignItems: 'center' }}><span className="p-pre" style={{ padding: '0 12px', color: '#575F6E' }}>+91</span><input type="text" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} style={{ padding: '12px 14px', width: '100%', border: 'none', background: 'none' }} /></div>
                    {errors.phone && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.phone}</span>}
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Target Social Platform <span className="req">*</span></label>
                    <div className="p-inp">
                      <select className="c-select" style={{ border: 'none', background: 'none', width: '100%', padding: '12px 14px', outline: 'none', color: 'var(--text)', cursor: 'pointer', appearance: 'none' }} value={platform} onChange={e => setPlatform(e.target.value)}>
                        <option value="Instagram">Instagram Reels</option>
                        <option value="YouTube">YouTube Shorts</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Multi-Platform">Multi-Platform Bundle</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Raw Video Folder Link <span className="req">*</span></label>
                    <div className={`p-inp ${errors.link ? 'err' : ''}`}><input type="url" placeholder="Google Drive, WeTransfer, or Dropbox shared folder link" value={link} onChange={e => setLink(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                    {errors.link && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', marginTop: '4px', display: 'block' }}>{errors.link}</span>}
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Timestamps & Pacing Notes</label>
                    <div className="p-inp">
                      <textarea rows="3" placeholder="Provide raw duration markers, visual style preferences, and caption overlays instructions..." value={instructions} onChange={e => setInstructions(e.target.value)} style={{ padding: '12px 14px', width: '100%', resize: 'none' }} />
                    </div>
                  </div>
                  
                  <div className="p-fg" style={{ marginBottom: '28px' }}>
                    <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 'bold', color: '#0E0E10', marginBottom: '8px' }}>Number of Clips <span className="req">*</span></label>
                    <div className="p-sel" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9+'].map(v => (
                        <button key={v} type="button" className={`p-btn ${selection === v ? 'p-btn-a' : ''}`} onClick={() => setSelection(prev => prev === v ? null : v)} style={{ flex: '1 1 50px', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer', fontWeight: 'bold' }}>{v}</button>
                      ))}
                    </div>
                    {errors.selection && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', display: 'block' }}>{errors.selection}</span>}
                    {selection === '9+' && (
                      <div className="p-cq" style={{ marginTop: '12px' }}><label style={{ display: 'block', fontSize: '0.8rem', color: '#575F6E', marginBottom: '6px' }}>Quantity (10–100):</label>
                        <div className={`p-inp ${errors.qty ? 'err' : ''}`}><input type="number" min="10" max="100" placeholder="e.g. 15" className="font-mono" value={customQty} onChange={e => setCustomQty(e.target.value)} style={{ padding: '12px 14px', width: '100%' }} /></div>
                        {errors.qty && <span className="p-err" style={{ fontSize: '0.78rem', color: '#EF4444', display: 'block', marginTop: '4px' }}>{errors.qty}</span>}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '16px', background: '#FAF9F6', borderRadius: '12px', border: '1px solid rgba(255, 106, 0, 0.08)', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.9rem', color: '#575F6E', fontWeight: '600' }}>Calculated Total</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>₹{price.toLocaleString()}</strong>
                  </div>
                  
                  <div className="p-btns payment-visible" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <button type="button" className="btn btn-ghost p-btn-q" onClick={handleSendQuery} disabled={status === 'loading'} style={{ padding: '14px', borderRadius: '10px' }}>Send Enquiry</button>
                    <button type="button" className="btn btn-primary p-btn-p" onClick={handlePay} disabled={status === 'loading'} style={{ padding: '14px', borderRadius: '10px' }}>
                      {status === 'loading' ? 'Processing...' : 'Pay with Razorpay'}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* TRUST BAR */}
        <section style={{ padding: '40px 24px', background: '#FAF9F6', borderTop: '1px solid rgba(255,106,0,0.04)', borderBottom: '1px solid rgba(255,106,0,0.04)' }}>
          <div className="container">
            <div className="svc-trust-bar">
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Razorpay Secure Checkout
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                48hr Fast Delivery
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                Premium Quality Guarantee
              </div>
              <div className="svc-trust-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                50+ Happy Clients
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
              <p className="sec-desc">A streamlined 3-step pipeline from submission to delivery.</p>
            </div>
            <div className="svc-process-grid">
              {[
                { icon: UploadCloud, title: 'Submit Your Content', desc: 'Paste your raw video link and specify timestamps for the moments you want clipped.' },
                { icon: Shield, title: 'We Edit & Optimize', desc: 'Our editors craft each clip with hook strategies, captions, and retention pacing.' },
                { icon: DownloadCloud, title: 'Receive Final Clips', desc: 'Finished edits delivered via Google Drive within 48 hours of confirmation.' }
              ].map((s, i) => (
                <div key={s.title} className="svc-process-step">
                  <div className="svc-process-icon">
                    <IconWrapper icon={s.icon} size={24} color="var(--accent)" />
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
            <div className="svc-cta-section">
              <h2 className="svc-cta-title">Ready to Go Viral?</h2>
              <p className="svc-cta-desc">Submit your footage now and get premium short-form clips delivered in 48 hours.</p>
              <div className="svc-cta-actions">
                <a href="#pricing" className="btn btn-primary">Start Your Order</a>
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
              
              {/* Service 1: Clip Editing (Active) */}
              <div className="svc-card" style={{ border: '2px solid var(--accent)', background: 'rgba(255, 106, 0, 0.02)', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '32px', borderRadius: '22px' }}>
                <div>
                  <div className="svc-card-hdr" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                    <IconWrapper icon={Scissors} size={44} color="var(--accent)" className="svc-icon" />
                    <div className="svc-hdr-group">
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Clip Editing (Active)</h3>
                    </div>
                  </div>
                  <p style={{ color: '#575F6E', fontSize: '0.9rem', lineHeight: '1.6' }}>Turn long-form content into highly engaging short-form videos engineered for maximum retention.</p>
                </div>
                <Link to="/services/clip-editing" className="btn btn-primary" style={{ width: '100%', marginTop: '24px', textAlign: 'center', display: 'block' }}>Start Project</Link>
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
