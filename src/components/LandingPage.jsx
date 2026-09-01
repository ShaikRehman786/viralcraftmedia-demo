import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import AnimatedCounter from './shared/AnimatedCounter.jsx';
import { clientTestimonials } from '../data/clientTestimonials.js';
import { getReferralAttribution, clearReferralAttribution } from '../services/referralAttribution.js';
import {
  Clock3,
  BarChart3,
  PenTool,
  Monitor,
  UploadCloud,
  ShieldCheck,
  DownloadCloud
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;

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

function preloadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = resolve;
    img.onerror = resolve;
    img.src = src;
  });
}

function useDebounce(fn, _delay) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
}

function ReelVideo({ src }) {
  const videoRef = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { rootMargin: '100px' });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={inView ? src : undefined}
      preload="metadata"
      autoPlay
      muted
      loop
      playsInline
      className="reel-video-element"
    />
  );
}

function useSmoothScroll(ref, speed, initialOffset = 0) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let y = initialOffset;
    let running = false;
    let frameId;

    const getSetHeight = () => {
      const firstSet = el.querySelector('.showcase-set');
      return firstSet ? firstSet.offsetHeight : el.scrollHeight / 2;
    };

    const animate = () => {
      if (!running) return;
      y -= speed;
      const setH = getSetHeight();
      if (setH > 0 && Math.abs(y) >= setH) {
        y += setH;
      }
      el.style.transform = `translate3d(0, ${y}px, 0)`;
      frameId = requestAnimationFrame(animate);
    };

    const observer = new IntersectionObserver((entries) => {
      const isIntersecting = entries[0].isIntersecting;
      if (isIntersecting) {
        if (!running) {
          running = true;
          frameId = requestAnimationFrame(animate);
        }
      } else {
        running = false;
        if (frameId) cancelAnimationFrame(frameId);
      }
    }, { threshold: 0.05 });

    const heroSection = document.getElementById('top');
    if (heroSection) {
      observer.observe(heroSection);
    } else {
      running = true;
      frameId = requestAnimationFrame(animate);
    }

    return () => {
      running = false;
      if (frameId) cancelAnimationFrame(frameId);
      if (observer) observer.disconnect();
    };
  }, [ref, speed, initialOffset]);
}

export default function LandingPage() {
  const clients = clientTestimonials;

  const faqs = [
    { q: 'How fast is delivery?', a: 'Usually within 48 hours of order confirmation. We prioritize speed without compromising quality.' },
    { q: 'How will I receive clips?', a: 'Via a private Google Drive folder link shared directly to your WhatsApp or email.' },
    { q: 'Can I request revisions?', a: 'No. We do not provide revisions after the order has been confirmed and delivered. Please ensure all timestamps, editing notes, references, branding preferences, and other requirements are shared before work begins, as the submitted instructions will be treated as final.' },
    { q: 'Is payment secure?', a: 'Yes, all transactions are secured by Razorpay with 256-bit SSL encryption.' },
    { q: 'Which platforms do you edit for?', a: 'Instagram Reels, YouTube Shorts, TikTok, and all major vertical video platforms.' },
  ];

  const [_mobileOpen, setMobileOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [platform, setPlatform] = useState('Instagram');
  const [link, setLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [selection, setSelection] = useState(null);
  const [customQty, setCustomQty] = useState('');
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle');
  const leftTrackRef = useRef(null);
  const rightTrackRef = useRef(null);

  // Enquiry / Consultation form states
  const [enquiryName, setEnquiryName] = useState('');
  const [enquiryEmail, setEnquiryEmail] = useState('');
  const [enquiryPhone, setEnquiryPhone] = useState('');
  const [enquiryService, setEnquiryService] = useState('');
  const [enquiryDesc, setEnquiryDesc] = useState('');
  const [enquiryBudget, setEnquiryBudget] = useState('');
  const [enquiryStatus, setEnquiryStatus] = useState('idle');

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!enquiryName.trim()) {
      toast('Name is required.', 'error');
      return;
    }
    if (!/^\d{10}$/.test(enquiryPhone)) {
      toast('Please enter a valid 10-digit WhatsApp number.', 'error');
      return;
    }
    if (!enquiryService) {
      toast('Please select a service type.', 'error');
      return;
    }

    setEnquiryStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: enquiryName,
          email: enquiryEmail,
          phone: enquiryPhone,
          serviceCategory: enquiryService,
          description: enquiryDesc,
          budget: enquiryBudget ? Number(enquiryBudget) : undefined,
          referralDetails: getReferralAttribution()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      
      setEnquiryStatus('success');
      clearReferralAttribution();
      toast('Enquiry submitted successfully! Harsha will reach out on WhatsApp.', 'success');
      
      // Reset form
      setEnquiryName('');
      setEnquiryEmail('');
      setEnquiryPhone('');
      setEnquiryService('');
      setEnquiryDesc('');
      setEnquiryBudget('');
    } catch (err) {
      setEnquiryStatus('error');
      toast(err.message || 'Failed to submit enquiry. Please try again.', 'error');
    }
  };
  const [_payId, setPayId] = useState('');
  const [vcmId, setVcmId] = useState('');
  const [price, setPrice] = useState(0);
  const [jobs, setJobs] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [pdfBase64, setPdfBase64] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);
  const [_activeSection, setActiveSection] = useState('top');
  const _navLinks = [
    { label: 'Home', id: '#top', activeId: 'top' },
    { label: 'Pricing', id: '#pricing', activeId: 'pricing' },
    { label: 'Services', id: '#services', activeId: 'services' },
    { label: 'Testimonials', id: '#clients', activeId: 'clients' },
    { label: 'Contact', id: '#contact', activeId: 'contact' }
  ];

  const handleBulkOrders = () => {
    setEnquiryService('Clip Editing');
    setEnquiryDesc('I would like to enquire about bulk orders (e.g. monthly clipping packages, high-volume video editing).');
    scrollTo('#contact');
    toast('Consultation form pre-filled for bulk orders!', 'info');
  };

  useEffect(() => {
    const sections = ['top', 'pricing', 'services', 'why', 'workflow', 'clients', 'faq', 'contact'];
    const observerOptions = {
      root: null,
      rootMargin: '-40% 0px -50% 0px',
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, []);

  const toast = (msg, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  useEffect(() => {
    let c = 0;
    if (selection === '9+') { const p = parseInt(customQty, 10); c = isNaN(p) ? 0 : p; }
    else c = parseInt(selection, 10) || 0;
    setJobs(c);

    let calcPrice = 0;
    if (c === 1) {
      calcPrice = 1099;
    } else if (c === 2) {
      calcPrice = 1798;
    } else if (c === 3) {
      calcPrice = 2697;
    } else if (c === 4) {
      calcPrice = 3596;
    } else if (c === 5) {
      calcPrice = 3995;
    } else if (c >= 6) {
      calcPrice = c * 699;
    }
    setPrice(calcPrice);
  }, [selection, customQty]);

  useSmoothScroll(leftTrackRef, 0.5, 0);
  useSmoothScroll(rightTrackRef, 0.5, -200);

  useEffect(() => {
    preloadImage('/logoooooooooo.png');
    preloadImage('/website header.png');
  }, []);

  useDebounce(() => {
    const l = leftTrackRef.current;
    const r = rightTrackRef.current;
    if (l) l.style.transform = 'translate3d(0, 0, 0)';
    if (r) r.style.transform = 'translate3d(0, -200px, 0)';
  }, 200);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!/^\d{10}$/.test(phone)) e.phone = 'Enter valid 10-digit number';
    if (!link.trim()) e.link = 'Raw video link is required';
    if (!instructions.trim()) e.instructions = 'Timestamps / Notes are required';
    if (!selection) e.selection = 'Please select number of clips';
    if (selection === '9+') { const p = parseInt(customQty, 10); if (isNaN(p) || p < 10 || p > 100) e.qty = 'Enter 10–100'; }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const isFormComplete =
    name.trim() !== '' &&
    /^\d{10}$/.test(phone) &&
    platform.trim() !== '' &&
    link.trim() !== '' &&
    instructions.trim() !== '' &&
    selection !== null &&
    (selection !== '9+' || (
      customQty.trim() !== '' &&
      !isNaN(parseInt(customQty, 10)) &&
      parseInt(customQty, 10) >= 10 &&
      parseInt(customQty, 10) <= 100
    ));

  const FORM_ACTION_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScN2YQl0HzJDM2aRhRxlCNZx8JOfhD4lj8Op1Wxe7pNXp5fBw/formResponse';

  const generateFormId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

  const generateTimestamp = () => new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });

  const postToGoogleForm = async (data) => {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(data)) {
      if (value) body.append(key, String(value));
    }
    try {
      await fetch(FORM_ACTION_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      return true;
    } catch (err) {
      throw err;
    }
  };

  const submitQuery = async () => {
    const qId = generateFormId('Q');
    const formData = {
      'entry.1162726734': qId,
      'entry.751094989': generateTimestamp(),
      'entry.215080158': '',
      'entry.1395260216': '',
      'entry.1288729801': '',
      'entry.739390473': name,
      'entry.1632747888': `91${phone}`,
      'entry.992899853': '',
      'entry.38431341': '',
      'entry.797855653': platform,
      'entry.1391203010': String(jobs),
      'entry.268150730': '',
      'entry.949659817': `Raw Video Link: ${link}\n\nTimestamps/Notes: ${instructions}`,
      'entry.807921680': String(price),
      'entry.1041557037': 'INR',
      'entry.611269715': 'UPI',
      'entry.2111823329': 'Pending',
      'entry.546801879': 'Website',
    };
    await postToGoogleForm(formData);
    return { success: true, orderId: qId };
  };

  const submitPayment = async (orderIdVal, paymentId, signature) => {
    const formData = {
      'entry.1162726734': generateFormId('PAY'),
      'entry.751094989': generateTimestamp(),
      'entry.215080158': orderIdVal,
      'entry.1395260216': paymentId,
      'entry.1288729801': signature || '',
      'entry.739390473': name,
      'entry.1632747888': `91${phone}`,
      'entry.992899853': '',
      'entry.38431341': '',
      'entry.797855653': platform,
      'entry.1391203010': String(jobs),
      'entry.268150730': '',
      'entry.949659817': `Raw Video Link: ${link}\n\nTimestamps/Notes: ${instructions}`,
      'entry.807921680': String(price),
      'entry.1041557037': 'INR',
      'entry.611269715': 'UPI',
      'entry.2111823329': 'Success',
      'entry.546801879': 'Website',
    };
    await postToGoogleForm(formData);
    return { success: true };
  };

  const sendQuery = async (e) => {
    e.preventDefault();
    if (!validate()) { toast('Please fix form errors', 'error'); return; }
    setStatus('loading');
    try {
      const res = await fetch(`${API_BASE}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email: '',
          serviceCategory: 'Clip Editing',
          description: `Platform: ${platform}\nVideo Link: ${link}\nInstructions: ${instructions}\nClips: ${jobs}`,
          budget: price,
          referralDetails: getReferralAttribution()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      // Still post to Google Form for backwards compatibility
      try {
        await submitQuery();
      } catch (gErr) {
      }

      const oid = data.orderId || '';
      setVcmId(oid);
      setStatus('query_sent');
      toast('Query submitted successfully! Harsha will reach out on WhatsApp.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to submit query. Please try again.', 'error');
      setStatus('error');
    }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    if (!validate()) { toast('Please fix form errors', 'error'); return; }
    setStatus('loading');
    setPayId('');
    try {
      toast('Creating order...', 'info');
      const cRes = await fetch(`${API_BASE}/api/config`);
      if (!cRes.ok) throw new Error('Config fetch failed');
      const cData = await cRes.json();
      const oRes = await fetch(`${API_BASE}/api/create-order`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: price }) });
      if (!oRes.ok) throw new Error('Order creation failed');
      const oData = await oRes.json();
      if (typeof window.Razorpay === 'undefined') throw new Error('Razorpay unavailable');
      toast('Opening checkout...', 'info');
      const opts = {
        key: cData.key, amount: price * 100, currency: 'INR', name: 'ViralCraftMedia',
        description: `${jobs} Clips`, order_id: oData.orderId,
        handler: async (resp) => {
          toast('Verifying...', 'info');
          try {
            const vRes = await fetch(`${API_BASE}/api/verify-payment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ razorpay_order_id: oData.orderId, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature, name, contact: `91${phone}`, videoLink: link, instructions, clipCount: jobs, amount: price, platform, referralDetails: getReferralAttribution() }) });
            if (!vRes.ok) throw new Error('Verify failed');
            const vData = await vRes.json();
            if (vData.success) {
              const oid = vData.orderId || '';
              const pBase64 = vData.pdfBase64 || '';
              setPayId(resp.razorpay_payment_id);
              setVcmId(oid);
              if (pBase64) {
                setPdfBase64(pBase64);
                try {
                  const linkElement = document.createElement('a');
                  linkElement.href = `data:application/pdf;base64,${pBase64}`;
                  linkElement.download = `invoice_${oid.replace('VCM-', 'VCM-INV-')}.pdf`;
                  document.body.appendChild(linkElement);
                  linkElement.click();
                  document.body.removeChild(linkElement);
                  toast('Invoice downloaded automatically!', 'success');
                } catch (dlErr) {
                }
              }
              try {
                await submitPayment(oid, resp.razorpay_payment_id, resp.razorpay_signature);
              } catch (formErr) {
              }
              setStatus('success');
              toast('Payment successful!', 'success');
            } else {
              setStatus('error');
              toast('Verification failed', 'error');
            }
          } catch (err) {
            setStatus('error');
            toast('Verification error', 'error');
          }
        },
        modal: { ondismiss: () => { setStatus('error'); toast('Checkout cancelled', 'error'); } },
        prefill: { name, contact: phone },
        theme: { color: 'var(--accent)' }
      };
      const rzp = new window.Razorpay(opts);
      rzp.open();
    } catch (err) {
      setStatus('error');
      const msg = err.message || '';
      if (/blocked|popup|open|Razorpay/i.test(msg)) {
        toast('Payment popup blocked by browser or extension. Please disable ad blocker and try again.', 'error');
      } else {
        toast(msg, 'error');
      }
    }
  };

  const handleDownloadInvoice = () => {
    if (!pdfBase64) return;
    try {
      const linkElement = document.createElement('a');
      linkElement.href = `data:application/pdf;base64,${pdfBase64}`;
      const invNum = vcmId ? vcmId.replace('VCM-', 'VCM-INV-') : 'invoice';
      linkElement.download = `invoice_${invNum}.pdf`;
      document.body.appendChild(linkElement);
      linkElement.click();
      document.body.removeChild(linkElement);
      toast('Invoice downloaded!', 'success');
    } catch (err) {
      toast('Failed to download invoice. Please try again.', 'error');
    }
  };

  const scrollTo = (sel) => { setMobileOpen(false); const el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth' }); };

  return (
    <>
      <div className="toast-container">{toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}</div>

      <Navbar />

      <main>
        {/* HERO */}
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
                  <a href="#pricing" className="btn btn-primary" onClick={(e) => { e.preventDefault(); scrollTo('#pricing'); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                    Start Order
                  </a>
                  <a href="#workflow" className="btn btn-ghost" onClick={(e) => { e.preventDefault(); scrollTo('#workflow'); }}>View How It Works</a>
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
                <div className="showcase-gallery">
                  <div className="showcase-col">
                    <div className="showcase-track" ref={leftTrackRef}>
                      <div className="showcase-set">
                        {['/Video-937.mp4', '/Video-554.mp4', '/Video-736.mp4', '/Video-879.mp4', '/Video-375.mp4'].map((src) => (
                          <div key={src} className="showcase-card">
                            <ReelVideo src={src} />
                          </div>
                        ))}
                      </div>
                      <div className="showcase-set">
                        {['/Video-937.mp4', '/Video-554.mp4', '/Video-736.mp4', '/Video-879.mp4', '/Video-375.mp4'].map((src) => (
                          <div key={`dup-${src}`} className="showcase-card">
                            <ReelVideo src={src} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="showcase-col">
                    <div className="showcase-track" ref={rightTrackRef}>
                      <div className="showcase-set">
                        {['/Video-736.mp4', '/Video-879.mp4', '/Video-375.mp4', '/Video-937.mp4', '/Video-554.mp4'].map((src) => (
                          <div key={src} className="showcase-card">
                            <ReelVideo src={src} />
                          </div>
                        ))}
                      </div>
                      <div className="showcase-set">
                        {['/Video-736.mp4', '/Video-879.mp4', '/Video-375.mp4', '/Video-937.mp4', '/Video-554.mp4'].map((src) => (
                          <div key={`dup-${src}`} className="showcase-card">
                            <ReelVideo src={src} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="section pricing" id="pricing">
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Pricing</span>
              <h2 className="sec-title">Start Your Order</h2>
              <p className="sec-desc">Select your quantity, send a query, or pay securely via Razorpay.</p>
            </div>
            <div className="p-grid">
              <div className="p-left">
                <div className="p-summary">
                  <div className="p-sum-hdr">Pricing Structure</div>
                  <div className="p-sum-body">
                    <div className="p-sum-item"><span>1 Video</span><span className="font-mono">₹1,099</span></div>
                    <div className="p-sum-item"><span>2–4 Videos</span><span className="font-mono">₹899 / video</span></div>
                    <div className="p-sum-item"><span>5 Videos</span><span className="font-mono">₹799 / video</span></div>
                    <div className="p-sum-item"><span>6+ Videos</span><span className="font-mono">₹699 / video</span></div>
                    <div className="p-sum-item" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '0.72rem', fontStyle: 'italic', color: 'var(--muted)' }}>
                      <span>Typical edited video length: 30–40 seconds</span>
                    </div>
                  </div>
                </div>
                <div className={`p-total payment-reveal-element ${isFormComplete ? 'visible' : ''}`}>
                  <div className="p-total-hdr">Estimated Total</div>
                  <div className="p-total-amt">
                    <span className="p-curr">₹</span>
                    <span className="p-digits">{price}</span>
                  </div>
                  <div className="p-total-detail"><span>Jobs: {String(jobs).padStart(2, '0')}</span><span className="p-ok">Ready</span></div>
                </div>
                <div className="p-badges">
                  <span className="p-badge-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Secure Payment
                  </span>
                  <span className="p-badge-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    Razorpay Protected
                  </span>
                  <span className="p-badge-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    Instant Confirmation
                  </span>
                  <span className="p-badge-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    Trusted by 50+ Clients
                  </span>
                </div>
              </div>
              <div className="p-right">
                {status === 'error' && <div className="alert alert-error"><div className="alert-ic">!</div><div><h4>Payment Failed</h4><p>Please try again.</p></div></div>}
                {status === 'success' && (
                  <div className="alert alert-ok">
                    <div className="alert-ic alert-ic-ok">✓</div>
                    <div>
                      <h4>Payment Successful</h4>
                      {vcmId && <p className="font-mono" style={{ color: '#F59E0B', fontWeight: 700, margin: '6px 0' }}>Order: {vcmId}</p>}
                      <p>We'll start processing your order shortly.</p>
                      {pdfBase64 && (
                        <button
                          type="button"
                          onClick={handleDownloadInvoice}
                          className="btn-dl-invoice"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginTop: '12px',
                            background: '#F97316',
                            color: '#FFFFFF',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#EA580C'}
                          onMouseOut={e => e.currentTarget.style.background = '#F97316'}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          Download PDF Invoice
                        </button>
                      )}
                    </div>
                  </div>
                )}
                {status === 'query_sent' && <div className="alert alert-ok"><div className="alert-ic alert-ic-ok">✓</div><div><h4>Query Submitted</h4><p>We'll contact you on WhatsApp within 24 hours.</p></div></div>}
                {status !== 'success' && status !== 'query_sent' && (
                  <form className="p-form" noValidate>
                    <div className="p-form-hdr">Order Details</div>
                    <div className="p-fg">
                      <label>Client Name <span className="req">*</span></label>
                      <div className={`p-inp ${errors.name ? 'err' : ''}`}><input type="text" placeholder="Your full name" value={name} onChange={e => { setName(e.target.value); }} /></div>
                      {errors.name && <span className="p-err">{errors.name}</span>}
                    </div>
                    <div className="p-fg">
                      <label>WhatsApp Number <span className="req">*</span></label>
                      <div className={`p-inp p-phone ${errors.phone ? 'err' : ''}`}><span className="p-pre">+91</span><input type="text" placeholder="9876543210" value={phone} onChange={e => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); }} /></div>
                      {errors.phone && <span className="p-err">{errors.phone}</span>}
                    </div>
                    <div className="p-fg">
                      <label>Platform <span className="req">*</span></label>
                      <div className="p-inp">
                        <select className="c-select" style={{ border: 'none', background: 'none', width: '100%', padding: '12px 14px', outline: 'none', color: 'var(--text)', cursor: 'pointer', appearance: 'none' }} value={platform} onChange={e => { setPlatform(e.target.value); }}>
                          <option value="Instagram">Instagram</option>
                          <option value="YouTube">YouTube</option>
                          <option value="TikTok">TikTok</option>
                          <option value="Multi-Platform">Multi-Platform</option>
                        </select>
                      </div>
                    </div>
                    <div className="p-fg">
                      <label>Raw Video Link <span className="req">*</span></label>
                      <div className={`p-inp ${errors.link ? 'err' : ''}`}><input type="url" placeholder="Paste your raw video link (Google Drive, Dropbox, OneDrive, WeTransfer or any public file link)" value={link} onChange={e => { setLink(e.target.value); }} /></div>
                      <span className="p-helper">Supported links: Google Drive, Dropbox, OneDrive, WeTransfer, Mega, or any publicly accessible file link.</span>
                      {errors.link && <span className="p-err">{errors.link}</span>}
                    </div>
                    <div className="p-fg">
                      <label>
                        Timestamps / Notes
                      </label>

                      <div className={`p-inp ${errors.instructions ? 'err' : ''}`}>
                        <textarea
                          rows="3"
                          placeholder={`Optional: Add timestamps (e.g., 00:15–00:28), editing style, captions, branding notes, or any special instructions.

Upload or paste your raw video link above—we'll review your footage, edit it professionally, and deliver your final video.`}
                          value={instructions}
                          onChange={(e) => { setInstructions(e.target.value); }}
                        />
                      </div>

                      {errors.instructions && (
                        <span className="p-err">{errors.instructions}</span>
                      )}
                    </div>
                    <div className="p-fg">
                      <label>Number of Clips <span className="req">*</span></label>
                      <div className="p-sel">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9+'].map(v => (
                          <button key={v} type="button" className={`p-btn ${selection === v ? 'p-btn-a' : ''}`} onClick={() => { setSelection(prev => prev === v ? null : v); }}>{v}</button>
                        ))}
                      </div>
                      {errors.selection && <span className="p-err">{errors.selection}</span>}
                      {selection === '9+' && (
                        <div className="p-cq"><label>Quantity (10–100):</label>
                          <div className={`p-inp ${errors.qty ? 'err' : ''}`}><input type="number" min="10" max="100" placeholder="e.g. 15" className="font-mono" value={customQty} onChange={e => { setCustomQty(e.target.value); }} /></div>
                          {errors.qty && <span className="p-err">{errors.qty}</span>}
                        </div>
                      )}
                    </div>
                    <div className="p-btns payment-visible">
                      <button type="button" className="btn btn-ghost p-btn-q" onClick={sendQuery} disabled={status === 'loading'}>Send Query</button>
                      <button type="button" className="btn btn-primary p-btn-p" onClick={handlePay} disabled={status === 'loading'}>
                        {status === 'loading' ? <><span className="spinner"></span>Processing...</> : `Proceed to Pay — ₹${price}`}
                      </button>
                    </div>
                    <button type="button" className="btn btn-bulk" onClick={handleBulkOrders}>
                      Bulk Orders
                    </button>
                  </form>
                )}
                <div className="p-summary p-summary-mobile">
                  <div className="p-sum-hdr">Pricing Structure</div>
                  <div className="p-sum-body">
                    <div className="p-sum-item"><span>1 Video</span><span className="font-mono">₹1,099</span></div>
                    <div className="p-sum-item"><span>2–4 Videos</span><span className="font-mono">₹899 / video</span></div>
                    <div className="p-sum-item"><span>5 Videos</span><span className="font-mono">₹799 / video</span></div>
                    <div className="p-sum-item"><span>6+ Videos</span><span className="font-mono">₹699 / video</span></div>
                    <div className="p-sum-item" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '0.72rem', fontStyle: 'italic', color: 'var(--muted)' }}>
                      <span>Typical edited video length: 30–40 seconds</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section className="section" id="services">
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Services & Solutions</span>
              <h2 className="sec-title">Custom Creative Operations Built For Business Results</h2>
              <p className="sec-desc">We build digital assets, platforms, and media funnels that convert attention into business assets. Every project is handcrafted, completely custom, and aligned with your conversion KPIs.</p>
            </div>

            {/* Redesigned Services Grid */}
            <div className="redesigned-services-grid">
              
              {/* Card 1: Clip Editing */}
              <div className="premium-service-card card-clip-editing">
                <div>
                  <div className="premium-card-badge">SHORT-FORM</div>
                  <div className="premium-card-header">
                    <h3 className="premium-service-title">Viral Clip Engine</h3>
                    <span className="premium-service-subtitle">Perfect For: Creators & Brands</span>
                  </div>
                  
                  <div className="premium-card-divider"></div>
                  
                  <p className="premium-one-liner-val">Transform long-form content into viral short-form videos.</p>
                  
                  <div className="premium-card-divider"></div>
                  
                  <div className="card-section-block">
                    <ul className="deliverables-list">
                      <li>✓ Higher Retention</li>
                      <li>✓ 48-Hour Delivery SLA</li>
                      <li>✓ Human Editor Quality Check</li>
                    </ul>
                  </div>
                </div>

                <div className="premium-pricing-cta">
                  <Link to="/#pricing" className="btn-premium-cta">
                    Customize Service &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 2: Podcast Editing */}
              <div className="premium-service-card card-podcast-editing">
                <div>
                  <div className="premium-card-badge">SHOW PRODUCTION</div>
                  <div className="premium-card-header">
                    <h3 className="premium-service-title">Podcast Masterclass</h3>
                    <span className="premium-service-subtitle">Perfect For: Hosts & Brands</span>
                  </div>
                  
                  <div className="premium-card-divider"></div>
                  
                  <p className="premium-one-liner-val">Full-service multi-camera show editing and professional audio mastering.</p>
                  
                  <div className="premium-card-divider"></div>
                  
                  <div className="card-section-block">
                    <ul className="deliverables-list">
                      <li>✓ Multi-Camera Switches</li>
                      <li>✓ Background Noise Removal</li>
                      <li>✓ Broadcast Audio EQ Standards</li>
                    </ul>
                  </div>
                </div>

                <div className="premium-pricing-cta">
                  <Link to="/services/podcast-editing" className="btn-premium-cta">
                    Customize Service &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 3: Social Media Marketing */}
              <div className="premium-service-card card-social-marketing">
                <div>
                  <div className="premium-card-badge">CONTENT STRATEGY</div>
                  <div className="premium-card-header">
                    <h3 className="premium-service-title">Organic Growth Suite</h3>
                    <span className="premium-service-subtitle">Perfect For: SaaS & Startups</span>
                  </div>
                  
                  <div className="premium-card-divider"></div>
                  
                  <p className="premium-one-liner-val">Data-driven distribution frameworks engineered to scale web traffic.</p>
                  
                  <div className="premium-card-divider"></div>
                  
                  <div className="card-section-block">
                    <ul className="deliverables-list">
                      <li>✓ Niche Competitor Audits</li>
                      <li>✓ Custom Hook Script Blueprints</li>
                      <li>✓ Direct Inbound Conversion Funnels</li>
                    </ul>
                  </div>
                </div>

                <div className="premium-pricing-cta">
                  <Link to="/services/social-media-marketing" className="btn-premium-cta">
                    Customize Service &rarr;
                  </Link>
                </div>
              </div>

              {/* Card 4: Web Development */}
              <div className="premium-service-card card-web-development">
                <div>
                  <div className="premium-card-badge">WEB DEVELOPMENT</div>
                  <div className="premium-card-header">
                    <h3 className="premium-service-title">Custom Web Solutions</h3>
                    <span className="premium-service-subtitle">Perfect For: Businesses, Startups & Growing Brands</span>
                  </div>
                  
                  <div className="premium-card-divider"></div>
                  
                  <p className="premium-one-liner-val">We design and develop high-performance websites tailored to your business goals, combining modern design, fast performance, and scalable technology.</p>
                  
                  <div className="premium-card-divider"></div>
                  
                  <div className="card-section-block">
                    <ul className="deliverables-list">
                      <li>✓ Business Websites</li>
                      <li>✓ Landing Pages</li>
                      <li>✓ Custom Websites</li>
                      <li>✓ CRM Development</li>
                    </ul>
                  </div>
                </div>

                <div className="premium-pricing-cta">
                  <Link to="/services/web-design-development" className="btn-premium-cta">
                    Customize Service &rarr;
                  </Link>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* PRODUCTION STANDARDS */}
        <section className="section why" id="why">
          <div className="container">
            <div className="why-grid">
              <div className="why-left">
                <span className="sec-label">Production Standards</span>
                <h2 className="why-title">Retain Your Viewer's First 3 Seconds</h2>
                <p className="why-desc">With thousands of vertical videos competing for attention, quality is no longer optional. We build high-retention frameworks that convert random swipers into dedicated subscribers.</p>
                <a href="#pricing" className="btn btn-primary" onClick={(e) => { e.preventDefault(); scrollTo('#pricing'); }}>Start Your Project &rarr;</a>
              </div>
              <div className="why-right">
                {[
                  { icon: Clock3, tag: 'TAT Guarantee', title: 'Fast Delivery', desc: 'Professional edits delivered within the committed turnaround time while maintaining premium quality.' },
                  { icon: BarChart3, tag: 'Retention Focus', title: 'High Retention Editing', desc: 'Every edit is crafted to maximize audience retention using modern pacing, captions, transitions and storytelling.' },
                  { icon: PenTool, tag: 'Bespoke Style', title: 'Creator Style Matching', desc: 'Every video is edited according to your unique content style instead of using generic templates.' },
                  { icon: Monitor, tag: 'Platform Settings', title: 'Platform Optimized', desc: 'Videos are optimized individually for Instagram Reels, YouTube Shorts and other vertical platforms.' }
                ].map((c, i) => (
                  <div key={c.tag} className="why-card" style={{ '--stagger': i }}>
                    <div className="why-card-hdr">
                      <div className="why-icon-box">
                        <IconWrapper icon={c.icon} size={36} color="var(--accent)" className="why-icon" />
                      </div>
                      <span className="why-tag">{c.tag}</span>
                    </div>
                    <h3 className="why-ctitle">{c.title}</h3>
                    <p className="why-cdesc">{c.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WORKFLOW */}
        <section className="section wf-section" id="workflow">
          <div className="container">
            <div className="sec-hdr center">
              <span className="sec-label">Workflow</span>
              <h2 className="sec-title">The <span className="sec-grad">3-Step</span> Pipeline</h2>
              <p className="sec-desc">From submission to delivery — a streamlined process built for speed and quality.</p>
            </div>
            <div className="wf-grid">
              {[
                { num: '01', icon: UploadCloud, title: 'Submit Link & Timestamps', desc: 'Paste your YouTube video, Google Drive folder, or raw file link. List the exact timestamps of highlights you want cut.', color: 'var(--accent)' },
                { num: '02', icon: ShieldCheck, title: 'Send Query / Pay Securely', desc: 'Review your dynamic pricing. Send us a query for questions, or pay securely via Razorpay to start immediately.', color: '#F59E0B' },
                { num: '03', icon: DownloadCloud, title: 'Receive Clips via Drive', desc: 'Once confirmed, finished edits are delivered via a private Google Drive folder link within 48 hours.', color: '#10B981' }
              ].map((s, i) => (
                <div key={s.num} className="wf-card" style={{ '--stagger': i }}>
                  <div className="wf-step-badge">Step {s.num}</div>
                  <div className="wf-icon-wrap">
                    <IconWrapper icon={s.icon} size={48} color={s.color} className="wf-icon" />
                  </div>
                  <h3 className="wf-title">{s.title}</h3>
                  <p className="wf-desc">{s.desc}</p>
                  {i < 2 && <div className="wf-connector">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </div>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLIENTS / TESTIMONIALS */}
        <section className="section clients" id="clients">
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

        {/* FAQ */}
        <section className="section faq-section" id="faq">
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
      </main>

      {/* CONTACT */}
      <section className="section contact-section" id="contact">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-left">
              <span className="sec-label">Let's Talk</span>
              <h2 className="contact-title">Let's Build Viral Content Together</h2>
              <p className="contact-desc">Ready to scale your content with high-retention edits that captivate audiences and drive growth? Let's craft something extraordinary.</p>
              <div className="contact-channels">
                <a href="mailto:contact@viralcraftmedia.com" className="contact-channel">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                  <span>contact@viralcraftmedia.com</span>
                </a>
                <a href="https://www.instagram.com/viralcraftsocial" target="_blank" rel="noopener noreferrer" className="contact-channel">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
                  <span>@viralcraftmedia</span>
                </a>
              </div>
            </div>
            <div className="contact-right">
              <div className="contact-card">
                <h3 className="contact-card-title">Book Free Consultation</h3>
                <p className="contact-card-desc">Tell us about your project and we'll get back to you within 24 hours.</p>
                 <form className="contact-form" onSubmit={handleEnquirySubmit}>
                  <div className="c-fg">
                    <input 
                      type="text" 
                      required 
                      placeholder="Your Name *" 
                      className="c-inp" 
                      value={enquiryName}
                      onChange={e => setEnquiryName(e.target.value)}
                    />
                  </div>
                  <div className="c-fg">
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      className="c-inp" 
                      value={enquiryEmail}
                      onChange={e => setEnquiryEmail(e.target.value)}
                    />
                  </div>
                  <div className="c-fg">
                    <input 
                      type="tel" 
                      required 
                      placeholder="WhatsApp Number * (10 Digits)" 
                      className="c-inp" 
                      value={enquiryPhone}
                      onChange={e => setEnquiryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                  <div className="c-fg">
                    <select 
                      required
                      className="c-inp c-select" 
                      value={enquiryService} 
                      onChange={e => setEnquiryService(e.target.value)}
                    >
                      <option value="">Select Service Type *</option>
                      <option value="Clip Editing">Short Form Clipping & Editing</option>
                      <option value="Podcast Editing">Podcast Editing & Production</option>
                      <option value="Social Media Marketing">Social Media Marketing</option>
                      <option value="Website Design & Development">Website Design & Development</option>
                      <option value="Clip Editing">Branding & Creative Design</option>
                      <option value="Clip Editing">Video Production Consultation</option>
                    </select>
                  </div>
                  <div className="c-fg">
                    <input 
                      type="number" 
                      placeholder="Estimated Budget in INR (Optional)" 
                      className="c-inp" 
                      value={enquiryBudget}
                      onChange={e => setEnquiryBudget(e.target.value)}
                    />
                  </div>
                  <div className="c-fg">
                    <textarea 
                      rows="3" 
                      placeholder="Tell us about your project or details..." 
                      className="c-inp c-textarea"
                      value={enquiryDesc}
                      onChange={e => setEnquiryDesc(e.target.value)}
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary contact-btn" disabled={enquiryStatus === 'loading'}>
                    {enquiryStatus === 'loading' ? 'Submitting...' : 'Book Free Consultation'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
